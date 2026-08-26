import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { supabase } from '@/lib/supabase';

import type { AuthState } from './auth-state-publisher';
import { useAuthStatePublisher } from './auth-state-publisher';
import { refreshWhileForeground } from './foreground-refresh';
import {
  clearReauthDemand,
  isReauthDemandOutstanding,
  recordReauthDemand,
  retryReauthDemandRecord,
} from './reauth-demand';
import {
  confirmSessionPurged,
  peekSessionPersistenceFailure,
  readBackStoredSession,
  takeSessionPersistenceFailure,
} from './session-storage';

/**
 * The state type lives beside the one gate that may publish it — the
 * REVIEW-024 finding-2 publication barrier in `auth-state-publisher.ts` —
 * and is re-exported here so consumers keep their import path.
 */
export type { AuthState } from './auth-state-publisher';

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
  // THE ONE PUBLICATION BARRIER — REVIEW-024 finding 2. Every state
  // publication below goes through `publish`, which re-checks the demand
  // signal and the write-refusal flag at publication time and refuses to
  // publish `signedIn` while either stands. The raw setter is a closure
  // variable of the hook and cannot be named here (`useState` in this file
  // is additionally lint-banned — see eslint.config.js).
  const { state, publish, setDemandSignal } = useAuthStatePublisher();

  // The bridge between the session effect (which owns the demand state) and
  // the `verifyOtp` action (which is where a fresh sign-in is known to have
  // completed). The effect assigns the real resolver; before the effect runs,
  // and after it cleans up, resolving is a no-op.
  const resolveDemandBySignInRef = useRef<() => Promise<void>>(async () => {});

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

    // The barrier's demand half reads THIS effect's cache, synchronously,
    // at every publication (REVIEW-024 finding 2). The flag half lives in
    // the barrier itself. Registered before anything below can publish.
    setDemandSignal(() => demandOutstanding);

    const resolveOnce = (next: AuthState) => {
      if (!active || supersededByEvent || resolved) return;
      resolved = true;
      publish(next);
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
        // WITHDRAWN AS AN INVARIANT (ruling 28, after REVIEW-025 finding 1):
        // "no path exposes a session while a re-authentication demand is
        // outstanding" is NOT established in general. It is demonstrated only
        // for the enumerated schedules in the committed probes — REVIEW-023's
        // pending-logout and the addendum's A2/A3; REVIEW-024's bootstrap,
        // mid-process, event-before-record, and fresh-sign-in resolution.
        // What this gate and the barrier check is publication INPUT: a newly
        // raised demand does not retract state queued before it, or standing
        // when it rose. The two REVIEW-025 schedules that end signedIn with
        // a demand outstanding ship as HIGH Known Issues with compensating
        // controls — the 006d evidence README's Known Issues register.
        //
        // The drop below is this listener's OWN, narrower choice, kept in
        // front of the barrier: an event arriving while either signal stands
        // is stale the moment it is delivered (the mid-purge TOKEN_REFRESHED
        // carrying the session being purged; the A2/A3 window where the
        // observer has recorded a refusal this provider's cache does not yet
        // reflect), and dropping it whole also keeps it from marking the
        // bootstrap superseded — a refused publication must not suppress the
        // bootstrap's own resolution. REVIEW-025's sign-out schedule measured
        // this drop's cost: dropping SIGNED_OUT(null) whole is part of what
        // leaves stale signedIn standing (Known Issue 1).
        //
        // A dropped sign-in is not lost: the app's own `verifyOtp` resolves
        // the demand once the fresh session is persisted AND read back (lead
        // 3), and events flow again the moment no demand stands.
        if (demandOutstanding || peekSessionPersistenceFailure() !== null) return;
        supersededByEvent = true;
        publish(stateForSession(session));
      }));

      // Covers the case the promise cannot: not rejecting, but never settling.
      bootstrapTimer = setTimeout(() => resolveOnce({ status: 'signedOut' }), BOOTSTRAP_TIMEOUT_MS);

      supabase.auth
        .getSession()
        // Ignored if an event already resolved the state: getSession() is the
        // cold-start bootstrap, not a later source of truth. THIS is the
        // publisher REVIEW-024 finding 2 named: the promise carries a session
        // across its await, and the pinned client can have refreshed — and
        // failed to persist — that session in the interval. The barrier
        // re-checks the demand and the flag at the publication itself, so a
        // session the observer has since refused resolves to signedOut here
        // rather than being exposed.
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
     * EXPOSURE ENDS FIRST — REVIEW-023 finding 2, under ruling 25: signedOut
     * is set BEFORE any await in this function, exactly as the
     * outstanding-at-bootstrap branch already does. The purge's network legs
     * have no application timeout, so a logout held pending indefinitely must
     * strand the purge retry, never the state change — the reviewer's
     * schedule held the logout fetch open and watched the provider keep
     * exposing signedIn until it settled. Setting `demandOutstanding` in the
     * same breath closes the listener door: the purge's own internal refresh
     * emits TOKEN_REFRESHED, and the gate in `startBootstrap` drops it while
     * the demand stands.
     *
     * Then the demand is recorded DURABLY — before the purge is attempted —
     * so a crash mid-purge leaves the record, not just the residual. (The
     * write path in `session-storage.ts` normally recorded it already, at the
     * refused write itself; this record is what makes the flag-driven path
     * independent of that.) Then the purge runs and is believed only as far
     * as the read-back proves it.
     */
    async function requireReauthentication(): Promise<void> {
      demandConsulted = true;
      demandOutstanding = true;
      // Deliberately not contingent on anything below: this layer cannot
      // force a refusing store, but it can refuse to keep using a session it
      // could not vouch for — from this moment.
      if (active) publish({ status: 'signedOut' });
      try {
        await recordReauthDemand('session-purge-pending');
      } catch {
        // record() never rejects by contract (ruling 25: a refused backend
        // write is held in memory and retried). Absorbed anyway — nothing on
        // this path may throw, and nothing here proceeds to trust a session.
      }
      demandOutstanding = !(await observedPurge());
    }

    /**
     * REVIEW-023-ADVISORY lead 3 (P3/B2) — a fresh sign-in RESOLVES the
     * demand. Re-authentication is what the demand asks for: once a new
     * sign-in's session is PERSISTED AND READ BACK, purging it would destroy
     * exactly what the demand existed to obtain. The advisory's B2 probe
     * showed the cost of not resolving: a sign-in that reports success, is
     * never exposed, and is then swept by the stale demand's purge.
     *
     * Resolution is deliberately narrow. It runs only from the app's own
     * `verifyOtp` success — the one entrance that mints a new session; no
     * auth EVENT resolves anything (lead 1's gate stays unconditional). And
     * it resolves only on evidence: no unconsumed write-refusal flag (a
     * refused persist means the "fresh" session exists nowhere durable) and
     * the key space actually reading the session back. Anything less keeps
     * the demand, at the disclosed conservative cost of one consumed
     * sign-in.
     *
     * The `evaluating` latch serialises this against the purge machinery: a
     * purge already in flight when the sign-in completes could otherwise
     * sweep the fresh session after the read-back saw it. Skipping the
     * resolution in that window falls toward the old conservative behaviour
     * — the safe direction — never toward exposure.
     */
    async function resolveDemandByFreshSignIn(): Promise<void> {
      if (evaluating) return;
      evaluating = true;
      try {
        if (!demandOutstanding) return;
        if (peekSessionPersistenceFailure() !== null) return;
        const storedSession = await readBackStoredSession();
        if (storedSession === null) return;
        demandOutstanding = false;
        try {
          await clearReauthDemand();
        } catch {
          // The durable record could not be removed; it remains for the next
          // process, whose consult will purge — costing the disclosed one
          // conservative re-authentication after a restart. This process has
          // the read-back evidence and proceeds. Never a trusted session
          // that should not be: the record's survival errs toward purging.
        }
        if (!active) return;
        if (!bootstrapStarted) {
          // The demand-at-mount path (the advisory's B2): nothing was
          // registered while the demand stood, so the ordinary bootstrap now
          // reads the fresh session and resolves the state from it.
          startBootstrap();
          return;
        }
        // The mid-process path: the listener was registered but the gate
        // dropped the sign-in event. Re-read and expose — through the
        // barrier: this getSession() can itself refresh the fresh session
        // and have THAT persist refused (the REVIEW-024 mid-process reread
        // schedule), so the publication re-checks the demand and the flag
        // and resolves to signedOut when either has been raised since.
        const { data } = await supabase.auth.getSession();
        if (active && data.session) {
          supersededByEvent = true;
          publish(stateForSession(data.session));
        }
      } finally {
        evaluating = false;
      }
    }
    resolveDemandBySignInRef.current = resolveDemandByFreshSignIn;

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
          // With a demand outstanding the resolution is signedOut whatever
          // the purge below achieves, so it is set BEFORE the await: the
          // purge's network legs have no timeout of their own, and a
          // never-settling fetch must strand the purge retry, not the UI on
          // a frozen splash. If the purge verifies, the bootstrap that
          // follows re-resolves the state from an empty store.
          if (active) publish({ status: 'signedOut' });
          // Ruling 25's "foreground / purge retry" opportunity: a demand that
          // could only be held in memory — every medium refused at the time —
          // gets its durable record retried here, before the purge below. A
          // no-op when nothing is held; never rejects.
          await retryReauthDemandRecord();
          // The observed purge comes BEFORE this provider's own
          // `getSession()`. REVIEW-022 found the order reversed — the
          // provider loaded (and could refresh) the very session it refused
          // to use, then retried the purge. While the demand is unmet,
          // nothing below runs: no bootstrap, no settle, no session exposed.
          demandOutstanding = !(await observedPurge());
          if (demandOutstanding) return;
        }

        if (!bootstrapStarted) startBootstrap();

        const outcome = await refreshWhileForeground(status, {
          settleSession: () => supabase.auth.getSession(),
          // Consuming the flag and raising the demand cache are ONE
          // synchronous act (REVIEW-024 finding 2's class). The take clears
          // the flag — the barrier's second signal — so if the cache were
          // raised only later, inside `requireReauthentication` beyond an
          // await boundary, an event in that interval would find both
          // signals down while a demand truth stood.
          takePersistenceFailure: () => {
            const failure = takeSessionPersistenceFailure();
            if (failure !== null) {
              demandConsulted = true;
              demandOutstanding = true;
            }
            return failure;
          },
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
      resolveDemandBySignInRef.current = async () => {};
      setDemandSignal(() => false);
      if (bootstrapTimer) clearTimeout(bootstrapTimer);
      appStateSubscription.remove();
      subscription?.unsubscribe();
    };
    // Both are stable useCallback([]) values from the publisher hook; listed
    // so the linter can see it. The effect still runs once.
  }, [publish, setDemandSignal]);

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
      // A completed sign-in is the one thing that may resolve an outstanding
      // re-authentication demand (REVIEW-023-ADVISORY lead 3) — and only
      // after the effect verifies the new session is persisted and reads
      // back. A no-op when no demand stands.
      if (!error) await resolveDemandBySignInRef.current();
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
