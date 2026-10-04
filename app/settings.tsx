import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Share, Linking, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDialog } from '../contexts/DialogContext';
import { useLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from '../contexts/LanguageContext';
import { auth } from '../config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { sendTestNotification } from '../services/notifications';
import { APP_VERSION, WEBSITE_URL } from '../constants/appInfo';
import { Header, Card, SettingsRow } from '../components/ui';
import { useDsInsets } from '../constants/ds';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SettingsScreen() {
  const { profile, isGuest, isAdmin, logout, updateProfile, deleteAccount } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const dialog = useDialog();
  const { language, setLanguage } = useLanguage();
  const { screenBottom } = useDsInsets();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const s = profile?.settings || ({} as any);
  const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === language);

  const updateSetting = async (key: string, value: boolean) => {
    await updateProfile({ settings: { ...(profile?.settings || {}), [key]: value } } as any);
  };

  const shareApp = async () => {
    try {
      await Share.share({
        message: `🙏 Sadhak — your Hindu spiritual companion.\n\nAccurate Panchang, Hindu calendar, nearby temples, sacred library, aarti & community.\n\n${WEBSITE_URL}`,
      });
    } catch {}
  };

  const rateApp = () => {
    dialog.alert(
      'Coming to Play Store',
      "Sadhak isn't on the Play Store yet. Until then, sharing with fellow sadhaks helps the most. 🙏",
      [{ text: 'Share instead', onPress: shareApp }, { text: 'OK', style: 'cancel' }],
      { tone: 'info' },
    );
  };

  const changePassword = () => {
    const em = profile?.email;
    if (!em) { dialog.alert('No email', 'Guest accounts have no password.', undefined, { tone: 'info' }); return; }
    dialog.alert('Change password', `We'll email a secure reset link to ${em}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send link', onPress: async () => {
        try {
          await sendPasswordResetEmail(auth, em);
          dialog.alert('Sent', 'Check your inbox and spam folder.', undefined, { tone: 'success' });
        } catch { dialog.alert('Failed', 'Try again later.'); }
      }},
    ]);
  };

  const handleLogout = () => {
    dialog.alert('Sign out', 'You will need to sign in again to access your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    dialog.alert('Delete account?', 'This permanently deletes your account and all data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete forever', style: 'destructive', onPress: () => {
        dialog.alert('Are you absolutely sure?', 'Last chance — this is permanent.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, delete', style: 'destructive', onPress: deleteAccount },
        ]);
      }},
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Settings" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: screenBottom }}>

        <SectionLabel label="Preferences" />
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <SettingsRow icon="theme-light-dark" label="Dark Mode" right="switch" switchValue={isDark} onSwitchChange={toggleTheme} />
          <Divider />
          <SettingsRow icon="translate" label="App Language" detail={langInfo?.nativeName} onPress={() => setLanguageOpen(true)} />
        </Card>

        <SectionLabel label="Notifications" />
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {/* Collapsed by default — expands to reveal the individual toggles */}
          <SettingsRow
            icon="bell-outline"
            label="Alerts & reminders"
            detail={notifOpen ? 'Tap to collapse' : 'Tap to manage'}
            right={<Ionicons name={notifOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />}
            onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setNotifOpen((o) => !o); }}
          />
          {notifOpen && (
            <>
              <Divider />
              <SettingsRow icon="bell-ring-outline" label="Spiritual reminders" detail="Through the day · paused 10 PM to 6 AM" right="switch" switchValue={s.notifications !== false} onSwitchChange={(v) => updateSetting('notifications', v)} />
              <Divider />
              <SettingsRow icon="content-cut" label="Grooming alerts" detail="6:30 AM on restricted days" right="switch" switchValue={s.groomingReminders !== false} onSwitchChange={(v) => updateSetting('groomingReminders', v)} />
              <Divider />
              <SettingsRow icon="party-popper" label="Festival alerts" detail="6:30 AM on festival days" right="switch" switchValue={s.festivalReminders !== false} onSwitchChange={(v) => updateSetting('festivalReminders', v)} />
              <Divider />
              <SettingsRow icon="moon-waning-crescent" label="Ekadashi alerts" detail="6:30 AM on Ekadashi" right="switch" switchValue={s.ekadashiReminders !== false} onSwitchChange={(v) => updateSetting('ekadashiReminders', v)} />
              <Divider />
              <SettingsRow icon="bell-check-outline" label="Send test notification" onPress={sendTestNotification} />
            </>
          )}
        </Card>

        {!isGuest && (
          <>
            <SectionLabel label="Privacy" />
            <Card padded={false} style={{ overflow: 'hidden' }}>
              <SettingsRow icon="eye-outline" label="Show profile in community" right="switch" switchValue={s.showProfileInCommunity !== false} onSwitchChange={(v) => updateSetting('showProfileInCommunity', v)} />
              <Divider />
              <SettingsRow icon="message-outline" label="Allow direct messages" right="switch" switchValue={s.allowDMs !== false} onSwitchChange={(v) => updateSetting('allowDMs', v)} />
            </Card>
          </>
        )}

        <SectionLabel label="Support" />
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <SettingsRow icon="star-outline" label="Rate Sadhak" onPress={rateApp} />
          <Divider />
          <SettingsRow icon="share-variant-outline" label="Share app" onPress={shareApp} />
          <Divider />
          <SettingsRow icon="web" label="Visit website" onPress={() => Linking.openURL(WEBSITE_URL).catch(() => {})} />
          <Divider />
          <SettingsRow icon="email-outline" label="Contact & feedback" onPress={() => router.push('/contact')} />
          <Divider />
          <SettingsRow icon="help-circle-outline" label="FAQ & help" onPress={() => router.push('/faq')} />
        </Card>

        <SectionLabel label="About" />
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <SettingsRow icon="information-outline" label="About Sadhak" onPress={() => router.push('/about')} />
          <Divider />
          <SettingsRow icon="shield-outline" label="Privacy Policy" onPress={() => router.push('/privacy')} />
          <Divider />
          <SettingsRow icon="file-document-outline" label="Terms & Conditions" onPress={() => router.push('/terms')} />
          <Divider />
          <SettingsRow icon="format-list-bulleted" label="Changelog" detail={`v${APP_VERSION}`} onPress={() => router.push('/changelog')} />
        </Card>

        <SectionLabel label="Account" />
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {!isGuest && (
            <>
              <SettingsRow icon="lock-reset" label="Change password" onPress={changePassword} />
              <Divider />
            </>
          )}
          {isAdmin && (
            <>
              <SettingsRow icon="shield-crown-outline" label="Admin Panel" onPress={() => router.push('/admin' as any)} />
              <Divider />
            </>
          )}
          <SettingsRow icon="logout" label="Sign out" onPress={handleLogout} />
          {!isGuest && (
            <>
              <Divider />
              <SettingsRow icon="trash-can-outline" label="Delete account" danger onPress={handleDeleteAccount} />
            </>
          )}
        </Card>

        <Text style={[styles.versionText, { color: colors.textTertiary }]}>Sadhak v{APP_VERSION}</Text>

        {/* Language Modal */}
        <Modal visible={languageOpen} transparent animationType="slide" onRequestClose={() => setLanguageOpen(false)}>
          <View style={styles.sheetOverlay}>
            <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.divider }]} />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>App language</Text>
              <View style={{ marginTop: 8, maxHeight: 380 }}>
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const active = language === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      onPress={() => { setLanguage(lang.code as LanguageCode); setLanguageOpen(false); }}
                      style={[styles.langRow, { backgroundColor: active ? colors.primary + '15' : 'transparent' }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{lang.nativeName}</Text>
                        <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 1 }}>{lang.name}</Text>
                      </View>
                      {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{label.toUpperCase()}</Text>;
}
function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.divider }]} />;
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 24, marginBottom: 8, marginLeft: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  versionText: { fontSize: 11.5, textAlign: 'center', marginTop: 24, marginBottom: 8 },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  sheetTitle: { fontSize: 19, fontWeight: '800' },
  langRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12 },
});
