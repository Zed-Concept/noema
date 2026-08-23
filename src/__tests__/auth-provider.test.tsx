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
    expect(auth.getSession).toHaveBeenCalledTimes(1);
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
 * ADR-005: a refresh must never fire while the device is locked, because
 * SecureStore keeps `WHEN_UNLOCKED` and the rotated token would be lost —
 * ending in refresh-token reuse detection revoking the family. Foreground is
 * the proxy for unlocked.
 */
describe('auth provider — auto-refresh is gated on AppState', () => {
  it('starts the refresh ticker when the app is already active at mount', async () => {
    await renderHook(() => useAuth(), { wrapper });

    expect(auth.startAutoRefresh).toHaveBeenCalledTimes(1);
    expect(auth.stopAutoRefresh).not.toHaveBeenCalled();
  });

  it('does not start a ticker when mounted while the app is backgrounded', async () => {
    setAppState('background');

    await renderHook(() => useAuth(), { wrapper });

    // The current state, not an assumption that a mounting app is foreground.
    expect(auth.startAutoRefresh).not.toHaveBeenCalled();
    expect(auth.stopAutoRefresh).toHaveBeenCalled();
  });

  it('stops the ticker on background and on inactive, and restarts on active', async () => {
    await renderHook(() => useAuth(), { wrapper });
    expect(auth.startAutoRefresh).toHaveBeenCalledTimes(1);

    await act(async () => emitAppState('background'));
    expect(auth.stopAutoRefresh).toHaveBeenCalledTimes(1);

    await act(async () => emitAppState('active'));
    expect(auth.startAutoRefresh).toHaveBeenCalledTimes(2);

    // `inactive` is the iOS state during the app switcher and an incoming call.
    // It is not active, so it must not keep a refresh ticker running.
    await act(async () => emitAppState('inactive'));
    expect(auth.stopAutoRefresh).toHaveBeenCalledTimes(2);
  });

  it('releases the AppState listener and stops the ticker on unmount', async () => {
    const { unmount } = await renderHook(() => useAuth(), { wrapper });

    expect(removeAppStateListener).not.toHaveBeenCalled();
    await unmount();

    expect(removeAppStateListener).toHaveBeenCalledTimes(1);
    expect(auth.stopAutoRefresh).toHaveBeenCalled();
  });

  it('absorbs a rejected gate call rather than crashing the effect', async () => {
    auth.startAutoRefresh.mockRejectedValue(new Error('ticker unavailable'));

    const { result } = await renderHook(() => useAuth(), { wrapper });

    // An unhandled rejection out of an effect is a crash-class problem, and the
    // ticker is not load-bearing: auth-js still refreshes on demand.
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
    expect(auth.startAutoRefresh).toHaveBeenCalled();
  });
});

describe('auth provider — misuse', () => {
  it('refuses to hand out context outside a provider', async () => {
    // Rendered without the wrapper on purpose.
    await expect(renderHook(() => useAuth())).rejects.toThrow(/useAuth must be used inside/);
  });
});
