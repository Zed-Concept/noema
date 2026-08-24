import * as SecureStore from 'expo-secure-store';

/**
 * A `supabase-js` storage adapter backed by `expo-secure-store`, which stores
 * one string per key. Session payloads outgrow what a single keychain entry can
 * be relied on to hold, so values are split across deterministically-named
 * chunk keys and described by a small index written at the base key.
 *
 * This module handles an OPAQUE STRING. It does not mint, parse, validate,
 * refresh, or inspect a token, and it never interprets the payload's contents.
 * The only two properties it derives from the value are its length and a
 * checksum over its code units, both of which exist to verify that a read
 * reassembled exactly what a write laid down.
 *
 * ---------------------------------------------------------------------------
 * THREE INVARIANTS
 * ---------------------------------------------------------------------------
 *
 * REVIEW-019 reproduced eight deterministic counterexamples against the
 * previous version of this file. They are not eight independent bugs; they are
 * three missing invariants. Each is stated here, enforced below, and named at
 * the code that enforces it. The counterexamples are unreachable because the
 * invariants hold, not because eight schedules were patched.
 *
 * **1. Absence is not failure.** A backend that refuses to answer has told us
 * nothing; it has not told us the key is empty. State discovery is not cleanup,
 * and a backend failure is never laundered into a state assertion. Concretely:
 * `setItem` rejects rather than guessing a generation when it cannot read the
 * current index, and `removeItem` reports success only when every key it swept
 * is actually gone. `getItem` is the deliberate asymmetry — see its own note.
 *
 * **2. Operations are serialized.** Every public operation runs to completion
 * before the next one starts. A reader can therefore never hold an index across
 * a writer's cleanup, and two writers can never select the same spare
 * generation. The scope of that guarantee is stated exactly under
 * "Serialization scope" below, because a serialization claim with no stated
 * scope is the kind of claim that reads as stronger than it is.
 *
 * **3. Cleanup does not stop at the first gap.** `removeItem` deletes the
 * complete enumerable key space for both generations and never terminates
 * early on an absent key. Token material surviving removal is the
 * security-relevant half of a cleanup bug, so removal is exhaustive by
 * construction rather than by argument about which gaps can occur.
 *
 * ---------------------------------------------------------------------------
 * FAIL CLOSED
 * ---------------------------------------------------------------------------
 *
 * `@supabase/auth-js` calls `getItem` OUTSIDE its own try/catch, so a rejected
 * promise from here propagates out of `supabase.auth.getSession()`; and a value
 * that survives truncation into still-parseable JSON makes auth-js treat the
 * session as invalid and actively wipe it. Both are avoided the same way: a
 * read that cannot be proven complete resolves to `null`, and `getItem` never
 * throws.
 *
 * ---------------------------------------------------------------------------
 * NEVER A NULL WINDOW
 * ---------------------------------------------------------------------------
 *
 * A single-key store is atomic: a reader sees the old value or the new one.
 * Chunking loses that for free. If a write cleared the old value first, a
 * concurrent `getSession()` would read `null` mid-write and the caller would
 * fall back to an anonymous request, or the UI would bounce a signed-in user to
 * sign-in.
 *
 * So writes never mutate the generation being read. Each payload lives under a
 * generation — 0 or 1 — recorded in the index; a write lays down the *other*
 * generation completely, then swaps the index in one call, then cleans up
 * behind itself. Two fixed generations keep every possible chunk key enumerable
 * from the base key alone, which is what lets `removeItem` guarantee it leaves
 * nothing behind.
 *
 * Two generations alone were not enough — REVIEW-019 finding 1 showed a reader
 * that captured the old index and resumed after the cleanup still reaching
 * `null`. Invariant 2 is what closes that: the reader holds the queue for the
 * whole of its read, so there is no "after" for it to resume into.
 *
 * ---------------------------------------------------------------------------
 * SERIALIZATION SCOPE — what invariant 2 does and does not cover
 * ---------------------------------------------------------------------------
 *
 * COVERED: every operation issued through one adapter instance inside one JS
 * runtime. On native that is the whole of it in practice, because
 * `session-storage.ts` builds exactly one instance at module scope, JavaScript
 * on iOS and Android runs on a single interpreter, and every session read and
 * write auth-js performs goes through that instance.
 *
 * NOT COVERED: a second OS process or app extension touching the same keychain
 * item; a native thread writing below the JS layer; and a second adapter
 * instance, which would carry its own queue. None of these arise in this app
 * today, and none of them are claimed to be handled.
 *
 * NOT APPLICABLE: web. `Platform.OS === 'web'` never reaches this module —
 * `session-storage.ts` hands `supabase-js` `undefined` so it uses its own
 * `localStorage` default — so nothing here says anything about browser tabs.
 *
 * NOT USED: auth-js's own `lock` option. It exists, and the pinned
 * `@supabase/auth-js` 2.112.3 still honours it, but that version marks the only
 * lock it ships for this environment (`processLock`) `@deprecated` with
 * "The auth client coordinates refreshes itself and the server resolves
 * concurrent refresh races, so passing `{ lock: processLock }` to it has no
 * effect", and the client's own lock path is annotated `TODO(v3): remove legacy
 * lock path`. Adopting a deprecated option on the auth path to obtain a
 * property this module can guarantee for itself would add a dependency on
 * behaviour scheduled for removal. It would also serialize only the calls
 * auth-js makes, whereas the queue below serializes every call that reaches
 * this adapter.
 */

