import { Redirect, Stack } from 'expo-router';

import { APP_NAME } from '@/lib/app-config';
import { useAuth } from '@/lib/auth/auth-provider';

export default function AppLayout() {
  const { state } = useAuth();

  // Unreachable in practice — the root layout holds the navigator back until the
  // session resolves — but stated rather than assumed, so this group can never
  // act on an unresolved session even if it is mounted some other way later.
  if (state.status === 'bootstrapping') return null;

  if (state.status === 'signedOut') return <Redirect href="/sign-in" />;

  // Set explicitly, because the in-app header otherwise falls back to the route
  // name — `getHeaderTitle(options, route.name)` — which is exactly how "index"
  // reached the header.
  //
  // This covers the header only. The browser tab is a separate mechanism in
  // expo-router 57: `ExpoRoot` hard-disables React Navigation's document-title
  // updater (`documentTitle = { enabled: false }`), so `options.title` never
  // reaches `document.title`. Each screen sets that through `expo-router/head`.
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: APP_NAME }} />
    </Stack>
  );
}
