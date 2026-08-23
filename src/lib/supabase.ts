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

    // Keeps the access token current while the app is running. Session state
    // reaches the UI through onAuthStateChange, which fires on refresh too.
    //
    // ADR-005 gates WHEN the ticker runs, not whether it exists: `auth-provider`
    // calls startAutoRefresh/stopAutoRefresh off AppState so a refresh never
    // fires against a locked device, where SecureStore's WHEN_UNLOCKED class
    // would lose the rotated token. Turning this off instead would also disable
    // the on-demand refresh auth-js performs when a caller asks for a session
    // near expiry, which is the path that recovers a long-backgrounded session.
    autoRefreshToken: true,

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
