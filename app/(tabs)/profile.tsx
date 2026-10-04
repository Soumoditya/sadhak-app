import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Image, Modal,
  Share, ActivityIndicator, Dimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../../contexts/AuthContext';
import { shareSadhak } from '../../services/shareApp';
import { useTheme } from '../../contexts/ThemeContext';
import { useDialog } from '../../contexts/DialogContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '../../contexts/LanguageContext';
import { db, collection, getDocs, query, where, setDoc, doc } from '../../config/firebase';
import { uploadToCloudinary } from '../../services/cloudinary';
import { getUserPosts, type Post } from '../../services/posts';
import { WEBSITE_URL } from '../../constants/appInfo';
import { Screen, Card, Button, AppBar, Icon } from '../../components/ui';
import { DS } from '../../constants/ds';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_GAP = 3;
const GRID_COL = (SCREEN_W - 20 * 2 - GRID_GAP * 2) / 3;

export default function ProfileScreen() {
  const { profile, isGuest, isAdmin, updateProfile, user } = useAuth();
  const { colors } = useTheme();
  const dialog = useDialog();
  const { t, display } = useLanguage();
  const insets = useSafeAreaInsets();

  const [uploadingPfp, setUploadingPfp] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female' | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postSort, setPostSort] = useState<'new' | 'old' | 'top'>('new');
  const [viewPost, setViewPost] = useState<Post | null>(null);

  // Year the user joined, from createdAt (Firestore Timestamp | Date | ms).
  const memberSinceYear = useMemo(() => {
    const c: any = profile?.createdAt;
    try {
      if (c?.toDate) return c.toDate().getFullYear();
      if (c) return new Date(c).getFullYear();
    } catch {}
    return new Date().getFullYear();
  }, [profile?.createdAt]);

  // Client-side sort for the My Posts grid.
  const sortedPosts = useMemo(() => {
    const arr = [...myPosts];
    const ts = (p: any) => (p.createdAt?.toDate ? p.createdAt.toDate().getTime() : new Date(p.createdAt || 0).getTime());
    if (postSort === 'new') arr.sort((a, b) => ts(b) - ts(a));
    else if (postSort === 'old') arr.sort((a, b) => ts(a) - ts(b));
    else arr.sort((a: any, b: any) => (b.likeCount || 0) - (a.likeCount || 0));
    return arr;
  }, [myPosts, postSort]);

  // Load the user's own posts whenever the tab regains focus (so a new post
  // shows up without a manual refresh).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!user?.uid) { setLoadingPosts(false); return; }
      setLoadingPosts(true);
      getUserPosts(user.uid)
        .then((posts) => { if (active) setMyPosts(posts); })
        .catch(() => {})
        .finally(() => { if (active) setLoadingPosts(false); });
      return () => { active = false; };
    }, [user?.uid]),
  );

  useEffect(() => {
    if (profile) {
      setEditName(profile.displayName || '');
      setEditBio(profile.bio || '');
      setEditGender((profile as any).gender ?? null);
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
      await updateProfile({ displayName: editName.trim() || 'Sadhak', bio: editBio.trim(), gender: editGender } as any);
      setEditOpen(false);
    } catch (e: any) {
      dialog.alert('Could not save', String(e?.message || e).slice(0, 200));
    } finally { setSavingEdit(false); }
  };

  const shareApp = async () => {
    const how = await shareSadhak();
    if (how === 'image') {
      dialog.alert('Invite copied', 'The invite message with the link is copied. Paste it as the caption if your app asks for one.', undefined, { tone: 'success' });
    }
  };

  const initials = (profile?.displayName || 'S').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Screen scroll tabbed edges={{ top: true, bottom: false }}>

      {/* ═══ Top bar: back, title, settings, language + theme ═══ */}
      <AppBar
        back
        title={t('p.title')}
        right={
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            style={[styles.gearBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            hitSlop={8}
            accessibilityLabel={t('t.settings')}
          >
            <Icon name="gear-six" size={19} color={colors.text} />
          </TouchableOpacity>
        }
      />

      {/* ═══ Identity: avatar + stats (Instagram-style) ═══ */}
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

        {/* Stats — honest, no fake social graph */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.text }]}>{myPosts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Posts</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.text }]}>{memberSinceYear}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Since</Text>
          </View>
          {!!profile?.location?.city && (
            <View style={styles.stat}>
              <Ionicons name="location" size={19} color={colors.primary} />
              <Text style={[styles.statLabel, { color: colors.textTertiary }]} numberOfLines={1}>{profile.location.city}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Name + handle + bio */}
      <View style={{ marginTop: DS.space.md }}>
        <Text style={[styles.name, { color: colors.text }, display]} numberOfLines={1}>{profile?.displayName || 'Sadhak'}</Text>
        <TouchableOpacity onPress={() => setUsernameOpen(true)} hitSlop={4}>
          <Text style={[styles.handle, { color: colors.textTertiary }]}>@{profile?.username || 'set-username'}</Text>
        </TouchableOpacity>
        {!!profile?.bio && <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>}
        {/* Only render the badge row when there's a badge to show (location now
            lives in the stat row above, so no duplicate badge here). */}
        {(isAdmin || isGuest) && (
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
          </View>
        )}
      </View>

      <View style={{ marginTop: DS.space.lg }}>
        <Button title={t('p.edit')} variant="secondary" size="md" icon="account-edit-outline" onPress={() => setEditOpen(true)} />
      </View>

      {/* ═══ My Posts grid ═══ */}
      <View style={styles.postsHeadRow}>
        <MaterialCommunityIcons name="grid" size={16} color={colors.text} />
        <Text style={[styles.postsHead, { color: colors.text }]}>{t('p.myPosts')}</Text>
        {myPosts.length > 0 && (
          <View style={styles.sortChips}>
            {([['new', 'New'], ['old', 'Oldest'], ['top', 'Top']] as const).map(([key, label]) => {
              const active = postSort === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setPostSort(key)}
                  style={[styles.sortChip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.cardBorder }]}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: active ? '#FFF' : colors.textSecondary }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {loadingPosts ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : myPosts.length === 0 ? (
        <View style={styles.emptyPosts}>
          <MaterialCommunityIcons name="image-multiple-outline" size={40} color={colors.textTertiary} />
          <Text style={[styles.emptyPostsText, { color: colors.textSecondary }]}>{t('p.noPosts')}</Text>
          <TouchableOpacity onPress={() => router.push('/create-post')} style={[styles.emptyPostsBtn, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="plus" size={16} color="#FFF" />
            <Text style={styles.emptyPostsBtnText}>Create your first post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.postGrid}>
          {sortedPosts.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.gridCell}
              activeOpacity={0.85}
              onPress={() => setViewPost(p)}
            >
              {p.imageUrl ? (
                <Image source={{ uri: p.imageUrl }} style={styles.gridImg} />
              ) : (
                <View style={[styles.gridText, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.gridTextBody, { color: colors.textSecondary }]} numberOfLines={4}>{p.text || '—'}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ═══ Edit Profile Modal ═══ */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: 28 + insets.bottom }]}>
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

            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>GENDER</Text>
            <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>Used to personalise grooming guidance per shastra</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
              {([['male', 'Male', 'gender-male'], ['female', 'Female', 'gender-female']] as const).map(([val, label, icon]) => {
                const active = editGender === val;
                return (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setEditGender(active ? null : val)}
                    activeOpacity={0.8}
                    style={[styles.genderChip, { borderColor: active ? colors.primary : colors.cardBorder, backgroundColor: active ? colors.primary + '15' : colors.background }]}
                  >
                    <MaterialCommunityIcons name={icon} size={17} color={active ? colors.primary : colors.textSecondary} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: active ? colors.primary : colors.text }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

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
          <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: 28 + insets.bottom }]}>
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

      {/* ═══ Post viewer ═══ */}
      <Modal visible={!!viewPost} transparent animationType="fade" onRequestClose={() => setViewPost(null)}>
        <View style={styles.postViewerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setViewPost(null)} />
          <View style={[styles.postViewerCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={styles.postViewerHead}>
              <Text style={[styles.postViewerName, { color: colors.text }]} numberOfLines={1}>{profile?.displayName || 'You'}</Text>
              <TouchableOpacity onPress={() => setViewPost(null)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            {!!viewPost?.imageUrl && (
              <Image source={{ uri: viewPost.imageUrl }} style={styles.postViewerImg} resizeMode="cover" />
            )}
            {!!viewPost?.text && (
              <Text style={[styles.postViewerText, { color: colors.text }]}>{viewPost.text}</Text>
            )}
            <View style={styles.postViewerMeta}>
              <Ionicons name="heart" size={15} color={colors.primary} />
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>{(viewPost as any)?.likeCount || 0}</Text>
            </View>
          </View>
        </View>
      </Modal>

    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 },
  screenTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  gearBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  identityRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 16 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  pfpEdit: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#13110F' },

  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', marginLeft: 12 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2 },

  name: { fontSize: 24, lineHeight: 32 },
  handle: { fontSize: 13.5, marginTop: 2 },
  bio: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },

  postsHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 26, marginBottom: 12 },
  fieldHint: { fontSize: 11.5, marginTop: -4, marginBottom: 8 },
  genderChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  sortChips: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  sortChip: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  postViewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 20 },
  postViewerCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', paddingBottom: 14 },
  postViewerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  postViewerName: { flex: 1, fontSize: 15, fontWeight: '800' },
  postViewerImg: { width: '100%', aspectRatio: 1 },
  postViewerText: { fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingTop: 12 },
  postViewerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingTop: 12 },
  postsHead: { fontSize: 15, fontWeight: '800' },
  postGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  gridCell: { width: GRID_COL, height: GRID_COL, borderRadius: 8, overflow: 'hidden' },
  gridImg: { width: '100%', height: '100%' },
  gridText: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 8, justifyContent: 'center' },
  gridTextBody: { fontSize: 11, lineHeight: 15 },
  emptyPosts: { alignItems: 'center', paddingVertical: 34, gap: 10 },
  emptyPostsText: { fontSize: 13.5 },
  emptyPostsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 100, marginTop: 4 },
  emptyPostsBtnText: { color: '#FFF', fontSize: 13.5, fontWeight: '800' },

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
