import { Redirect, Stack } from 'expo-router';

import { APP_NAME } from '@/lib/app-config';
import { useAuth } from '@/lib/auth/auth-provider';

export default function AuthLayout() {
  const { state } = useAuth();

  if (state.status === 'bootstrapping') return null;

  if (state.status === 'signedIn') return <Redirect href="/" />;

  return (
    <Stack>
      <Stack.Screen name="sign-in" options={{ title: `Sign in · ${APP_NAME}` }} />
    </Stack>
  );
}
