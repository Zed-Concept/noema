import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { AuthProvider, useAuth } from '@/lib/auth/auth-provider';
import type { AuthState } from '@/lib/auth/auth-provider';
import { supabase } from '@/lib/supabase';

// The real module reads EXPO_PUBLIC_* at import time and throws when they are
// unset, which is correct behaviour and the reason it is replaced here: these
// tests prove the provider's own logic and must not need credentials to run.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signOut: jest.fn(),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
  },
}));

// The persistence-failure flag and the purge read-back are driven directly
// here, so the provider's REACTION to them can be measured on its own. What
// each actually does — how a refused write records the durable demand and
// resolves, and what `confirmSessionPurged` reads to reach its verdict — is
// proved against the real adapter and the real demand module over in-memory
// doubles in `foreground-refresh.test.ts`, and against the real pinned client
// in the finding-3 probe under `docs/05-quality/evidence/006a-*`; not here.
jest.mock('@/lib/auth/session-storage', () => ({
  takeSessionPersistenceFailure: jest.fn(),
  peekSessionPersistenceFailure: jest.fn(),
  confirmSessionPurged: jest.fn(),
  readBackStoredSession: jest.fn(),
}));

// The durable demand — ADR-009 requirement 2. Mocked for the same reason as
// the storage layer: this suite measures when the provider consults, records,
// and clears; the demand module's own contract has its own suite.
jest.mock('@/lib/auth/reauth-demand', () => ({
  recordReauthDemand: jest.fn(),
  isReauthDemandOutstanding: jest.fn(),
  clearReauthDemand: jest.fn(),
  retryReauthDemandRecord: jest.fn(),
}));

/**
 * The REAL publication barrier, transparently wrapped so every `publish`
 * invocation is RECORDED before it runs. Render histories cannot observe a
 * transient exposure that React batches away within one tick (the same
 * compression the probes document for the A2 window), and the barrier
 * itself absorbs a deleted listener gate — so the gate tests below assert
 * on THIS log: a dropped event never reaches `publish` at all, which is a
 * fact batching cannot hide. Pure pass-through otherwise; every other test
 * in this file runs the real barrier unchanged.
 */
const mockPublishLog: string[] = [];
const mockPublishWraps = new WeakMap<object, (next: { status: string }) => void>();
// Defined OUTSIDE the jest.mock factory: babel's hoist checker rejects any
// non-mock-prefixed identifier inside the factory, type positions included,
// so the typed logic lives here and the factory calls it by its mock- name.
// Identity-stable: the provider's session effect lists `publish` in its
// dependency array, so the wrapper must not mint a new function per render.
const mockWrapPublisher = (
  real: ReturnType<(typeof import('@/lib/auth/auth-state-publisher'))['useAuthStatePublisher']>,
) => {
  let wrapped = mockPublishWraps.get(real.publish);
  if (!wrapped) {
    const forward = real.publish as (value: { status: string }) => void;
    wrapped = (next: { status: string }) => {
      mockPublishLog.push(next.status);
      forward(next);
    };
    mockPublishWraps.set(real.publish, wrapped);
  }
  return { ...real, publish: wrapped };
};
jest.mock('@/lib/auth/auth-state-publisher', () => {
  const actual = jest.requireActual(
    '@/lib/auth/auth-state-publisher',
  ) as typeof import('@/lib/auth/auth-state-publisher');
  return {
    ...actual,
    useAuthStatePublisher: () => mockWrapPublisher(actual.useAuthStatePublisher()),
  };
});

const {
  takeSessionPersistenceFailure,
  peekSessionPersistenceFailure,
  confirmSessionPurged,
  readBackStoredSession,
} = jest.requireMock('@/lib/auth/session-storage') as {
  takeSessionPersistenceFailure: jest.Mock;
  peekSessionPersistenceFailure: jest.Mock;
  confirmSessionPurged: jest.Mock;
  readBackStoredSession: jest.Mock;
};

const {
  recordReauthDemand,
  isReauthDemandOutstanding,
  clearReauthDemand,
  retryReauthDemandRecord,
} = jest.requireMock('@/lib/auth/reauth-demand') as {
  recordReauthDemand: jest.Mock;
  isReauthDemandOutstanding: jest.Mock;
  clearReauthDemand: jest.Mock;
  retryReauthDemandRecord: jest.Mock;
};

const auth = supabase.auth as unknown as {
  getSession: jest.Mock;
  onAuthStateChange: jest.Mock;
  signInWithOtp: jest.Mock;
  verifyOtp: jest.Mock;
  signOut: jest.Mock;
  startAutoRefresh: jest.Mock;
  stopAutoRefresh: jest.Mock;
};

/**
 * AppState is driven directly rather than through a module mock: the provider
 * reads `currentState` at mount and subscribes for changes, and both halves
 * have to be controllable for the gate to be measured rather than assumed.
 */
const appStateListeners: ((status: AppStateStatus) => void)[] = [];
const removeAppStateListener = jest.fn();

function setAppState(status: AppStateStatus): void {
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    get: () => status,
  });
}

function emitAppState(status: AppStateStatus): void {
  setAppState(status);
  for (const listener of appStateListeners) listener(status);
}

