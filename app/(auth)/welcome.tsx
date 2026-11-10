import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDialog } from '../../contexts/DialogContext';
import { Button } from '../../components/ui';
import { AuthBrand, GoogleButton, OrDivider } from '../../components/ui/AuthUI';
import { DS, useDsInsets } from '../../constants/ds';

// Welcome screen for a new user (after picking a language): sign in with
// Google, continue as a guest, or go to the email sign-in screen. The back
// button returns to the language screen.
export default function WelcomeScreen() {
  const { tx } = useLanguage();
  const { colors } = useTheme();
  const { insets } = useDsInsets();
  const dialog = useDialog();
  const { signInWithGoogle, signInAsGuest } = useAuth();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [guest, setGuest] = useState(false);

  const google = async () => {
    setGoogleBusy(true);
    try {
      const ok = await signInWithGoogle();
      if (ok) router.replace('/(tabs)');
    } catch (e: any) {
      dialog.alert('Sign in failed', String(e?.message || 'Google sign-in failed.').slice(0, 160));
    } finally { setGoogleBusy(false); }
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

  const busy = googleBusy || guest;
  return (
    <View style={[st.container, { backgroundColor: colors.background, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}>
      <TouchableOpacity
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/language'))}
        hitSlop={10}
        accessibilityLabel={tx('Back')}
        style={[st.back, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
      >
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </TouchableOpacity>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <AuthBrand title={tx('Welcome to Sadhak')} subtitle={tx('Your daily spiritual companion')} />
        <GoogleButton onPress={google} loading={googleBusy} disabled={busy} />
        <OrDivider />
        <Button title={tx('Continue as Guest')} variant="ghost" onPress={asGuest} loading={guest} disabled={busy} />
        <View style={st.switchRow}>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} hitSlop={8}>
            <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '800' }}>{tx('Sign in with email')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: DS.layout.screenPaddingH },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
});
