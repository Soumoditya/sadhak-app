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
import { Button } from '../../components/ui';
import { DS, useDsInsets } from '../../constants/ds';

export default function SignupScreen() {
  const { signUpWithEmail } = useAuth();
  const { colors } = useTheme();
  const dialog = useDialog();
  const { insets } = useDsInsets();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      dialog.alert('Missing details', 'Please fill all fields.');
      return;
    }
    if (password !== confirm) { dialog.alert('Passwords don\'t match', 'Please retype the password.'); return; }
    if (password.length < 6) { dialog.alert('Password too short', 'Use at least 6 characters.'); return; }
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
      router.replace('/(auth)/profile-setup');
    } catch (error: any) {
      const msg = error.code === 'auth/email-already-in-use' ? 'This email already has an account. Sign in instead.'
        : error.code === 'auth/invalid-email' ? 'Invalid email format.'
        : error.code === 'auth/weak-password' ? 'Password is too weak.'
        : String(error?.message || 'Sign up failed.').slice(0, 160);
      dialog.alert('Sign up failed', msg);
    } finally { setLoading(false); }
  };

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24, paddingHorizontal: DS.layout.screenPaddingH }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={[st.backBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>

          {/* Brand */}
          <View style={st.brand}>
            <Image source={require('../../assets/images/icon.png')} style={st.emblem} />
          </View>

          {/* Title */}
          <Text style={[st.title, { color: colors.text }]}>Create your account</Text>
          <Text style={[st.sub, { color: colors.textSecondary }]}>Begin your daily practice with Sadhak.</Text>

          {/* Name */}
          <Text style={[st.label, { color: colors.textTertiary }]}>FULL NAME</Text>
          <View style={[st.field, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
            <Ionicons name="person-outline" size={18} color={colors.textTertiary} />
            <TextInput
              style={[st.input, { color: colors.text }]}
              placeholder="Your name"
              placeholderTextColor={colors.textTertiary}
              value={name} onChangeText={setName}
            />
          </View>

          {/* Email */}
          <Text style={[st.label, { color: colors.textTertiary }]}>EMAIL</Text>
          <View style={[st.field, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
            <Ionicons name="mail-outline" size={18} color={colors.textTertiary} />
            <TextInput
              style={[st.input, { color: colors.text }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.textTertiary}
              value={email} onChangeText={setEmail}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            />
          </View>

          {/* Password */}
          <Text style={[st.label, { color: colors.textTertiary }]}>PASSWORD</Text>
          <View style={[st.field, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />
            <TextInput
              style={[st.input, { color: colors.text }]}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textTertiary}
              value={password} onChangeText={setPassword}
              secureTextEntry={!showPw}
            />
            <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={8}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Confirm */}
          <Text style={[st.label, { color: colors.textTertiary }]}>CONFIRM PASSWORD</Text>
          <View style={[st.field, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.textTertiary} />
            <TextInput
              style={[st.input, { color: colors.text }]}
              placeholder="Repeat password"
              placeholderTextColor={colors.textTertiary}
              value={confirm} onChangeText={setConfirm}
              secureTextEntry={!showPw}
              onSubmitEditing={submit}
            />
          </View>

          <View style={{ marginTop: 24 }}>
            <Button title="Create Account" loading={loading} disabled={loading} onPress={submit} />
          </View>

          <Text style={[st.legal, { color: colors.textTertiary }]}>
            By creating an account, you agree to Sadhak's terms and privacy policy.
          </Text>

          <View style={st.signin}>
            <Text style={{ color: colors.textSecondary, fontSize: 13.5 }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
              <Text style={{ color: colors.primary, fontSize: 13.5, fontWeight: '800' }}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  brand: { alignItems: 'center', marginTop: 12, marginBottom: 20 },
  emblem: { width: 56, height: 56, borderRadius: 28 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  sub: { fontSize: 14, marginTop: 6, marginBottom: 22 },
  label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8, marginTop: 6 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, height: DS.layout.fieldHeight, borderRadius: DS.radius.lg, borderWidth: 1, paddingHorizontal: 16, marginBottom: 12 },
  input: { flex: 1, fontSize: 15.5 },
  legal: { fontSize: 11.5, textAlign: 'center', marginTop: 16, lineHeight: 16 },
  signin: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
});
