import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { AuthProvider, useAuth } from '@/lib/auth/auth-provider';
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
  confirmSessionPurged: jest.fn(),
}));

// The durable demand — ADR-009 requirement 2. Mocked for the same reason as
// the storage layer: this suite measures when the provider consults, records,
// and clears; the demand module's own contract has its own suite.
jest.mock('@/lib/auth/reauth-demand', () => ({
  recordReauthDemand: jest.fn(),
  isReauthDemandOutstanding: jest.fn(),
  clearReauthDemand: jest.fn(),
}));

const { takeSessionPersistenceFailure, confirmSessionPurged } = jest.requireMock(
  '@/lib/auth/session-storage',
) as {
  takeSessionPersistenceFailure: jest.Mock;
  confirmSessionPurged: jest.Mock;
};

const { recordReauthDemand, isReauthDemandOutstanding, clearReauthDemand } = jest.requireMock(
  '@/lib/auth/reauth-demand',
) as {
  recordReauthDemand: jest.Mock;
  isReauthDemandOutstanding: jest.Mock;
  clearReauthDemand: jest.Mock;
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
  confirmSessionPurged.mockResolvedValue(true);
  recordReauthDemand.mockResolvedValue(undefined);
  isReauthDemandOutstanding.mockResolvedValue(false);
  clearReauthDemand.mockResolvedValue(undefined);

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