const unsubscribe = jest.fn();
/** The listener the provider registered, so tests can drive auth events. */
let emit: (event: string, session: unknown) => void;

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

const FAKE_SESSION = {
  access_token: 'opaque',
  refresh_token: 'opaque',
  expires_at: 4102444800,
  user: { id: 'user-1', email: 'someone@example.test' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPublishLog.length = 0;
  auth.onAuthStateChange.mockImplementation((callback: typeof emit) => {
    emit = callback;
    return { data: { subscription: { unsubscribe } } };
  });
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
  auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
  auth.signOut.mockResolvedValue({ error: null });
  auth.startAutoRefresh.mockResolvedValue(undefined);
  auth.stopAutoRefresh.mockResolvedValue(undefined);
  takeSessionPersistenceFailure.mockReturnValue(null);
  peekSessionPersistenceFailure.mockReturnValue(null);
  confirmSessionPurged.mockResolvedValue(true);
  readBackStoredSession.mockResolvedValue(null);
  recordReauthDemand.mockResolvedValue('durable');
  isReauthDemandOutstanding.mockResolvedValue(false);
  clearReauthDemand.mockResolvedValue(undefined);
  retryReauthDemandRecord.mockResolvedValue(true);

  appStateListeners.length = 0;
  setAppState('active');
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _type: string,
    listener: (status: AppStateStatus) => void,
  ) => {
    appStateListeners.push(listener);
    return { remove: removeAppStateListener };
  }) as unknown as typeof AppState.addEventListener);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('auth provider — bootstrap', () => {
  it('starts in bootstrapping, which is not signed out', async () => {
    // Held open so the unresolved window is observable rather than a race.
    let release: (value: { data: { session: null }; error: null }) => void = () => {};
    auth.getSession.mockReturnValue(
      new Promise<{ data: { session: null }; error: null }>((resolve) => {
        release = resolve;
      }),
    );

    const { result } = await renderHook(() => useAuth(), { wrapper });

    expect(result.current.state.status).toBe('bootstrapping');
    expect(result.current.state.status).not.toBe('signedOut');

    await act(async () => {
      release({ data: { session: null }, error: null });
    });
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
  });

  it('resolves to signedOut when there is no stored session', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
    // Not an exact count. `getSession()` has two callers: the cold-start
    // bootstrap here, and the foreground gate, which evaluates once at mount
    // because AppState is `active`. The gate's own call is counted in its own
    // describe block below.
    expect(auth.getSession).toHaveBeenCalled();
  });

  it('resolves to signedIn and carries the session when one is stored', async () => {
    auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.status).toBe('signedIn'));
    expect(result.current.state).toEqual({ status: 'signedIn', session: FAKE_SESSION });
  });

  it('resolves rather than hanging when the stored session cannot be read', async () => {
    auth.getSession.mockRejectedValue(new Error('storage unavailable'));

    const { result } = await renderHook(() => useAuth(), { wrapper });

    // Bootstrapping must always end; a guard that waits forever shows nothing.
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
  });

  it('stops waiting on a cold-start read that never settles', async () => {
    jest.useFakeTimers();
    // Not a rejection — a promise that never settles, which is what a
    // black-holing network produces and what .catch() cannot see.
    auth.getSession.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useAuth(), { wrapper });
    expect(result.current.state.status).toBe('bootstrapping');

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });

    // Recoverable: the user reaches the sign-in screen instead of a frozen
    // splash, and a later auth event still corrects the state.
    expect(result.current.state.status).toBe('signedOut');
    jest.useRealTimers();
  });

  it('subscribes before reading, so an event in flight is not missed', async () => {
    await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(auth.onAuthStateChange).toHaveBeenCalled());
    expect(auth.onAuthStateChange.mock.invocationCallOrder[0]).toBeLessThan(
      auth.getSession.mock.invocationCallOrder[0],
    );
  });
});

