import { refreshWhileForeground } from '@/lib/auth/foreground-refresh';
import type { AppStateStatus } from 'react-native';
import {
  clearSessionPersistenceFailure,
  clearSessionPurgeFailure,
  observingWrites,
  peekSessionPersistenceFailure,
  peekSessionPurgeFailure,
  takeSessionPersistenceFailure,
  takeSessionPurgeFailure,
} from '@/lib/auth/session-storage';
import { createChunkedSecureStore, type SecureStoreBackend } from '@/lib/auth/secure-store-adapter';

/**
 * ADR-007 / binding ruling 17, tested at the module the decision lives in.
 *
 * REVIEW-020 finding 1 said of the previous lifecycle evidence: the provider
 * tests "replace the whole auth client with method spies ... they prove only
 * that `startAutoRefresh` or `stopAutoRefresh` was called; they cannot observe
 * initialization, recovery refresh, ticker restart, cancellation, or a
 * post-stop storage write."
 *
 * These tests are built the opposite way. Nothing below is a spy standing in
 * for storage: the REAL chunked adapter runs over an in-memory keychain double,
 * wrapped in the REAL `observingWrites` observer, and the persistence failure
 * is produced by actually refusing a write. What is asserted is the decision
 * the gate reached and the state the store was left in, not that a method was
 * called.
 *
 * The one stand-in is `settleSession`, which plays auth-js's `_saveSession`.
 * That is faithful to the pinned library rather than invented: `_saveSession`
 * persists through `setItemAsync(this.storage, this.storageKey, data)`
 * (`GoTrueClient.js`), and that helper is exactly
 * `await storage.setItem(key, JSON.stringify(data))`
 * (`lib/helpers.js:132-134`).
 *
 * NOT COVERED HERE, and not claimed anywhere: a real device, a real keychain,
 * and a locked screen. ADR-007 classifies locked-device behaviour NOT RUN and
 * NOT CLAIMED in Phase A and carries a named physical-device test into Phase B.
 */

const SESSION_KEY = 'sb-noema-auth-token';

/** A session-shaped payload. Opaque to everything under test. */
function sessionJson(refreshToken: string): string {
  return JSON.stringify({
    access_token: 'opaque-access',
    refresh_token: refreshToken,
    expires_at: 4102444800,
    user: { id: 'user-1', email: 'someone@example.test' },
  });
}

type Harness = {
  readonly storage: ReturnType<typeof observingWrites>;
  readonly store: Map<string, string>;
  /** Refuse every write whose key starts with this base. Default: never. */
  refuseWrites: boolean;
};

