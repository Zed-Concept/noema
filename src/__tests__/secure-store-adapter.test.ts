import {
  CHUNK_BUDGET_BYTES,
  GENERATIONS,
  MAX_CHUNKS,
  chunkKeyFor,
  createChunkedSecureStore,
  payloadChecksum,
  splitByUtf8Budget,
  type Generation,
  type SecureStoreBackend,
} from '@/lib/auth/secure-store-adapter';

/**
 * The adapter is exercised against an in-memory double rather than the real
 * keychain, so these properties are provable with no device, no native module,
 * and no credentials.
 *
 * The double is deliberately strict about the things `expo-secure-store` is
 * strict about — it enforces the same key regex and the same string-only value
 * rule — and deliberately faithful about the things it is lenient about: a
 * missing key reads back `null`, and deleting an absent key is a no-op. Those
 * four behaviours were read out of the installed package (57.0.1), and they are
 * the entire surface the adapter depends on.
 *
 * Two things it adds, both required to reach behaviour REVIEW-019 showed the
 * previous battery never touched:
 *
 * - **Per-operation failure injection.** A predicate per verb decides which
 *   individual calls reject. Rejecting *every* call, which is all the previous
 *   double could do, cannot reach a schedule where discovery succeeds and
 *   cleanup fails — and that schedule is findings 3, 4, and 6.
 * - **A structured operation log.** Interleaving is a property of the ORDER of
 *   backend calls, so the order is recorded and asserted on directly rather
 *   than inferred from an outcome that might hold for another reason.
 *
 * `onOperation` runs after each backend call and is how a concurrent operation
 * is scheduled into another one. It must never call back into the adapter: the
 * adapter serializes its public methods, so a re-entrant call from inside a
 * backend call would wait for the operation that is waiting for it. Tests drive
 * concurrency by starting real concurrent operations instead, which is also
 * what auth-js actually does.
 */

/** SecureStore's own key rule: `/^[\w.-]+$/`, applied before any native call. */
const SECURE_STORE_KEY_PATTERN = /^[\w.-]+$/;

type Op = {
  readonly kind: 'get' | 'set' | 'delete';
  readonly key: string;
  readonly value?: string;
};

type FakeSecureStore = {
  readonly backend: SecureStoreBackend;
  readonly store: Map<string, string>;
  /** Every backend call in order, as strings, for simple ordering assertions. */
  readonly ops: string[];
  /** The same calls, structured, for interleaving assertions. */
  readonly log: Op[];
  /** Runs after each backend call. Must not re-enter the adapter. */
  onOperation?: (op: Op) => Promise<void> | void;
  /** Reject this individual read / write / delete. Default: never. */
  failGet?: (key: string) => boolean;
  failSet?: (key: string) => boolean;
  failDelete?: (key: string) => boolean;
};

function createFakeSecureStore(): FakeSecureStore {
  const store = new Map<string, string>();
  const ops: string[] = [];
  const log: Op[] = [];

  function assertValidKey(key: string): void {
    if (!SECURE_STORE_KEY_PATTERN.test(key)) {
      throw new Error(
        'Invalid key provided to SecureStore. Keys must not be empty and ' +
          'contain only alphanumeric characters, ".", "-", and "_".',
      );
    }
  }

  const fake: FakeSecureStore = { backend: undefined as never, store, ops, log };

  async function record(op: Op): Promise<void> {
    ops.push(`${op.kind}:${op.key}`);
    log.push(op);
    await fake.onOperation?.(op);
  }

  const backend: SecureStoreBackend = {
    async getItemAsync(key) {
      assertValidKey(key);
      if (fake.failGet?.(key)) throw new Error(`errSecInteractionNotAllowed (get ${key})`);
      const value = store.has(key) ? (store.get(key) as string) : null;
      await record({ kind: 'get', key });
      return value;
    },
    async setItemAsync(key, value) {
      assertValidKey(key);
      if (typeof value !== 'string') {
        throw new Error('Invalid value provided to SecureStore. Values must be strings;');
      }
      if (fake.failSet?.(key)) throw new Error(`errSecInteractionNotAllowed (set ${key})`);
      store.set(key, value);
      await record({ kind: 'set', key, value });
    },
    async deleteItemAsync(key) {
      assertValidKey(key);
      if (fake.failDelete?.(key)) throw new Error(`errSecInteractionNotAllowed (delete ${key})`);
      store.delete(key);
      await record({ kind: 'delete', key });
    },
  };

  return Object.assign(fake, { backend });
}

