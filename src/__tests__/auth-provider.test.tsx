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

// The persistence-failure flag is module scope in the real module and is driven
// directly here, so the provider's REACTION to it can be measured on its own.
// What the flag itself does — how a refused write comes to set it, and what is
// left on disk when one does — is proved against the real adapter over a real
// in-memory keychain in `foreground-refresh.test.ts`, not here.
jest.mock('@/lib/auth/session-storage', () => ({
  takeSessionPersistenceFailure: jest.fn(),
}));

const { takeSessionPersistenceFailure } = jest.requireMock('@/lib/auth/session-storage') as {
  takeSessionPersistenceFailure: jest.Mock;
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
    // Not an exact count. Under ADR-007 `getSession()` has two callers: the
    // cold-start bootstrap here, and the foreground gate, which evaluates once
    // at mount because AppState is `active`. The gate's own call is counted in
    // its own describe block below.
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

    expect(auth.onAuthStateChange).toHaveBeenCalled();
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
    // auth-js rethrows anything that is not an AuthError — a keychain failure
    // inside _saveSession, for instance. Every screen disables its controls
    // until these resolve, so an escaping rejection strands the UI.
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
 * ADR-007 / binding ruling 17 — the client never self-schedules a refresh, and
 * the app initiates one only while foreground.
 *
 * This block replaces the previous "auto-refresh is gated on AppState" block
 * wholesale. That block asserted `startAutoRefresh`/`stopAutoRefresh` call
 * counts, and REVIEW-020 finding 1 proved those calls never established the
 * property they were credited with: `stopAutoRefresh()` clears only the timers
 * that exist at that moment and cancels neither initialization nor an in-flight
 * refresh. Asserting them harder would not have helped. ADR-007 removed the
 * scheduler, so what is asserted here is that the ticker is never touched at
 * all, and that the gate decides what it is supposed to decide.
 */
describe('auth provider — ADR-007 refresh lifecycle', () => {
  it('never touches the auto-refresh ticker, in any AppState', async () => {
    await renderHook(() => useAuth(), { wrapper });

    await act(async () => emitAppState('background'));
    await act(async () => emitAppState('active'));
    await act(async () => emitAppState('inactive'));

    // The whole of ADR-007's first clause, asserted negatively because that is
    // what it says: the client is constructed with `autoRefreshToken: false`
    // and nothing here starts or stops a ticker. `supabase-client.test.ts`
    // asserts the construction option itself.
    expect(auth.startAutoRefresh).not.toHaveBeenCalled();
    expect(auth.stopAutoRefresh).not.toHaveBeenCalled();
  });

  it('initiates a settle when the app is already active at mount', async () => {
    await renderHook(() => useAuth(), { wrapper });

    // Bootstrap + gate. Both are foreground-initiated calls this app makes.
    await waitFor(() => expect(auth.getSession).toHaveBeenCalledTimes(2));
  });

  it('initiates nothing when mounted while the app is backgrounded', async () => {
    setAppState('background');

    await renderHook(() => useAuth(), { wrapper });

    // The current state, not an assumption that a mounting app is foreground.
    // Exactly one call: the cold-start bootstrap. The gate added none.
    await waitFor(() => expect(auth.getSession).toHaveBeenCalledTimes(1));
    expect(auth.startAutoRefresh).not.toHaveBeenCalled();
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
    takeSessionPersistenceFailure.mockReturnValue({
      key: 'sb-noema-auth-token',
      cause: new Error('errSecInteractionNotAllowed'),
    });

    const { result } = await renderHook(() => useAuth(), { wrapper });

    // ADR-007 item 3. The server has already rotated the refresh token and the
    // write was refused, so what is on disk is the superseded one. The app must
    // not keep using a session it did not store.
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
    // Device-local, still: requiring re-authentication here must not revoke the
    // same user's session on their other devices. ADR-005's scope decision is
    // untouched by ADR-007.
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('still forces signedOut when the cleanup removal also fails', async () => {
    auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });
    takeSessionPersistenceFailure.mockReturnValue({
      key: 'sb-noema-auth-token',
      cause: new Error('errSecInteractionNotAllowed'),
    });
    // The store that just refused a write may refuse the deletes too.
    auth.signOut.mockRejectedValue(new Error('errSecInteractionNotAllowed'));

    const { result } = await renderHook(() => useAuth(), { wrapper });

    // The demand for re-authentication is NOT contingent on the removal
    // succeeding. The residual — a superseded session still on disk, readable
    // on next cold start — is disclosed in the provider and in the evidence
    // README; it is not claimed closed.
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
  });
});
