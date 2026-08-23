import {
  CHUNK_BUDGET_BYTES,
  GENERATIONS,
  chunkKeyFor,
  createChunkedSecureStore,
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
 */

/** SecureStore's own key rule: `/^[\w.-]+$/`, applied before any native call. */
const SECURE_STORE_KEY_PATTERN = /^[\w.-]+$/;

type FakeSecureStore = {
  readonly backend: SecureStoreBackend;
  readonly store: Map<string, string>;
  /** Every backend call in order, so write ordering can be asserted. */
  readonly ops: string[];
  /**
   * Runs after each backend call. This is how a concurrent reader is
   * interleaved into a write at every point a real one could land — the adapter
   * yields at each `await`, and this fires exactly there.
   */
  onOperation?: () => Promise<void>;
};

function createFakeSecureStore(): FakeSecureStore {
  const store = new Map<string, string>();
  const ops: string[] = [];

  function assertValidKey(key: string): void {
    if (!SECURE_STORE_KEY_PATTERN.test(key)) {
      throw new Error(
        'Invalid key provided to SecureStore. Keys must not be empty and ' +
          'contain only alphanumeric characters, ".", "-", and "_".',
      );
    }
  }

  const fake: FakeSecureStore = { backend: undefined as never, store, ops };

  const backend: SecureStoreBackend = {
    async getItemAsync(key) {
      assertValidKey(key);
      ops.push(`get:${key}`);
      const value = store.has(key) ? (store.get(key) as string) : null;
      await fake.onOperation?.();
      return value;
    },
    async setItemAsync(key, value) {
      assertValidKey(key);
      if (typeof value !== 'string') {
        throw new Error('Invalid value provided to SecureStore. Values must be strings;');
      }
      ops.push(`set:${key}`);
      store.set(key, value);
      await fake.onOperation?.();
    },
    async deleteItemAsync(key) {
      assertValidKey(key);
      ops.push(`delete:${key}`);
      store.delete(key);
      await fake.onOperation?.();
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
function indexOf(fake: FakeSecureStore, key: string): { g: Generation; n: number; len: number } {
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
    const payload = sessionLikePayload(5000);

    await adapter.setItem(BASE_KEY, payload);

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
    const payload = sessionLikePayload(5000);

    await adapter.setItem(BASE_KEY, payload);
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

  it('resolves null instead of rejecting when the backend throws', async () => {
    const failing: SecureStoreBackend = {
      getItemAsync: () => Promise.reject(new Error('keychain unavailable')),
      setItemAsync: () => Promise.resolve(),
      deleteItemAsync: () => Promise.resolve(),
    };
    const adapter = createChunkedSecureStore(failing);

    // auth-js awaits getItem outside its own try/catch, so a rejection here
    // would propagate out of supabase.auth.getSession().
    await expect(adapter.getItem(BASE_KEY)).resolves.toBeNull();
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

describe('chunked SecureStore adapter — leaves nothing behind', () => {
  it('removes every chunk and the index, leaving no key at all', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);

    await adapter.setItem(BASE_KEY, sessionLikePayload(9000));
    expect(keysOf(fake).length).toBeGreaterThan(2);

    await adapter.removeItem(BASE_KEY);

    expect(keysOf(fake)).toEqual([]);
    expect(fake.store.size).toBe(0);
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

describe('chunked SecureStore adapter — a reader never sees a gap', () => {
  it('exposes the old value or the new one at every point of a replacement, never null', async () => {
    const fake = createFakeSecureStore();
    const adapter = createChunkedSecureStore(fake.backend);
    const before = sessionLikePayload(5000);
    const after = sessionLikePayload(3000);

    await adapter.setItem(BASE_KEY, before);

    const observed: (string | null)[] = [];
    let reentrant = false;
    fake.onOperation = async () => {
      // The observer's own reads would otherwise re-enter this hook.
      if (reentrant) return;
      reentrant = true;
      observed.push(await adapter.getItem(BASE_KEY));
      reentrant = false;
    };

    await adapter.setItem(BASE_KEY, after);
    fake.onOperation = undefined;

    // The write must actually have yielded several times, or this proves little.
    expect(observed.length).toBeGreaterThan(3);
    // This is the property a single-key store gets for free and chunking does
    // not: a concurrent getSession() must never read the session as absent.
    expect(observed).not.toContain(null);
    for (const value of observed) {
      expect(value === before || value === after).toBe(true);
    }
    expect(await adapter.getItem(BASE_KEY)).toBe(after);
  });

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

describe('chunked SecureStore adapter — teardown cannot reject', () => {
  /** A backend whose reads and deletes fail the way a locked keychain does. */
  function hostileBackend(): SecureStoreBackend {
    return {
      getItemAsync: () => Promise.reject(new Error('errSecInteractionNotAllowed')),
      setItemAsync: () => Promise.resolve(),
      deleteItemAsync: () => Promise.reject(new Error('errSecInteractionNotAllowed')),
    };
  }

  it('resolves removeItem instead of rejecting when the backend fails', async () => {
    const adapter = createChunkedSecureStore(hostileBackend());

    // auth-js awaits removeItem inside _removeSession BEFORE it emits
    // SIGNED_OUT, so a rejection here would strand the sign-out entirely.
    await expect(adapter.removeItem(BASE_KEY)).resolves.toBeUndefined();
  });

  it('still writes a value when only the cleanup reads and deletes fail', async () => {
    const written = new Map<string, string>();
    const adapter = createChunkedSecureStore({
      getItemAsync: () => Promise.reject(new Error('unreadable')),
      setItemAsync: async (key, value) => {
        written.set(key, value);
      },
      deleteItemAsync: () => Promise.reject(new Error('undeletable')),
    });

    await expect(adapter.setItem(BASE_KEY, 'payload')).resolves.toBeUndefined();
    expect(written.has(BASE_KEY)).toBe(true);
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
});