/** The default `supabase-js` session key shape: `sb-<project ref>-auth-token`. */
const BASE_KEY = 'sb-abcdefghijklmnopqrst-auth-token';

/** A session-shaped JSON payload of roughly `size` characters. */
function sessionLikePayload(size: number): string {
  // A JWT-ish opaque blob. The adapter never parses this; it is here only so the
  // payload resembles what auth-js actually stores.
  const filler = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.0123456789abcdefghijklmnop.';
  let body = '';
  while (body.length < size) body += filler;
  return JSON.stringify({ access_token: body.slice(0, size), token_type: 'bearer' });
}

// TextEncoder/TextDecoder rather than Buffer: this project carries no Node type
// definitions (tsconfig `types: ["jest"]`), and adding @types/node is not an
// authorized dependency for this unit. Both are in the DOM lib the project
// already compiles against, and both are present in the jest runtime.
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function utf8Bytes(value: string): number {
  return encoder.encode(value).length;
}

/** True when both strings encode to the identical UTF-8 byte sequence. */
function sameBytes(left: string, right: string): boolean {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

/** Every key currently present, sorted, for exact-set assertions. */
function keysOf(fake: FakeSecureStore): string[] {
  return [...fake.store.keys()].sort();
}

/** The index the adapter committed at `key`, as the adapter would read it. */
function indexOf(
  fake: FakeSecureStore,
  key: string,
): { __scs: 1; g: Generation; n: number; len: number; c: number } {
  const raw = fake.store.get(key);
  if (raw === undefined) throw new Error(`no index at ${key}`);
  return JSON.parse(raw);
}

/** The chunk key at position `i` of whichever generation is currently live. */
function liveChunkKey(fake: FakeSecureStore, key: string, i: number): string {
  return chunkKeyFor(key, indexOf(fake, key).g, i);
}

/** The chunk keys present for `key`, in any generation. */
function chunkKeysOf(fake: FakeSecureStore, key: string): string[] {
  return keysOf(fake).filter((k) => k !== key && k.startsWith(`${key}.`));
}

/** One turn of the microtask queue — lets another in-flight operation proceed. */
function microtask(): Promise<void> {
  return Promise.resolve();
}

/** One turn of the macrotask queue — drains all pending microtask work first. */
function macrotask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Rejects the first `times` calls whose key satisfies `match`, then stops. */
function failFirst(times: number, match: (key: string) => boolean): (key: string) => boolean {
  let remaining = times;
  return (key) => {
    if (remaining > 0 && match(key)) {
      remaining -= 1;
      return true;
    }
    return false;
  };
}

describe('chunked SecureStore adapter — round trip', () => {
  it('returns a payload past the chunk threshold byte-for-byte identical', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);
    const payload = sessionLikePayload(5000);

    // Guard the premise: this test is only meaningful if the payload actually
    // exceeds one chunk.
    expect(utf8Bytes(payload)).toBeGreaterThan(CHUNK_BUDGET_BYTES);

    await adapter.setItem(BASE_KEY, payload);
    const read = await adapter.getItem(BASE_KEY);

    expect(read).toBe(payload);
    // Byte equality, stated as bytes rather than inferred from string equality.
    expect(sameBytes(read as string, payload)).toBe(true);
  });

  it('actually splits that payload across multiple chunk keys', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));

    const chunkKeys = chunkKeysOf(fake, BASE_KEY);
    expect(chunkKeys.length).toBeGreaterThan(1);
    // Chunk keys are exactly the deterministic derivations of the base key for
    // the generation the committed index names.
    const live = indexOf(fake, BASE_KEY);
    expect(chunkKeys).toEqual(
      Array.from({ length: live.n }, (_unused, i) => chunkKeyFor(BASE_KEY, live.g, i)).sort(),
    );
  });

  it('keeps every stored chunk within the byte budget', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(9000));

    for (const [key, value] of fake.store) {
      if (key === BASE_KEY) continue;
      expect(utf8Bytes(value)).toBeLessThanOrEqual(CHUNK_BUDGET_BYTES);
    }
  });

  it('round-trips multi-byte text without corrupting it', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);
    // Arabic plus non-BMP emoji: the first is multi-byte, the second is a
    // surrogate pair that a naive code-unit split would tear in half.
    const payload = JSON.stringify({ name: 'أحمد '.repeat(400), flag: '🇸🇦🧠'.repeat(200) });

    expect(utf8Bytes(payload)).toBeGreaterThan(CHUNK_BUDGET_BYTES);

    await adapter.setItem(BASE_KEY, payload);
    expect(await adapter.getItem(BASE_KEY)).toBe(payload);
  });

  it('never leaves a lone surrogate in a stored chunk', async () => {
    const payload = '🧠'.repeat(2000);
    for (const chunk of splitByUtf8Budget(payload, CHUNK_BUDGET_BYTES)) {
      // A lone surrogate does not survive a UTF-8 encode/decode: it becomes
      // U+FFFD. Native storage does exactly that encode/decode.
      expect(decoder.decode(encoder.encode(chunk))).toBe(chunk);
    }
  });

  it('round-trips an empty string and reports an absent key as null', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    expect(await adapter.getItem(BASE_KEY)).toBeNull();

    await adapter.setItem(BASE_KEY, '');
    expect(await adapter.getItem(BASE_KEY)).toBe('');
  });

  it('refuses a value larger than the chunk ceiling instead of truncating it', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);
    const oversized = 'x'.repeat(MAX_CHUNKS * CHUNK_BUDGET_BYTES + 1);

    await expect(adapter.setItem(BASE_KEY, oversized)).rejects.toThrow(/above the .* limit/);
    // Nothing half-written is left readable.
    expect(await adapter.getItem(BASE_KEY)).toBeNull();
  });
});