/**
 * Bytes of UTF-8 payload per chunk.
 *
 * The installed `expo-secure-store` (57.0.1) enforces no per-value size limit:
 * the iOS-only oversize *warning* that older versions printed was deleted in
 * 55.0.0, and no JS, Swift, or Kotlin path in the installed package inspects
 * value length. The ceiling that remains is the platform's own — an iOS
 * keychain item, an Android keystore-encrypted preference entry — and neither
 * is stated in any file in this tree. This budget is therefore a deliberate
 * safety margin under the 2048-byte figure historically associated with the
 * removed warning, not a constant read from the library. It is chosen, and
 * chosen conservatively, because an oversize write surfaces only as a generic
 * native error with no size-specific message.
 */
export const CHUNK_BUDGET_BYTES = 1536;

/**
 * Upper bound on chunks per generation, and so on the sweep in `removeItem`.
 * At the budget above this caps a single value at 384 KiB.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS NUMBER, AND WHAT IT IS NOT
 * ---------------------------------------------------------------------------
 *
 * This constant is pulled in two directions by two review findings that
 * constrain each other, and the previous value resolved only one of them.
 *
 * REVIEW-019 finding 6 required removal to sweep the FULL key space rather
 * than trust the index, because a first-gap early exit stranded a live token
 * fragment. That makes removal cost `2 * MAX_CHUNKS + 1` backend deletes, so
 * the bound acquired a price it did not have before. Fix cycle 1 answered by
 * lowering it 256 -> 64.
 *
 * REVIEW-020 finding 2 then rejected the justification for that. It was
 * asserted, not measured, and it was false as stated: auth-js persists the
 * whole `Session.user` when no separate `userStorage` is configured — as here
 * — and `UserMetadata`/`UserAppMetadata` carry open-ended index signatures, so
 * a structurally valid session with a 100,000-character metadata value needs
 * more than 64 chunks. 64 refused a session the pinned client can hand us.
 *
 * The number below is chosen from MEASUREMENT instead. `session-sizes.txt` in
 * this cycle's evidence records the producer and its output:
 *
 *   |   chunks | session shape                                        |
 *   |----------|------------------------------------------------------|
 *   |        2 | empty `user_metadata` — what Noema v1 actually creates |
 *   |        2 | small profile (full_name, avatar_url, locale)          |
 *   |        8 | 10 KiB metadata                                       |
 *   |       67 | REVIEW-020 finding 2's 100,000-character counterexample |
 *   |      172 | 256 KiB metadata                                       |
 *
 * 256 covers this product's actual session 128x over and finding 2's
 * counterexample 3.8x over, at a removal cost of exactly 513 backend deletes —
 * a deterministic figure, asserted by test, paid once per sign-out.
 *
 * **WHAT IS NOT CLAIMED.** The previous note said 64 was "far beyond any
 * session payload". No finite ceiling can honestly claim that, and this one
 * does not: `UserMetadata` is an open-ended index signature, so for any bound
 * there exists a structurally valid session above it. This constant is a
 * RESOURCE BOUND ON REMOVAL, not a safety property, and the refusal above it
 * is a DISCLOSED FUNCTIONAL LIMIT rather than a guarantee of unreachability.
 *
 * What makes that limit safe rather than merely bounded is that exceeding it
 * is a thrown error at write time, before any backend write: zero writes, a
 * byte-stable key set, and the previous value still readable. It never
 * truncates. REVIEW-020 verified that fail-closed behaviour at the exact
 * module and it is unchanged here.
 *
 * Whether the Noema Supabase project will ever return metadata approaching
 * this size is **NOT RUN** — Phase A makes no live auth call, so no
 * server-side bound is established, and none is assumed. ADR-007's Phase B
 * work is where a real session is first measured.
 */
