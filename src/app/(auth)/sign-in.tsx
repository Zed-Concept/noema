import Head from 'expo-router/head';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { APP_NAME } from '@/lib/app-config';
import { useAuth } from '@/lib/auth/auth-provider';

/**
 * Email one-time-code sign-in, which is also sign-up: the same code creates the
 * account when there is not one yet.
 *
 * There is no password field, no "forgot password", and no magic link. A code
 * is requested, then typed back in.
 */
export default function SignIn() {
  const { sendOtp, verifyOtp } = useAuth();

  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSendCode() {
    setPending(true);
    setError(null);
    const { error: sendError } = await sendOtp(email.trim());
    setPending(false);

    if (sendError) {
      setError(sendError.message);
      return;
    }
    setStage('code');
  }

  async function onVerifyCode() {
    setPending(true);
    setError(null);
    const { error: verifyError } = await verifyOtp(email.trim(), code.trim());
    setPending(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    // Nothing to navigate. A verified code produces a session, the provider
    // observes it, and the group layout redirects.
  }

  return (
    <View style={styles.container}>
      <Head>
        <title>{`Sign in · ${APP_NAME}`}</title>
      </Head>

      <Text accessibilityRole="header" style={styles.heading}>
        Sign in
      </Text>

      {stage === 'email' ? (
        <>
          <Text>We will email you a one-time code.</Text>
          <TextInput
            accessibilityLabel="Email address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            inputMode="email"
            editable={!pending}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            onPress={onSendCode}
            disabled={pending || email.trim().length === 0}
            style={styles.button}
          >
            <Text>{pending ? 'Sending…' : 'Send code'}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text>Enter the code sent to {email.trim()}.</Text>
          <TextInput
            accessibilityLabel="One-time code"
            placeholder="123456"
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            keyboardType="number-pad"
            inputMode="numeric"
            editable={!pending}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            onPress={onVerifyCode}
            disabled={pending || code.trim().length === 0}
            style={styles.button}
          >
            <Text>{pending ? 'Verifying…' : 'Verify code'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setStage('email');
              setCode('');
              setError(null);
            }}
            disabled={pending}
            style={styles.button}
          >
            <Text>Use a different email</Text>
          </Pressable>
        </>
      )}

      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  heading: {
    fontSize: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
  },
  button: {
    paddingVertical: 12,
    alignItems: 'center',
  },
});