/**
 * ADR-004 requires the adapter never to mint, parse, validate, or refresh a
 * token, and REVIEW-019 finding 7 found that property with no instrument at all
 * — not even a NOT RUN row. These three are that instrument. Each fails under a
 * different way of breaking opacity: parsing the payload, re-serialising it,
 * and reading a field off it.
 */
describe('chunked SecureStore adapter — the payload stays opaque', () => {
  it('stores and returns a payload that is not valid JSON', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);
    // Deliberately unparseable, and long enough to chunk. Any `JSON.parse` of
    // the value on the write path throws here rather than passing quietly.
    const notJson = `{"access_token": ${'unquoted-and-unterminated '.repeat(200)}`;

    expect(utf8Bytes(notJson)).toBeGreaterThan(CHUNK_BUDGET_BYTES);

    await expect(adapter.setItem(BASE_KEY, notJson)).resolves.toBeUndefined();
    expect(await adapter.getItem(BASE_KEY)).toBe(notJson);
  });

  it('stores the payload verbatim, so nothing re-serialises it', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);
    // Round-tripping this through JSON.parse/stringify would reorder nothing
    // but would normalise the whitespace, which concatenation exposes.
    const payload = `{ "access_token" :  "${'a'.repeat(4000)}" ,  "expires_at" : 1 }`;

    await adapter.setItem(BASE_KEY, payload);

    const live = indexOf(fake, BASE_KEY);
    const stored = Array.from({ length: live.n }, (_unused, i) =>
      fake.store.get(chunkKeyFor(BASE_KEY, live.g, i)),
    ).join('');
    expect(stored).toBe(payload);
  });

  it('writes an index of its own metadata only, with no field off the payload', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));

    // Exact key set, not a subset check: a token field copied into the index
    // for any reason — caching, debugging, an "expires_at" fast path — is a
    // token the adapter has parsed, and it fails here.
    expect(Object.keys(indexOf(fake, BASE_KEY)).sort()).toEqual(['__scs', 'c', 'g', 'len', 'n']);
  });
});

