import Head from 'expo-router/head';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { APP_NAME } from '@/lib/app-config';
import { useAuth } from '@/lib/auth/auth-provider';

export default function Index() {
  const { state, signOut } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = state.status === 'signedIn' ? state.session.user.email : undefined;

  async function onSignOut() {
    setPending(true);
    setError(null);
    const { error: signOutError } = await signOut();
    setPending(false);

    // Sign-out can fail with the session still on disk — auth-js returns early,
    // before clearing storage, if it cannot reach the network to revoke. Saying
    // nothing would leave the user believing they had signed out when they had
    // not, which is the one outcome this screen must never produce.
    if (signOutError) {
      setError(signOutError.message);
      return;
    }
    // Nothing to navigate on success: clearing the session raises an auth event
    // and the group layout redirects. The screen never routes itself.
  }

  return (
    <View style={styles.container}>
      {/*
        The browser tab title. expo-router 57 disables React Navigation's
        document-title updater, so screen options do not reach `document.title`
        — this is the mechanism that does, and it is what leaves the static
        export's title element empty when omitted.
      */}
      <Head>
        <title>{APP_NAME}</title>
      </Head>

      <Text accessibilityRole="header">Placeholder home screen</Text>
      <Text>Edit src/app/(app)/index.tsx to replace this.</Text>
      {email ? <Text>Signed in as {email}</Text> : null}

      <Pressable
        accessibilityRole="button"
        onPress={onSignOut}
        disabled={pending}
        style={styles.button}
      >
        <Text>{pending ? 'Signing out…' : 'Sign out'}</Text>
      </Pressable>

      {error ? <Text accessibilityRole="alert">Could not sign out: {error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});
