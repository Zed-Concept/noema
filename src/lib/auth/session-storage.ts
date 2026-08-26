import type { SupportedStorage } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { ReauthDemandHandle } from './reauth-demand';
import { reauthDemand } from './reauth-demand';
import type { ChunkedSecureStore } from './secure-store-adapter';
import { createChunkedSecureStore } from './secure-store-adapter';

/**
 * The key the Supabase client persists the session under, passed to
 * `createClient` as `auth.storageKey` in `supabase.ts`.
 *
 * EXPLICIT, NOT DERIVED. Left unset, the pinned client derives this from the
 * project URL inside its own constructor. ADR-009 requirement 1 makes the
 * session layer read this key space back to prove a purge happened, so the
 * key must be knowable HERE — and re-deriving the library's formula in app
 * code is exactly the reading-of-internals that learning 20 and ADR-009 warn
 * against: it silently breaks on any upgrade that changes the formula.
 * Setting the documented public option makes the key an app constant that the
 * client, this module, and the evidence probes all share.
 *
 * The transition from the derived default is out of this unit's scope by
 * owner ruling 26; the scope ruling and its ground live in the evidence
 * record, not here — code does not assert the world.
 */
export const AUTH_SESSION_STORAGE_KEY = 'zc-auth-session';

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
 * WHY THIS EXISTS — ADR-009, binding ruling 20
 * ---------------------------------------------------------------------------
 *
 * The danger ADR-009 names is not that a refresh happened. It is that a
 * ROTATED TOKEN VANISHED AND NOBODY NOTICED. When `_saveSession` cannot write,
 * the server has already rotated the refresh token, so what remains on disk is
 * the SUPERSEDED one. Continuing against it is how a session dies days later
 * inside Supabase's refresh-token reuse detection, with no diagnostic trail.
 *
 * Detection sits AT THE WRITE, not at the initiator. That is what makes it
 * indifferent to how many refresh entrances exist — ADR-009 records that they
 * are not enumerable — because every failing session write lands here no
 * matter what initiated it.
 *
 * This in-process flag is one of TWO records a refused session write now
 * leaves. The other is the durable demand (`reauth-demand.ts`), written FIRST,
 * which survives process restart — REVIEW-022 finding 3 established that this
 * flag alone does not. The flag remains because the two answer different
 * consumers: the demand tells the NEXT process not to trust the disk; this
 * flag tells THIS process's foreground evaluation to act now.
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
 * write there is NOT observed and no claim is made that it is (ADR-008).
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

/** Drop any outstanding failure. Test seam. */
export function clearSessionPersistenceFailure(): void {
  lastPersistenceFailure = null;
}

/**
 * Record whether each session write landed, then decide what the library sees.
 *
 * A decorator, deliberately, rather than a change inside the adapter. ADR-004
 * names the adapter the highest-risk code in the repo and constrains it to stay
 * minimal; observing writes is a session-layer concern and does not belong in
 * the module that must remain small enough to audit by reading.
 *
 * ---------------------------------------------------------------------------
 * A REFUSED SESSION WRITE IS RECORDED AND ABSORBED — ADR-009 requirement 3
 * ---------------------------------------------------------------------------
 *
 * The previous version rethrew every refused write. REVIEW-022 observed what
 * that does inside the pinned client: `_callRefreshToken` both rejects its
 * internal Deferred and throws to the initiating chain, so one refused write
 * produced TWO unhandled `refused-session-write` rejections that no caller
 * could consume. The library's throw-and-reject path is not this module's to
 * fix, but it is this module's not to enter.
 *
 * So for the session key the order is now: demand FIRST, in-process flag
 * second, then RESOLVE. By the time auth-js resumes, the refusal is already
 * recorded — durably when any medium answers — and the library is told
 * nothing it would turn into an unhandled rejection. The refusal still
 * surfaces — through the flag to this process's foreground evaluation, and
 * through the demand to every process after it.
 *
 * ABSORBED IN EVERY CASE — ruling 25 (owner, 2026-08-26). When the DEMAND
 * write is also refused, the refusal is STILL absorbed: `record()` holds the
 * demand in memory and its durable record is retried on every later
 * opportunity — the next write through this observer (below), the next
 * foreground evaluation, the next purge retry — until a medium answers or
 * the process ends. An earlier version rethrew the original cause here as a
 * recorded fail-closed fallback; REVIEW-023 finding 1 measured what that
 * fallback re-entered — two unhandled rejections from the pinned client's
 * throw-and-reject path, and a restart that had forgotten the demand — and
 * ruling 25 withdrew it: R3 is unqualified, and R2 holds whenever any
 * durable medium accepts a write. The schedule where every medium refuses
 * and the process dies first is the ruling-25 Known limit, recorded with its
 * server-side bound in `reauth-demand.ts` and the evidence README.
 *
 * A SUCCESSFUL session write does NOT clear the demand. An earlier version
 * cleared it here, reasoning that a completed write proves the disk holds
 * the newest session — and this unit's own adversarial review found what
 * that invites: `signOut()` refreshes the residual on its way out
 * (REVIEW-022 finding 2, recorded behaviour), so the purge's OWN internal
 * write could erase a 'session-purge-pending' demand while the purge it
 * records was still unproven, and a crash in the window that follows left
 * a readable session with no durable record — the exact restart hole the
 * demand exists to close. So the demand now ends in exactly one place:
 * `auth-provider.tsx`'s observed purge, on read-back proof. The cost is one
 * conservative re-authentication after a recovery write — which the sticky
 * flag below was already going to force — never a cleared demand that
 * should not be.
 */