describe('auth provider — currency', () => {
  it('follows onAuthStateChange into and out of a session', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

    await act(async () => emit('SIGNED_IN', FAKE_SESSION));
    await waitFor(() => expect(result.current.state.status).toBe('signedIn'));

    await act(async () => emit('TOKEN_REFRESHED', { ...FAKE_SESSION, access_token: 'rotated' }));
    await waitFor(() =>
      expect(
        result.current.state.status === 'signedIn' && result.current.state.session.access_token,
      ).toBe('rotated'),
    );

    await act(async () => emit('SIGNED_OUT', null));
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
  });

  it('does not let a late cold-start read overwrite a newer event', async () => {
    let release: (value: { data: { session: null }; error: null }) => void = () => {};
    auth.getSession.mockReturnValue(
      new Promise<{ data: { session: null }; error: null }>((resolve) => {
        release = resolve;
      }),
    );

    const { result } = await renderHook(() => useAuth(), { wrapper });

    // A sign-in lands while the cold-start read is still outstanding.
    await act(async () => emit('SIGNED_IN', FAKE_SESSION));
    await waitFor(() => expect(result.current.state.status).toBe('signedIn'));

    await act(async () => {
      release({ data: { session: null }, error: null });
    });
    await waitFor(() => expect(auth.getSession).toHaveBeenCalled());

    // The stale read must not sign the user back out.
    expect(result.current.state.status).toBe('signedIn');
  });

  it('unsubscribes on unmount', async () => {
    const { unmount } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(auth.onAuthStateChange).toHaveBeenCalled());
    expect(unsubscribe).not.toHaveBeenCalled();
    await unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('auth provider — OTP flow', () => {
  it('requests a code that also creates the account, and never a redirect link', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

    await result.current.sendOtp('someone@example.test');

    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'someone@example.test',
      options: { shouldCreateUser: true },
    });
    // `emailRedirectTo` is what turns this into a magic link. Its absence is the
    // property, so it is asserted rather than assumed.
    const [[sent]] = auth.signInWithOtp.mock.calls;
    expect(sent.options).not.toHaveProperty('emailRedirectTo');
  });

  it('verifies the emailed code as an email OTP', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

    await result.current.verifyOtp('someone@example.test', '123456');

    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: 'someone@example.test',
      token: '123456',
      type: 'email',
    });
  });

  it('reports errors instead of throwing them', async () => {
    const failure = { message: 'Invalid code', name: 'AuthApiError' };
    auth.verifyOtp.mockResolvedValue({ data: {}, error: failure });

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

    await expect(result.current.verifyOtp('someone@example.test', '000000')).resolves.toEqual({
      error: failure,
    });
  });

  it('returns an error rather than throwing when auth-js throws', async () => {
    // auth-js rethrows anything that is not an AuthError. Every screen
    // disables its controls until these resolve, so an escaping rejection
    // strands the UI. (A refused SESSION write no longer arrives this way —
    // the observer records it and resolves, ADR-009 requirement 3 — but other
    // throw classes remain: an unreadable store, a rejected demand fallback.)
    auth.verifyOtp.mockRejectedValue(new Error('errSecInteractionNotAllowed'));
    auth.signOut.mockRejectedValue(new Error('errSecInteractionNotAllowed'));

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

    await expect(result.current.verifyOtp('someone@example.test', '123456')).resolves.toEqual({
      error: expect.any(Error),
    });
    await expect(result.current.signOut()).resolves.toEqual({ error: expect.any(Error) });
  });

  it('ends the session through signOut, device-locally', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

    await result.current.signOut();

    expect(auth.signOut).toHaveBeenCalledTimes(1);
    // ADR-005 and binding ruling 13. auth-js defaults this to `'global'`, which
    // would end the same user's session on their other devices. The exact
    // argument is asserted, because the property is what is passed, not that a
    // call happened.
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});

/**
 * ADR-009 / binding ruling 20 — the client never self-schedules a refresh,
 * and the app's OWN calls are made only while foreground.
 *
 * What this block does NOT assert, because ADR-009 bars the claim: that no
 * refresh can occur before the first foreground. The pinned client registers
 * an internal auth listener during construction and can load and refresh a
 * stored session with no application call — REVIEW-022 proved it, and the
 * mocked client here could never show it. These tests measure the app's own
 * conduct: what THIS code initiates, and when.
 */