describe('chunked SecureStore adapter — fails closed', () => {
  it('returns null, not a truncated prefix, when a middle chunk is gone', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);
    const payload = sessionLikePayload(5000);

    await adapter.setItem(BASE_KEY, payload);
    const middle = liveChunkKey(fake, BASE_KEY, 1);
    expect(fake.store.has(middle)).toBe(true);
    fake.store.delete(middle);

    const read = await adapter.getItem(BASE_KEY);

    expect(read).toBeNull();
    // The failure mode this guards against is handing auth-js something that
    // still looks like a value.
    expect(typeof read).not.toBe('string');
  });

  it('returns null when the final chunk is gone', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));
    const chunkCount = indexOf(fake, BASE_KEY).n;
    fake.store.delete(liveChunkKey(fake, BASE_KEY, chunkCount - 1));

    expect(await adapter.getItem(BASE_KEY)).toBeNull();
  });

  it('returns null when the index is corrupt', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));
    fake.store.set(BASE_KEY, '{not json');

    expect(await adapter.getItem(BASE_KEY)).toBeNull();
  });

  it('returns null for a plain value written by something other than this adapter', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);
    // Valid JSON, but carries no index marker — e.g. a session written directly
    // by an earlier build. Unreadable is the safe answer; a half-understood one
    // is not.
    fake.store.set(BASE_KEY, JSON.stringify({ access_token: 'abc' }));

    expect(await adapter.getItem(BASE_KEY)).toBeNull();
  });

  it('returns null for an index with no recorded checksum', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));
    const { c: _dropped, ...withoutChecksum } = indexOf(fake, BASE_KEY);
    fake.store.set(BASE_KEY, JSON.stringify(withoutChecksum));

    // This is also the migration behaviour: an index written by the
    // pre-checksum adapter is "not ours", and the session behind it reads as
    // absent rather than as unverified.
    expect(await adapter.getItem(BASE_KEY)).toBeNull();
  });

  it('returns null when the reassembled length disagrees with the index', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));
    const firstChunk = liveChunkKey(fake, BASE_KEY, 0);
    // Every chunk still present, each individually a valid string — only the
    // total is wrong.
    fake.store.set(firstChunk, (fake.store.get(firstChunk) as string).slice(0, -10));

    expect(await adapter.getItem(BASE_KEY)).toBeNull();
  });

  it('resolves null instead of rejecting when the index read throws', async () => {
    const fake = createFakeSecureStore();
    fake.failGet = () => true;
    const adapter = createChunkedSecureStore(fake.backend);

    // auth-js awaits getItem outside its own try/catch, so a rejection here
    // would propagate out of supabase.auth.getSession().
    await expect(adapter.getItem(BASE_KEY)).resolves.toBeNull();
  });

  it('resolves null instead of rejecting when a CHUNK read throws', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));
    // The index read succeeds and the failure happens afterwards. REVIEW-019
    // finding 8 recorded that the previous claim-7 test rejected the index read
    // and so returned before any chunk was read at all — a mutant that let a
    // chunk-read rejection escape stayed green.
    fake.failGet = (key) => key !== BASE_KEY;

    await expect(adapter.getItem(BASE_KEY)).resolves.toBeNull();
    expect(fake.log.filter((op) => op.kind === 'get' && op.key === BASE_KEY)).not.toHaveLength(0);
  });

  it('writes the index last, so an interrupted write is never readable', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));

    const writes = fake.ops.filter((op) => op.startsWith('set:'));
    expect(writes[writes.length - 1]).toBe(`set:${BASE_KEY}`);
    expect(writes.slice(0, -1).every((op) => op !== `set:${BASE_KEY}`)).toBe(true);
  });

  it('is unreadable if the write stopped before the index landed', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));
    // Simulate the crash window: chunks on disk, index never written.
    fake.store.delete(BASE_KEY);

    expect(await adapter.getItem(BASE_KEY)).toBeNull();
  });
});

/**
 * ADR-006 and binding ruling 15. The checksum closes both REVIEW-019 finding 5
 * counterexamples — same-length corruption, and an index rewritten to describe
 * a shorter payload — and the last test here records, executably, the thing it
 * does NOT do. It is corruption detection, not tamper resistance.
 */
