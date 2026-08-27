/**
 * The wiring itself, which REVIEW-019 finding 8 recorded as unmeasured: claim
 * 13 said "the platform storage reaches the Supabase client" while its tests
 * inspected only the exported platform value, so deleting
 * `storage: authSessionStorage` from `src/lib/supabase.ts` left every gate
 * green. These assertions are on the options object the client is actually
 * constructed with.
 *
 * `createClient` is replaced rather than called for real: constructing a live
 * client is not this claim, and the module under test throws by design when the
 * publishable env vars are unset. Those are set to obvious placeholders here so
 * the test does not depend on a machine-local `.env` — a test that passes only
 * on a developer's laptop is not evidence.
 */

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'sb_publishable_placeholder_not_a_real_key';

type AuthOptions = {
  persistSession?: unknown;
  storage?: unknown;
  storageKey?: unknown;
  autoRefreshToken?: unknown;
  detectSessionInUrl?: unknown;
};

function loadClientModule(): { authOptions: AuthOptions; expectedStorage: unknown } {
  jest.resetModules();

  const createClient = jest.fn(() => ({ auth: {} }));
  jest.doMock('@supabase/supabase-js', () => ({ createClient }));

  process.env.EXPO_PUBLIC_SUPABASE_URL = PLACEHOLDER_URL;
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = PLACEHOLDER_KEY;

  // `require`, not `import`: the module decides at import time, and the mock
  // plus the env above have to be in place first. An ESM import is hoisted
  // above both.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/lib/supabase');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { authSessionStorage } = require('@/lib/auth/session-storage');

  expect(createClient).toHaveBeenCalledTimes(1);
  const [url, key, options] = createClient.mock.calls[0] as unknown as [
    string,
    string,
    { auth: AuthOptions },
  ];
  expect(url).toBe(PLACEHOLDER_URL);
  expect(key).toBe(PLACEHOLDER_KEY);

  return { authOptions: options.auth, expectedStorage: authSessionStorage };
}

const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const originalKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
  jest.dontMock('@supabase/supabase-js');
  jest.resetModules();
  process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
});

describe('supabase client — session storage is actually wired in', () => {
  it('passes the platform session storage to createClient', () => {
    const { authOptions, expectedStorage } = loadClientModule();

    // Presence first, identity second. Identity alone would pass vacuously on
    // web, where the correct value is `undefined` and a deleted option is also
    // `undefined`; the own-property check is what distinguishes them.
    expect(Object.prototype.hasOwnProperty.call(authOptions, 'storage')).toBe(true);
    expect(authOptions.storage).toBe(expectedStorage);
  });

  it('gives that storage a complete adapter surface when the platform has one', () => {
    const { authOptions } = loadClientModule();

    // On native this is the chunked adapter; on web `session-storage.ts`
    // deliberately yields `undefined` so `supabase-js` uses its own
    // `localStorage` default. Both are asserted rather than assumed.
    if (authOptions.storage === undefined) return;
    const storage = authOptions.storage as Record<string, unknown>;
    expect(typeof storage.getItem).toBe('function');
    expect(typeof storage.setItem).toBe('function');
    expect(typeof storage.removeItem).toBe('function');
  });

  it('keeps persistence on, without which the storage option is ignored', () => {
    const { authOptions } = loadClientModule();

    // `supabase-js` consults `storage` only inside its `persistSession` branch,
    // so persistence off would silently replace the adapter with an in-memory
    // store while every storage test still passed.
    expect(authOptions.persistSession).toBe(true);
  });

  it('never lets the client self-schedule a refresh', () => {
    const { authOptions } = loadClientModule();

    // ADR-009 / binding ruling 20 carries this forward from the superseded
    // ADR-007: `autoRefreshToken: false` eliminates the recurring ticker, and
    // REVIEW-022's probe confirmed that elimination against the real pinned
    // client (zero interval starts, zero scheduled fetches).
    //
    // What this option does NOT do — and what no assertion here claims — is
    // gate refresh entrances. ADR-009 records that pinned supabase-js can
    // refresh from construction, from session loading, and from `signOut()`,
    // with no `autoRefreshToken` check on those paths. Those are recorded
    // library behaviour; the containment is the persistence guarantee, not
    // this flag.
    expect(authOptions.autoRefreshToken).toBe(false);
  });

  it('persists under the app-constant storage key, not the derived default', () => {
    const { authOptions } = loadClientModule();

    // ADR-009 requirement 1: the session layer proves a purge by reading the
    // session's key space back, so the key must be an app constant it can
    // name. Left unset, the client derives the key from the project URL
    // inside its own constructor — a formula this app would otherwise have to
    // re-derive from library internals (learning 20) to know what to verify.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AUTH_SESSION_STORAGE_KEY } = require('@/lib/auth/session-storage');
    expect(authOptions.storageKey).toBe(AUTH_SESSION_STORAGE_KEY);
    expect(typeof authOptions.storageKey).toBe('string');
    expect((authOptions.storageKey as string).length).toBeGreaterThan(0);
  });

  it('does not parse a session out of the URL', () => {
    const { authOptions } = loadClientModule();

    // Both flows that would put one there — magic links and OAuth redirects —
    // need `expo.scheme`, frozen by ruling 8, and are out of scope for v1.
    expect(authOptions.detectSessionInUrl).toBe(false);
  });
});
