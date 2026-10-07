import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getUserPosts, rankPosts, withPinnedFirst, type Post } from '../../services/posts';
import { followCounts } from '../../services/social';
import { shareSadhak } from '../../services/shareApp';
import { useDialog } from '../../contexts/DialogContext';
import { Screen, Button, AppBar, Icon } from '../../components/ui';
import { ProfileHead, PostGrid, PostSort } from '../../components/community/ProfileHead';
import { DS } from '../../constants/ds';

export default function ProfileScreen() {
  const { profile, isGuest, isAdmin, user, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const { t, tx } = useLanguage();
  const dialog = useDialog();

  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<'hot' | 'new' | 'top'>('new');
  const ordered = useMemo(() => withPinnedFirst(rankPosts(myPosts, sort, 'all')), [myPosts, sort]);

  // Year the user joined, from createdAt (Firestore Timestamp | Date | ms).
  const since = useMemo(() => {
    const c: any = profile?.createdAt;
    try {
      const y = c?.toDate ? c.toDate().getFullYear() : c ? new Date(c).getFullYear() : NaN;
      return Number.isFinite(y) ? y : new Date().getFullYear();
    } catch { return new Date().getFullYear(); }
  }, [profile?.createdAt]);

  const load = useCallback(async () => {
    if (!user?.uid) { setLoadingPosts(false); return; }
    const [p, c] = await Promise.all([getUserPosts(user.uid).catch(() => [] as Post[]), followCounts(user.uid)]);
    setMyPosts(p); setCounts(c); setLoadingPosts(false);
  }, [user?.uid]);

  // Reload on focus so a new post or follow shows without a manual refresh.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refreshProfile(), load()]); } catch {} finally { setRefreshing(false); }
  }, [refreshProfile, load]);

  const share = async () => {
    const how = await shareSadhak();
    if (how === 'image') dialog.alert('Invite copied', 'The invite message with the link is copied. Paste it as the caption if your app asks for one.', undefined, { tone: 'success' });
  };

  return (
    <Screen scroll tabbed edges={{ top: true, bottom: false }} scrollProps={{ refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} /> }}>
      <AppBar
        back
        title={t('p.title')}
        after={
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

      <ProfileHead
        uid={user?.uid || ''}
        name={profile?.displayName || 'Sadhak'}
        username={profile?.username}
        pfp={profile?.profilePicUrl}
        bio={profile?.bio}
        city={profile?.location?.city}
        since={since}
        posts={myPosts.length}
        followers={counts.followers}
        following={counts.following}
        editable
        onAvatar={() => router.push('/edit-profile')}
      />

      {(isAdmin || isGuest) && (
        <View style={styles.badgeRow}>
          {isAdmin && (
            <View style={[styles.badge, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B55' }]}>
              <MaterialCommunityIcons name="shield-crown" size={11} color="#F59E0B" />
              <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '800' }}>{tx('Admin')}</Text>
            </View>
          )}
          {isGuest && (
            <View style={[styles.badge, { backgroundColor: colors.textTertiary + '18', borderColor: colors.textTertiary + '55' }]}>
              <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: '800' }}>{tx('Guest')}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <Button title={t('p.edit')} variant="secondary" size="md" icon="account-edit-outline" onPress={() => router.push('/edit-profile')} style={{ flex: 1 }} />
        <Button title={tx('Share')} variant="secondary" size="md" icon="share-variant-outline" onPress={share} style={{ flex: 1 }} />
      </View>

      <View style={styles.postsHeadRow}>
        <MaterialCommunityIcons name="grid" size={16} color={colors.text} />
        <Text style={[styles.postsHead, { color: colors.text }]}>{t('p.myPosts')}</Text>
        <View style={{ marginLeft: 'auto' }}>{myPosts.length > 1 && <PostSort value={sort} onChange={setSort} />}</View>
        <TouchableOpacity onPress={() => router.push('/create-post')} style={{ marginLeft: 8 }} hitSlop={8} accessibilityLabel={tx('New post')}>
          <MaterialCommunityIcons name="plus-box-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loadingPosts ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : myPosts.length === 0 ? (
        <View style={styles.emptyPosts}>
          <MaterialCommunityIcons name="image-multiple-outline" size={40} color={colors.textTertiary} />
          <Text style={[styles.emptyPostsText, { color: colors.textSecondary }]}>{t('p.noPosts')}</Text>
          <TouchableOpacity onPress={() => router.push('/create-post')} style={[styles.emptyPostsBtn, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="plus" size={16} color="#FFF" />
            <Text style={styles.emptyPostsBtnText}>{tx('Create your first post')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <PostGrid posts={ordered} uid={user?.uid || ''} name={profile?.displayName} sort={sort} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gearBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: DS.space.lg },
  postsHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 26, marginBottom: 12 },
  postsHead: { fontSize: 15, fontWeight: '800' },
  emptyPosts: { alignItems: 'center', paddingVertical: 34, gap: 10 },
  emptyPostsText: { fontSize: 13.5 },
  emptyPostsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 100, marginTop: 4 },
  emptyPostsBtnText: { color: '#FFF', fontSize: 13.5, fontWeight: '800' },
});