export const MAX_CHUNKS = 256;

/** The two generations a payload can occupy. */
export const GENERATIONS = [0, 1] as const;
export type Generation = (typeof GENERATIONS)[number];

/** Marker distinguishing an index this adapter wrote from any other value. */
const INDEX_MARKER = '__scs' as const;

type ChunkIndex = {
  readonly [INDEX_MARKER]: 1;
  /** Which generation holds the payload. */
  readonly g: Generation;
  /** Number of chunk keys holding the payload. */
  readonly n: number;
  /** Length of the payload in UTF-16 code units, used to verify reassembly. */
  readonly len: number;
  /** `payloadChecksum` of the payload — see that function for what it is not. */
  readonly c: number;
};

/**
 * A 32-bit FNV-1a checksum over the value's UTF-16 code units.
 *
 * **This is corruption detection. It is NOT tamper resistance.** Read that
 * sentence again before writing any claim that rests on this function. It
 * catches truncation, accidental damage, and a payload assembled from two
 * different writes. It does not resist an adversary who can write arbitrary
 * values into the Keychain or Keystore: such an adversary can recompute this
 * number as easily as we can, and in any case already holds the tokens, so
 * there is nothing left for a checksum to protect. ADR-006 decides this and
 * binding ruling 15 bars any claim to the contrary in code, evidence, or
 * documentation.
 *
 * FNV-1a specifically because ADR-004 names this adapter the highest-risk code
 * in the repo and constrains it to stay minimal: this is nine lines, adds no
 * dependency, and uses no cryptographic API. A SHA-256 through `expo-crypto`
 * would buy real integrity against everyone except the only adversary that
 * matters here, at the cost of a crypto dependency on the auth path.
 *
 * `Math.imul` is the 32-bit multiply — a plain `*` would exceed the exact
 * integer range and silently produce a different number on the same input.
 */
export function payloadChecksum(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 0x01000193);
  }
  return hash >>> 0;
}

/**
 * The subset of `expo-secure-store` this adapter uses. Declaring it lets the
 * real keychain be substituted for an in-memory double under test. It is a
 * constructor argument with a real default, not a runtime switch: nothing in
 * the shipped path reads an environment variable to decide which backend it
 * gets.
 */
export type SecureStoreBackend = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

/**
 * `WHEN_UNLOCKED` is stated rather than inherited.
 *
 * It is already `expo-secure-store`'s default, so this line changes no
 * behaviour — it makes ADR-005's decision visible at the point it takes effect
 * and turns a future weakening into a visible diff. ADR-005 considered and
 * rejected `AFTER_FIRST_UNLOCK`: it would fix a background refresh's lost write
 * by making the session readable while the device is locked, which is exactly
 * the at-rest protection ADR-004 chose SecureStore for. That rejection stands
 * unchanged under ADR-007.
 *
 * WHAT IS NOT CLAIMED HERE. An earlier version of this note said a refresh
 * "never fires against a locked device, and there is no lost write to fix".
 * Both halves are withdrawn. REVIEW-020 finding 1 disproved the first, and
 * ADR-007 replaced the clause it rested on: the client no longer schedules
 * refreshes at all (`supabase.ts`, `autoRefreshToken: false`) and the app
 * initiates them only while foreground (`foreground-refresh.ts`). The second
 * half was never established in this phase — ADR-007 classifies locked-device
 * behaviour NOT RUN and NOT CLAIMED in Phase A and carries a named
 * physical-device test into Phase B. What this codebase does instead of
 * claiming the write cannot be lost is DETECT that it was: a refused session
 * write is recorded by `session-storage.ts` and forces re-authentication.
 */
const secureStoreBackend: SecureStoreBackend = {
  getItemAsync: (key) => SecureStore.getItemAsync(key),
  setItemAsync: (key, value) =>
    SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED }),
  deleteItemAsync: (key) => SecureStore.deleteItemAsync(key),
};

