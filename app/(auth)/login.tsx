import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDialog } from '../../contexts/DialogContext';
import { sendPasswordResetEmail, signInAnonymously as fbAnon, signOut as fbSignOut, deleteUser as fbDeleteUser } from 'firebase/auth';
import { auth, db, doc, getDoc } from '../../config/firebase';
import { Button } from '../../components/ui';
import { DS, useDsInsets } from '../../constants/ds';

export default function LoginScreen() {
  const { signInWithEmail, signInAsGuest } = useAuth();
  const { colors } = useTheme();
  const dialog = useDialog();
  const { insets } = useDsInsets();

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [guest, setGuest] = useState(false);

  const resolveUsernameToEmail = async (username: string): Promise<string> => {
    const anon = await fbAnon(auth);
    try {
      const uSnap = await getDoc(doc(db, 'usernames', username.toLowerCase()));
      if (!uSnap.exists()) throw new Error('No account found with this username.');
      const uid = (uSnap.data() as any).uid;
      const pSnap = await getDoc(doc(db, 'users', uid));
      const em = (pSnap.data() as any)?.email;
      if (!em) throw new Error('This account has no email. Sign in with your email.');
      return em;
    } finally {
      try { await fbDeleteUser(anon.user); } catch { try { await fbSignOut(auth); } catch {} }
    }
  };

  const signIn = async () => {
    if (!id.trim() || !password) {
      dialog.alert('Missing details', 'Enter your email or username and password.');
      return;
    }
    setSigningIn(true);
    try {
      let em = id.trim();
      if (!em.includes('@')) em = await resolveUsernameToEmail(em.replace(/^@/, ''));
      await signInWithEmail(em, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      const msg = error.code === 'auth/user-not-found' ? 'No account found with this email/username.'
        : error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' ? 'Incorrect email/username or password.'
        : error.code === 'auth/invalid-email' ? 'Invalid email format.'
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

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, paddingHorizontal: DS.layout.screenPaddingH }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand mark — compact, understated */}
          <View style={st.brand}>
            <Image source={require('../../assets/images/emblem.png')} style={st.emblem} />
            <Text style={[st.wordmark, { color: colors.text }]}>Sadhak</Text>
          </View>

          {/* Form title */}
          <Text style={[st.title, { color: colors.text }]}>Welcome back</Text>
          <Text style={[st.sub, { color: colors.textSecondary }]}>Sign in to continue your practice.</Text>

          {/* Email / username */}
          <Text style={[st.label, { color: colors.textTertiary }]}>EMAIL OR USERNAME</Text>
          <View style={[st.field, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
            <Ionicons name="person-outline" size={18} color={colors.textTertiary} />
            <TextInput
              style={[st.input, { color: colors.text }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.textTertiary}
              value={id} onChangeText={setId}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <Text style={[st.label, { color: colors.textTertiary }]}>PASSWORD</Text>
          <View style={[st.field, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />
            <TextInput
              style={[st.input, { color: colors.text }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              value={password} onChangeText={setPassword}
              secureTextEntry={!showPw}
              returnKeyType="go" onSubmitEditing={signIn}
            />
            <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={8}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={forgot} hitSlop={8} style={{ alignSelf: 'flex-end', marginTop: 12, marginBottom: 22 }}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>Forgot password?</Text>
          </TouchableOpacity>

          <Button title="Sign In" onPress={signIn} loading={signingIn} disabled={signingIn || guest} />

          {/* Divider */}
          <View style={st.dividerRow}>
            <View style={[st.dividerLine, { backgroundColor: colors.divider }]} />
            <Text style={[st.dividerText, { color: colors.textTertiary }]}>or</Text>
            <View style={[st.dividerLine, { backgroundColor: colors.divider }]} />
          </View>

          <Button title="Continue as Guest" variant="secondary" onPress={asGuest} loading={guest} disabled={signingIn || guest} />

          {/* Sign up link */}
          <View style={st.signup}>
            <Text style={{ color: colors.textSecondary, fontSize: 13.5 }}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')} hitSlop={8}>
              <Text style={{ color: colors.primary, fontSize: 13.5, fontWeight: '800' }}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  brand: { alignItems: 'center', marginBottom: 30 },
  emblem: { width: 64, height: 64, borderRadius: 32 },
  wordmark: { fontSize: 22, fontWeight: '800', letterSpacing: 4, marginTop: 12 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 14.5, marginTop: 6, marginBottom: 24 },
  label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8, marginTop: 4 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, height: DS.layout.fieldHeight, borderRadius: DS.radius.lg, borderWidth: 1, paddingHorizontal: 16, marginBottom: 14 },
  input: { flex: 1, fontSize: 15.5 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '600' },
  signup: { flexDirection: 'row', justifyContent: 'center', marginTop: 26 },
});
