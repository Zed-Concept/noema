/**
 * ADR-005's third clause: SecureStore keeps `WHEN_UNLOCKED`.
 *
 * It is already `expo-secure-store`'s default, so this measures a decision
 * rather than a behaviour change — which is exactly why it needs an instrument.
 * An accessibility class that is merely inherited is one line away from being
 * changed by someone who does not know that ADR-005 considered
 * `AFTER_FIRST_UNLOCK` and rejected it for weakening at-rest protection. Stated
 * in code and asserted here, that becomes a failing test rather than a silent
 * regression.
 *
 * This is the only test in the battery that exercises the DEFAULT backend. Every
 * other adapter test injects a double, which by construction cannot see what the
 * real `expo-secure-store` calls would carry.
 */

import * as SecureStoreModule from 'expo-secure-store';

import { createChunkedSecureStore } from '@/lib/auth/secure-store-adapter';

// Written below the imports for `import/first`, and hoisted above them by
// babel-plugin-jest-hoist before either module is resolved — so the binding
// above is the double, not the real package. If that hoisting ever stopped,
// `SecureStore.setItemAsync.mock` would be undefined and both tests would fail
// loudly rather than silently measuring the real module.
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED: 'when-unlocked-sentinel',
  AFTER_FIRST_UNLOCK: 'after-first-unlock-sentinel',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const SecureStore = SecureStoreModule as unknown as {
  WHEN_UNLOCKED: string;
  AFTER_FIRST_UNLOCK: string;
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};

const BASE_KEY = 'sb-abcdefghijklmnopqrst-auth-token';

beforeEach(() => {
  jest.clearAllMocks();
  SecureStore.getItemAsync.mockResolvedValue(null);
  SecureStore.setItemAsync.mockResolvedValue(undefined);
  SecureStore.deleteItemAsync.mockResolvedValue(undefined);
});

describe('the default backend — keychain accessibility', () => {
  it('writes every key as WHEN_UNLOCKED, never a weaker class', async () => {
    // No backend argument: this is the adapter as the app actually builds it.
    const adapter = createChunkedSecureStore();

    await adapter.setItem(BASE_KEY, 'a'.repeat(4000));

    expect(SecureStore.setItemAsync).toHaveBeenCalled();
    for (const call of SecureStore.setItemAsync.mock.calls) {
      const [, , options] = call as [string, string, { keychainAccessible?: unknown }];
      expect(options).toEqual({ keychainAccessible: SecureStore.WHEN_UNLOCKED });
      expect(options.keychainAccessible).not.toBe(SecureStore.AFTER_FIRST_UNLOCK);
    }
  });

  it('carries the class on chunk keys as well as the index', async () => {
    const adapter = createChunkedSecureStore();

    // Long enough to chunk: an accessibility class applied to the index alone
    // would leave the token material itself readable while locked.
    await adapter.setItem(BASE_KEY, 'b'.repeat(6000));

    const chunkWrites = SecureStore.setItemAsync.mock.calls.filter(
      ([key]) => (key as string) !== BASE_KEY,
    );
    expect(chunkWrites.length).toBeGreaterThan(1);
    for (const [, , options] of chunkWrites) {
      expect(options).toEqual({ keychainAccessible: SecureStore.WHEN_UNLOCKED });
    }
  });
});