/**
 * Chunk key for `index` of `generation` under `baseKey` — derived
 * deterministically from those three, and since there are exactly two
 * generations, the complete set of chunk keys for a base key is enumerable
 * from the base key alone. SecureStore exposes no key enumeration, so that
 * property is what makes a complete teardown possible.
 *
 * The `.` separator is deliberate: auth-js's own derived keys
 * (`-code-verifier`, `-flow-<id>-code-verifier`, `-flows-code-verifier`,
 * `-user`) avoid dots by design, so this namespace cannot collide with them.
 * `.` is also inside SecureStore's permitted key character set.
 */
export function chunkKeyFor(baseKey: string, generation: Generation, index: number): string {
  return `${baseKey}.${generation}.${index}`;
}

/** UTF-8 byte length of a single code point. */
function utf8ByteLength(codePoint: number): number {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

/**
 * Split `value` into pieces each at most `budget` UTF-8 bytes.
 *
 * Iteration is by code point, so a surrogate pair is never split across two
 * chunks — a lone surrogate can be mangled to U+FFFD by a native string
 * boundary, which would break round-trip equality for any non-BMP character.
 * Concatenating the result in order reproduces the input exactly.
 */
export function splitByUtf8Budget(value: string, budget: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  let bytes = 0;

  for (let i = 0; i < value.length;) {
    const codePoint = value.codePointAt(i) as number;
    const units = codePoint > 0xffff ? 2 : 1;
    const width = utf8ByteLength(codePoint);

    // `i > start` keeps a single code point wider than the budget in a chunk of
    // its own rather than looping forever on an empty slice.
    if (bytes + width > budget && i > start) {
      chunks.push(value.slice(start, i));
      start = i;
      bytes = 0;
    }

    bytes += width;
    i += units;
  }

  if (start < value.length) chunks.push(value.slice(start));
  return chunks;
}

/**
 * Parse an index, returning null for anything not written by this adapter.
 *
 * `c` is required, which makes the index format self-describing: a value
 * written by the pre-checksum version of this adapter parses as "not ours" and
 * the session behind it reads as absent. That is deliberate rather than a
 * migration oversight. This code has never run on a device — there is no EAS
 * project, no store presence, and Phase A is offline — so the installed base
 * this would strand is empty, and the alternative is accepting a payload we
 * cannot verify. Cost if that assumption is ever wrong: one re-authentication.
 */
function parseIndex(raw: string): ChunkIndex | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as Record<string, unknown>;

  if (candidate[INDEX_MARKER] !== 1) return null;
  const { g, n, len, c } = candidate;
  if (g !== 0 && g !== 1) return null;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > MAX_CHUNKS) return null;
  if (typeof len !== 'number' || !Number.isInteger(len) || len < 0) return null;
  if (typeof c !== 'number' || !Number.isInteger(c) || c < 0 || c > 0xffffffff) return null;

  return { [INDEX_MARKER]: 1, g, n, len, c };
}

export type ChunkedSecureStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

/**
 * The outcome of one backend read, keeping "the key is not there" and "the
 * backend refused to answer" apart.
 *
 * INVARIANT 1 lives in this type. The previous version collapsed both into
 * `null`, and REVIEW-019 findings 3 and 4 are what that collapse cost: a failed
 * replacement destroyed a live session, and a removal that deleted nothing
 * reported success. A union makes the distinction impossible to drop silently —
 * every caller has to say which case it is handling.
 */
type BackendRead =
  | { readonly ok: true; readonly value: string | null }
  | { readonly ok: false; readonly error: unknown };

/**
 * Build the adapter. `backend` defaults to the real keychain; tests pass a
 * double.
 */