function createHarness(): Harness {
  const store = new Map<string, string>();
  const harness: Partial<Harness> & { refuseWrites: boolean } = { refuseWrites: false };

  const backend: SecureStoreBackend = {
    getItemAsync: async (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItemAsync: async (key, value) => {
      // The shape a locked keychain actually produces: the write is refused,
      // and nothing about the refusal says how much of the value landed.
      if (harness.refuseWrites) throw new Error('errSecInteractionNotAllowed');
      store.set(key, value);
    },
    deleteItemAsync: async (key) => {
      store.delete(key);
    },
  };

  return Object.assign(harness, {
    storage: observingWrites(createChunkedSecureStore(backend)),
    store,
  }) as Harness;
}

beforeEach(() => {
  // The observer is module scope, like the adapter singleton it wraps. Cleared
  // between cases so no test inherits another's flag.
  clearSessionPersistenceFailure();
});

describe('ADR-007 — the foreground gate initiates nothing while backgrounded', () => {
  const NOT_FOREGROUND: AppStateStatus[] = ['background', 'inactive'];

  it.each(NOT_FOREGROUND)('initiates no refresh in AppState "%s"', async (status) => {
    let settleCalls = 0;

    const outcome = await refreshWhileForeground(status, {
      settleSession: async () => {
        settleCalls += 1;
      },
      takePersistenceFailure: takeSessionPersistenceFailure,
    });

    expect(outcome).toBe('not-foreground');
    // The gate is what is being measured: the call never happened at all. Under
    // ADR-007 there is no ticker to stop, so "did not initiate" is the entire
    // backgrounded behaviour.
    expect(settleCalls).toBe(0);
  });

  it('initiates exactly one settle when the app is active', async () => {
    let settleCalls = 0;

    const outcome = await refreshWhileForeground('active', {
      settleSession: async () => {
        settleCalls += 1;
      },
      takePersistenceFailure: takeSessionPersistenceFailure,
    });

    expect(outcome).toBe('settled');
    expect(settleCalls).toBe(1);
  });
});

// ADR-008: the surfacing guarantee is NATIVE-ONLY, and this block's name says so
// rather than leaving the platform to be inferred. The observer wraps the
// SecureStore-backed adapter handed to the client on native; on web, storage is
// `localStorage` through the supabase-js default, which never reaches the
// adapter, so no flag is set and nothing here is claimed about it. A web
// observer is a named backlog unit, deliberately not built in this cycle.
describe('ADR-007 item 3 / ADR-008 — on NATIVE, a rotated session that cannot be stored is surfaced', () => {
  it('reports "unpersisted" when the store refuses the rotated write', async () => {
    const harness = createHarness();
    // A session is already stored, as it would be for a signed-in user.
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v1'));
    expect(peekSessionPersistenceFailure()).toBeNull();

    // The server rotates the refresh token, and the keychain refuses the write.
    harness.refuseWrites = true;

    const outcome = await refreshWhileForeground('active', {
      settleSession: () => harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v2')),
      takePersistenceFailure: takeSessionPersistenceFailure,
    });

    expect(outcome).toBe('unpersisted');

    // The security-relevant half, asserted on the store rather than inferred
    // from the outcome: what survived is the SUPERSEDED token. This is the
    // state ADR-007 exists to stop the app from continuing against — the
    // server has moved on to refresh-v2 and the disk still says refresh-v1.
    const survived = await harness.storage.getItem(SESSION_KEY);
    expect(survived).toBe(sessionJson('refresh-v1'));
    expect(survived).not.toContain('refresh-v2');
  });

  it('reports "settled" when the rotated write lands', async () => {
    const harness = createHarness();
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v1'));

    const outcome = await refreshWhileForeground('active', {
      settleSession: () => harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v2')),
      takePersistenceFailure: takeSessionPersistenceFailure,
    });

    expect(outcome).toBe('settled');
    expect(await harness.storage.getItem(SESSION_KEY)).toBe(sessionJson('refresh-v2'));
  });

  it('does not demand re-authentication when a settle fails for any other reason', async () => {
    // The distinction the flag exists to draw. A dead network and an unreadable
    // store both reject, and neither means a rotated token was lost. Signing
    // the user out on those would be its own defect.
    const outcome = await refreshWhileForeground('active', {
      settleSession: async () => {
        throw new Error('network request failed');
      },
      takePersistenceFailure: takeSessionPersistenceFailure,
    });

    expect(outcome).toBe('settled');
  });

  it('consumes the failure, so one refused write forces re-authentication once', async () => {
    const harness = createHarness();
    harness.refuseWrites = true;
    await expect(harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v2'))).rejects.toThrow();

    const deps = {
      settleSession: async () => {},
      takePersistenceFailure: takeSessionPersistenceFailure,
    };

    expect(await refreshWhileForeground('active', deps)).toBe('unpersisted');
    // Read-and-clear. Without this the provider would sign the user out again
    // on every subsequent foreground, including after a successful sign-in.
    expect(await refreshWhileForeground('active', deps)).toBe('settled');
  });

  it('keeps a refused write outstanding when a later write succeeds', async () => {
    // REVIEW-021 finding 2, exactly. This schedule USED to return `settled`,
    // and the predecessor test asserted that it should: the observer cleared
    // the flag on any later successful write, so a refused rotation of v2
    // followed by a successful write of v3 erased the refusal before the
    // foreground consumer ever read it. The reviewer ran this schedule against
    // the real client and the earlier refused rotation "was never surfaced as
    // claimed".
    //
    // A later write succeeding does not un-lose the token the earlier one
    // dropped, so the flag is now STICKY UNTIL TAKEN.
    const harness = createHarness();
    harness.refuseWrites = true;
    await expect(harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v2'))).rejects.toThrow();
    expect(peekSessionPersistenceFailure()).not.toBeNull();

    harness.refuseWrites = false;
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v3'));

    // Still outstanding, because nothing has consumed it.
    expect(peekSessionPersistenceFailure()).not.toBeNull();
    expect(
      await refreshWhileForeground('active', {
        settleSession: async () => {},
        takePersistenceFailure: takeSessionPersistenceFailure,
      }),
    ).toBe('unpersisted');
  });

  it('surfaces a refused write exactly once, so re-authentication cannot loop', async () => {
    // The other half of sticky-until-taken, and the reason it does not turn
    // into a permanent signed-out loop: the CONSUMER clears it. One refused
    // write forces re-authentication once, and the sign-in that follows —
    // whose own write succeeds — is unaffected.
    const harness = createHarness();
    harness.refuseWrites = true;
    await expect(harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v2'))).rejects.toThrow();

    const deps = {
      settleSession: async () => {},
      takePersistenceFailure: takeSessionPersistenceFailure,
    };
    expect(await refreshWhileForeground('active', deps)).toBe('unpersisted');

    harness.refuseWrites = false;
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v4'));
    expect(await refreshWhileForeground('active', deps)).toBe('settled');
  });

  it('observes without absorbing: the caller still sees the rejection', async () => {
    const harness = createHarness();
    harness.refuseWrites = true;

    await expect(harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v2'))).rejects.toThrow(
      'errSecInteractionNotAllowed',
    );
    expect(peekSessionPersistenceFailure()).toMatchObject({ key: SESSION_KEY });
  });

  it('does not record a refused REMOVAL as a persistence failure', async () => {
    // Bounded to the claim it supports, per learning 12. A refused removal is a
    // failed sign-out, which the adapter already surfaces by rejecting and the
    // provider already turns into an error shown to the user. It is not a lost
    // rotated token, and widening the flag to cover it would overstate what
    // this instrument measures.
    const store = new Map<string, string>();
    const backend: SecureStoreBackend = {
      getItemAsync: async (key) => (store.has(key) ? (store.get(key) as string) : null),
      setItemAsync: async (key, value) => {
        store.set(key, value);
      },
      deleteItemAsync: async () => {
        throw new Error('errSecInteractionNotAllowed');
      },
    };
    const storage = observingWrites(createChunkedSecureStore(backend));
    await storage.setItem(SESSION_KEY, sessionJson('refresh-v1'));

    await expect(storage.removeItem(SESSION_KEY)).rejects.toThrow(/Removal of/);
    expect(peekSessionPersistenceFailure()).toBeNull();
    // It IS recorded, separately, as a purge failure — see the block below.
    expect(peekSessionPurgeFailure()).toMatchObject({ key: SESSION_KEY });
  });
});

/**
 * REVIEW-021 finding 2 — durable re-authentication.
 *
 * The finding was not that detection fails. The advisory confirmed detection is
 * sound because the observer sits at the WRITE rather than at the initiator. It
 * was that what happens AFTER detection does not guarantee the superseded
 * session stops existing: `signOut()` can reject before cleanup runs and leave
 * the old session readable on the next cold start.
 *
 * These tests cover the fact the provider needs in order to keep the demand
 * alive: did the STORE remove it? That is a different question from whether
 * `signOut()` rejected, and it is the one that decides whether a residual
 * exists.
 */
describe('the purge observer — did the store actually remove it', () => {
  beforeEach(() => {
    clearSessionPersistenceFailure();
    clearSessionPurgeFailure();
  });

  function refusingRemovalStore() {
    const store = new Map<string, string>();
    const backend: SecureStoreBackend = {
      getItemAsync: async (key) => (store.has(key) ? (store.get(key) as string) : null),
      setItemAsync: async (key, value) => {
        store.set(key, value);
      },
      deleteItemAsync: async () => {
        throw new Error('errSecInteractionNotAllowed');
      },
    };
    return { store, storage: observingWrites(createChunkedSecureStore(backend)) };
  }

  it('records a refused removal, and rethrows rather than absorbing it', async () => {
    const { storage } = refusingRemovalStore();
    await storage.setItem(SESSION_KEY, sessionJson('refresh-v1'));

    await expect(storage.removeItem(SESSION_KEY)).rejects.toThrow(/Removal of/);

    // The residual is real and this is what proves it: the superseded session
    // is still readable after the removal was refused.
    expect(await storage.getItem(SESSION_KEY)).toBe(sessionJson('refresh-v1'));
    expect(peekSessionPurgeFailure()).toMatchObject({ key: SESSION_KEY });
  });

  it('reports the residual gone once a retried removal is accepted', async () => {
    // The durability property, as a schedule: refused first, accepted second.
    // The provider retries on each later foreground evaluation, and this is the
    // transition it is waiting for.
    const store = new Map<string, string>();
    let refuseRemoval = true;
    const backend: SecureStoreBackend = {
      getItemAsync: async (key) => (store.has(key) ? (store.get(key) as string) : null),
      setItemAsync: async (key, value) => {
        store.set(key, value);
      },
      deleteItemAsync: async (key) => {
        if (refuseRemoval) throw new Error('errSecInteractionNotAllowed');
        store.delete(key);
      },
    };
    const storage = observingWrites(createChunkedSecureStore(backend));
    await storage.setItem(SESSION_KEY, sessionJson('refresh-v1'));

    await expect(storage.removeItem(SESSION_KEY)).rejects.toThrow();
    expect(takeSessionPurgeFailure()).not.toBeNull();

    refuseRemoval = false;
    await storage.removeItem(SESSION_KEY);

    expect(peekSessionPurgeFailure()).toBeNull();
    expect(await storage.getItem(SESSION_KEY)).toBeNull();
  });

  it('does not record a successful removal', async () => {
    const harness = createHarness();
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v1'));
    await harness.storage.removeItem(SESSION_KEY);

    expect(peekSessionPurgeFailure()).toBeNull();
  });
});