describe('auth provider — ADR-009 refresh lifecycle', () => {
  it('never touches the auto-refresh ticker, in any AppState', async () => {
    await renderHook(() => useAuth(), { wrapper });

    await act(async () => emitAppState('background'));
    await act(async () => emitAppState('active'));
    await act(async () => emitAppState('inactive'));

    // The client is constructed with `autoRefreshToken: false` and nothing
    // here starts or stops a ticker. `supabase-client.test.ts` asserts the
    // construction option itself.
    expect(auth.startAutoRefresh).not.toHaveBeenCalled();
    expect(auth.stopAutoRefresh).not.toHaveBeenCalled();
  });

  it('initiates a settle when the app is already active at mount', async () => {
    await renderHook(() => useAuth(), { wrapper });

    // Bootstrap + gate. Both are foreground-initiated calls this app makes.
    await waitFor(() => expect(auth.getSession).toHaveBeenCalledTimes(2));
  });

  it('initiates nothing at all when mounted while the app is backgrounded', async () => {
    setAppState('background');

    await renderHook(() => useAuth(), { wrapper });

    // Zero is the whole property — FOR THIS APP'S OWN CALLS. Nothing is asked
    // of the auth client, and the durable demand store is not even consulted,
    // before the first foreground. (What the pinned client does from its own
    // constructor is recorded behaviour under ADR-009, invisible to this
    // mocked suite and probed for real in the 006a evidence.)
    await waitFor(() => expect(auth.getSession).not.toHaveBeenCalled());
    expect(auth.startAutoRefresh).not.toHaveBeenCalled();
    expect(isReauthDemandOutstanding).not.toHaveBeenCalled();
  });

  it('registers no app auth listener until the app is foreground', async () => {
    setAppState('background');

    await renderHook(() => useAuth(), { wrapper });

    // THIS APP's registration is deferred to the first foreground — an app
    // choice, not a boundary claim. (An earlier version of this comment said
    // `supabase-js` registers no listener of its own; REVIEW-022 disproved
    // that by probe, and the claim is withdrawn. The library's internal
    // listener is outside what a mocked client can show.)
    await waitFor(() => expect(auth.onAuthStateChange).not.toHaveBeenCalled());
  });

  it('opens the bootstrap on the first transition to active, and only then', async () => {
    setAppState('background');
    await renderHook(() => useAuth(), { wrapper });
    expect(auth.onAuthStateChange).not.toHaveBeenCalled();
    expect(auth.getSession).not.toHaveBeenCalled();

    await act(async () => emitAppState('active'));

    // The app's registration and cold-start read, now that its own gate has
    // opened, plus the gate's settle.
    await waitFor(() => expect(auth.onAuthStateChange).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(auth.getSession).toHaveBeenCalledTimes(2));
  });

  it('registers the listener exactly once across repeated foregrounds', async () => {
    setAppState('background');
    await renderHook(() => useAuth(), { wrapper });

    await act(async () => emitAppState('active'));
    await act(async () => emitAppState('background'));
    await act(async () => emitAppState('active'));

    // The bootstrap is a cold start, not a per-foreground event. A second
    // registration would leak a subscription and double every auth event.
    expect(auth.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it('initiates on each transition to active and none on background or inactive', async () => {
    await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(auth.getSession).toHaveBeenCalledTimes(2));

    await act(async () => emitAppState('background'));
    expect(auth.getSession).toHaveBeenCalledTimes(2);

    await act(async () => emitAppState('active'));
    expect(auth.getSession).toHaveBeenCalledTimes(3);

    // `inactive` is the iOS state during the app switcher and an incoming call.
    // It is not active, so it must initiate nothing.
    await act(async () => emitAppState('inactive'));
    expect(auth.getSession).toHaveBeenCalledTimes(3);
  });

  it('releases the AppState listener on unmount', async () => {
    const { unmount } = await renderHook(() => useAuth(), { wrapper });

    expect(removeAppStateListener).not.toHaveBeenCalled();
    await unmount();

    expect(removeAppStateListener).toHaveBeenCalledTimes(1);
    // There is no ticker to stop on unmount, and nothing must pretend there is.
    expect(auth.stopAutoRefresh).not.toHaveBeenCalled();
  });

  it('absorbs a rejected settle rather than crashing the effect', async () => {
    auth.getSession.mockRejectedValue(new Error('storage unavailable'));

    const { result } = await renderHook(() => useAuth(), { wrapper });

    // An unhandled rejection out of an effect is a crash-class problem.
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
  });

  it('does not sign the user out when a settle fails without a persistence failure', async () => {
    // A dead network and an unreadable store both reject, and neither means a
    // rotated token was lost. Only the flag distinguishes them.
    auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });
    takeSessionPersistenceFailure.mockReturnValue(null);

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.status).toBe('signedIn'));
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('requires re-authentication when a rotated session could not be persisted', async () => {
    auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });
    takeSessionPersistenceFailure.mockReturnValueOnce({
      key: 'zc-auth-session',
      cause: new Error('errSecInteractionNotAllowed'),
    });
    takeSessionPersistenceFailure.mockReturnValue(null);

    const { result } = await renderHook(() => useAuth(), { wrapper });

    // ADR-009: the server has already rotated the refresh token and the write
    // was refused, so what is on disk is the superseded one. The app must not
    // keep using a session it did not store.
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
    // Device-local, still: requiring re-authentication here must not revoke the
    // same user's session on their other devices. ADR-005's scope decision is
    // carried forward by ADR-009.
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    // And the demand went durable — recorded, not merely flagged in memory.
    expect(recordReauthDemand).toHaveBeenCalledWith('session-purge-pending');
  });

  it('still forces signedOut when the purge cannot be proven', async () => {
    auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });
    takeSessionPersistenceFailure.mockReturnValueOnce({
      key: 'zc-auth-session',
      cause: new Error('errSecInteractionNotAllowed'),
    });
    takeSessionPersistenceFailure.mockReturnValue(null);
    // The store that just refused a write refuses the deletes too, and the
    // read-back still finds the residual.
    auth.signOut.mockRejectedValue(new Error('errSecInteractionNotAllowed'));
    confirmSessionPurged.mockResolvedValue(false);

    const { result } = await renderHook(() => useAuth(), { wrapper });

    // The demand for re-authentication is NOT contingent on the purge
    // succeeding.
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
  });
});

/**
 * REVIEW-022 finding 3 — the purge is proven by read-back, and the demand
 * survives what a restart resets.
 *
 * The predecessor of this block asserted the FALSE INFERENCE the finding
 * names: its "reads what the STORE did" test mocked a rejected `signOut()`
 * with a null purge record and expected NO retry — encoding "no observation
 * of a refused delete" as "deleted". Pinned auth-js can reject before any
 * removal is attempted, so that null proved nothing. The block is REPLACED,
 * not patched: the only fact the provider now acts on is the read-back
 * (`confirmSessionPurged`), and the demand it keeps while unproven is durable
 * (`reauth-demand`), consulted again by the next process.
 */