export function createChunkedSecureStore(
  backend: SecureStoreBackend = secureStoreBackend,
): ChunkedSecureStore {
  // ------------------------------------------------------------ INVARIANT 2
  // One operation at a time, in call order. Every public method's body runs
  // through here, and no body calls another public method, so this cannot
  // deadlock against itself.
  //
  // The one way to deadlock it is from outside: a caller that re-enters the
  // adapter from inside a backend call would wait for an operation that is
  // waiting for it. The real backend has no callbacks and cannot do this. A
  // test double with a per-operation hook can, and must not.
  let queue: Promise<unknown> = Promise.resolve();

  function serialized<T>(operation: () => Promise<T>): Promise<T> {
    // `then(operation, operation)` rather than `then(operation)`: the next
    // operation runs whether or not the previous one succeeded.
    const result = queue.then(operation, operation);
    // The queue tracks completion, not outcome. Swallowing here keeps one
    // failed operation from rejecting everything queued behind it; it hides
    // nothing, because `result` still carries the rejection to that
    // operation's own caller.
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  // ------------------------------------------------------------ INVARIANT 1
  // Reads report refusal; they do not report emptiness they did not observe.
  async function readBackend(key: string): Promise<BackendRead> {
    try {
      const value = await backend.getItemAsync(key);
      return { ok: true, value: typeof value === 'string' ? value : null };
    } catch (error) {
      return { ok: false, error };
    }
  }

  // Deletes report whether the key is gone. Deleting an absent key is a no-op
  // in SecureStore, so `true` means "not there afterwards" and `false` means
  // "the store refused, and we do not know". Removal's honesty depends on this
  // boolean actually being consulted; see `removeItemBody`.
  async function deleteBackend(key: string): Promise<boolean> {
    try {
      await backend.deleteItemAsync(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete `count` chunks of one generation, in order, **without stopping at an
   * absent or undeletable key**. Returns false if any delete was refused.
   *
   * INVARIANT 3. The previous version broke out of this loop at the first key
   * that read back absent, and REVIEW-019 finding 6 showed the adapter creating
   * exactly such a gap itself and then stranding a live token fragment behind
   * it. There is nothing to break on now: an absent key costs one no-op delete,
   * which is cheaper than the read that used to decide whether to skip it.
   */
  async function purgeRange(key: string, generation: Generation, count: number): Promise<boolean> {
    let complete = true;
    for (let i = 0; i < count; i += 1) {
      if (!(await deleteBackend(chunkKeyFor(key, generation, i)))) complete = false;
    }
    return complete;
  }

  async function getItemBody(key: string): Promise<string | null> {
    try {
      const indexRead = await readBackend(key);
      // The deliberate asymmetry. `getItem` answers "can you prove a value?",
      // and a refused read cannot, so `null` here is a fail-closed answer to
      // its own question rather than a state assertion about the store. That is
      // not what findings 3 and 4 were about: those were `setItem` and
      // `removeItem` treating refusal as evidence about what is on disk, and
      // then acting destructively on it.
      if (!indexRead.ok || indexRead.value === null) return null;

      // Absent, corrupt, or not ours — all indistinguishable from here, and
      // all resolved the same way rather than guessed at.
      const index = parseIndex(indexRead.value);
      if (!index) return null;

      const parts: string[] = [];
      for (let i = 0; i < index.n; i += 1) {
        const chunk = await readBackend(chunkKeyFor(key, index.g, i));
        // A missing chunk and a refused chunk read are the same answer here:
        // the payload cannot be reassembled, and returning what was recovered
        // would hand auth-js a truncated string.
        if (!chunk.ok || chunk.value === null) return null;
        parts.push(chunk.value);
      }

      const value = parts.join('');
      // Two independent completeness checks over the reassembled payload.
      // Length catches a short or missing piece. The checksum catches damage
      // that preserves length — including a payload made of chunks from two
      // different writes, which is the shape REVIEW-019 finding 2 produced.
      // Neither is an integrity check against an adversary; see
      // `payloadChecksum`.
      if (value.length !== index.len) return null;
      if (payloadChecksum(value) !== index.c) return null;

      return value;
    } catch {
      // auth-js reads storage outside its try/catch, so a rejection here would
      // propagate out of getSession(). `readBackend` already absorbs backend
      // refusals; this is the backstop for anything else — a backend that
      // throws synchronously, a getter that misbehaves — so that the "never
      // throws" contract holds without depending on where the failure came
      // from.
      return null;
    }
  }

  async function setItemBody(key: string, value: string): Promise<void> {
    const indexRead = await readBackend(key);
    // INVARIANT 1, and the whole of finding 4. This read is state discovery:
    // its answer decides which generation is safe to overwrite. A refusal is
    // not "there is no current index" — treating it as one made the adapter
    // choose generation 0, purge it, and destroy a live session when the
    // replacement then failed. There is no safe generation to pick without
    // this answer, so the write does not happen and the caller is told.
    if (!indexRead.ok) {
      throw new Error(
        `Cannot write "${key}": the secure store refused to report its current ` +
          `state, so no generation is safe to overwrite.`,
      );
    }

    // A present-but-unparseable index is genuinely different from a refusal: it
    // says the store answered and what it holds is not a readable value of
    // ours. Nothing readable can be lost by overwriting it.
    const current = indexRead.value === null ? null : parseIndex(indexRead.value);

    // Write into the generation nobody is reading. With no readable index,
    // generation 0 is as good as either.
    const target: Generation = current?.g === 0 ? 1 : 0;

    const chunks = splitByUtf8Budget(value, CHUNK_BUDGET_BYTES);
    if (chunks.length > MAX_CHUNKS) {
      throw new Error(
        `Value for "${key}" needs ${chunks.length} chunks, above the ${MAX_CHUNKS} limit.`,
      );
    }

    // Writes are deliberately NOT wrapped: a write that did not happen must be
    // visible to the caller.
    for (let i = 0; i < chunks.length; i += 1) {
      await backend.setItemAsync(chunkKeyFor(key, target, i), chunks[i]);
    }

    // The index is the commit point and the only atomic step that matters: up
    // to this call a reader sees the previous payload intact, after it the new
    // one, and never a partial or absent value in between.
    const index: ChunkIndex = {
      [INDEX_MARKER]: 1,
      g: target,
      n: chunks.length,
      len: value.length,
      c: payloadChecksum(value),
    };
    await backend.setItemAsync(key, JSON.stringify(index));

    // Only now is the previous generation unreferenced, and its exact extent is
    // known from the index we just read. Cleanup failures here cannot corrupt
    // anything — the value is committed — and they cannot fail the write, which
    // would report a persisted session as unpersisted. What they can leave is
    // unreferenced material, and `removeItem` sweeps for that unconditionally.
    //
    // There is no purge of the TARGET generation before the write. After any
    // completed write the target generation is empty, because that write's own
    // cleanup emptied it. After an interrupted one it may hold fragments, and
    // those are unreachable — reads are bounded by `n` and verified by length
    // and checksum — and are cleared by removal's exhaustive sweep. A complete
    // pre-write purge would cost `MAX_CHUNKS` deletes on every token refresh to
    // clean material that is already unreadable.
    if (current) await purgeRange(key, current.g, current.n);
  }

  async function removeItemBody(key: string): Promise<void> {
    // No index read. Removal does not need to know what is there, and asking
    // would reintroduce exactly the discovery step whose failure mode is
    // finding 4: an unreadable index would have to mean either "nothing to do"
    // or "sweep everything", and only one of those is safe.
    //
    // The index goes FIRST, the opposite of a write. Removal's job is to make
    // the value unreadable, and dropping the index achieves that in one call
    // even if every delete below fails.
    let complete = await deleteBackend(key);

    // INVARIANT 3: the complete enumerable key space, both generations, no
    // early exit on an absent or undeletable key. `2 * MAX_CHUNKS` deletes,
    // once, on sign-out. The sweep is finished even after a refusal — a
    // half-swept store is the state that strands token material, so reporting
    // the failure comes after the work, not instead of it.
    for (const generation of GENERATIONS) {
      if (!(await purgeRange(key, generation, MAX_CHUNKS))) complete = false;
    }

    // INVARIANT 1, and the whole of finding 3. `removeItem` used to resolve
    // unconditionally, so a store that refused every delete produced a
    // successful sign-out with the complete session still readable: auth-js
    // awaits this call before it emits SIGNED_OUT, so the app announced a
    // sign-out that had not happened and the session came back on next launch.
    //
    // Rejecting is the honest report and it lands where it belongs. auth-js
    // does not emit SIGNED_OUT, `signOut()` rejects, `auth-provider.tsx`
    // converts that into a returned error, and the screen tells the user the
    // sign-out failed. That is a worse-looking outcome than the old one and a
    // truthful one; the old one was neither.
    if (!complete) {
      throw new Error(
        `Removal of "${key}" is incomplete: the secure store refused at least ` +
          `one delete, so session material may still be present.`,
      );
    }
  }

  return {
    getItem: (key) => serialized(() => getItemBody(key)),
    setItem: (key, value) => serialized(() => setItemBody(key, value)),
    removeItem: (key) => serialized(() => removeItemBody(key)),
  };
}