describe('chunked SecureStore adapter — the recorded checksum', () => {
  it('returns null for corruption that preserves the total length', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));
    const first = liveChunkKey(fake, BASE_KEY, 0);
    const original = fake.store.get(first) as string;
    // Same length, different bytes: invisible to the length oracle, which is
    // why REVIEW-019 finding 5 got a corrupted string back rather than null.
    fake.store.set(first, `Z${original.slice(1)}`);
    expect((fake.store.get(first) as string).length).toBe(original.length);

    expect(await adapter.getItem(BASE_KEY)).toBeNull();
  });

  it('returns null for a self-consistent index that describes a shorter payload', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));
    const live = indexOf(fake, BASE_KEY);
    const chunkZero = fake.store.get(chunkKeyFor(BASE_KEY, live.g, 0)) as string;
    // Exactly the forgery REVIEW-019 reproduced: every field internally
    // consistent, describing chunk 0 alone as the whole payload.
    fake.store.set(
      BASE_KEY,
      JSON.stringify({ __scs: 1, g: live.g, n: 1, len: chunkZero.length, c: live.c }),
    );

    expect(await adapter.getItem(BASE_KEY)).toBeNull();
  });

  it('does NOT detect a forger who recomputes the checksum — this is not tamper resistance', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));
    const live = indexOf(fake, BASE_KEY);
    const chunkZero = fake.store.get(chunkKeyFor(BASE_KEY, live.g, 0)) as string;
    fake.store.set(
      BASE_KEY,
      JSON.stringify({
        __scs: 1,
        g: live.g,
        n: 1,
        len: chunkZero.length,
        c: payloadChecksum(chunkZero),
      }),
    );

    // Recorded as a behaviour, not left as prose, so no later reader mistakes
    // the checksum for an integrity guarantee. ADR-006: an adversary who can
    // write self-consistent values into the Keychain already holds the tokens,
    // and a non-cryptographic checksum they can recompute protects nothing.
    expect(await adapter.getItem(BASE_KEY)).toBe(chunkZero);
  });

  it('is deterministic, and distinguishes same-length payloads', () => {
    expect(payloadChecksum('session')).toBe(payloadChecksum('session'));
    expect(payloadChecksum('session')).not.toBe(payloadChecksum('sessioo'));
    expect(payloadChecksum('')).toBe(payloadChecksum(''));
    // Stays inside the unsigned 32-bit range the index encodes.
    for (const sample of ['', 'a', sessionLikePayload(5000), '🧠'.repeat(100)]) {
      const value = payloadChecksum(sample);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

/**
 * INVARIANT 1 — absence is not failure. REVIEW-019 findings 3 and 4: a refused
 * read was read as "nothing there" and a refused delete as "it is gone", so a
 * failed replacement destroyed a live session and a sign-out reported success
 * with the session intact.
 */
describe('chunked SecureStore adapter — a refusal is never read as a state', () => {
  it('refuses to write, and preserves the live session, when the index read is refused', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);
    const live = sessionLikePayload(5000);
    await adapter.setItem(BASE_KEY, live);

    // Exactly REVIEW-019 finding 4: one transient refusal of the base-index
    // read, then a refused first replacement chunk write. The old version chose
    // generation 0, purged it, failed the write, and left the previous session
    // unreadable.
    fake.failGet = failFirst(1, (key) => key === BASE_KEY);
    fake.failSet = failFirst(1, (key) => key !== BASE_KEY);

    await expect(adapter.setItem(BASE_KEY, sessionLikePayload(3000))).rejects.toThrow(
      /refused to report its current state/,
    );

    fake.failGet = undefined;
    fake.failSet = undefined;
    // The value that was there before the failed write is still there.
    expect(await adapter.getItem(BASE_KEY)).toBe(live);
  });

  it('writes normally when the index is merely absent, which is not a refusal', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    // The asymmetry is the point: refusing to answer blocks the write, an empty
    // store does not. A blanket "any problem rejects" would pass the test above
    // and fail here.
    await expect(adapter.setItem(BASE_KEY, 'first value')).resolves.toBeUndefined();
    expect(await adapter.getItem(BASE_KEY)).toBe('first value');
  });

  it('overwrites an unreadable index without refusing, since nothing readable is lost', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));
    fake.store.set(BASE_KEY, 'not an index at all');

    await expect(adapter.setItem(BASE_KEY, 'replacement')).resolves.toBeUndefined();
    expect(await adapter.getItem(BASE_KEY)).toBe('replacement');
  });

  it('reports failure with the session still readable when every delete is refused', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);
    const live = sessionLikePayload(5000);
    await adapter.setItem(BASE_KEY, live);

    // REVIEW-019 finding 3: every delete refused. The old adapter resolved, and
    // auth-js — which awaits removeItem BEFORE emitting SIGNED_OUT — announced
    // a sign-out while the complete session was still readable.
    fake.failDelete = () => true;

    await expect(adapter.removeItem(BASE_KEY)).rejects.toThrow(/Removal of .* is incomplete/);

    fake.failDelete = undefined;
    // The rejection is the truth: the session really is still there.
    expect(await adapter.getItem(BASE_KEY)).toBe(live);
  });

  it('reports failure when only the index delete is refused', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);
    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));

    // The test above refuses every delete, so both halves of the completeness
    // report fire at once and neither is isolated — a mutation that dropped
    // only the index half survived it. This one refuses the index alone: the
    // sweep comes back clean, so the index is the only thing left to report.
    fake.failDelete = (key) => key === BASE_KEY;

    await expect(adapter.removeItem(BASE_KEY)).rejects.toThrow(/Removal of .* is incomplete/);

    fake.failDelete = undefined;
    expect(keysOf(fake)).toEqual([BASE_KEY]);
  });

  it('reports failure when only a chunk delete is refused, after finishing the sweep', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);
    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));
    const live = indexOf(fake, BASE_KEY);
    const stubborn = chunkKeyFor(BASE_KEY, live.g, 1);

    // The index goes; one chunk refuses. This is the half REVIEW-019 finding 8
    // recorded as never exercised: the old claim-13c test rejected the sweep
    // READ, which stopped the sweep before any delete ran.
    fake.failDelete = (key) => key === stubborn;

    await expect(adapter.removeItem(BASE_KEY)).rejects.toThrow(/Removal of .* is incomplete/);

    // Reporting the failure did not cost the rest of the cleanup: the stranded
    // chunk is the only survivor, and the value is already unreadable.
    expect(keysOf(fake)).toEqual([stubborn]);
    fake.failDelete = undefined;
    expect(await adapter.getItem(BASE_KEY)).toBeNull();
  });

  it('resolves and leaves nothing when the store is healthy', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(9000));
    expect(keysOf(fake).length).toBeGreaterThan(2);

    await expect(adapter.removeItem(BASE_KEY)).resolves.toBeUndefined();
    expect(keysOf(fake)).toEqual([]);
  });
});