describe('auth provider — the observed purge and the durable demand', () => {
  const REFUSED = {
    key: 'zc-auth-session',
    cause: new Error('errSecInteractionNotAllowed'),
  };

  it('treats a signOut rejection with a populated key space as NOT purged, and retries', async () => {
    // The exact schedule the old test got wrong. `signOut()` rejects — as it
    // does when a pre-removal refresh write is refused — and the read-back
    // finds the session still there. The old code called this success; the
    // provider must now keep the demand alive and retry on the next
    // foreground.
    auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });
    takeSessionPersistenceFailure.mockReturnValueOnce(REFUSED).mockReturnValue(null);
    auth.signOut.mockRejectedValue(new Error('refused-session-write'));
    confirmSessionPurged.mockResolvedValue(false);

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
    expect(auth.signOut).toHaveBeenCalledTimes(1);

    await act(async () => emitAppState('background'));
    await act(async () => emitAppState('active'));

    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(2));
    expect(auth.signOut).toHaveBeenLastCalledWith({ scope: 'local' });
    // Never cleared: the read-back never proved the space empty.
    expect(clearReauthDemand).not.toHaveBeenCalled();
  });

  it('treats a signOut rejection with a PROVEN-empty key space as purged', async () => {
    // The other half of observation replacing inference: the rejection itself
    // is not evidence either way. Here the deletes actually ran before the
    // rejection surfaced elsewhere, the read-back proves the space empty, and
    // there is nothing to retry.
    auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });
    takeSessionPersistenceFailure.mockReturnValueOnce(REFUSED).mockReturnValue(null);
    auth.signOut.mockRejectedValue(new Error('network request failed'));
    confirmSessionPurged.mockResolvedValue(true);

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(clearReauthDemand).toHaveBeenCalledTimes(1));

    await act(async () => emitAppState('background'));
    await act(async () => emitAppState('active'));

    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('records the durable demand BEFORE attempting the purge', async () => {
    // A crash between the two must leave the record, not just the residual.
    auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });
    takeSessionPersistenceFailure.mockReturnValueOnce(REFUSED).mockReturnValue(null);

    await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));

    expect(recordReauthDemand).toHaveBeenCalledTimes(1);
    expect(recordReauthDemand.mock.invocationCallOrder[0]).toBeLessThan(
      auth.signOut.mock.invocationCallOrder[0],
    );
  });

  it('sets signedOut while the purge is still pending — a hung logout cannot delay it', async () => {
    // REVIEW-023 finding 2, at this suite's granularity. The reviewer's
    // pinned-client schedule held the logout fetch open after `signOut()`'s
    // internal refresh and watched the provider keep exposing signedIn for
    // the whole unbounded interval. The property: signedOut and the recorded
    // demand exist WHILE the purge is pending, not after it settles; the
    // read-back and the clear follow only once the logout releases.
    auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });
    takeSessionPersistenceFailure.mockReturnValueOnce(REFUSED).mockReturnValue(null);
    let releaseLogout: () => void = () => {};
    auth.signOut.mockReturnValue(
      new Promise<{ error: null }>((resolve) => {
        releaseLogout = () => resolve({ error: null });
      }),
    );
    confirmSessionPurged.mockResolvedValue(true);

    const { result } = await renderHook(() => useAuth(), { wrapper });

    // The logout leg is pending — and the state has already changed, with
    // the durable demand already recorded. Nothing is awaited first.
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(recordReauthDemand).toHaveBeenCalledWith('session-purge-pending');
    // The purge has not settled, so no read-back verdict and no clear yet.
    expect(confirmSessionPurged).not.toHaveBeenCalled();
    expect(clearReauthDemand).not.toHaveBeenCalled();

    // Release the logout: the read-back proves the space empty and the
    // demand ends — the reviewer's release/read-back/cleared tail.
    await act(async () => releaseLogout());
    await waitFor(() => expect(clearReauthDemand).toHaveBeenCalledTimes(1));
    expect(result.current.state.status).toBe('signedOut');
  });

  it('drops a mid-purge TOKEN_REFRESHED instead of re-exposing the session', async () => {
    // The door REVIEW-023 finding 2's fix has to close to stay closed:
    // pinned `signOut()` refreshes the residual on its way out (REVIEW-022
    // finding 2, recorded behaviour) and emits TOKEN_REFRESHED carrying the
    // very session the purge is removing. While the demand is outstanding,
    // that event must not flip the provider back to signedIn.
    auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });
    takeSessionPersistenceFailure.mockReturnValueOnce(REFUSED).mockReturnValue(null);
    let releaseLogout: () => void = () => {};
    auth.signOut.mockReturnValue(
      new Promise<{ error: null }>((resolve) => {
        releaseLogout = () => resolve({ error: null });
      }),
    );
    confirmSessionPurged.mockResolvedValue(true);

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

    // The purge's own internal refresh announces the session it is deleting.
    // Asserted at the publication log, beneath React's batching: the gated
    // event never reaches publish at all — the listener drops it whole
    // rather than leaning on the barrier to refuse it.
    const publishesBeforeEvent = mockPublishLog.length;
    await act(async () => emit('TOKEN_REFRESHED', FAKE_SESSION));
    expect(result.current.state.status).toBe('signedOut');
    expect(mockPublishLog.slice(publishesBeforeEvent)).not.toContain('signedIn');

    await act(async () => releaseLogout());
    await waitFor(() => expect(clearReauthDemand).toHaveBeenCalledTimes(1));

    // Once the read-back has proven the space empty and the demand has
    // ended, events flow again — a real later sign-in still surfaces.
    await act(async () => emit('SIGNED_IN', FAKE_SESSION));
    await waitFor(() => expect(result.current.state.status).toBe('signedIn'));
  });

  it('stops retrying once the read-back proves the space empty', async () => {
    auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });
    takeSessionPersistenceFailure.mockReturnValueOnce(REFUSED).mockReturnValue(null);
    confirmSessionPurged.mockResolvedValueOnce(false).mockResolvedValue(true);

    await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));

    // Retry #2: the store accepts, the read-back proves it, the demand clears.
    await act(async () => emitAppState('background'));
    await act(async () => emitAppState('active'));
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(clearReauthDemand).toHaveBeenCalledTimes(1));

    // ...and there is nothing left to retry.
    await act(async () => emitAppState('background'));
    await act(async () => emitAppState('active'));
    expect(auth.signOut).toHaveBeenCalledTimes(2);
  });

  it('does not retry a purge the read-back proved the first time', async () => {
    auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });
    takeSessionPersistenceFailure.mockReturnValueOnce(REFUSED).mockReturnValue(null);
    confirmSessionPurged.mockResolvedValue(true);

    await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));

    await act(async () => emitAppState('background'));
    await act(async () => emitAppState('active'));

    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });
});

