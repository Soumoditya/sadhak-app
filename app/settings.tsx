import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Share, Linking, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { shareSadhak } from '../services/shareApp';
import { useTheme } from '../contexts/ThemeContext';
import { useDialog } from '../contexts/DialogContext';
import { useLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from '../contexts/LanguageContext';
import { auth } from '../config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { sendTestNotification } from '../services/notifications';
import { APP_VERSION, WEBSITE_URL } from '../constants/appInfo';
import { Header, Card, SettingsRow, Icon } from '../components/ui';
import { useDsInsets } from '../constants/ds';
import { updateLabel } from '../services/appUpdates';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SettingsScreen() {
  const { profile, isGuest, isAdmin, logout, updateProfile, deleteAccount } = useAuth();
  const { colors, isDark, mode, setMode } = useTheme();
  const dialog = useDialog();
  const { language, setLanguage, t } = useLanguage();
  const { screenBottom } = useDsInsets();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const s = profile?.settings || ({} as any);
  const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === language);

  const updateSetting = async (key: string, value: boolean) => {
    await updateProfile({ settings: { ...(profile?.settings || {}), [key]: value } } as any);
  };

  const shareApp = async () => {
    const how = await shareSadhak();
    if (how === 'image') {
      dialog.alert('Invite copied', 'The invite message with the link is copied. Paste it as the caption if your app asks for one.', undefined, { tone: 'success' });
    }
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
      <Header title={t('t.settings')} quick={false} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: screenBottom }}>

        <SectionLabel label={t('s.preferences')} />
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <SettingsRow icon="theme-light-dark" label={t('s.appearance')} right={<View />} />
          <View style={[st.segment, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}>
            {(['light', 'dark', 'system'] as const).map((m) => {
              const active = mode === m;
              return (
                <TouchableOpacity key={m} onPress={() => setMode(m)} activeOpacity={0.85}
                  style={[st.segBtn, active && { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                  <Icon name={m === 'light' ? 'sun' : m === 'dark' ? 'moon' : 'gear-six'} size={16} color={active ? colors.primary : colors.textSecondary} weight={active ? 'duotone' : 'regular'} />
                  <Text style={{ color: active ? colors.text : colors.textSecondary, fontWeight: active ? '800' : '600', fontSize: 13 }}>{t(`theme.${m}`)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Divider />
          <SettingsRow icon="translate" label={t('s.language')} detail={langInfo?.nativeName} onPress={() => setLanguageOpen(true)} />
        </Card>

        <SectionLabel label={t('s.notifications')} />
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {/* Collapsed by default — expands to reveal the individual toggles */}
          <SettingsRow
            icon="bell-outline"
            label={t('s.alerts')}
            detail={notifOpen ? t('s.tapCollapse') : t('s.tapManage')}
            right={<Ionicons name={notifOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />}
            onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setNotifOpen((o) => !o); }}
          />
          {notifOpen && (
            <>
              <Divider />
              <SettingsRow icon="bell-ring-outline" label={t('s.spiritual')} detail={t('s.spiritualDetail')} right="switch" switchValue={s.notifications !== false} onSwitchChange={(v) => updateSetting('notifications', v)} />
              <Divider />
              <SettingsRow icon="content-cut" label={t('s.grooming')} detail={t('s.groomingDetail')} right="switch" switchValue={s.groomingReminders !== false} onSwitchChange={(v) => updateSetting('groomingReminders', v)} />
              <Divider />
              <SettingsRow icon="party-popper" label={t('s.festival')} detail={t('s.festivalDetail')} right="switch" switchValue={s.festivalReminders !== false} onSwitchChange={(v) => updateSetting('festivalReminders', v)} />
              <Divider />
              <SettingsRow icon="moon-waning-crescent" label={t('s.ekadashi')} detail={t('s.ekadashiDetail')} right="switch" switchValue={s.ekadashiReminders !== false} onSwitchChange={(v) => updateSetting('ekadashiReminders', v)} />
              <Divider />
              <SettingsRow icon="bell-check-outline" label={t('s.test')} onPress={sendTestNotification} />
            </>
          )}
        </Card>

        {!isGuest && (
          <>
            <SectionLabel label={t('s.privacy')} />
            <Card padded={false} style={{ overflow: 'hidden' }}>
              <SettingsRow icon="eye-outline" label={t('s.showProfile')} right="switch" switchValue={s.showProfileInCommunity !== false} onSwitchChange={(v) => updateSetting('showProfileInCommunity', v)} />
              <Divider />
              <SettingsRow icon="message-outline" label={t('s.allowDms')} right="switch" switchValue={s.allowDMs !== false} onSwitchChange={(v) => updateSetting('allowDMs', v)} />
            </Card>
          </>
        )}

        <SectionLabel label={t('s.support')} />
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <SettingsRow icon="star-outline" label={t('s.rate')} onPress={rateApp} />
          <Divider />
          <SettingsRow icon="share-variant-outline" label={t('s.share')} onPress={shareApp} />
          <Divider />
          <SettingsRow icon="web" label={t('s.website')} onPress={() => Linking.openURL(WEBSITE_URL).catch(() => {})} />
          <Divider />
          <SettingsRow icon="email-outline" label={t('s.contact')} onPress={() => router.push('/contact')} />
          <Divider />
          <SettingsRow icon="help-circle-outline" label={t('s.faq')} onPress={() => router.push('/faq')} />
        </Card>

        <SectionLabel label={t('s.about')} />
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <SettingsRow icon="information-outline" label={t('s.aboutSadhak')} onPress={() => router.push('/about')} />
          <Divider />
          <SettingsRow icon="shield-outline" label={t('s.privacyPolicy')} onPress={() => router.push('/privacy')} />
          <Divider />
          <SettingsRow icon="file-document-outline" label={t('s.terms')} onPress={() => router.push('/terms')} />
          <Divider />
          <SettingsRow icon="format-list-bulleted" label={t('s.changelog')} detail={`v${APP_VERSION}`} onPress={() => router.push('/changelog')} />
        </Card>

        <SectionLabel label={t('s.account')} />
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {!isGuest && (
            <>
              <SettingsRow icon="lock-reset" label={t('s.changePassword')} onPress={changePassword} />
              <Divider />
            </>
          )}
          {isAdmin && (
            <>
              <SettingsRow icon="shield-crown-outline" label={t('s.admin')} onPress={() => router.push('/admin' as any)} />
              <Divider />
            </>
          )}
          <SettingsRow icon="logout" label={t('s.signOut')} onPress={handleLogout} />
          {!isGuest && (
            <>
              <Divider />
              <SettingsRow icon="trash-can-outline" label={t('s.deleteAccount')} danger onPress={handleDeleteAccount} />
            </>
          )}
        </Card>

        <Text style={[styles.versionText, { color: colors.textTertiary }]}>Sadhak v{APP_VERSION}{updateLabel() ? ` · ${updateLabel()}` : ''}</Text>

        {/* Language Modal */}
        <Modal visible={languageOpen} transparent animationType="slide" onRequestClose={() => setLanguageOpen(false)}>
          <View style={styles.sheetOverlay}>
            <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.divider }]} />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('s.chooseLanguage')}</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12.5, lineHeight: 18, marginTop: 4 }}>{t('s.languageNote')}</Text>
              {/* Scrollable: 12 languages don't fit the old fixed-height box. */}
              <ScrollView style={{ marginTop: 8, maxHeight: 420 }} showsVerticalScrollIndicator={false}>
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
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  const { colors } = useTheme();
  const { noTrack } = useLanguage();
  return <Text style={[styles.sectionLabel, { color: colors.textTertiary }, noTrack]}>{label.toUpperCase()}</Text>;
}
function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.divider }]} />;
}

const st = StyleSheet.create({
  segment: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 14, marginTop: -4, padding: 4, borderRadius: 12, borderWidth: 1, gap: 4 },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 9, borderColor: 'transparent' },
});

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
