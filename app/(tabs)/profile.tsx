import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert,
  TextInput, Image, Animated, Modal, ActivityIndicator, Platform, Share, Linking,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDialog } from "../../contexts/DialogContext";
import { useLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from '../../contexts/LanguageContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { db, collection, getDocs, query, where, setDoc, doc } from '../../config/firebase';
import { sendTestNotification } from '../../services/notifications';
import { uploadToCloudinary } from '../../services/cloudinary';
import { APP_VERSION, WEBSITE_URL } from '../../constants/appInfo';
import { useLayoutInsets } from '../../constants/layout';

export default function ProfileScreen() {
  const { profile, isGuest, isAdmin, logout, updateProfile, user, deleteAccount } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const dialog = useDialog();
  const { language, setLanguage, t } = useLanguage();
  const { headerPaddingTop, tabContentPadding } = useLayoutInsets();
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Modals
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  
  // Username
  const [newUsername, setNewUsername] = useState(profile?.username || '');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [uploadingPfp, setUploadingPfp] = useState(false);

  // Edit Profile
  const [editName, setEditName] = useState(profile?.displayName || '');
  const [editBio, setEditBio] = useState(profile?.bio || '');

  // Settings state
  const settings = profile?.settings;
  const [notifications, setNotifications] = useState(settings?.notifications ?? true);
  const [groomingReminders, setGroomingReminders] = useState(settings?.groomingReminders ?? true);
  const [festivalReminders, setFestivalReminders] = useState(settings?.festivalReminders ?? true);
  const [ekadashiReminders, setEkadashiReminders] = useState(settings?.ekadashiReminders ?? true);
  const [quietHours, setQuietHours] = useState(settings?.quietHoursEnabled ?? false);
  const [showInCommunity, setShowInCommunity] = useState(settings?.showProfileInCommunity ?? true);
  const [allowDMs, setAllowDMs] = useState(settings?.allowDMs ?? true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  // ─── PROFILE PICTURE ────────────────────────────────────────
  const pickAndUploadPfp = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        dialog.alert('Permission needed', 'Please allow photo library access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setUploadingPfp(true);
      // Shrink to avatar size first — a multi-MB camera photo dies on weak
      // connections; a 512px JPEG (~100-200KB) uploads reliably.
      const small = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 512 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
      );
      // Upload to Cloudinary so the photo persists across reinstall / cache clear.
      const up = await uploadToCloudinary(small.uri, 'sadhak/avatars', 'image');
      await updateProfile({ profilePicUrl: up.secure_url });
      dialog.alert('Updated', 'Your profile picture has been updated.', undefined, { tone: 'success' });
    } catch (e: any) {
      console.error(e);
      // Show the REAL reason so failures are debuggable from a screenshot.
      dialog.alert('Upload failed', String(e?.message || e).slice(0, 300));
    } finally {
      setUploadingPfp(false);
    }
  };

  // ─── USERNAME ────────────────────────────────────────
  const validateUsername = (text: string) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setNewUsername(cleaned);
    if (cleaned.length < 3) setUsernameError('Min 3 characters');
    else if (cleaned.length > 20) setUsernameError('Max 20 characters');
    else setUsernameError('');
  };

  const checkAndSaveUsername = async () => {
    if (newUsername.length < 3 || newUsername.length > 20) return;
    setCheckingUsername(true);
    try {
      const q = query(collection(db, 'usernames'), where('username', '==', newUsername));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const isOurs = snap.docs.some(d => d.data().uid === user?.uid);
        if (!isOurs) { setUsernameError('Username taken'); setCheckingUsername(false); return; }
      }
      await updateProfile({ username: newUsername });
      await setDoc(doc(db, 'usernames', newUsername), { uid: user?.uid, username: newUsername, createdAt: new Date().toISOString() });
      setShowUsernameModal(false);
      dialog.alert('Done!', `Username set to @${newUsername}`);
    } catch (e) {
      dialog.alert('Error', 'Could not update username');
    } finally { setCheckingUsername(false); }
  };

  // ─── EDIT PROFILE ────────────────────────────────────────
  const saveEditProfile = async () => {
    try {
      await updateProfile({ displayName: editName.trim() || 'Sadhak', bio: editBio.trim() });
      setShowEditProfileModal(false);
      dialog.alert('✅ Saved!', 'Profile updated.');
    } catch (e) { dialog.alert('Error', 'Could not update profile'); }
  };

  // ─── SETTINGS ────────────────────────────────────────
  const updateSetting = async (key: string, value: boolean) => {
    const s = { ...(profile?.settings || {}), [key]: value };
    await updateProfile({ settings: s } as any);
  };

  const handleLogout = () => {
    dialog.alert(t('settings.logout'), 'Are you sure?', [
      { text: t('common.cancel') },
      { text: t('settings.logout'), style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    dialog.alert('⚠️ Delete Account', 'This will permanently delete your account and all data. This action cannot be undone.', [
      { text: t('common.cancel') },
      { text: 'Delete Forever', style: 'destructive', onPress: () => {
        dialog.alert('Final Confirmation', 'Are you absolutely sure?', [
          { text: t('common.cancel') },
          { text: 'Yes, Delete', style: 'destructive', onPress: deleteAccount },
        ]);
      }},
    ]);
  };

  const handleShareApp = async () => {
    try {
      // Share the live website until the Play Store listing exists —
      // a dead store link reads as fake.
      await Share.share({
        message: `🙏 Sadhak — your Hindu spiritual companion.\n\nAccurate Panchang, Hindu calendar, nearby temples, sacred library, aarti & community.\n\n${WEBSITE_URL}`,
      });
    } catch (e) {}
  };

  const handleRateApp = () => {
    // Not on the Play Store yet — an honest dialog beats a broken store page.
    dialog.alert(
      'Coming to Play Store',
      'Sadhak is preparing for its Play Store release. Once live, you can rate it here — until then, sharing the app with fellow sadhaks helps the most. 🙏',
      [
        { text: 'Share instead', onPress: handleShareApp },
        { text: 'OK', style: 'cancel' },
      ],
      { tone: 'info' },
    );
  };

  const handleWebsite = () => {
    Linking.openURL(WEBSITE_URL).catch(() => {});
  };

  const getInitials = () => {
    const name = profile?.displayName || 'S';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const selectedLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === language);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: tabContentPadding }} showsVerticalScrollIndicator={false}>
      {/* ─── Profile Card ──── */}
      <Animated.View style={[styles.profileCard, { marginTop: headerPaddingTop }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
        <LinearGradient colors={isDark ? [colors.surfaceElevated, colors.surface] : ['#D94F00', '#F07830']} style={styles.profileGradient}>
          <TouchableOpacity style={styles.pfpContainer} onPress={pickAndUploadPfp} activeOpacity={0.8}>
            {uploadingPfp ? (
              <View style={styles.pfpPlaceholder}><ActivityIndicator size="large" color="#FFD700" /></View>
            ) : profile?.profilePicUrl ? (
              <Image source={{ uri: profile.profilePicUrl }} style={styles.pfpImage} />
            ) : (
              <View style={styles.pfpPlaceholder}><Text style={styles.pfpInitials}>{getInitials()}</Text></View>
            )}
            <View style={styles.pfpEdit}><MaterialCommunityIcons name="camera" size={14} color="#FFF" /></View>
          </TouchableOpacity>

          <Text style={styles.profileName}>{profile?.displayName || 'Sadhak'}</Text>
          <TouchableOpacity style={styles.usernameRow} onPress={() => setShowUsernameModal(true)}>
            <Text style={styles.username}>@{profile?.username || 'set_username'}</Text>
            <MaterialCommunityIcons name="pencil-outline" size={14} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          {/* Bio */}
          {profile?.bio ? (
            <Text style={styles.bioText} numberOfLines={2}>{profile.bio}</Text>
          ) : null}

          {/* Info Chips */}
          <View style={styles.infoChips}>
            {profile?.gender && (
              <View style={styles.chip}>
                <MaterialCommunityIcons name={profile.gender === 'male' ? 'gender-male' : 'gender-female'} size={14} color="#FFD700" />
                <Text style={styles.chipText}>{profile.gender === 'male' ? 'Male' : 'Female'}</Text>
              </View>
            )}
            {profile?.location?.city && (
              <View style={styles.chip}>
                <MaterialCommunityIcons name="map-marker" size={14} color="#FFD700" />
                <Text style={styles.chipText}>{profile.location.city}</Text>
              </View>
            )}
            {isAdmin && (
              <View style={[styles.chip, { backgroundColor: 'rgba(255,215,0,0.3)' }]}>
                <MaterialCommunityIcons name="shield-crown" size={14} color="#FFD700" />
                <Text style={[styles.chipText, { color: '#FFD700' }]}>Admin</Text>
              </View>
            )}
          </View>
          <Text style={styles.email}>{profile?.email || 'Guest User'}</Text>

          {/* Edit Profile Button */}
          <TouchableOpacity style={styles.editProfileBtn} onPress={() => { setEditName(profile?.displayName || ''); setEditBio(profile?.bio || ''); setShowEditProfileModal(true); }}>
            <MaterialCommunityIcons name="account-edit-outline" size={16} color="#FFF" />
            <Text style={styles.editProfileBtnText}>{t('profile.editProfile')}</Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim }}>
        {/* ─── APPEARANCE ──── */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t('settings.appearance').toUpperCase()}</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: isDark ? '#FFD700' + '15' : colors.text + '10' }]}>
              <MaterialCommunityIcons name={isDark ? 'weather-night' : 'weather-sunny'} size={20} color={isDark ? '#FFD700' : '#FF8C00'} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.darkMode')}</Text>
            <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: '#ccc', true: colors.primary + '60' }} thumbColor={isDark ? colors.primary : '#f4f4f4'} />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <TouchableOpacity style={styles.settingRow} onPress={() => setShowLanguageModal(true)} activeOpacity={0.7}>
            <View style={[styles.settingIcon, { backgroundColor: '#1A73E8' + '15' }]}>
              <MaterialCommunityIcons name="translate" size={20} color="#1A73E8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.appLanguage')}</Text>
              <Text style={[styles.settingHint, { color: colors.textTertiary }]}>{selectedLangInfo?.nativeName || 'English'}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* ─── NOTIFICATIONS ──── */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t('settings.notifications').toUpperCase()}</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {[
            { key: 'notifications', label: t('settings.spiritualReminders'), icon: 'bell-ring-outline', color: '#D94F00', state: notifications, setter: setNotifications },
            { key: 'groomingReminders', label: t('settings.groomingAlerts'), icon: 'content-cut', color: '#2D6A4F', state: groomingReminders, setter: setGroomingReminders },
            { key: 'festivalReminders', label: t('settings.festivalAlerts'), icon: 'party-popper', color: '#D32F2F', state: festivalReminders, setter: setFestivalReminders },
            { key: 'ekadashiReminders', label: t('settings.ekadashiAlerts'), icon: 'calendar-star', color: '#9C27B0', state: ekadashiReminders, setter: setEkadashiReminders },
            { key: 'quietHoursEnabled', label: t('settings.quietHours'), icon: 'moon-waning-crescent', color: '#37474F', state: quietHours, setter: setQuietHours, hint: t('settings.quietHoursDesc') },
          ].map((item, idx) => (
            <React.Fragment key={item.key}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
              <View style={styles.settingRow}>
                <View style={[styles.settingIcon, { backgroundColor: item.color + '15' }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>{item.label}</Text>
                  {(item as any).hint && <Text style={[styles.settingHint, { color: colors.textTertiary }]}>{(item as any).hint}</Text>}
                </View>
                <Switch
                  value={item.state}
                  onValueChange={(val) => { item.setter(val); updateSetting(item.key, val); }}
                  trackColor={{ false: '#ccc', true: colors.primary + '60' }}
                  thumbColor={item.state ? colors.primary : '#f4f4f4'}
                />
              </View>
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.testNotifBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
          onPress={() => { sendTestNotification(); dialog.alert('Sent!', 'Check your notification tray.'); }}
        >
          <MaterialCommunityIcons name="bell-badge-outline" size={20} color={colors.primary} />
          <Text style={[styles.testNotifText, { color: colors.primary }]}>Send Test Notification</Text>
        </TouchableOpacity>

        {/* ─── PRIVACY ──── */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t('settings.privacy').toUpperCase()}</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {[
            { key: 'showProfileInCommunity', label: t('settings.showInCommunity'), icon: 'eye-outline', color: '#1565C0', state: showInCommunity, setter: setShowInCommunity },
            { key: 'allowDMs', label: t('settings.allowDMs'), icon: 'message-outline', color: '#4ADE80', state: allowDMs, setter: setAllowDMs },
          ].map((item, idx) => (
            <React.Fragment key={item.key}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
              <View style={styles.settingRow}>
                <View style={[styles.settingIcon, { backgroundColor: item.color + '15' }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{item.label}</Text>
                <Switch
                  value={item.state}
                  onValueChange={(val) => { item.setter(val); updateSetting(item.key, val); }}
                  trackColor={{ false: '#ccc', true: colors.primary + '60' }}
                  thumbColor={item.state ? colors.primary : '#f4f4f4'}
                />
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ─── SUPPORT ──── */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t('settings.support').toUpperCase()}</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {[
            { label: t('settings.rateApp'), icon: 'star-outline', color: '#FFB300', action: handleRateApp },
            { label: t('settings.shareApp'), icon: 'share-variant-outline', color: '#4ADE80', action: handleShareApp },
            { label: 'Website', icon: 'web', color: '#38BDF8', action: handleWebsite },
            { label: t('settings.about'), icon: 'information-outline', color: '#37474F', action: () => router.push('/about' as any) },
            { label: t('settings.privacyPolicy'), icon: 'shield-lock-outline', color: '#1565C0', action: () => router.push('/privacy' as any) },
            { label: t('settings.terms'), icon: 'file-document-outline', color: '#9C27B0', action: () => router.push('/terms' as any) },
            { label: t('settings.contact'), icon: 'email-outline', color: '#D94F00', action: () => router.push('/contact' as any) },
            { label: t('settings.changelog'), icon: 'format-list-bulleted', color: '#2D6A4F', action: () => router.push('/changelog' as any) },
            { label: t('settings.faq'), icon: 'help-circle-outline', color: '#1A73E8', action: () => router.push('/faq' as any) },
            ...(isAdmin ? [{ label: 'Admin Panel', icon: 'shield-crown-outline', color: '#D94F00', action: () => router.push('/admin' as any) }] : []),
          ].map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
              <TouchableOpacity style={styles.settingRow} onPress={item.action} activeOpacity={0.7}>
                <View style={[styles.settingIcon, { backgroundColor: item.color + '15' }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{item.label}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* ─── ACCOUNT ──── */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t('settings.account').toUpperCase()}</Text>
        <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.error }]} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>{isGuest ? 'Exit Guest Mode' : t('settings.logout')}</Text>
        </TouchableOpacity>

        {!isGuest && (
          <TouchableOpacity style={[styles.deleteBtn, { borderColor: '#EF4444' }]} onPress={handleDeleteAccount}>
            <MaterialCommunityIcons name="delete-forever-outline" size={20} color="#EF4444" />
            <Text style={[styles.logoutText, { color: '#EF4444' }]}>{t('settings.deleteAccount')}</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.versionText, { color: colors.textTertiary }]}>Sadhak v{APP_VERSION}</Text>
        <View style={{ height: 100 }} />
      </Animated.View>

      {/* ─── USERNAME MODAL ──── */}
      <Modal visible={showUsernameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Username</Text>
            <View style={[styles.usernameInputRow, { borderColor: usernameError ? colors.error : colors.border }]}>
              <Text style={[styles.atSign, { color: colors.textTertiary }]}>@</Text>
              <TextInput
                style={[styles.usernameInput, { color: colors.text }]}
                value={newUsername}
                onChangeText={validateUsername}
                placeholder="username"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                maxLength={20}
              />
            </View>
            {usernameError ? <Text style={[styles.errorText, { color: colors.error }]}>{usernameError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowUsernameModal(false)} style={[styles.modalBtn, { borderColor: colors.border }]}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={checkAndSaveUsername} disabled={!!usernameError || checkingUsername}>
                <LinearGradient colors={['#D94F00', '#F07830']} style={styles.modalBtnPrimary}>
                  {checkingUsername ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalBtnPrimaryText}>{t('common.save')}</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── EDIT PROFILE MODAL ──── */}
      <Modal visible={showEditProfileModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('profile.editProfile')}</Text>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Display Name</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('profile.bio')}</Text>
            <TextInput
              style={[styles.modalInput, styles.bioInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={editBio}
              onChangeText={(t) => setEditBio(t.slice(0, 150))}
              placeholder={t('profile.bioPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: colors.textTertiary }]}>{editBio.length}/150</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowEditProfileModal(false)} style={[styles.modalBtn, { borderColor: colors.border }]}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEditProfile}>
                <LinearGradient colors={['#D94F00', '#F07830']} style={styles.modalBtnPrimary}>
                  <Text style={styles.modalBtnPrimaryText}>{t('common.save')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── LANGUAGE PICKER MODAL ──── */}
      <Modal visible={showLanguageModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.langModalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings.appLanguage')}</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langRow, language === lang.code && { backgroundColor: '#D94F00' + '15', borderColor: '#D94F00' }]}
                  onPress={() => { setLanguage(lang.code as LanguageCode); setShowLanguageModal(false); }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.langName, { color: language === lang.code ? '#D94F00' : colors.text }]}>{lang.nativeName}</Text>
                    <Text style={[styles.langSub, { color: colors.textTertiary }]}>{lang.name}</Text>
                  </View>
                  {language === lang.code && <MaterialCommunityIcons name="check-circle" size={22} color="#D94F00" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowLanguageModal(false)} style={[styles.modalBtn, { borderColor: colors.border, alignSelf: 'center', marginTop: 12 }]}>
              <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: { marginHorizontal: 20, marginTop: Platform.OS === 'ios' ? 60 : 48, borderRadius: 20, overflow: 'hidden' },
  profileGradient: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  pfpContainer: { position: 'relative', marginBottom: 12 },
  pfpImage: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  pfpPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  pfpInitials: { fontSize: 32, fontWeight: '800', color: '#FFD700' },
  pfpEdit: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#D94F00', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  profileName: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  username: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  bioText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 },
  infoChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  chipText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  email: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  editProfileBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginHorizontal: 20, marginTop: 24, marginBottom: 8 },
  settingsCard: { marginHorizontal: 20, borderRadius: 16, padding: 4, borderWidth: 1, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, gap: 12 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  settingHint: { fontSize: 11, marginTop: 1 },
  divider: { height: 1, marginHorizontal: 12 },
  testNotifBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginTop: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed' },
  testNotifText: { fontSize: 13, fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginTop: 8, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginTop: 8, padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed' },
  logoutText: { fontSize: 15, fontWeight: '600' },
  versionText: { textAlign: 'center', marginTop: 20, fontSize: 12 },
  // Modals
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 },
  modalCard: { width: '100%', borderRadius: 20, padding: 24 },
  langModalCard: { maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  usernameInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, height: 50 },
  atSign: { fontSize: 18, fontWeight: '600', marginRight: 2 },
  usernameInput: { flex: 1, fontSize: 16 },
  errorText: { fontSize: 12, marginTop: 6, marginLeft: 4 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
  modalBtnPrimary: { flex: 1, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalBtnPrimaryText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  modalInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15 },
  bioInput: { height: 80, paddingTop: 12 },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },
  langRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4, borderWidth: 1, borderColor: 'transparent' },
  langName: { fontSize: 16, fontWeight: '600' },
  langSub: { fontSize: 12, marginTop: 1 },
});