/**
 * ADR-009 requirement 2 — the demand is consulted at bootstrap, before any
 * session is exposed, and the observed purge comes BEFORE the provider's own
 * `getSession()`. REVIEW-022 found the order reversed: the provider loaded
 * (and could refresh) the very session it refused to use, then retried the
 * purge. A fresh mount with the demand outstanding is exactly the restart
 * schedule at this suite's granularity — everything process-local is new, and
 * only the durable store says what happened before.
 */
describe('auth provider — the durable demand at bootstrap', () => {
  it('purges before its own getSession when a demand is outstanding at mount', async () => {
    isReauthDemandOutstanding.mockResolvedValue(true);
    confirmSessionPurged.mockResolvedValue(true);

    await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(auth.getSession).toHaveBeenCalled());
    // The order IS the property: purge first, then the provider's own reads.
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(auth.signOut.mock.invocationCallOrder[0]).toBeLessThan(
      auth.getSession.mock.invocationCallOrder[0],
    );
    expect(clearReauthDemand).toHaveBeenCalledTimes(1);
  });

  it('exposes no session and reads nothing while the demand is unmet', async () => {
    isReauthDemandOutstanding.mockResolvedValue(true);
    confirmSessionPurged.mockResolvedValue(false);
    // Even a readable stored session must not surface.
    auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
    // No bootstrap, no settle, no app listener: the provider's own surface
    // stays closed until the purge is proven. (What the pinned client's
    // constructor does internally is recorded behaviour, contained by the
    // purge — probed in the 006a evidence, invisible to these mocks.)
    expect(auth.getSession).not.toHaveBeenCalled();
    expect(auth.onAuthStateChange).not.toHaveBeenCalled();
    expect(clearReauthDemand).not.toHaveBeenCalled();
  });

  it('keeps retrying across foregrounds until the read-back proves the purge, then bootstraps', async () => {
    isReauthDemandOutstanding.mockResolvedValue(true);
    confirmSessionPurged.mockResolvedValueOnce(false).mockResolvedValue(true);

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
    expect(auth.getSession).not.toHaveBeenCalled();

    await act(async () => emitAppState('background'));
    await act(async () => emitAppState('active'));

    // Proven on the retry: the demand clears and the normal bootstrap runs.
    await waitFor(() => expect(clearReauthDemand).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(auth.getSession).toHaveBeenCalled());
    expect(auth.signOut).toHaveBeenCalledTimes(2);
    // Still purge-before-read, on every evaluation that purged.
    expect(Math.max(...auth.signOut.mock.invocationCallOrder)).toBeLessThan(
      Math.min(...auth.getSession.mock.invocationCallOrder),
    );
  });

  it('retries the durable record on every foreground while the demand is outstanding', async () => {
    // Ruling 25: a demand that could only be held in memory — every medium
    // refused at the time — has its durable record retried on each later
    // opportunity. The outstanding branch is the foreground/purge-retry one;
    // the retry must run on every evaluation that purges, before the purge.
    isReauthDemandOutstanding.mockResolvedValue(true);
    confirmSessionPurged.mockResolvedValue(false);

    await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
    expect(retryReauthDemandRecord).toHaveBeenCalledTimes(1);
    expect(retryReauthDemandRecord.mock.invocationCallOrder[0]).toBeLessThan(
      auth.signOut.mock.invocationCallOrder[0],
    );

    await act(async () => emitAppState('background'));
    await act(async () => emitAppState('active'));

    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(2));
    expect(retryReauthDemandRecord).toHaveBeenCalledTimes(2);
  });

  it('treats a demand store that will not answer as an outstanding demand', async () => {
    // Refusal is not absence. The cost of assuming outstanding is one
    // observed purge of an empty key space; the cost of assuming absence
    // would be trusting the residual the demand exists to bar.
    isReauthDemandOutstanding.mockRejectedValue(new Error('io error'));
    confirmSessionPurged.mockResolvedValue(true);

    await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(auth.getSession).toHaveBeenCalled());
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(auth.signOut.mock.invocationCallOrder[0]).toBeLessThan(
      auth.getSession.mock.invocationCallOrder[0],
    );
  });

  it('consults the durable store once per process, not on every foreground', async () => {
    isReauthDemandOutstanding.mockResolvedValue(false);

    await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(auth.getSession).toHaveBeenCalledTimes(2));

    await act(async () => emitAppState('background'));
    await act(async () => emitAppState('active'));

    expect(isReauthDemandOutstanding).toHaveBeenCalledTimes(1);
  });
});

