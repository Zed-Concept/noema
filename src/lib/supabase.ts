import { createClient } from '@supabase/supabase-js';

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
    // Session persistence, refresh, and URL detection stay off until the auth
    // unit ships a storage adapter and policy set (RED lane; separate dispatch).
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
