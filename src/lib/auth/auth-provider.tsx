import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { supabase } from '@/lib/supabase';

import { refreshWhileForeground } from './foreground-refresh';
import { clearReauthDemand, isReauthDemandOutstanding, recordReauthDemand } from './reauth-demand';
import { confirmSessionPurged, takeSessionPersistenceFailure } from './session-storage';

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
    // ADR-009 / binding ruling 20: the durable re-authentication demand, the
    // observed purge, and the app's own foreground choices — in that order.
    //
    // This is ONE effect with ONE AppState subscription on purpose. What it
    // does NOT claim matters as much as what it does: refresh entrances are
    // not enumerated and not gated. REVIEW-022 established by probe that
    // pinned supabase-js registers an internal auth listener during
    // construction and can refresh a near-expiry stored session before any
    // code in this file runs — an earlier version of this comment counted
    // "exactly TWO app-initiated entrances", and that count was false. Such
    // library-internal loads are recorded, expected behaviour under ADR-009;
    // they precede the demand consult below and are CONTAINED by it, never
    // prevented: whatever a construction-time refresh did, a refused write of
    // it was recorded durably at the write, and the purge that follows removes
    // what is on disk.
    //
    // This effect still starts nothing and stops nothing. There is no ticker
    // to gate: `supabase.ts` sets `autoRefreshToken: false`, so the client
    // never schedules a refresh of its own (confirmed by REVIEW-022's probe,
    // carried forward by ADR-009).
    let active = true;
    // Once any auth event has spoken, it is newer than the cold-start read.
    let supersededByEvent = false;
    let resolved = false;
    let bootstrapStarted = false;
    let evaluating = false;
    // ADR-009 requirement 2 — the durable demand, cached after one consult.
    // The DURABLE record lives in `reauth-demand.ts`; these two locals only
    // remember what it said so the store is not re-read on every transition.
    // Process restart resets them, which is now safe: the next process's first
    // foreground evaluation consults the durable store again.
    let demandConsulted = false;
    let demandOutstanding = false;
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
     * has no screen to show, so deferring costs nothing the user can observe.
     * Under ADR-009 the deferral is this app's own foreground choice, not a
     * boundary claim: the pinned client has entrances of its own — its
     * constructor registers an internal auth listener that can load and
     * refresh a stored session before this function runs — and those are
     * recorded behaviour, contained by the persistence guarantee rather than
     * prevented here.
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
     * The OBSERVED purge — ADR-009 requirement 1.
     *
     * `signOut({ scope: 'local' })` asks; the read-back answers. The return
     * value comes from `confirmSessionPurged()` — a read of the session's
     * complete enumerable key space — and from nothing else, because that
     * read-back is the ONLY proof of deletion this layer accepts. REVIEW-022
     * finding 3 showed what any weaker rule invites: pinned `signOut()` can
     * reject BEFORE removal was attempted (it loads, and can refresh, the
     * stored session on the way out), and the previous version read the
     * resulting silence of its removal observer as success. A rejection that
     * occurred before removal was attempted is NOT purged — and the read-back
     * below classifies it exactly that way, by finding the key space still
     * populated.
     *
     * When — and only when — the read-back proves the space empty, the durable
     * demand is cleared, best-effort, right here. There is no other clear on
     * the purge path.
     */
    async function observedPurge(): Promise<boolean> {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Deliberately ignored as EVIDENCE: a rejection here says nothing
        // about what is on disk, in either direction. The read-back below is
        // the verdict. (The user-facing `signOut` action is a different path
        // and still reports its errors.)
      }
      const empty = await confirmSessionPurged();
      if (empty) {
        try {
          await clearReauthDemand();
        } catch {
          // Clearing is best-effort by design: a demand that outlives a
          // proven-empty key space costs one redundant observed purge on the
          // next consult — the safe direction — and the clear is retried
          // there. It can never cause a session to be trusted.
        }
      }
      return empty;
    }

    /**
     * ADR-009 — a rotated token that was not stored must not be used, and the
     * demand to re-authenticate must survive process restart.
     *
     * By the time this runs the server has already rotated the refresh token,
     * so what is on disk is the SUPERSEDED one. Continuing against it is
     * precisely the path that ends days later inside Supabase's refresh-token
     * reuse detection, with the whole family revoked and no diagnostic trail.
     *
     * The demand is recorded DURABLY, FIRST — before the purge is attempted —
     * so a crash mid-purge leaves the record, not just the residual. (The
     * write path in `session-storage.ts` normally recorded it already, at the
     * refused write itself; this record is what makes the flag-driven path
     * independent of that.) Then the purge runs and is believed only as far
     * as the read-back proves it.
     */
    async function requireReauthentication(): Promise<void> {
      try {
        await recordReauthDemand('session-purge-pending');
      } catch {
        // The demand store refused. Durability across restart is lost for
        // this event — the recorded fallback, not a silent one: the purge
        // below still runs now, and `demandOutstanding` keeps THIS process
        // retrying. Nothing here proceeds to trust a session.
      }
      demandConsulted = true;
      demandOutstanding = !(await observedPurge());
      // Unconditional, and deliberately not contingent on the purge: this
      // layer cannot force a refusing store, but it can refuse to keep using
      // a session it could not vouch for.
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
        // THE GATE, for everything below it. A provider mounted while the app
        // is backgrounded initiates nothing at all — no demand read, no
        // listener registration, no session read, no refresh.
        if (status !== 'active') return;

        // ADR-009 requirement 2: consult the durable demand BEFORE this
        // provider exposes any session as usable. One consult per process,
        // cached; `requireReauthentication` keeps the cache current after.
        if (!demandConsulted) {
          try {
            demandOutstanding = await isReauthDemandOutstanding();
          } catch {
            // The store refused to answer, and refusal is not absence: assume
            // outstanding. The cost of being wrong is one observed purge of
            // an empty key space; the cost of assuming absence would be
            // trusting a residual session the demand exists to bar.
            demandOutstanding = true;
          }
          demandConsulted = true;
        }

        if (demandOutstanding) {
          // The observed purge comes BEFORE this provider's own
          // `getSession()`. REVIEW-022 found the order reversed — the
          // provider loaded (and could refresh) the very session it refused
          // to use, then retried the purge. While the demand is unmet,
          // nothing below runs: no bootstrap, no settle, no session exposed.
          demandOutstanding = !(await observedPurge());
          if (demandOutstanding) {
            if (active) setState({ status: 'signedOut' });
            return;
          }
        }

        if (!bootstrapStarted) startBootstrap();

        const outcome = await refreshWhileForeground(status, {
          settleSession: () => supabase.auth.getSession(),
          takePersistenceFailure: takeSessionPersistenceFailure,
        });
        if (!active) return;

        if (outcome === 'unpersisted') {
          await requireReauthentication();
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