/**
 * INVARIANT 2 — operations are serialized. REVIEW-019 findings 1 and 2: a
 * reader holding an old index resumed after the writer's cleanup and got
 * `null`; two writers selected the same spare generation and committed a
 * session made of both payloads.
 *
 * These tests drive real concurrent operations. They never re-enter the adapter
 * from inside a backend call, which is the schedule the queue makes impossible
 * and which the previous battery used for its only concurrency test.
 */
describe('chunked SecureStore adapter — operations do not interleave', () => {
  it('never exposes null to a reader that a writer overtakes', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);
    const before = sessionLikePayload(5000);
    const after = sessionLikePayload(3000);
    await adapter.setItem(BASE_KEY, before);

    // The reader stalls for a full macrotask right after its first chunk read;
    // the writer yields only microtasks. Without serialization that gives the
    // writer time to commit AND purge while the reader is mid-payload, which is
    // REVIEW-019 finding 1 exactly: the reader resumes against an index whose
    // chunks are gone and returns null.
    let stalled = false;
    fake.onOperation = async (op) => {
      if (op.kind === 'get' && op.key !== BASE_KEY && !stalled) {
        stalled = true;
        await macrotask();
        return;
      }
      await microtask();
    };

    const readPromise = adapter.getItem(BASE_KEY);
    const writePromise = adapter.setItem(BASE_KEY, after);
    const [read] = await Promise.all([readPromise, writePromise]);
    fake.onOperation = undefined;

    expect(stalled).toBe(true);
    expect(read).not.toBeNull();
    expect(read === before || read === after).toBe(true);
    expect(await adapter.getItem(BASE_KEY)).toBe(after);
  });

  it('lets no write land between a reader chunk read and the next', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);
    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));
    fake.log.length = 0;

    fake.onOperation = () => microtask();
    await Promise.all([adapter.getItem(BASE_KEY), adapter.setItem(BASE_KEY, 'replacement')]);
    fake.onOperation = undefined;

    // Stated structurally rather than inferred from an outcome. `setItem` and
    // `removeItem` never read a chunk key, so every chunk-key `get` belongs to
    // the reader; a mutating call between the reader's first and last is a
    // writer running inside a read.
    const chunkReads = fake.log
      .map((op, index) => ({ op, index }))
      .filter(({ op }) => op.kind === 'get' && op.key !== BASE_KEY);
    expect(chunkReads.length).toBeGreaterThan(1);

    const first = chunkReads[0].index;
    const last = chunkReads[chunkReads.length - 1].index;
    const interlopers = fake.log.slice(first, last).filter((op) => op.kind !== 'get');
    expect(interlopers).toEqual([]);
  });

  it('does not let two writers commit a payload belonging to neither', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);
    // A live value first, so both writers read the same current index and would
    // both select the same spare generation.
    await adapter.setItem(BASE_KEY, sessionLikePayload(3000));
    fake.log.length = 0;

    // Equal-length, session-shaped, and distinguishable byte by byte.
    const fromA = JSON.stringify({ access_token: 'A'.repeat(5000), expires_at: 1 });
    const fromB = JSON.stringify({ access_token: 'B'.repeat(5000), expires_at: 1 });

    fake.onOperation = () => microtask();
    await Promise.all([adapter.setItem(BASE_KEY, fromA), adapter.setItem(BASE_KEY, fromB)]);
    fake.onOperation = undefined;

    const read = await adapter.getItem(BASE_KEY);
    // REVIEW-019 finding 2 observed a final value that was valid JSON, carried
    // access_token/refresh_token/expires_at, and was neither input — its access
    // token began with one writer's bytes and ended with the other's.
    expect(read === fromA || read === fromB).toBe(true);

    // And structurally: each writer's chunk writes are one unbroken run.
    const letters = fake.log
      .filter((op) => op.kind === 'set' && op.key !== BASE_KEY)
      .map((op) => ((op.value as string).includes('A') ? 'A' : 'B'))
      .join('');
    expect(letters).toMatch(/^(A+B+|B+A+)$/);
  });

  it('keeps running after an operation rejects', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    // A queue built on a promise chain rejects everything behind a failure
    // unless it is written not to. Sign-out failing must not brick the store.
    await expect(
      adapter.setItem(BASE_KEY, 'x'.repeat(MAX_CHUNKS * CHUNK_BUDGET_BYTES + 1)),
    ).rejects.toThrow();
    await expect(adapter.setItem(BASE_KEY, 'still works')).resolves.toBeUndefined();
    expect(await adapter.getItem(BASE_KEY)).toBe('still works');
  });
});

