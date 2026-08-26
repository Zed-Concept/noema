import { refreshWhileForeground } from '@/lib/auth/foreground-refresh';
import type { AppStateStatus } from 'react-native';
import type { DemandStoreBackend } from '@/lib/auth/reauth-demand';
import { createReauthDemand } from '@/lib/auth/reauth-demand';
import {
  AUTH_SESSION_STORAGE_KEY,
  clearSessionPersistenceFailure,
  observingWrites,
  peekSessionPersistenceFailure,
  takeSessionPersistenceFailure,
} from '@/lib/auth/session-storage';
import { createChunkedSecureStore, type SecureStoreBackend } from '@/lib/auth/secure-store-adapter';

/**
 * ADR-009's persistence guarantee, tested at the modules the decisions live in.
 *
 * REVIEW-020 finding 1 said of the previous lifecycle evidence: the provider
 * tests "replace the whole auth client with method spies ... they prove only
 * that `startAutoRefresh` or `stopAutoRefresh` was called."
 *
 * These tests are built the opposite way. Nothing below is a spy standing in
 * for storage: the REAL chunked adapter runs over an in-memory keychain double,
 * wrapped in the REAL `observingWrites` observer over the REAL demand module
 * with an in-memory demand backend, and every refusal is produced by actually
 * refusing an operation. What is asserted is the decision each layer reached
 * and the state both stores were left in.
 *
 * The one stand-in is `settleSession`, which plays auth-js's `_saveSession`.
 * That is faithful to the pinned library rather than invented: `_saveSession`
 * persists through `setItemAsync(this.storage, this.storageKey, data)`
 * (`GoTrueClient.js`), and that helper is exactly
 * `await storage.setItem(key, JSON.stringify(data))`
 * (`lib/helpers.js:132-134`). The full pinned-client composition — real
 * `createClient`, injected refusing storage, fake fetch — is the finding-3
 * probe in `docs/05-quality/evidence/006a-session-durability/`, not here.
 *
 * NOT COVERED HERE, and not claimed anywhere: a real device, a real keychain,
 * a real app-sandbox file, and a locked screen. ADR-009 keeps locked-device
 * behaviour NOT RUN and NOT CLAIMED in Phase A and carries a named
 * physical-device test into Phase B.
 */

/** The key the client persists the session under — the R3 branch keys off it. */
const SESSION_KEY = AUTH_SESSION_STORAGE_KEY;

/** A session-shaped payload. Opaque to everything under test. */
function sessionJson(refreshToken: string): string {
  return JSON.stringify({
    access_token: 'opaque-access',
    refresh_token: refreshToken,
    expires_at: 4102444800,
    user: { id: 'user-1', email: 'someone@example.test' },
  });
}

function memoryDemandBackend(): DemandStoreBackend & {
  content: string | null;
  refuseWrites: boolean;
  writeLog: string[];
} {
  const backend = {
    content: null as string | null,
    refuseWrites: false,
    writeLog: [] as string[],
    read: async () => backend.content,
    write: async (value: string) => {
      if (backend.refuseWrites) throw new Error('demand store refused');
      backend.writeLog.push(value);
      backend.content = value;
    },
    remove: async () => {
      backend.content = null;
    },
  };
  return backend;
}

type Harness = {
  readonly storage: ReturnType<typeof observingWrites>;
  readonly store: Map<string, string>;
  readonly demandBackend: ReturnType<typeof memoryDemandBackend>;
  /** Refuse every keychain write. Default: never. */
  refuseWrites: boolean;
  /** Refuse every keychain delete. Default: never. */
  refuseDeletes: boolean;
  /** Order-sensitive log of keychain refusals and demand writes. */
  readonly events: string[];
};