export function observingWrites(
  inner: ChunkedSecureStore,
  demand: ReauthDemandHandle = reauthDemand,
): ChunkedSecureStore {
  return {
    getItem: (key) => inner.getItem(key),
    setItem: async (key, value) => {
      // Ruling 25's "next write" opportunity: a demand held in memory because
      // every medium refused earlier gets its durable record retried before
      // this write proceeds. A no-op when nothing is held; never rejects.
      await demand.retryHeldRecord();
      try {
        await inner.setItem(key, value);
      } catch (cause) {
        if (key === AUTH_SESSION_STORAGE_KEY) {
          try {
            await demand.record('session-write-refused');
          } catch {
            // record() never rejects by contract (a refused backend write is
            // held in memory instead — ruling 25). Absorbed anyway: R3 is
            // unqualified, so no path out of this branch may rethrow.
          }
          lastPersistenceFailure = { key, cause };
          return;
        }
        // Non-session keys keep the observe-and-rethrow contract: nothing
        // auth-js does with them enters the Deferred path a session persist
        // does, and absorbing their failures would claim more than ADR-009
        // asks for.
        lastPersistenceFailure = { key, cause };
        throw cause;
      }
      // The demand is NOT cleared on success — see the header. Only the
      // observed purge's read-back proof ends it.
      //
      // The flag is NOT cleared on success. REVIEW-021 finding 2 reproduced
      // the defect that rule removes: a refused rotation of v2 followed by a
      // successful write of v3 erased the outstanding failure before the
      // foreground consumer had read it, and the refusal was never surfaced.
      // STICKY UNTIL TAKEN; `takeSessionPersistenceFailure()` is the only
      // thing that consumes it in production.
    },
    // Removals pass through untouched. The previous version kept a second
    // flag here — `lastPurgeFailure`, recording a refused delete — and
    // REVIEW-022 finding 3 showed what that instrument invited: the absence
    // of its record was read as proof of deletion, when auth-js can reject
    // before any delete is attempted. ADR-009 requirement 1 replaces
    // inference with observation — `confirmSessionPurged()` below reads the
    // key space back — so the flag is deleted rather than repaired. A refused
    // delete still rejects out of the adapter itself, and still reaches the
    // user as a failed sign-out.
    removeItem: (key) => inner.removeItem(key),
    confirmRemoved: (key) => inner.confirmRemoved(key),
  };
}

/**
 * The adapter instance behind the observer, kept so the read-back below can
 * reach it. Null on web, where no adapter exists at all.
 */
const nativeAdapter: ChunkedSecureStore | null =
  Platform.OS === 'web' ? null : createChunkedSecureStore();

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
export const authSessionStorage: SupportedStorage | undefined = nativeAdapter
  ? observingWrites(nativeAdapter)
  : undefined;

/**
 * ADR-009 requirement 1 — is the session's key space PROVEN empty?
 *
 * This is the read-back `auth-provider.tsx` treats as the only proof that a
 * recovery purge happened. It asks the adapter to read the complete
 * enumerable key space under `AUTH_SESSION_STORAGE_KEY` — the index and every
 * chunk key of both generations, the same space `removeItem` sweeps — and
 * returns true only when every read succeeded and found nothing. A `signOut()`
 * that rejected before any delete ran, the case REVIEW-022 finding 3 showed
 * being misread as success, leaves the space populated and this returns false.
 *
 * Deliberately NOT routed through the write observer: observation must never
 * be able to record or clear anything, or the proof would perturb what it
 * proves. It reads through the same serialization queue as every other
 * adapter operation, so it cannot catch a write mid-transition.
 *
 * On web there is no adapter and no observer, so there is nothing this could
 * prove: it returns false, and nothing is claimed (ADR-008). No production
 * web path calls it — no demand is ever recorded there to trigger one.
 */
export function confirmSessionPurged(): Promise<boolean> {
  if (!nativeAdapter) return Promise.resolve(false);
  return nativeAdapter.confirmRemoved(AUTH_SESSION_STORAGE_KEY);
}

/**
 * REVIEW-023-ADVISORY lead 3 (P3/B2) — the read-back half of "persisted and
 * read back", for resolving a demand by a fresh sign-in.
 *
 * Returns the stored session payload when the key space READS BACK a value,
 * and null for everything else — including a refused read: resolving a
 * demand is the permissive act, so refusal falls toward NOT resolving, the
 * safe direction (the opposite of `isOutstanding`, where refusal falls
 * toward outstanding, for the same reason).
 *
 * Read-only, through the same serialized adapter as every other operation.
 * On web there is no adapter and no demand to resolve; null.
 */
export function readBackStoredSession(): Promise<string | null> {
  if (!nativeAdapter) return Promise.resolve(null);
  return nativeAdapter.getItem(AUTH_SESSION_STORAGE_KEY).catch(() => null);
}
