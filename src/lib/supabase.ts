import { createClient } from '@supabase/supabase-js';

import { authSessionStorage } from './auth/session-storage';
import type { Database } from './database.types';

// EXPO_PUBLIC_* values are inlined into client bundles by Expo at build time;
// only publishable-class keys may ever live in them.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Supabase is not configured: EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must both be set. ' +
      'Copy .env.example to .env and fill in the staging values (owner-held).',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    // Persistence is on as of the auth unit, and it must be: `supabase-js`
    // consults the `storage` option only inside its `persistSession` branch, so
    // with persistence off the adapter below would be silently replaced by an
    // in-memory store and every session would die with the process.
    persistSession: true,
    storage: authSessionStorage,

    // ADR-007 / binding ruling 17: THE CLIENT NEVER SELF-SCHEDULES A REFRESH.
    //
    // This single option is the whole enforcement mechanism, which is exactly
    // why ADR-007 preferred it to the three lifecycle patches it replaces. The
    // property is checkable by reading this line, rather than by reasoning
    // about the internals of a pinned dependency.
    //
    // REVIEW-020 finding 1 proved with three probes that `stopAutoRefresh()`
    // cannot bound refresh execution while this is `true`: it clears only the
    // interval and pending timeout that exist at that moment, and cancels
    // neither initialization nor a refresh already in flight. Pinned auth-js
    // 2.112.3 exposes no cancellation API for either, so there was nothing to
    // patch this against.
    //
    // Both restart paths are gated on this flag in the pinned source, so
    // turning it off REMOVES them rather than racing them:
    //   - `_recoverAndRefresh()` gates its recovery refresh on
    //     `if (this.autoRefreshToken && currentSession.refresh_token)`
    //     (`GoTrueClient.js:4104`), so construction no longer refreshes a
    //     stored session.
    //   - `_handleVisibilityChange()` on a non-browser runtime gates the ticker
    //     on `if (this.autoRefreshToken)` (`GoTrueClient.js:4693`), so no
    //     ticker is ever started and `_autoRefreshTokenTick` never runs.
    //
    // What deliberately REMAINS is auth-js's ON-DEMAND refresh: `getSession()`
    // still calls `_callRefreshToken` when the stored access token is inside
    // its 90s `EXPIRY_MARGIN_MS` (`GoTrueClient.js:2554`). That is not
    // self-scheduling — it fires only on a call this app makes — and ADR-007
    // requires those calls to be foreground-gated. `auth/foreground-refresh.ts`
    // is that gate and `auth-provider.tsx` is where it is wired to AppState.
    //
    // THE FLAG ALONE IS NOT THE BOUNDARY, and the previous version of this
    // comment implied it was. REVIEW-021 finding 1 and REVIEW-021-ADVISORY
    // finding 1 established that `__loadSession` refreshes a near-expiry stored
    // session with no `autoRefreshToken` check on the path, and that it is
    // reachable without any application `getSession()` call: registering an
    // `onAuthStateChange` listener schedules `_emitInitialSession`
    // (`GoTrueClient.js:3640`), which enters it. The advisory verified that
    // `supabase-js` registers no auth listener itself — the app's own
    // registration at mount was the trigger, which is why the fix is app-side.
    // `auth-provider.tsx` now defers BOTH that registration and the cold-start
    // `getSession()` until AppState is `active`. The enforcement of ADR-007 is
    // therefore this option AND that deferral together, not this option alone.
    autoRefreshToken: false,

    // No `lock` option, deliberately. The pinned auth-js 2.112.3 marks the only
    // lock it ships for this environment (`processLock`) `@deprecated` —
    // "the auth client coordinates refreshes itself ... passing
    // `{ lock: processLock }` to it has no effect" — and annotates its own lock
    // path `TODO(v3): remove legacy lock path`. Serialization of session
    // storage is provided by the adapter instead, which covers every call that
    // reaches it rather than only the ones auth-js makes. Scope and limits are
    // stated in `auth/secure-store-adapter.ts` under "Serialization scope".

    // Stays off: this unit ships email OTP only. Both flows that would put a
    // session in a URL — magic links and OAuth redirects — are out of scope, so
    // there is nothing for the client to detect and no reason to let it parse
    // one out of the address bar.
    detectSessionInUrl: false,
  },
});
