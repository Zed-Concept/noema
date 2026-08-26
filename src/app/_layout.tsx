import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AuthProvider, useAuth } from '@/lib/auth/auth-provider';

function RootNavigator() {
  const { state } = useAuth();

  // The navigator is not mounted until the stored session has resolved. This is
  // what makes "no flash of protected content" structural rather than a race the
  // guards have to win: while the answer is unknown there are no screens to show
  // and nothing to redirect away from.
  if (state.status === 'bootstrapping') {
    return (
      <View style={styles.bootstrapping}>
        <ActivityIndicator accessibilityLabel="Restoring your session" />
      </View>
    );
  }

  // Headers belong to the group layouts, which know which screen is showing and
  // set its title explicitly.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  bootstrapping: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