/**
 * REVIEW-023-ADVISORY leads 1 and 3, adjudicated into this cycle. One
 * invariant: NO path exposes a session while a re-authentication demand is
 * outstanding, in memory or durable. The listener gates every setState on the
 * demand AND on the unconsumed write-refusal flag (the advisory's A2/A3
 * window: the observer records refusal and demand before the event fires,
 * while this provider's own cache still says no demand). A fresh sign-in is
 * the one thing that resolves a demand — and only once its session is
 * persisted and READ BACK.
 */
describe('auth provider — the advisory invariant: no exposure while a demand stands', () => {
  const REFUSED = {
    key: 'zc-auth-session',
    cause: new Error('errSecInteractionNotAllowed'),
  };

  it('drops a session event arriving under an unconsumed persistence failure', async () => {
    // The advisory's A2/A3 shape at this suite's granularity: the write
    // observer has recorded a refusal (flag set, demand recorded) but this
    // provider has not yet taken the flag, so its demand cache is stale. The
    // event carries a session no medium is known to hold; it must not
    // surface.
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

    peekSessionPersistenceFailure.mockReturnValue(REFUSED);
    const publishesBeforeEvents = mockPublishLog.length;
    await act(async () => emit('SIGNED_IN', FAKE_SESSION));
    expect(result.current.state.status).toBe('signedOut');
    await act(async () => emit('TOKEN_REFRESHED', FAKE_SESSION));
    expect(result.current.state.status).toBe('signedOut');
    // Beneath batching: the events were dropped whole, never published.
    expect(mockPublishLog.slice(publishesBeforeEvents)).not.toContain('signedIn');

    // Flag consumed and no demand outstanding: events flow again.
    peekSessionPersistenceFailure.mockReturnValue(null);
    await act(async () => emit('SIGNED_IN', FAKE_SESSION));
    await waitFor(() => expect(result.current.state.status).toBe('signedIn'));
  });

  it('resolves a demand outstanding at mount through a fresh sign-in that reads back', async () => {
    // The advisory's B2 schedule: with the demand outstanding at mount the
    // provider exposes nothing and starts no bootstrap; the old behaviour
    // then destroyed a fresh sign-in with the stale purge. Lead 3: the
    // sign-in RESOLVES the demand — clear, bootstrap, expose — because
    // re-authentication is what the demand asked for.
    isReauthDemandOutstanding.mockResolvedValue(true);
    confirmSessionPurged.mockResolvedValue(false);
    auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
    expect(auth.getSession).not.toHaveBeenCalled();

    // The fresh sign-in persists and reads back.
    readBackStoredSession.mockResolvedValue('stored-session-payload');
    await act(async () => {
      await expect(result.current.verifyOtp('someone@example.test', '123456')).resolves.toEqual({
        error: null,
      });
    });

    await waitFor(() => expect(clearReauthDemand).toHaveBeenCalledTimes(1));
    // The bootstrap the demand had been holding back now runs and exposes
    // the fresh session — not the purge.
    await waitFor(() => expect(result.current.state.status).toBe('signedIn'));
    expect(auth.getSession).toHaveBeenCalled();
    // And no purge destroyed it: signOut ran only for the pre-sign-in purge
    // attempts, never after the resolution.
    const purgesBeforeSignIn = auth.signOut.mock.calls.length;
    await act(async () => emitAppState('background'));
    await act(async () => emitAppState('active'));
    expect(auth.signOut.mock.calls.length).toBe(purgesBeforeSignIn);
  });

  it('resolves a mid-process demand through a fresh sign-in and re-exposes the session', async () => {
    // The flag-driven variant: bootstrap already ran, the demand arrived
    // mid-process, lead 1's gate dropped the sign-in event — resolution must
    // re-read the session and expose it itself.
    auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });
    takeSessionPersistenceFailure.mockReturnValueOnce(REFUSED).mockReturnValue(null);
    confirmSessionPurged.mockResolvedValue(false);

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

    readBackStoredSession.mockResolvedValue('stored-session-payload');
    await act(async () => {
      await result.current.verifyOtp('someone@example.test', '123456');
    });

    await waitFor(() => expect(clearReauthDemand).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.state.status).toBe('signedIn'));
  });

  it('does not resolve the demand when the sign-in persist was refused', async () => {
    // `verifyOtp` can report success while the keychain refused the persist
    // (the advisory's A3). The flag names that refusal; the "fresh" session
    // exists nowhere durable, so the demand stands and nothing surfaces.
    isReauthDemandOutstanding.mockResolvedValue(true);
    confirmSessionPurged.mockResolvedValue(false);

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

    peekSessionPersistenceFailure.mockReturnValue(REFUSED);
    readBackStoredSession.mockResolvedValue('whatever-the-disk-still-holds');
    await act(async () => {
      await result.current.verifyOtp('someone@example.test', '123456');
    });

    expect(clearReauthDemand).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe('signedOut');
  });

  it('does not resolve the demand when nothing reads back', async () => {
    // "Persisted and read back" is conjunctive: a sign-in whose session the
    // key space cannot return has not re-established anything durable.
    isReauthDemandOutstanding.mockResolvedValue(true);
    confirmSessionPurged.mockResolvedValue(false);

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

    readBackStoredSession.mockResolvedValue(null);
    await act(async () => {
      await result.current.verifyOtp('someone@example.test', '123456');
    });

    expect(clearReauthDemand).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe('signedOut');
  });
});

