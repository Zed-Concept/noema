import type { SupportedStorage } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { ChunkedSecureStore } from './secure-store-adapter';
import { createChunkedSecureStore } from './secure-store-adapter';

/**
 * A session write that the store refused.
 *
 * `cause` is whatever the adapter rejected with. It is never inspected here and
 * never logged: a failed write's error text is not token material, but this
 * module has no reason to handle it and every reason not to widen what touches
 * the auth path.
 */
export type SessionPersistenceFailure = {
  readonly key: string;
  readonly cause: unknown;
};

/**
 * The most recent session write, remembered only when it FAILED.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS — ADR-007 item 3, binding ruling 17
 * ---------------------------------------------------------------------------
 *
 * The danger ADR-007 names is not that a refresh happened. It is that a
 * ROTATED TOKEN VANISHED AND NOBODY NOTICED. When `_saveSession` cannot write,
 * the server has already rotated the refresh token, so what remains on disk is
 * the SUPERSEDED one. Continuing against it is how a session dies days later
 * inside Supabase's refresh-token reuse detection, with no diagnostic trail.
 *
 * auth-js does propagate that failure — a non-`AuthError` thrown out of
 * `_saveSession` is rethrown by `_callRefreshToken`
 * (`GoTrueClient.js:4301`) and again by `_refreshSession`
 * (`GoTrueClient.js:3229`) — but a propagated rejection is indistinguishable
 * at the call site from a network failure or an unreadable store. Only one of
 * those means "a rotated token is now lost". This flag is what tells them
 * apart, so the session layer can require re-authentication for the one case
 * that warrants it instead of signing users out on any transient error.
 *
 * ---------------------------------------------------------------------------
 * SCOPE — what this observes and what it does not
 * ---------------------------------------------------------------------------
 *
 * COVERED: every `setItem` issued through this module's adapter instance, on
 * native, in one JS runtime. That is every session persist auth-js performs on
 * iOS and Android, because `supabase.ts` hands it exactly this object.
 *
 * NOT COVERED: web. `Platform.OS === 'web'` gets `undefined` so `supabase-js`
 * uses its own `localStorage`, which this module never sees — a quota-exceeded
 * write there is NOT observed and no claim is made that it is.
 *
 * NOT COVERED BY THIS FLAG: `removeItem`. A refused removal is a different
 * fact about a different operation, and it is recorded separately below in
 * `lastPurgeFailure` rather than folded in here. Two flags, because the session
 * layer must act differently on each: a refused WRITE means a rotated token was
 * lost and the session must be abandoned; a refused REMOVAL means a session that
 * has already been abandoned is still on disk and must be deleted again. Merging
 * them would widen each past the claim it exists to support, and learning 12 is
 * explicit that a claim is bound to its instrument.
 *
 * Module scope, like the adapter singleton it wraps, and for the same reason:
 * there is exactly one session store per runtime.
 */
let lastPersistenceFailure: SessionPersistenceFailure | null = null;

/** Read the outstanding failure without consuming it. */
export function peekSessionPersistenceFailure(): SessionPersistenceFailure | null {
  return lastPersistenceFailure;
}

/**
 * Read and clear the outstanding failure.
 *
 * Read-and-clear rather than read: the session layer acts on this exactly once
 * per failed write. Leaving it set would force re-authentication again on the
 * next foreground, including after the user has successfully signed back in.
 */
export function takeSessionPersistenceFailure(): SessionPersistenceFailure | null {
  const failure = lastPersistenceFailure;
  lastPersistenceFailure = null;
  return failure;
}

/** Drop any outstanding failure. Test seam; also called on a successful write. */
export function clearSessionPersistenceFailure(): void {
  lastPersistenceFailure = null;
}

/**
 * The most recent session REMOVAL, remembered only when the store refused it.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS — REVIEW-021 finding 2
 * ---------------------------------------------------------------------------
 *
 * Forcing `signedOut` is not the same thing as making a superseded session
 * stop existing. REVIEW-021 reproduced the gap: the real composition rejected
 * before cleanup ran and left the old session on disk, and `signOut()`
 * rejecting tells the caller nothing about whether the delete happened — it
 * can reject for reasons upstream of the store entirely.
 *
 * This flag answers the narrower question the caller actually needs: did the
 * STORE remove it? `auth-provider.tsx` reads it after every forced
 * re-authentication and retries the removal on each later foreground
 * evaluation until it comes back clear.
 *
 * Kept separate from `lastPersistenceFailure` on purpose — see the scope note
 * above.
 */
