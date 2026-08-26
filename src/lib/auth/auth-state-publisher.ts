import type { Session } from '@supabase/supabase-js';
import { useCallback, useRef, useState } from 'react';

import { peekSessionPersistenceFailure } from './session-storage';

/**
 * Session state as three mutually exclusive cases.
 *
 * `bootstrapping` is not a flavour of signed out. Until the stored session has
 * been read back and resolved, the answer to "is this user signed in?" is not
 * yet known, and a route guard that collapses the two would redirect a
 * returning signed-in user to the sign-in screen on every cold start. Keeping
 * it a distinct case makes that mistake a type error rather than a judgement
 * call at each call site.
 *
 * The type lives HERE, beside the one gate that may publish a value of it —
 * see `useAuthStatePublisher` below. `auth-provider.tsx` re-exports it.
 */
export type AuthState =
  | { readonly status: 'bootstrapping' }
  | { readonly status: 'signedIn'; readonly session: Session }
  | { readonly status: 'signedOut' };

/**
 * THE ONE PUBLICATION BARRIER — REVIEW-024 finding 2.
 *
 * Every publication of provider auth state flows through the `publish`
 * returned here, and `publish` re-checks the re-authentication demand and the
 * unconsumed write-refusal flag AT PUBLICATION TIME — after whatever awaits
 * the caller performed — refusing to publish `signedIn` while either stands.
 *
 * WHY A BARRIER AND NOT ANOTHER GATE. REVIEW-023 closed the listener's exact
 * schedules with a gate at the listener; REVIEW-024 then found the same
 * exposure class recurring through a DIFFERENT publisher — the bootstrap
 * `getSession()` promise, which carried a rotated session across its await
 * and published it after a new demand had been recorded. Gating publishers
 * one by one is schedule-patching: every enumeration invites the next missed
 * publisher. The barrier inverts that: the check lives at the single point
 * every publication must pass, so a publisher added tomorrow is gated on the
 * day it is written.
 *
 * NO OTHER ROUTE TO THE SETTER EXISTS, as a scope-level fact rather than a
 * convention: the raw `useState` setter is a closure variable of this hook
 * and is never returned, so no code outside this function can name it —
 * TypeScript rejects the reference. `eslint.config.js` additionally bans
 * `useState` inside `auth-provider.tsx`, so the provider cannot mint a second
 * setter; and `auth-state-publisher.test.ts` asserts this module contains
 * exactly one `useState` and one `setState` call site.
 *
 * WHAT REFUSAL DOES. A refused `signedIn` publishes `signedOut` instead —
 * never a silent drop. The two signals both mean exactly that: a session the
 * provider cannot vouch for is not usable, which is the same resolution
 * `requireReauthentication` publishes. Dropping silently would strand
 * `bootstrapping` when the refused publication was the bootstrap's own
 * resolution — the frozen-splash failure the bootstrap timeout exists to
 * prevent.
 *
 * THE TWO SIGNALS, both synchronously readable at publication time:
 *
 * - the DEMAND, via the predicate the session effect registers with
 *   `setDemandSignal` — the provider's consulted demand cache, current from
 *   the first synchronous instant `requireReauthentication` or the consult
 *   raises it;
 * - the FLAG, `peekSessionPersistenceFailure()` — the write observer's
 *   record, installed synchronously at the refusal itself
 *   (`session-storage.ts`), which covers the window where the observer knows
 *   of a refusal the provider's cache does not yet reflect.
 *
 * The registered predicate defaults to "no demand" only before the session
 * effect runs — no publisher exists before then, because every publisher
 * lives inside that effect.
 */
export function useAuthStatePublisher(): {
  readonly state: AuthState;
  readonly publish: (next: AuthState) => void;
  readonly setDemandSignal: (isOutstanding: () => boolean) => void;
} {
  const [state, setState] = useState<AuthState>({ status: 'bootstrapping' });
  const demandSignalRef = useRef<() => boolean>(() => false);

  const publish = useCallback((next: AuthState) => {
    if (
      next.status === 'signedIn' &&
      (demandSignalRef.current() || peekSessionPersistenceFailure() !== null)
    ) {
      setState({ status: 'signedOut' });
      return;
    }
    setState(next);
  }, []);

  const setDemandSignal = useCallback((isOutstanding: () => boolean) => {
    demandSignalRef.current = isOutstanding;
  }, []);

  return { state, publish, setDemandSignal };
}
