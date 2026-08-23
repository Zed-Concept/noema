import type { SupportedStorage } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { createChunkedSecureStore } from './secure-store-adapter';

/**
 * Which storage the auth client persists the session into, decided per
 * platform and stated here rather than inferred anywhere downstream.
 *
 * Native (iOS, Android) gets the chunked SecureStore adapter: the keychain and
 * the Android keystore are the only places on those platforms where a session
 * belongs.
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
  Platform.OS === 'web' ? undefined : createChunkedSecureStore();