function createHarness(): Harness {
  const store = new Map<string, string>();
  const events: string[] = [];
  const demandBackend = memoryDemandBackend();
  const originalWrite = demandBackend.write;
  demandBackend.write = async (value) => {
    await originalWrite(value);
    events.push('demand-recorded');
  };

  const harness: Partial<Harness> & { refuseWrites: boolean; refuseDeletes: boolean } = {
    refuseWrites: false,
    refuseDeletes: false,
  };

  const backend: SecureStoreBackend = {
    getItemAsync: async (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItemAsync: async (key, value) => {
      // The shape a locked keychain actually produces: the write is refused,
      // and nothing about the refusal says how much of the value landed.
      if (harness.refuseWrites) {
        events.push('keychain-refused-write');
        throw new Error('errSecInteractionNotAllowed');
      }
      store.set(key, value);
    },
    deleteItemAsync: async (key) => {
      if (harness.refuseDeletes) throw new Error('errSecInteractionNotAllowed');
      store.delete(key);
    },
  };

  return Object.assign(harness, {
    storage: observingWrites(createChunkedSecureStore(backend), createReauthDemand(demandBackend)),
    store,
    demandBackend,
    events,
  }) as Harness;
}

beforeEach(() => {
  // The observer is module scope, like the adapter singleton it wraps. Cleared
  // between cases so no test inherits another's flag.
  clearSessionPersistenceFailure();
});

describe('the foreground gate initiates nothing while backgrounded', () => {
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
    // The gate is what is being measured: the call never happened at all.
    // There is no ticker to stop, because `autoRefreshToken: false` means one
    // was never started.
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
// adapter, so no flag is set and nothing here is claimed about it.
describe('ADR-009 / ADR-008 — on NATIVE, a rotated session that cannot be stored is surfaced', () => {
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
    // from the outcome: what survived is the SUPERSEDED token. The server has
    // moved on to refresh-v2 and the disk still says refresh-v1.
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
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v2'));

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
    // REVIEW-021 finding 2, exactly, and unchanged under ADR-009: a later
    // write succeeding does not un-lose the token the earlier one dropped, so
    // the flag is STICKY UNTIL TAKEN. (The durable demand behaves the same
    // way — asserted in its own block below — and ends only on read-back
    // proof.)
    const harness = createHarness();
    harness.refuseWrites = true;
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v2'));
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
    const harness = createHarness();
    harness.refuseWrites = true;
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v2'));

    const deps = {
      settleSession: async () => {},
      takePersistenceFailure: takeSessionPersistenceFailure,
    };
    expect(await refreshWhileForeground('active', deps)).toBe('unpersisted');

    harness.refuseWrites = false;
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v4'));
    expect(await refreshWhileForeground('active', deps)).toBe('settled');
  });
});

/**
 * ADR-009 requirement 3 — a refused session write is recorded and absorbed.
 *
 * REVIEW-022 observed what rethrowing did inside the pinned client: one
 * refused write produced TWO unhandled `refused-session-write` rejections,
 * because `_callRefreshToken` both rejects its internal Deferred and throws to
 * the initiating chain. The observer now records the refusal — demand FIRST,
 * in-process flag second — and resolves, so the library never enters that
 * path. IN EVERY CASE (ruling 25): when the demand store also refuses, the
 * refusal is still absorbed, the demand is held in memory, and its durable
 * record is retried at every later opportunity until a medium answers or the
 * process ends. REVIEW-023 finding 1 withdrew the earlier rethrow fallback.
 */
describe('ADR-009 requirement 3 — the refused session write is recorded, then absorbed', () => {
  beforeEach(() => clearSessionPersistenceFailure());

  it('resolves a refused SESSION write instead of rethrowing it', async () => {
    const harness = createHarness();
    harness.refuseWrites = true;

    // No rejection escapes: by the time this resolves, the refusal is already
    // recorded somewhere a crash cannot erase.
    await expect(
      harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v2')),
    ).resolves.toBeUndefined();

    expect(peekSessionPersistenceFailure()).toMatchObject({ key: SESSION_KEY });
  });

  it('records the durable demand BEFORE it resolves, and before the flag is readable', async () => {
    const harness = createHarness();
    harness.refuseWrites = true;

    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v2'));

    // The demand is on "disk".
    expect(harness.demandBackend.content).not.toBeNull();
    const record = JSON.parse(harness.demandBackend.content as string) as Record<string, unknown>;
    expect(record.reason).toBe('session-write-refused');
    // Order: the keychain refusal happened, then the demand write — nothing
    // between them could have observed a refusal with no durable record.
    expect(harness.events).toEqual(['keychain-refused-write', 'demand-recorded']);
  });

  it('absorbs the refusal even when the demand store ALSO refuses — ruling 25, no path rethrows', async () => {
    // REVIEW-023 finding 1. The withdrawn version rethrew the original cause
    // here, re-entering the pinned client's throw-and-reject path — two
    // unhandled rejections — and losing restart durability. Now the refusal
    // is absorbed in every case: the demand is HELD in the handle's memory,
    // nothing reaches the caller, and the flag still serves this process.
    const harness = createHarness();
    harness.refuseWrites = true;
    harness.demandBackend.refuseWrites = true;

    await expect(
      harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v2')),
    ).resolves.toBeUndefined();

    // Nothing durable — every medium refused — but the demand exists: held.
    expect(harness.demandBackend.content).toBeNull();
    expect(peekSessionPersistenceFailure()).toMatchObject({ key: SESSION_KEY });
  });

  it('retries the held record on the next write once the demand store recovers', async () => {
    // Ruling 25's "next write" opportunity, driven end to end: both media
    // refuse, the demand is held; the demand store recovers; the next write
    // through the observer flushes the held record durably, and a fresh
    // handle over the same backend — the restart shape — sees it.
    const harness = createHarness();
    harness.refuseWrites = true;
    harness.demandBackend.refuseWrites = true;
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v2'));
    expect(harness.demandBackend.content).toBeNull();

    harness.demandBackend.refuseWrites = false;
    harness.refuseWrites = false;
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v3'));

    expect(harness.demandBackend.content).not.toBeNull();
    const record = JSON.parse(harness.demandBackend.content as string) as Record<string, unknown>;
    expect(record.reason).toBe('session-write-refused');
    await expect(createReauthDemand(harness.demandBackend).isOutstanding()).resolves.toBe(true);
  });

  it('lands the demand durably when the demand store recovers but the keychain still refuses', async () => {
    // The asymmetric recovery: the session write keeps failing, but the
    // MEDIUM the demand needs has come back. The fresh record() attempt on
    // the next refused write is itself the retry, and it must land.
    const harness = createHarness();
    harness.refuseWrites = true;
    harness.demandBackend.refuseWrites = true;
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v2'));
    expect(harness.demandBackend.content).toBeNull();

    harness.demandBackend.refuseWrites = false;
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v3'));

    expect(harness.demandBackend.content).not.toBeNull();
    expect(peekSessionPersistenceFailure()).toMatchObject({ key: SESSION_KEY });
  });

  it('still rethrows a refused write of a NON-session key', async () => {
    // Bounded to the claim: only the session persist enters auth-js's
    // Deferred path. Other keys keep the observe-and-rethrow contract.
    const harness = createHarness();
    harness.refuseWrites = true;

    await expect(harness.storage.setItem('some-other-key', 'value')).rejects.toThrow(
      'errSecInteractionNotAllowed',
    );
    expect(peekSessionPersistenceFailure()).toMatchObject({ key: 'some-other-key' });
    // And no demand: the durable demand is about the session.
    expect(harness.demandBackend.content).toBeNull();
  });

  it('keeps the demand outstanding when a later session write succeeds', async () => {
    // This unit's own adversarial review is why this direction is asserted:
    // an earlier version CLEARED the demand here, and the purge's own
    // internal refresh write (`signOut()` refreshes on the way out —
    // REVIEW-022 finding 2, recorded behaviour) could then erase a
    // purge-pending demand while the purge was unproven, undoing R2's
    // restart durability. The demand now ends only on read-back proof, in
    // the provider's observed purge. Like the flag above, a later success
    // does not un-demand what an earlier refusal demanded.
    const harness = createHarness();
    harness.refuseWrites = true;
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v2'));
    expect(harness.demandBackend.content).not.toBeNull();

    harness.refuseWrites = false;
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v3'));

    expect(harness.demandBackend.content).not.toBeNull();
    expect(peekSessionPersistenceFailure()).not.toBeNull();
  });

  it('does not record a refused REMOVAL as a persistence failure', async () => {
    // Bounded to the claim it supports, per learning 12. A refused removal is
    // a failed sign-out, which the adapter surfaces by rejecting and the
    // provider turns into an error shown to the user. It is not a lost
    // rotated token.
    const harness = createHarness();
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v1'));
    harness.refuseDeletes = true;

    await expect(harness.storage.removeItem(SESSION_KEY)).rejects.toThrow(/Removal of/);
    expect(peekSessionPersistenceFailure()).toBeNull();
  });
});

/**
 * ADR-009 requirement 1 — purge success is OBSERVED, never inferred.
 *
 * The previous version of this file tested a purge-failure flag here: a
 * refused delete was recorded, and the ABSENCE of that record was read
 * upstream as proof of deletion. REVIEW-022 finding 3 showed the inference
 * fail — auth-js can reject before any delete is attempted, leaving no record
 * and no deletion. The flag is deleted, not repaired. What replaces it is
 * observation: `confirmRemoved` reads the complete enumerable key space back,
 * and empty means EMPTY, proven by reads that succeeded.
 */
describe('ADR-009 requirement 1 — the read-back is the only proof of deletion', () => {
  it('reports a populated key space after a refused removal — the residual is real', async () => {
    const harness = createHarness();
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v1'));
    harness.refuseDeletes = true;

    await expect(harness.storage.removeItem(SESSION_KEY)).rejects.toThrow(/Removal of/);

    // The read-back finds what the refusal left behind. Note the removal
    // rejection above proves nothing on its own — THIS does.
    expect(await harness.storage.confirmRemoved(SESSION_KEY)).toBe(false);
    expect(await harness.storage.getItem(SESSION_KEY)).toBe(sessionJson('refresh-v1'));
  });

  it('proves the space empty once a retried removal is accepted', async () => {
    const harness = createHarness();
    await harness.storage.setItem(SESSION_KEY, sessionJson('refresh-v1'));
    harness.refuseDeletes = true;
    await expect(harness.storage.removeItem(SESSION_KEY)).rejects.toThrow();

    harness.refuseDeletes = false;
    await harness.storage.removeItem(SESSION_KEY);

    expect(await harness.storage.confirmRemoved(SESSION_KEY)).toBe(true);
    expect(await harness.storage.getItem(SESSION_KEY)).toBeNull();
  });

  it('detects stranded chunk material that no getItem would ever return', async () => {
    // A fragment without an index is unreadable — getItem fails closed to
    // null — but it is still token material on disk. The read-back sweeps the
    // full enumerable key space precisely so "empty" means no material, not
    // merely no readable session.
    const harness = createHarness();
    harness.store.set(`${SESSION_KEY}.0.3`, 'stranded-fragment');

    expect(await harness.storage.getItem(SESSION_KEY)).toBeNull();
    expect(await harness.storage.confirmRemoved(SESSION_KEY)).toBe(false);
  });

  it('refuses to call a space empty when the backend refuses to answer', async () => {
    // Reading for absence honours the same invariant as every other read: a
    // backend that would not answer has not said the key is empty.
    const store = new Map<string, string>();
    const backend: SecureStoreBackend = {
      getItemAsync: async () => {
        throw new Error('errSecInteractionNotAllowed');
      },
      setItemAsync: async (key, value) => {
        store.set(key, value);
      },
      deleteItemAsync: async (key) => {
        store.delete(key);
      },
    };
    const storage = observingWrites(
      createChunkedSecureStore(backend),
      createReauthDemand(memoryDemandBackend()),
    );

    expect(await storage.confirmRemoved(SESSION_KEY)).toBe(false);
  });
});