let lastPurgeFailure: SessionPersistenceFailure | null = null;

/** Read the outstanding removal failure without consuming it. */
export function peekSessionPurgeFailure(): SessionPersistenceFailure | null {
  return lastPurgeFailure;
}

/** Read and clear the outstanding removal failure. */
export function takeSessionPurgeFailure(): SessionPersistenceFailure | null {
  const failure = lastPurgeFailure;
  lastPurgeFailure = null;
  return failure;
}

/**
 * Drop any outstanding removal failure.
 *
 * Called immediately BEFORE an attempted purge, so that what is read afterwards
 * describes that attempt rather than an older one. Also a test seam.
 */
export function clearSessionPurgeFailure(): void {
  lastPurgeFailure = null;
}

/**
 * Record whether each session write landed, then let the result through
 * unchanged.
 *
 * A decorator, deliberately, rather than a change inside the adapter. ADR-004
 * names the adapter the highest-risk code in the repo and constrains it to stay
 * minimal; observing writes is a session-layer concern and does not belong in
 * the module that must remain small enough to audit by reading.
 *
 * The rejection is RETHROWN. This observes; it does not absorb. A caller that
 * would have seen the failure still sees it.
 */
export function observingWrites(inner: ChunkedSecureStore): ChunkedSecureStore {
  return {
    getItem: (key) => inner.getItem(key),
    setItem: async (key, value) => {
      try {
        await inner.setItem(key, value);
      } catch (cause) {
        lastPersistenceFailure = { key, cause };
        throw cause;
      }
      // NOT cleared on success. REVIEW-021 finding 2 reproduced the defect this
      // removes: a refused rotation of session v2 followed by a successful write
      // of v3 erased the outstanding failure before the foreground consumer had
      // read it, and the refusal was never surfaced at all. A later write
      // succeeding does not un-lose the token that the earlier one dropped.
      //
      // The flag is therefore STICKY UNTIL TAKEN, and
      // `takeSessionPersistenceFailure()` is the only thing that consumes it in
      // production. That is also why this cannot loop: the consumer clears it as
      // it acts, so a single refused write forces re-authentication exactly once
      // and the sign-in that follows is unaffected.
    },
    removeItem: async (key) => {
      try {
        await inner.removeItem(key);
      } catch (cause) {
        // A removal the store refused leaves a session on disk that the session
        // layer has already decided not to trust — after a refused rotation, the
        // SUPERSEDED one. `auth-provider.tsx` keeps retrying the removal while
        // this is set, so the residual stops existing rather than merely being
        // disclosed. Rethrown, like the write above: this observes, it does not
        // absorb, and a failed sign-out still reaches the user as an error.
        lastPurgeFailure = { key, cause };
        throw cause;
      }
      lastPurgeFailure = null;
    },
  };
}

/**
 * Which storage the auth client persists the session into, decided per
 * platform and stated here rather than inferred anywhere downstream.
 *
 * Native (iOS, Android) gets the chunked SecureStore adapter, wrapped in the
 * write observer above: the keychain and the Android keystore are the only
 * places on those platforms where a session belongs.
 *
 * Web gets `undefined` — deliberately, not by omission. `supabase-js` reads
 * this option as `if (settings.storage) { ... } else { localStorage }`
 * (`GoTrueClient.ts`, inside the `persistSession` branch), so a falsy value
 * selects its own `localStorage` default. `expo-secure-store` has no web
 * implementation beyond an empty stub — every method call there is a TypeError
 * — so routing web through the adapter would break the client outright.
 *
 * The branch is written as an explicit `Platform.OS === 'web'` test so the
 * split is visible in code review, not a consequence of module resolution.
 */
export const authSessionStorage: SupportedStorage | undefined =
  Platform.OS === 'web' ? undefined : observingWrites(createChunkedSecureStore());
