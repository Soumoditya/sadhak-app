import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Image, Modal,
  Share, Linking, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDialog } from '../../contexts/DialogContext';
import { useLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from '../../contexts/LanguageContext';
import { db, auth, collection, getDocs, query, where, setDoc, doc } from '../../config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { uploadToCloudinary } from '../../services/cloudinary';
import { sendTestNotification } from '../../services/notifications';
import { APP_VERSION, WEBSITE_URL } from '../../constants/appInfo';
import { Screen, Card, Button, SettingsRow } from '../../components/ui';
import { DS } from '../../constants/ds';

export default function ProfileScreen() {
  const { profile, isGuest, isAdmin, logout, updateProfile, user, deleteAccount } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const dialog = useDialog();
  const { t, language, setLanguage } = useLanguage();

  const [uploadingPfp, setUploadingPfp] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditName(profile.displayName || '');
      setEditBio(profile.bio || '');
    }
  }, [profile]);

  // ─── Profile picture (Cloudinary) ───────────────────────
  const pickAndUploadPfp = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { dialog.alert('Permission needed', 'Allow photo library access.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setUploadingPfp(true);
      const small = await ImageManipulator.manipulateAsync(
        result.assets[0].uri, [{ resize: { width: 512 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
      );
      const up = await uploadToCloudinary(small.uri, 'sadhak/avatars', 'image');
      await updateProfile({ profilePicUrl: up.secure_url });
      dialog.alert('Updated', 'Your profile picture has been updated.', undefined, { tone: 'success' });
    } catch (e: any) {
      dialog.alert('Upload failed', String(e?.message || e).slice(0, 300));
    } finally { setUploadingPfp(false); }
  };

  // ─── Username ───────────────────────────────────────────
  const saveUsername = async () => {
    const name = newUsername.trim().toLowerCase();
    if (name.length < 3) { dialog.alert('Too short', 'Username must be 3+ characters.'); return; }
    if (!/^[a-z0-9_]+$/.test(name)) { dialog.alert('Invalid', 'Only lowercase letters, numbers, underscores.'); return; }
    setCheckingUsername(true);
    try {
      const snap = await getDocs(query(collection(db, 'usernames'), where('username', '==', name)));
      if (!snap.empty && snap.docs[0].data().uid !== user?.uid) {
        dialog.alert('Taken', 'That username is already taken.');
        setCheckingUsername(false);
        return;
      }
      if (profile?.username) {
        await setDoc(doc(db, 'usernames', profile.username), { deletedAt: Date.now() }, { merge: true });
      }
      await setDoc(doc(db, 'usernames', name), { uid: user?.uid, username: name, createdAt: Date.now() });
      await updateProfile({ username: name });
      setUsernameOpen(false); setNewUsername('');
      dialog.alert('Set!', `You're now @${name}.`, undefined, { tone: 'success' });
    } catch (e: any) {
      dialog.alert('Could not save', String(e?.message || e).slice(0, 200));
    } finally { setCheckingUsername(false); }
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      await updateProfile({ displayName: editName.trim() || 'Sadhak', bio: editBio.trim() });
      setEditOpen(false);
    } catch (e: any) {
      dialog.alert('Could not save', String(e?.message || e).slice(0, 200));
    } finally { setSavingEdit(false); }
  };

  // ─── Settings ───────────────────────────────────────────
  const updateSetting = async (key: string, value: boolean) => {
    const s = { ...(profile?.settings || {}), [key]: value };
    await updateProfile({ settings: s } as any);
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

  const initials = (profile?.displayName || 'S').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === language);
  const s = profile?.settings || ({} as any);

  return (
    <Screen scroll tabbed edges={{ top: false, bottom: false }}>

      {/* ═══ Identity ═══ */}
      <View style={styles.identityRow}>
        <TouchableOpacity onPress={pickAndUploadPfp} activeOpacity={0.8}>
          <View style={styles.avatarWrap}>
            {profile?.profilePicUrl ? (
              <Image source={{ uri: profile.profilePicUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary + '25', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.primary, fontSize: 26, fontWeight: '800' }}>{initials}</Text>
              </View>
            )}
            <View style={[styles.pfpEdit, { backgroundColor: colors.primary }]}>
              {uploadingPfp ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <MaterialCommunityIcons name="camera" size={13} color="#FFF" />
              )}
            </View>
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: DS.space.lg }}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{profile?.displayName || 'Sadhak'}</Text>
          <TouchableOpacity onPress={() => setUsernameOpen(true)} hitSlop={4}>
            <Text style={[styles.handle, { color: colors.textTertiary }]}>@{profile?.username || 'set-username'}</Text>
          </TouchableOpacity>
          <View style={styles.badgeRow}>
            {isAdmin && (
              <View style={[styles.badge, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B55' }]}>
                <MaterialCommunityIcons name="shield-crown" size={11} color="#F59E0B" />
                <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '800' }}>Admin</Text>
              </View>
            )}
            {isGuest && (
              <View style={[styles.badge, { backgroundColor: colors.textTertiary + '18', borderColor: colors.textTertiary + '55' }]}>
                <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: '800' }}>Guest</Text>
              </View>
            )}
            {profile?.location?.city && (
              <View style={[styles.badge, { backgroundColor: colors.info + '18' || '#1565C018', borderColor: colors.info + '55' || '#1565C055' }]}>
                <Ionicons name="location-outline" size={11} color={colors.info || '#1565C0'} />
                <Text style={{ color: colors.info || '#1565C0', fontSize: 11, fontWeight: '700' }}>{profile.location.city}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: DS.space.lg }}>
        <Button title="Edit Profile" variant="secondary" size="md" icon="account-edit-outline" onPress={() => setEditOpen(true)} />
        <Button title="Share App" variant="secondary" size="md" icon="share-variant-outline" onPress={shareApp} />
      </View>

      {/* ═══ Preferences ═══ */}
      <SectionLabel label="Preferences" />
      <Card padded={false} style={{ overflow: 'hidden' }}>
        <SettingsRow icon="theme-light-dark" iconColor="#F59E0B" label="Dark Mode" right="switch" switchValue={isDark} onSwitchChange={toggleTheme} />
        <Divider />
        <SettingsRow icon="translate" iconColor="#1565C0" label="App Language" detail={langInfo?.nativeName} onPress={() => setLanguageOpen(true)} />
      </Card>

      {/* ═══ Notifications ═══ */}
      <SectionLabel label="Notifications" />
      <Card padded={false} style={{ overflow: 'hidden' }}>
        <SettingsRow icon="bell-outline" iconColor="#D94F00" label="Spiritual reminders" right="switch" switchValue={s.notifications !== false} onSwitchChange={(v) => updateSetting('notifications', v)} />
        <Divider />
        <SettingsRow icon="content-cut" iconColor="#2D6A4F" label="Grooming alerts" right="switch" switchValue={s.groomingReminders !== false} onSwitchChange={(v) => updateSetting('groomingReminders', v)} />
        <Divider />
        <SettingsRow icon="party-popper" iconColor="#DC2626" label="Festival alerts" right="switch" switchValue={s.festivalReminders !== false} onSwitchChange={(v) => updateSetting('festivalReminders', v)} />
        <Divider />
        <SettingsRow icon="moon-waning-crescent" iconColor="#7C3AED" label="Ekadashi alerts" right="switch" switchValue={s.ekadashiReminders !== false} onSwitchChange={(v) => updateSetting('ekadashiReminders', v)} />
        <Divider />
        <SettingsRow icon="bell-ring-outline" iconColor={colors.textSecondary} label="Send test notification" onPress={sendTestNotification} />
      </Card>

      {/* ═══ Privacy ═══ */}
      {!isGuest && (
        <>
          <SectionLabel label="Privacy" />
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <SettingsRow icon="eye-outline" iconColor="#1565C0" label="Show profile in community" right="switch" switchValue={s.showProfileInCommunity !== false} onSwitchChange={(v) => updateSetting('showProfileInCommunity', v)} />
            <Divider />
            <SettingsRow icon="message-outline" iconColor="#2D6A4F" label="Allow direct messages" right="switch" switchValue={s.allowDMs !== false} onSwitchChange={(v) => updateSetting('allowDMs', v)} />
          </Card>
        </>
      )}

      {/* ═══ Support & About ═══ */}
      <SectionLabel label="Support" />
      <Card padded={false} style={{ overflow: 'hidden' }}>
        <SettingsRow icon="star-outline" iconColor="#FFB300" label="Rate Sadhak" onPress={rateApp} />
        <Divider />
        <SettingsRow icon="web" iconColor="#38BDF8" label="Visit website" onPress={() => Linking.openURL(WEBSITE_URL).catch(() => {})} />
        <Divider />
        <SettingsRow icon="email-outline" iconColor="#EA580C" label="Contact & feedback" onPress={() => router.push('/contact')} />
        <Divider />
        <SettingsRow icon="help-circle-outline" iconColor="#7C3AED" label="FAQ & help" onPress={() => router.push('/faq')} />
      </Card>

      <SectionLabel label="About" />
      <Card padded={false} style={{ overflow: 'hidden' }}>
        <SettingsRow icon="information-outline" iconColor={colors.textSecondary} label="About Sadhak" onPress={() => router.push('/about')} />
        <Divider />
        <SettingsRow icon="shield-outline" iconColor={colors.textSecondary} label="Privacy Policy" onPress={() => router.push('/privacy')} />
        <Divider />
        <SettingsRow icon="file-document-outline" iconColor={colors.textSecondary} label="Terms & Conditions" onPress={() => router.push('/terms')} />
        <Divider />
        <SettingsRow icon="format-list-bulleted" iconColor={colors.textSecondary} label="Changelog" detail={`v${APP_VERSION}`} onPress={() => router.push('/changelog')} />
      </Card>

      {/* ═══ Account ═══ */}
      <SectionLabel label="Account" />
      <Card padded={false} style={{ overflow: 'hidden' }}>
        {!isGuest && (
          <>
            <SettingsRow icon="lock-reset" iconColor="#A78BFA" label="Change password" onPress={changePassword} />
            <Divider />
          </>
        )}
        {isAdmin && (
          <>
            <SettingsRow icon="shield-crown-outline" iconColor="#D94F00" label="Admin Panel" onPress={() => router.push('/admin' as any)} />
            <Divider />
          </>
        )}
        <SettingsRow icon="logout" iconColor="#EF4444" label="Sign out" onPress={handleLogout} />
        {!isGuest && (
          <>
            <Divider />
            <SettingsRow icon="trash-can-outline" label="Delete account" danger onPress={handleDeleteAccount} />
          </>
        )}
      </Card>

      <Text style={[styles.versionText, { color: colors.textTertiary }]}>Sadhak v{APP_VERSION}</Text>

      {/* ═══ Edit Profile Modal ═══ */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.divider }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Edit profile</Text>

            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>DISPLAY NAME</Text>
            <TextInput
              style={[styles.field, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background }]}
              value={editName} onChangeText={setEditName} placeholder="Your name" placeholderTextColor={colors.textTertiary}
            />
            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>BIO</Text>
            <TextInput
              style={[styles.field, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background, height: 96, textAlignVertical: 'top' }]}
              value={editBio} onChangeText={setEditBio} placeholder="Tell us about your spiritual journey…"
              placeholderTextColor={colors.textTertiary} multiline maxLength={150}
            />
            <Text style={[styles.charCount, { color: colors.textTertiary }]}>{editBio.length}/150</Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <Button title="Cancel" variant="secondary" onPress={() => setEditOpen(false)} />
              <Button title="Save" loading={savingEdit} onPress={saveEdit} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══ Username Modal ═══ */}
      <Modal visible={usernameOpen} transparent animationType="slide" onRequestClose={() => setUsernameOpen(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.divider }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Set username</Text>
            <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
              Others can find and mention you by your @username.
            </Text>
            <View style={[styles.usernameField, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
              <Text style={{ color: colors.textTertiary, fontSize: 17, fontWeight: '600' }}>@</Text>
              <TextInput
                style={{ flex: 1, color: colors.text, fontSize: 15.5, marginLeft: 4 }}
                value={newUsername} onChangeText={setNewUsername}
                placeholder="your_username" placeholderTextColor={colors.textTertiary}
                autoCapitalize="none" autoCorrect={false}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <Button title="Cancel" variant="secondary" onPress={() => setUsernameOpen(false)} />
              <Button title="Save" loading={checkingUsername} onPress={saveUsername} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══ Language Modal ═══ */}
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

    </Screen>
  );
}

// ─── Local helpers ───────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{label.toUpperCase()}</Text>
  );
}
function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.divider }]} />;
}

const styles = StyleSheet.create({
  identityRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 14 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 78, height: 78, borderRadius: 39 },
  pfpEdit: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0B0E13' },
  name: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  handle: { fontSize: 13.5, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },

  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 24, marginBottom: 8, marginLeft: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  versionText: { fontSize: 11.5, textAlign: 'center', marginTop: 24, marginBottom: 8 },

  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  sheetTitle: { fontSize: 19, fontWeight: '800' },
  sheetSub: { fontSize: 13, marginTop: 4, marginBottom: 12 },

  fieldLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6, marginTop: 12 },
  field: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  charCount: { fontSize: 11.5, textAlign: 'right', marginTop: 4, marginBottom: 8 },

  usernameField: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 52, marginTop: 12 },

  langRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 4 },
});
