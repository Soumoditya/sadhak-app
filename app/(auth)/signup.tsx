import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDialog } from '../../contexts/DialogContext';
import { Button, Icon } from '../../components/ui';
import { AuthBrand, AuthField, GoogleButton, OrDivider } from '../../components/ui/AuthUI';
import { DS, useDsInsets } from '../../constants/ds';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SignupScreen() {
  const { tx } = useLanguage();

  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const { colors } = useTheme();
  const dialog = useDialog();
  const { insets } = useDsInsets();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      dialog.alert('Missing details', 'Please fill all fields.');
      return;
    }
    if (password !== confirm) { dialog.alert('Passwords don\'t match', 'Please retype the password.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { dialog.alert('Check your email', 'That doesn\'t look like a valid email address.'); return; }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      dialog.alert('Stronger password', 'Use at least 8 characters with letters and numbers.');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
      router.replace('/(auth)/profile-setup');
    } catch (error: any) {
      const msg = error.code === 'auth/email-already-in-use' ? 'This email already has an account. Sign in instead.'
        : error.code === 'auth/invalid-email' ? 'Invalid email format.'
        : error.code === 'auth/weak-password' ? 'Password is too weak.'
        : error.code === 'auth/credential-already-in-use' ? 'This email already has an account. Sign in instead.'
        : error.code === 'auth/network-request-failed' ? 'No internet connection. Check it and try again.'
        : String(error?.message || 'Sign up failed.').slice(0, 160);
      dialog.alert('Sign up failed', msg);
    } finally { setLoading(false); }
  };

  const [googleBusy, setGoogleBusy] = useState(false);
  const google = async () => {
    setGoogleBusy(true);
    try {
      const ok = await signInWithGoogle();
      if (ok) router.replace('/(auth)/profile-setup');
    } catch (e: any) {
      dialog.alert('Sign up failed', String(e?.message || 'Google sign-in failed.').slice(0, 160));
    } finally { setGoogleBusy(false); }
  };

  const busy = loading || googleBusy;
  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28, paddingHorizontal: DS.layout.screenPaddingH }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
          style={[st.backBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} hitSlop={8} accessibilityLabel="Back">
          <Icon name="caret-left" size={20} color={colors.text} weight="regular" />
        </TouchableOpacity>

        <AuthBrand title={tx('Create your account')} subtitle={tx('Begin your daily practice with Sadhak.')} />

        <GoogleButton onPress={google} loading={googleBusy} disabled={busy} />
        <OrDivider />

        <AuthField label={tx('Full name')} icon="user-circle" placeholder={tx('Your name')} value={name} onChangeText={setName} textContentType="name" returnKeyType="next" />
        <AuthField label={tx('Email')} icon="envelope-simple" placeholder="you@example.com" value={email} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" returnKeyType="next" />
        <AuthField label={tx('Password')} icon="lock-key" secure placeholder={tx('At least 8 characters, with a number')} value={password} onChangeText={setPassword} textContentType="newPassword" returnKeyType="next" />
        <AuthField label={tx('Confirm password')} icon="shield-check" secure placeholder={tx('Repeat password')} value={confirm} onChangeText={setConfirm} onSubmitEditing={submit} returnKeyType="go" />

        <View style={{ marginTop: 8 }}>
          <Button title={tx('Create Account')} loading={loading} disabled={busy} onPress={submit} />
        </View>

        <Text style={[st.legal, { color: colors.textTertiary }]}>{tx("By creating an account, you agree to Sadhak's terms and privacy policy.")}</Text>

        <View style={st.switchRow}>
          <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{tx('Already have an account?')} </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
            <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '800' }}>{tx('Sign in')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  legal: { fontSize: 12.5, lineHeight: 18, textAlign: 'center', marginTop: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
});