/**
 * INVARIANT 3 — cleanup does not stop at the first gap. REVIEW-019 finding 6:
 * the sweep halted at the first absent key, and the adapter could create that
 * gap itself by swallowing one failed cleanup delete, stranding a later chunk
 * of token material through sign-out.
 */
describe('chunked SecureStore adapter — removal leaves nothing behind', () => {
  it('removes every chunk and the index, leaving no key at all', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(9000));
    expect(keysOf(fake).length).toBeGreaterThan(2);

    await adapter.removeItem(BASE_KEY);

    expect(keysOf(fake)).toEqual([]);
    expect(fake.store.size).toBe(0);
  });

  it('clears a fragment stranded behind a gap the adapter created itself', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(9000));
    const first = indexOf(fake, BASE_KEY);

    // One cleanup delete refuses during the replacement. The old adapter
    // swallowed it, leaving a hole at that position, and its next sweep stopped
    // there — so the later chunk survived sign-out with token material in it.
    const swallowed = chunkKeyFor(BASE_KEY, first.g, 1);
    fake.failDelete = (key) => key === swallowed;
    await adapter.setItem(BASE_KEY, 'short replacement');
    fake.failDelete = undefined;

    // The gap and the stranded chunk both exist at this point.
    expect(fake.store.has(swallowed)).toBe(true);
    expect(fake.store.has(chunkKeyFor(BASE_KEY, first.g, 0))).toBe(false);

    await adapter.removeItem(BASE_KEY);

    expect(keysOf(fake)).toEqual([]);
  });

  it('purges chunks left in either generation', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));
    // A fragment stranded in the other generation by an interrupted earlier
    // write: unreferenced by the live index, and still session material.
    const live = indexOf(fake, BASE_KEY).g;
    const other = GENERATIONS.find((g) => g !== live) as Generation;
    fake.store.set(chunkKeyFor(BASE_KEY, other, 0), 'stranded-token-fragment');

    await adapter.removeItem(BASE_KEY);

    expect(keysOf(fake)).toEqual([]);
  });

  it('sweeps the complete enumerable key space, not just the occupied part', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, 'one chunk only');
    fake.log.length = 0;
    await adapter.removeItem(BASE_KEY);

    // Every chunk key that could exist for this base key is deleted, whether or
    // not anything was there. That is what makes "leaves nothing behind" a
    // property of the algorithm rather than of the store's current contents.
    const deleted = new Set(fake.log.filter((op) => op.kind === 'delete').map((op) => op.key));
    expect(deleted.has(BASE_KEY)).toBe(true);
    for (const generation of GENERATIONS) {
      for (let i = 0; i < MAX_CHUNKS; i += 1) {
        expect(deleted.has(chunkKeyFor(BASE_KEY, generation, i))).toBe(true);
      }
    }
    expect(deleted.size).toBe(GENERATIONS.length * MAX_CHUNKS + 1);
  });

  it('leaves no key behind even when the index was corrupted first', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(9000));
    fake.store.set(BASE_KEY, 'garbage');

    await adapter.removeItem(BASE_KEY);

    expect(keysOf(fake)).toEqual([]);
  });

  it('leaves no key behind when a chunk was deleted before sign-out', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(9000));
    fake.store.delete(liveChunkKey(fake, BASE_KEY, 1));

    await adapter.removeItem(BASE_KEY);

    expect(keysOf(fake)).toEqual([]);
  });

  it('orphans no chunk when a longer value is replaced by a shorter one', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(9000));
    const longKeys = keysOf(fake).length;

    await adapter.setItem(BASE_KEY, 'short');
    expect(keysOf(fake).length).toBeLessThan(longKeys);
    expect(keysOf(fake)).toEqual([BASE_KEY, liveChunkKey(fake, BASE_KEY, 0)].sort());
    expect(await adapter.getItem(BASE_KEY)).toBe('short');

    await adapter.removeItem(BASE_KEY);
    expect(keysOf(fake)).toEqual([]);
  });

  it('touches no other key while removing its own', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);
    const otherKey = `${BASE_KEY}-code-verifier`;

    await adapter.setItem(BASE_KEY, sessionLikePayload(5000));
    await adapter.setItem(otherKey, 'verifier');

    await adapter.removeItem(BASE_KEY);

    // auth-js derives its own sibling keys off the same base; removing the
    // session must not take them with it.
    expect(keysOf(fake)).toEqual([otherKey, liveChunkKey(fake, otherKey, 0)].sort());
    expect(await adapter.getItem(otherKey)).toBe('verifier');
  });
});

