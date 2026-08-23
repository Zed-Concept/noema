import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * Session state as three mutually exclusive cases.
 *
 * `bootstrapping` is not a flavour of signed out. Until the stored session has
 * been read back and resolved, the answer to "is this user signed in?" is not
 * yet known, and a route guard that collapses the two would redirect a
 * returning signed-in user to the sign-in screen on every cold start. Keeping
 * it a distinct case makes that mistake a type error rather than a judgement
 * call at each call site.
 */
export type AuthState =
  | { readonly status: 'bootstrapping' }
  | { readonly status: 'signedIn'; readonly session: Session }
  | { readonly status: 'signedOut' };

/**
 * Every action reports failure by returning it, never by throwing.
 *
 * The type is `Error`, not `AuthError`, on purpose: auth-js rethrows anything
 * that is not an `AuthError` — a keychain failure inside `_saveSession`, for
 * instance — straight out of `verifyOtp`/`signOut`. A caller that only expected
 * `AuthError` would leave those unhandled, and every screen here disables its
 * controls until the call returns, so an escaping rejection strands the UI.
 */
export type AuthAction<Args extends unknown[]> = (
  ...args: Args
) => Promise<{ error: Error | null }>;

export type AuthContextValue = {
  readonly state: AuthState;
  /**
   * Send a one-time code to `email`, creating the account if it does not exist.
   * Never passes `emailRedirectTo`: this is a code-entry flow, not a magic link.
   */
  readonly sendOtp: AuthAction<[email: string]>;
  /** Exchange the emailed code for a session. */
  readonly verifyOtp: AuthAction<[email: string, token: string]>;
  readonly signOut: AuthAction<[]>;
};

/**
 * How long the cold-start read may take before the UI is allowed to proceed.
 *
 * Not belt-and-braces. `getSession()` awaits auth-js's `initializePromise`,
 * which awaits a token refresh over the network, and React Native sets no
 * default timeout on `fetch` — so on a captive portal that completes the
 * handshake and then drops packets, neither the promise nor its `.catch` ever
 * runs. Without this the provider stays `bootstrapping`, and because the root
 * layout deliberately mounts no navigator in that state, the app has no screen
 * to fall back to. Resolving to signed-out is recoverable; a frozen splash is
 * not, and `onAuthStateChange` corrects the state if the session was fine.
 */
const BOOTSTRAP_TIMEOUT_MS = 10_000;

const AuthContext = createContext<AuthContextValue | null>(null);

function stateForSession(session: Session | null): AuthState {
  return session ? { status: 'signedIn', session } : { status: 'signedOut' };
}

/**
 * Turn any failure into a returned error.
 *
 * auth-js returns an `error` for problems it recognises and rethrows everything
 * else, so both have to be caught here for the actions to keep their contract.
 */
async function reportRatherThanThrow(
  run: () => Promise<Error | null>,
): Promise<{ error: Error | null }> {
  try {
    return { error: await run() };
  } catch (thrown) {
    return { error: thrown instanceof Error ? thrown : new Error(String(thrown)) };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'bootstrapping' });

  useEffect(() => {
    let active = true;
    // Once any auth event has spoken, it is newer than the cold-start read.
    let supersededByEvent = false;
    let resolved = false;

    const resolveOnce = (next: AuthState) => {
      if (!active || supersededByEvent || resolved) return;
      resolved = true;
      setState(next);
    };

    // Subscribed before the read below, so an event landing while getSession()
    // is still in flight is observed rather than dropped.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      supersededByEvent = true;
      setState(stateForSession(session));
    });

    // Covers the case the promise cannot: not rejecting, but never settling.
    const timer = setTimeout(() => resolveOnce({ status: 'signedOut' }), BOOTSTRAP_TIMEOUT_MS);

    supabase.auth
      .getSession()
      // Ignored if an event already resolved the state: getSession() is the
      // cold-start bootstrap, not a later source of truth.
      .then(({ data }) => resolveOnce(stateForSession(data.session)))
      // Nothing readable came back. Signed out is the only safe resolution —
      // and it must be a resolution, or bootstrapping would never end.
      .catch(() => resolveOnce({ status: 'signedOut' }))
      .finally(() => clearTimeout(timer));

    return () => {
      active = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const sendOtp = useCallback(async (email: string) => {
    return reportRatherThanThrow(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      return error;
    });
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    return reportRatherThanThrow(async () => {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      return error;
    });
  }, []);

  const signOut = useCallback(async () => {
    // Left at auth-js's default scope, which is 'global': signing out here
    // revokes every session on the account, including this user's other
    // devices. That is auth-js's default rather than a decision taken here, and
    // it is called out in the handoff as one the owner may want to revisit.
    return reportRatherThanThrow(async () => {
      const { error } = await supabase.auth.signOut();
      return error;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ state, sendOtp, verifyOtp, signOut }),
    [state, sendOtp, verifyOtp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside an <AuthProvider>.');
  return value;
}
