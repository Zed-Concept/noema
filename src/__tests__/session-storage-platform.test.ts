/**
 * The platform split, exercised on both branches.
 *
 * `session-storage.ts` decides at module scope, so each case re-imports the
 * module under a different mocked `Platform`. `jest.doMock` is used rather than
 * `jest.mock` precisely because it is NOT hoisted — the mock has to be in place
 * between the reset and the import.
 */

const PLATFORM_MODULE = 'react-native/Libraries/Utilities/Platform';

function storageForPlatform(os: string): unknown {
  jest.resetModules();
  // The deep path is mockable because React Native's jest resolver strips
  // `exports` from its package.json; the `__esModule`/`default` shape is
  // required because Platform.ios.js is an ESM default export.
  jest.doMock(PLATFORM_MODULE, () => ({
    __esModule: true,
    default: { OS: os, select: (spec: Record<string, unknown>) => spec[os] ?? spec.default },
  }));
  // `require`, not `import()`: this jest runs CommonJS, where a dynamic import
  // needs --experimental-vm-modules. The re-require after resetModules is the
  // whole point — the module decides at import time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/lib/auth/session-storage').authSessionStorage;
}

afterEach(() => {
  jest.dontMock(PLATFORM_MODULE);
  jest.resetModules();
});

describe('session storage — platform split', () => {
  it('gives web no adapter, so supabase-js falls back to localStorage', () => {
    // `supabase-js` reads this as `if (settings.storage) {...} else {localStorage}`,
    // so undefined is what selects its own web default. expo-secure-store has no
    // web implementation beyond an empty stub, and calling it there is a TypeError.
    expect(storageForPlatform('web')).toBeUndefined();
  });

  it('gives iOS the chunked SecureStore adapter', () => {
    const storage = storageForPlatform('ios') as Record<string, unknown>;

    expect(storage).toBeDefined();
    expect(typeof storage.getItem).toBe('function');
    expect(typeof storage.setItem).toBe('function');
    expect(typeof storage.removeItem).toBe('function');
  });

  it('gives Android the chunked SecureStore adapter', () => {
    const storage = storageForPlatform('android') as Record<string, unknown>;

    expect(storage).toBeDefined();
    expect(typeof storage.getItem).toBe('function');
  });
});
