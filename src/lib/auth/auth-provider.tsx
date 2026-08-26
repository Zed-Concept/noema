import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { supabase } from '@/lib/supabase';

import { refreshWhileForeground } from './foreground-refresh';
import {
  clearSessionPurgeFailure,
  takeSessionPersistenceFailure,
  takeSessionPurgeFailure,
} from './session-storage';

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
    // ADR-007 / binding ruling 17: THE FOREGROUND GATE, and everything behind it.
    //
    // This is ONE effect with ONE AppState subscription on purpose. REVIEW-021
    // finding 1 and REVIEW-021-ADVISORY finding 1 converged on the same defect
    // in the previous shape: the gate was real, but it did not stand in front of
    // every entrance. The cold-start bootstrap registered the auth listener and
    // called `getSession()` at mount, unconditionally with respect to AppState.
    //
    // The advisory traced the exact door, and corrected the reviewer of record
    // on the mechanism: `supabase-js` registers no auth listener of its own —
    // THIS APP'S `onAuthStateChange` registration is the trigger. Registration
    // schedules `_emitInitialSession` (`GoTrueClient.js:3640`), which enters
    // `_useSession` (`:2477`) → `__loadSession` (`:2496`), which calls
    // `_callRefreshToken` whenever the stored access token is inside the 90s
    // `EXPIRY_MARGIN_MS` (`:2521-2547`). Nothing on that path consults
    // `autoRefreshToken` — the flag gates `_recoverAndRefresh` (`:4104`) and the
    // ticker (`:4693`) only. The bootstrap `getSession()` was a second ungated
    // entrance into the same function.
    //
    // Because the trigger is this app's own call, the fix is in app code: both
    // entrances now sit behind the same `status === 'active'` gate as the
    // refresh evaluation. There are exactly TWO app-initiated entrances into
    // auth-js's on-demand refresh — the cold-start bootstrap below and the gate
    // evaluation — and neither can run before the first foreground.
    //
    // This effect still starts nothing and stops nothing. There is no ticker to
    // gate: `supabase.ts` sets `autoRefreshToken: false`, so the client never
    // schedules a refresh of its own. REVIEW-020 finding 1 proved with three
    // probes that `stopAutoRefresh()` is not a lifecycle barrier in pinned
    // auth-js 2.112.3, and the library offers no cancellation API, so ADR-007
    // removed the scheduler instead of patching it.
    let active = true;
    // Once any auth event has spoken, it is newer than the cold-start read.
    let supersededByEvent = false;
    let resolved = false;
    let bootstrapStarted = false;
    let evaluating = false;
    // ADR-007 item 3: a superseded session the store refused to delete. Held
    // until a later foreground evaluation actually gets rid of it.
    let purgeOutstanding = false;
    let bootstrapTimer: ReturnType<typeof setTimeout> | undefined;
    let subscription: { unsubscribe: () => void } | undefined;

    const resolveOnce = (next: AuthState) => {
      if (!active || supersededByEvent || resolved) return;
      resolved = true;
      setState(next);
    };

    /**
     * The cold-start read, started once and only while foreground.
     *
     * Deferred rather than removed: until the stored session has been read back
     * the answer to "is this user signed in?" is not known, and the app needs
     * that answer before it can show a screen. While the app is backgrounded it
     * has no screen to show, so deferring costs nothing the user can observe —
     * and it is what keeps the listener registration above from refreshing a
     * near-expiry stored session with no gate in front of it.
     */
    function startBootstrap(): void {
      bootstrapStarted = true;

      // Subscribed before the read below, so an event landing while
      // getSession() is still in flight is observed rather than dropped.
      ({
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        supersededByEvent = true;
        setState(stateForSession(session));
      }));

      // Covers the case the promise cannot: not rejecting, but never settling.
      bootstrapTimer = setTimeout(() => resolveOnce({ status: 'signedOut' }), BOOTSTRAP_TIMEOUT_MS);

      supabase.auth
        .getSession()
        // Ignored if an event already resolved the state: getSession() is the
        // cold-start bootstrap, not a later source of truth.
        .then(({ data }) => resolveOnce(stateForSession(data.session)))
        // Nothing readable came back. Signed out is the only safe resolution —
        // and it must be a resolution, or bootstrapping would never end.
        .catch(() => resolveOnce({ status: 'signedOut' }))
        .finally(() => clearTimeout(bootstrapTimer));
    }

    /**
     * Remove the stored session, and report whether the store actually did it.
     *
     * The return value is taken from the purge observer rather than from
     * whether `signOut()` rejected, because those are different questions.
     * `signOut({ scope: 'local' })` can reject for reasons that have nothing to
     * do with the delete — REVIEW-021 finding 2 reproduced exactly that: the
     * real composition rejected before cleanup ran and left the old session on
     * disk. The observer records what the STORE did, which is the fact that
     * decides whether a superseded session is still readable.
     */
    async function purgeStoredSession(): Promise<boolean> {
      clearSessionPurgeFailure();
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Best effort by necessity: the store that just refused a write may
        // refuse the deletes too. The flag below, not this rejection, is what
        // says whether the session is gone.
      }
      return takeSessionPurgeFailure() === null;
    }

    /**
     * ADR-007 item 3 / binding ruling 17 — a rotated token that was not stored
     * must not be used.
     *
     * By the time this runs the server has already rotated the refresh token, so
     * what is on disk is the SUPERSEDED one. Continuing against it is precisely
     * the path that ends days later inside Supabase's refresh-token reuse
     * detection, with the whole family revoked and no diagnostic trail.
     *
     * REVIEW-021 finding 2 held that the state transition alone is not durable
     * re-authentication, and it was right: a single best-effort removal that
     * the store refuses leaves the superseded session readable on the next cold
     * start. So the demand does not end here. `purgeOutstanding` keeps it alive
     * and every later foreground evaluation retries the removal until the store
     * accepts it — which is the point at which the residual actually stops
     * existing, rather than the point at which this function returns.
     */
    async function requireReauthentication(): Promise<void> {
      purgeOutstanding = !(await purgeStoredSession());
      // Unconditional, and deliberately not contingent on the removal: this
      // layer cannot force a refusing store, but it can refuse to keep using a
      // session it could not vouch for.
      if (active) setState({ status: 'signedOut' });
    }

    async function evaluate(status: AppStateStatus): Promise<void> {
      // One evaluation at a time. AppState can deliver several transitions
      // faster than a network round trip completes, and two overlapping
      // evaluations would race for the same persistence-failure flag — the
      // second consuming what the first needed to act on.
      if (evaluating) return;
      evaluating = true;
      try {
        // THE GATE, for the bootstrap as well as for the refresh. A provider
        // mounted while the app is already backgrounded initiates nothing at
        // all — no listener registration, no read, no refresh.
        if (status === 'active' && !bootstrapStarted) startBootstrap();

        const outcome = await refreshWhileForeground(status, {
          settleSession: () => supabase.auth.getSession(),
          takePersistenceFailure: takeSessionPersistenceFailure,
        });
        if (!active) return;

        if (outcome === 'unpersisted') {
          await requireReauthentication();
        } else if (outcome === 'settled' && purgeOutstanding) {
          // A refusal that has already forced re-authentication, whose removal
          // the store would not accept at the time. Retry it now that the store
          // is answering again.
          purgeOutstanding = !(await purgeStoredSession());
        }
      } finally {
        evaluating = false;
      }
    }

    // The current state, not an assumption about it.
    void evaluate(AppState.currentState);
    const appStateSubscription = AppState.addEventListener('change', (status) => {
      void evaluate(status);
    });

    return () => {
      active = false;
      if (bootstrapTimer) clearTimeout(bootstrapTimer);
      appStateSubscription.remove();
      subscription?.unsubscribe();
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
    // ADR-005: device-local, stated rather than inherited. auth-js defaults
    // `scope` to `'global'`, which revokes every session on the account — so
    // signing out on a phone would silently end the same user's session on
    // their tablet. In a multi-device second brain that is the wrong default
    // for the common case in order to serve the rare one.
    //
    // The accepted cost, recorded in ADR-005 rather than discovered later:
    // there is no remote revocation until a "sign out everywhere" affordance
    // exists, so a lost device's refresh token stays valid until it expires.
    return reportRatherThanThrow(async () => {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
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