describe('chunked SecureStore adapter — key derivation', () => {
  it('derives chunk keys deterministically from the base key and generation', () => {
    expect(chunkKeyFor(BASE_KEY, 0, 0)).toBe(`${BASE_KEY}.0.0`);
    expect(chunkKeyFor(BASE_KEY, 1, 7)).toBe(`${BASE_KEY}.1.7`);
    expect(chunkKeyFor(BASE_KEY, 0, 3)).toBe(chunkKeyFor(BASE_KEY, 0, 3));
    // Only two generations exist, so the full key space for a base key is
    // enumerable without consulting any index.
    expect(GENERATIONS).toEqual([0, 1]);
  });

  it('derives keys SecureStore will accept', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    // The double enforces SecureStore's real key regex, so an illegal derived
    // key would throw here rather than at runtime on a device.
    await adapter.setItem(BASE_KEY, sessionLikePayload(9000));

    for (const key of keysOf(fake)) {
      expect(key).toMatch(SECURE_STORE_KEY_PATTERN);
    }
  });

  it('cannot collide with the sibling keys auth-js derives', () => {
    // auth-js's own derived keys avoid dots by design; this adapter's chunk
    // namespace is exactly the dot suffix.
    for (const suffix of ['-code-verifier', '-flows-code-verifier', '-user']) {
      expect(`${BASE_KEY}${suffix}`).not.toBe(chunkKeyFor(BASE_KEY, 0, 0));
      expect(`${BASE_KEY}${suffix}`.includes('.')).toBe(false);
    }
  });
});

describe('chunked SecureStore adapter — generation alternation', () => {
  it('leaves only one generation behind after a replacement', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(9000));
    await adapter.setItem(BASE_KEY, sessionLikePayload(9000));

    const live = indexOf(fake, BASE_KEY);
    const stale = GENERATIONS.filter((g) => g !== live.g);
    for (const generation of stale) {
      for (let i = 0; i < 8; i += 1) {
        expect(fake.store.has(chunkKeyFor(BASE_KEY, generation, i))).toBe(false);
      }
    }
    expect(chunkKeysOf(fake, BASE_KEY)).toHaveLength(live.n);
  });

  it('alternates generations so a write never touches the one being read', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, 'first');
    const one = indexOf(fake, BASE_KEY).g;
    await adapter.setItem(BASE_KEY, 'second');
    const two = indexOf(fake, BASE_KEY).g;

    expect(two).not.toBe(one);
  });
});
