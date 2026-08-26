import type { AppStateStatus } from 'react-native';

import type { SessionPersistenceFailure } from './session-storage';

/**
 * The app's deliberate foreground settle path, as one function with injected
 * dependencies.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS GATE IS UNDER ADR-009, AND WHY THIS IS A MODULE
 * ---------------------------------------------------------------------------
 *
 * ADR-005 asked for a refresh that "only ever fires while foreground";
 * REVIEW-020 finding 1 proved the client could not be made to honour that
 * while it scheduled its own refreshes, and `supabase.ts` therefore sets
 * `autoRefreshToken: false`. Three fix cycles then tried to put every
 * remaining entrance behind this gate, and ADR-009 records the outcome:
 * refresh entrances are NOT enumerable and NOT gated. Pinned supabase-js
 * refreshes from construction, from session loading, and from `signOut()`,
 * with no AppState check on any of those paths — an earlier version of this
 * comment counted "exactly TWO app-initiated entrances", and REVIEW-022
 * finding 2 disproved the count.
 *
 * So this function no longer carries a boundary claim. It is the app's OWN
 * settle call, deliberately made only while foreground — a choice about when
 * this app asks, not a claim about when refreshes happen. What contains a
 * refresh this gate never initiated is the persistence guarantee: detection at
 * the write (`session-storage.ts`), a durable re-authentication demand
 * (`reauth-demand.ts`), and a purge proven by read-back (ADR-009).
 *
 * It is a module rather than an inline effect body because of what REVIEW-020
 * finding 1 said about the previous evidence: the provider tests "replace the
 * whole auth client with method spies ... they prove only that
 * `startAutoRefresh` or `stopAutoRefresh` was called". A gate whose decision
 * lives inside a `useEffect` can only be tested that way. A gate that takes its
 * dependencies as arguments can be driven directly, with a real backend double
 * underneath, and its decision observed rather than inferred from a spy.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT CLAIM
 * ---------------------------------------------------------------------------
 *
 * It is not evidence about a locked device: ADR-009 keeps locked-device
 * behaviour NOT RUN and NOT CLAIMED in Phase A and carries a named
 * physical-device test into Phase B. Nothing here observes a keychain under
 * lock, because nothing in Phase A can.
 *
 * It is also not a cross-platform claim. `takePersistenceFailure` can only
 * report what the write observer saw, and per ADR-008 / binding ruling 18 that
 * observer exists on NATIVE ONLY: web storage is `localStorage` through the
 * `supabase-js` default and never reaches the observed adapter. On web this
 * gate still holds its own foreground choice, but an `unpersisted` outcome is
 * not available to it, so a refused web write returns `settled`. Web surfacing
 * is deferred and named in ADR-008, not claimed here.
 */

/**
 * What one foreground evaluation did. Three cases, deliberately, because the
 * caller must act differently on exactly one of them.
 */
export type ForegroundRefreshOutcome =
  /** The gate held. Nothing was initiated, because the app is not foreground. */
  | 'not-foreground'
  /** The client settled the session. Nothing needs surfacing. */
  | 'settled'
  /**
   * A session write was refused, so a rotated token may have been lost. The
   * caller must require re-authentication — see `AuthProvider`.
   */
  | 'unpersisted';

export type ForegroundRefreshDeps = {
  /**
   * Ask the auth client to settle the stored session, refreshing it on demand
   * if it is inside auth-js's 90s `EXPIRY_MARGIN_MS`.
   *
   * In the app this is `supabase.auth.getSession()`. `getSession()` rather than
   * `refreshSession()` on purpose: `__loadSession` already calls
   * `_callRefreshToken` exactly when the stored access token is near expiry
   * (`GoTrueClient.js:2554`), so `getSession()` refreshes when a refresh is due
   * and performs no network round trip when it is not. Calling
   * `refreshSession()` here instead would rotate the token on every single
   * foreground transition — more rotations, more chances to lose one, and no
   * property gained. This is also the recovery path ADR-009 carries forward
   * for a long-backgrounded session.
   */
  readonly settleSession: () => Promise<unknown>;

  /**
   * Read and clear the outstanding session-write failure. In the app this is
   * `takeSessionPersistenceFailure` from `session-storage.ts`.
   */
  readonly takePersistenceFailure: () => SessionPersistenceFailure | null;
};

/**
 * Evaluate the gate for one AppState value.
 *
 * `status !== 'active'` is the gate, and it is a whole-function early return
 * rather than a condition wrapped around the call: when the app is not
 * foreground this function initiates NOTHING. There is no ticker to stop,
 * because `autoRefreshToken: false` means one was never started (ADR-009
 * carries that forward).
 */
export async function refreshWhileForeground(
  status: AppStateStatus,
  deps: ForegroundRefreshDeps,
): Promise<ForegroundRefreshOutcome> {
  if (status !== 'active') return 'not-foreground';

  try {
    await deps.settleSession();
  } catch {
    // Swallowed HERE and only here, because a rejection is ambiguous on its
    // own: an unreadable store, a dead network, and a rotated-but-unwritten
    // session all arrive as one. The flag below is what distinguishes them.
    // Signing a user out on every transient foreground error would be its own
    // defect, so the rejection alone is not allowed to force re-authentication.
  }

  // Checked AFTER the call, and checked whether or not it threw. Under
  // ADR-009 the observer records a refused session write and RESOLVES, so a
  // settle whose rotated write was refused typically completes without any
  // rejection at all. The flag records the write itself, which is the fact
  // ADR-009's persistence guarantee is actually about.
  return deps.takePersistenceFailure() ? 'unpersisted' : 'settled';
}