/**
 * REVIEW-024 finding 2 — the ONE publication barrier. The listener gate
 * closed the events; the reviewer then found the same exposure class through
 * the OTHER publishers: the bootstrap `getSession().then` and the
 * mid-process resolution re-read, each carrying a session across an await
 * with no re-check at the publication. Every publisher now goes through
 * `useAuthStatePublisher`'s `publish`, which re-checks the demand signal and
 * the write-refusal flag at publication time and resolves a refused
 * `signedIn` to `signedOut`.
 *
 * Coverage of the enumerated publishers (the enumeration itself is pinned in
 * `auth-state-publisher.test.ts`): the listener is exercised by the advisory
 * describe above; the bootstrap resolution and the mid-process re-read are
 * exercised here under signals raised DURING their awaits; the two signedOut
 * publishers pass through the same barrier in every re-authentication test
 * in this file.
 */
describe('auth provider — the REVIEW-024 publication barrier', () => {
  const REFUSED = {
    key: 'zc-auth-session',
    cause: new Error('errSecInteractionNotAllowed'),
  };

  async function renderWithHistory() {
    const history: AuthState[] = [];
    const hook = await renderHook(
      () => {
        const value = useAuth();
        history.push(value.state);
        return value;
      },
      { wrapper },
    );
    return { history, ...hook };
  }

  it('refuses the bootstrap resolution whose awaited session was refused persistence — the finding-2 schedule', async () => {
    // The reviewer's shape at this suite's granularity: getSession carries a
    // session across its await, and by the time it resolves the observer has
    // refused that session's persist — the flag stands at publication time.
    // The cycle-1 code published signedIn here; the barrier resolves it to
    // signedOut, and no render ever holds the session.
    auth.getSession.mockImplementation(async () => {
      peekSessionPersistenceFailure.mockReturnValue(REFUSED);
      return { data: { session: FAKE_SESSION }, error: null };
    });

    const { result, history } = await renderWithHistory();

    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
    expect(history.some((state) => state.status === 'signedIn')).toBe(false);
  });

  it('refuses the mid-process resolution re-read whose follow-up persist was refused', async () => {
    // The resolution legitimately clears the old demand on read-back
    // evidence, then re-reads the session to expose it — and that re-read
    // can itself refresh the fresh session and have THAT persist refused.
    // The publication must re-check; the cycle-1 code exposed it.
    auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });
    takeSessionPersistenceFailure.mockReturnValueOnce(REFUSED).mockReturnValue(null);
    confirmSessionPurged.mockResolvedValue(false);

    const { result, history } = await renderWithHistory();
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

    // The fresh sign-in persists and reads back; the demand resolves. But
    // the re-read's own settle is refused persistence mid-await.
    readBackStoredSession.mockResolvedValue('stored-session-payload');
    auth.getSession.mockImplementation(async () => {
      peekSessionPersistenceFailure.mockReturnValue(REFUSED);
      return { data: { session: FAKE_SESSION }, error: null };
    });
    const beforeResolution = history.length;
    await act(async () => {
      await result.current.verifyOtp('someone@example.test', '123456');
    });

    // Resolution ran — the old demand cleared on evidence — but the refused
    // follow-up may not surface: signedOut, and no render after the
    // resolution began ever held a session.
    await waitFor(() => expect(clearReauthDemand).toHaveBeenCalledTimes(1));
    expect(result.current.state.status).toBe('signedOut');
    expect(history.slice(beforeResolution).some((state) => state.status === 'signedIn')).toBe(
      false,
    );
  });

  it('an event in the take-to-cache interval finds the demand signal already raised', async () => {
    // The third window of the class: consuming the flag and raising the
    // provider's demand cache are ONE synchronous act inside the take. The
    // microtask-injected TOKEN_REFRESHED lands after the flag was consumed
    // and before requireReauthentication could run — the interval where,
    // with the cycle-1 order, neither signal stood.
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    takeSessionPersistenceFailure.mockImplementationOnce(() => {
      queueMicrotask(() => emit('TOKEN_REFRESHED', FAKE_SESSION));
      return REFUSED;
    });
    confirmSessionPurged.mockResolvedValue(false);

    const { result, history } = await renderWithHistory();

    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
    expect(history.some((state) => state.status === 'signedIn')).toBe(false);
    // The render history alone cannot prove this: React batches a transient
    // signedIn away within the tick (observed while building this cycle's
    // battery). The publication log is beneath batching — the injected
    // event must never reach publish with a session, because the take
    // raised the demand signal in the same synchronous act that consumed
    // the flag, and the listener therefore dropped it.
    expect(mockPublishLog).not.toContain('signedIn');
  });
});
