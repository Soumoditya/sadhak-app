import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDialog } from '../../contexts/DialogContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { Button } from '../../components/ui';
import { AuthBrand, AuthField, GoogleButton, OrDivider } from '../../components/ui/AuthUI';
import { DS, useDsInsets } from '../../constants/ds';
import { useLanguage } from '../../contexts/LanguageContext';

export default function LoginScreen() {
  const { tx } = useLanguage();

  const { signInWithEmail, signInAsGuest, resolveLoginEmail, signInWithGoogle } = useAuth();
  const { colors } = useTheme();
  const dialog = useDialog();
  const { insets } = useDsInsets();

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [guest, setGuest] = useState(false);

  const signIn = async () => {
    if (!id.trim() || !password) {
      dialog.alert('Missing details', 'Enter your email or username and password.');
      return;
    }
    setSigningIn(true);
    try {
      const em = await resolveLoginEmail(id);
      await signInWithEmail(em, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      const msg = error.code === 'auth/user-not-found' ? 'No account found with this email/username.'
        : error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' ? 'Incorrect email/username or password.'
        : error.code === 'auth/invalid-email' ? 'Invalid email format.'
        : error.code === 'auth/too-many-requests' ? 'Too many attempts. Wait a few minutes or reset your password.'
        : error.code === 'auth/network-request-failed' ? 'No internet connection. Check it and try again.'
        : String(error?.message || 'Login failed.').slice(0, 160);
      dialog.alert('Sign in failed', msg);
    } finally { setSigningIn(false); }
  };

  const forgot = async () => {
    const em = id.trim();
    if (!em.includes('@')) {
      dialog.alert('Enter your email', 'Type your account email above, then tap Forgot password again.', undefined, { tone: 'info' });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, em);
      dialog.alert('Reset link sent', `Check the inbox and spam of ${em}.`, undefined, { tone: 'success' });
    } catch (e: any) {
      dialog.alert('Could not send', e?.code === 'auth/user-not-found' ? 'No account exists with this email.' : 'Failed to send. Try again.');
    }
  };

  const asGuest = async () => {
    setGuest(true);
    try {
      await signInAsGuest();
      router.replace('/(tabs)');
    } catch {
      dialog.alert('Error', 'Could not sign in as guest.');
    } finally { setGuest(false); }
  };

  const [googleBusy, setGoogleBusy] = useState(false);
  const google = async () => {
    setGoogleBusy(true);
    try {
      const ok = await signInWithGoogle();
      if (ok) router.replace('/(tabs)');
    } catch (e: any) {
      dialog.alert('Sign in failed', String(e?.message || 'Google sign-in failed.').slice(0, 160));
    } finally { setGoogleBusy(false); }
  };

  const busy = signingIn || guest || googleBusy;
  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28, paddingHorizontal: DS.layout.screenPaddingH }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthBrand title={tx('Welcome back')} subtitle={tx('Sign in to continue your practice.')} />

        <GoogleButton onPress={google} loading={googleBusy} disabled={busy} />
        <OrDivider />

        <AuthField label={tx('Email or username')} icon="user-circle" placeholder="you@example.com" value={id} onChangeText={setId}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="next" textContentType="username" />
        <AuthField label={tx('Password')} icon="lock-key" secure placeholder="••••••••" value={password} onChangeText={setPassword}
          returnKeyType="go" onSubmitEditing={signIn} textContentType="password" />

        <TouchableOpacity onPress={forgot} hitSlop={8} style={{ alignSelf: 'flex-end', marginTop: -4, marginBottom: 22 }}>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>{tx('Forgot password?')}</Text>
        </TouchableOpacity>

        <Button title={tx('Sign In')} onPress={signIn} loading={signingIn} disabled={busy} />
        <View style={{ height: 12 }} />
        <Button title={tx('Continue as Guest')} variant="ghost" onPress={asGuest} loading={guest} disabled={busy} />

        <View style={st.switchRow}>
          <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{tx("Don't have an account?")} </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')} hitSlop={8}>
            <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '800' }}>{tx('Sign up')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
});
