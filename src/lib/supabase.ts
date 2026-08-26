import { createClient } from '@supabase/supabase-js';

import { AUTH_SESSION_STORAGE_KEY, authSessionStorage } from './auth/session-storage';
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

    // The key the session persists under, made an app constant rather than
    // left to the client's URL-derived default. ADR-009 requirement 1 has the
    // session layer read this key space back to PROVE a purge happened
    // (`session-storage.ts`, `confirmSessionPurged`), and a verification
    // target the app cannot name without re-deriving library internals would
    // be the reading-of-internals learning 20 warns against. A documented
    // public option, shared by the client, the session layer, and the
    // evidence probes. No installed base is stranded by the rename: no device
    // or simulator has ever run this app.
    storageKey: AUTH_SESSION_STORAGE_KEY,

    // ADR-009 / binding ruling 20: THE CLIENT NEVER SELF-SCHEDULES A REFRESH —
    // AND THAT IS ALL THIS FLAG DOES.
    //
    // REVIEW-022 confirmed by probe that with this `false` the recurring
    // ticker is permanently eliminated: a real pinned client produced zero
    // interval starts and zero fetches from scheduling. The flag is retained
    // for exactly that, carried forward from the superseded ADR-007.
    //
    // WHAT THIS FLAG DOES NOT DO — and no comment here may claim otherwise:
    // refresh entrances are NOT enumerated and NOT gated. Three fix cycles
    // tried to stand a foreground gate in front of every entrance and each
    // cycle found one more. REVIEW-022 finding 1 then established by probe
    // that pinned supabase-js registers an INTERNAL auth listener during
    // construction — `createClient()` alone refreshed and persisted a
    // near-expiry stored session with no application auth call — and finding 2
    // that `signOut()` loads, and can refresh, the stored session before
    // deleting it. Earlier comments here claimed construction no longer
    // refreshes and that a bounded number of entrances existed; ADR-009
    // records those claims as unenforceable and requires their deletion.
    // Library-internal refreshes — from construction, from session loading,
    // from `signOut()`, and from paths not yet identified — are recorded,
    // expected behaviour.
    //
    // THE GUARANTEE IS PERSISTENCE, NOT INITIATION. Detection sits at the
    // write: any rotated session that cannot be persisted is recorded by the
    // observer in `auth/session-storage.ts` — durably, through
    // `auth/reauth-demand.ts`, so the record survives restart — and forces
    // re-authentication, with the recovery purge proven by read-back rather
    // than inferred. That mechanism is indifferent to how many entrances
    // exist, which is what makes it an architecture where the gate inventory
    // was not (ADR-009).
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
