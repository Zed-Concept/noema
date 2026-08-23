import * as SecureStore from 'expo-secure-store';

/**
 * A `supabase-js` storage adapter backed by `expo-secure-store`, which stores
 * one string per key. Session payloads outgrow what a single keychain entry can
 * be relied on to hold, so values are split across deterministically-named
 * chunk keys and described by a small index written at the base key.
 *
 * This module handles an OPAQUE STRING. It does not mint, parse, validate,
 * refresh, or inspect a token, and it never interprets the payload's contents.
 * The only property it reads off the value is its length, to verify a read
 * reassembled completely.
 *
 * Two contracts drive the design.
 *
 * **Fail closed.** `@supabase/auth-js` calls `getItem` OUTSIDE its own
 * try/catch, so a rejected promise from here propagates out of
 * `supabase.auth.getSession()`; and a value that survives truncation into
 * still-parseable JSON makes auth-js treat the session as invalid and actively
 * wipe it. Both are avoided the same way: a read that cannot be proven complete
 * resolves to `null`, and neither `getItem` nor `removeItem` ever throws.
 *
 * **Never a null window.** A single-key store is atomic: a reader sees the old
 * value or the new one. Chunking loses that for free, and the loss is not
 * theoretical — this client runs auth-js LOCKLESS (no `lock` option is passed,
 * and auth-js only installs one when told to), so reads genuinely interleave
 * with writes. If a write cleared the old value first, a concurrent
 * `getSession()` would read `null` mid-write and the caller would fall back to
 * an anonymous request, or the UI would bounce a signed-in user to sign-in.
 *
 * So writes never mutate the generation being read. Each payload lives under a
 * generation — 0 or 1 — recorded in the index; a write lays down the *other*
 * generation completely, then swaps the index in one call, then cleans up
 * behind itself. A reader either sees the old index (whose chunks are all still
 * present) or the new one (whose chunks are all already present). Two fixed
 * generations keep every possible chunk key enumerable from the base key alone,
 * which is what lets `removeItem` guarantee it leaves nothing behind.
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
 * At the budget above this caps a single value at 384 KiB — far beyond any
 * session payload, while keeping the sweep bounded.
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
};

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

const secureStoreBackend: SecureStoreBackend = {
  getItemAsync: (key) => SecureStore.getItemAsync(key),
  setItemAsync: (key, value) => SecureStore.setItemAsync(key, value),
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

/** Parse an index, returning null for anything not written by this adapter. */
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
  const { g, n, len } = candidate;
  if (g !== 0 && g !== 1) return null;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > MAX_CHUNKS) return null;
  if (typeof len !== 'number' || !Number.isInteger(len) || len < 0) return null;

  return { [INDEX_MARKER]: 1, g, n, len };
}

export type ChunkedSecureStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

/**
 * Build the adapter. `backend` defaults to the real keychain; tests pass a
 * double.
 */
export function createChunkedSecureStore(
  backend: SecureStoreBackend = secureStoreBackend,
): ChunkedSecureStore {
  // Reads and deletes that cannot throw. The keychain rejects for reasons that
  // have nothing to do with this key — a locked device, an undecryptable entry,
  // a missing entitlement — and neither teardown nor cleanup may abort on one.
  // Writes are deliberately NOT wrapped: a write that did not happen must be
  // visible to the caller.
  async function readQuietly(key: string): Promise<string | null> {
    try {
      const value = await backend.getItemAsync(key);
      return typeof value === 'string' ? value : null;
    } catch {
      return null;
    }
  }

  async function deleteQuietly(key: string): Promise<void> {
    try {
      await backend.deleteItemAsync(key);
    } catch {
      // Best effort. The index is dropped first, so anything left behind is
      // already unreachable.
    }
  }

  async function readIndex(key: string): Promise<ChunkIndex | null> {
    const raw = await readQuietly(key);
    return raw === null ? null : parseIndex(raw);
  }

  /**
   * Delete every chunk of one generation. `claimed` chunks are deleted by
   * position — a chunk already missing still has its key cleared, since
   * deleting an absent key is a no-op — and the sweep continues past them until
   * a gap, so chunks orphaned by a longer previous value cannot survive.
   */
  async function purgeGeneration(key: string, generation: Generation, claimed: number) {
    for (let i = 0; i < claimed; i += 1) {
      await deleteQuietly(chunkKeyFor(key, generation, i));
    }
    for (let i = claimed; i < MAX_CHUNKS; i += 1) {
      const chunkKey = chunkKeyFor(key, generation, i);
      if ((await readQuietly(chunkKey)) === null) break;
      await deleteQuietly(chunkKey);
    }
  }

  async function removeItem(key: string): Promise<void> {
    const index = await readIndex(key);

    // The index goes FIRST here, the opposite of a write. Removal's job is to
    // make the value unreadable, and dropping the index achieves that in one
    // call even if every delete below fails.
    await deleteQuietly(key);

    // Both generations, because a previous write may have left the older one
    // partially cleaned and a corrupt index cannot say which is live.
    for (const generation of GENERATIONS) {
      await purgeGeneration(key, generation, index?.g === generation ? index.n : 0);
    }
  }

  return {
    async getItem(key: string): Promise<string | null> {
      try {
        const index = await readIndex(key);
        // Absent, corrupt, or not ours — all indistinguishable from here, and
        // all resolved the same way rather than guessed at.
        if (!index) return null;

        const parts: string[] = [];
        for (let i = 0; i < index.n; i += 1) {
          const chunk = await backend.getItemAsync(chunkKeyFor(key, index.g, i));
          // One missing chunk means the payload cannot be reassembled. Returning
          // what was recovered would hand auth-js a truncated string.
          if (typeof chunk !== 'string') return null;
          parts.push(chunk);
        }

        const value = parts.join('');
        // Length is the completeness check: chunks that were individually
        // present but collectively wrong cannot pass as a whole payload.
        if (value.length !== index.len) return null;

        return value;
      } catch {
        // auth-js reads storage outside its try/catch, so a rejection here would
        // propagate out of getSession(). Absent is the safe answer to every
        // failure this adapter can see.
        return null;
      }
    },

    async setItem(key: string, value: string): Promise<void> {
      const current = await readIndex(key);
      // Write into the generation nobody is reading. With no readable index,
      // generation 0 is as good as either.
      const target: Generation = current?.g === 0 ? 1 : 0;

      const chunks = splitByUtf8Budget(value, CHUNK_BUDGET_BYTES);
      if (chunks.length > MAX_CHUNKS) {
        throw new Error(
          `Value for "${key}" needs ${chunks.length} chunks, above the ${MAX_CHUNKS} limit.`,
        );
      }

      // Stale chunks of the target generation are cleared first. They are not
      // being read — the live index points elsewhere — so this is invisible to
      // a concurrent reader.
      await purgeGeneration(key, target, 0);

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
      };
      await backend.setItemAsync(key, JSON.stringify(index));

      // Only now is the previous generation unreferenced. Cleanup failures here
      // cannot corrupt anything — the value is already committed.
      if (current) await purgeGeneration(key, current.g, current.n);
    },

    removeItem,
  };
}
