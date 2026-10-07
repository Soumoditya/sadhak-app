import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Header, Button } from '../../components/ui';
import { ProfileHead, PostGrid, PostSort } from '../../components/community/ProfileHead';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDialog } from '../../contexts/DialogContext';
import { getUserPosts, rankPosts, withPinnedFirst, type Post } from '../../services/posts';
import { getPublicProfile, followCounts, isFollowing, follow, unfollow, ensureDm } from '../../services/social';
import { DS, useDsInsets } from '../../constants/ds';

const yearOf = (c: any) => { try { return c?.toDate ? c.toDate().getFullYear() : c ? new Date(c).getFullYear() : undefined; } catch { return undefined; } };

export default function PublicProfile() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { colors } = useTheme();
  const { tx } = useLanguage();
  const { user, profile, isGuest } = useAuth();
  const dialog = useDialog();
  const { screenBottom } = useDsInsets();
  const [p, setP] = useState<Awaited<ReturnType<typeof getPublicProfile>>>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [followed, setFollowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<'hot' | 'new' | 'top'>('new');
  const ordered = useMemo(() => withPinnedFirst(rankPosts(posts, sort, 'all')), [posts, sort]);

  useEffect(() => { if (uid && uid === user?.uid) router.replace('/(tabs)/profile'); }, [uid, user?.uid]);

  const load = useCallback(async () => {
    if (!uid) return;
    const [pp, ps, c, f] = await Promise.all([
      getPublicProfile(uid).catch(() => null),
      getUserPosts(uid).catch(() => []),
      followCounts(uid),
      user ? isFollowing(user.uid, uid) : Promise.resolve(false),
    ]);
    setP(pp); setPosts(ps); setCounts(c); setFollowed(f); setLoading(false);
  }, [uid, user?.uid]);

  useEffect(() => { load(); }, [load]);

  const needAccount = () => dialog.alert(tx('Create an account'), tx('Sign up to follow and message fellow Sadhaks.'));

  const toggleFollow = async () => {
    if (!user || !profile || !p) return;
    if (isGuest) return needAccount();
    setBusy(true);
    const was = followed;
    setFollowed(!was);
    setCounts((c) => ({ ...c, followers: Math.max(0, c.followers + (was ? -1 : 1)) }));
    try {
      if (was) await unfollow(user.uid, p.uid);
      else await follow({ uid: user.uid, displayName: profile.displayName, username: profile.username, profilePicUrl: profile.profilePicUrl }, p);
    } catch (e: any) {
      setFollowed(was);
      setCounts((c) => ({ ...c, followers: Math.max(0, c.followers + (was ? 1 : -1)) }));
      dialog.alert('Could not update', String(e?.message || e).slice(0, 200));
    } finally { setBusy(false); }
  };

  const message = async () => {
    if (!user || !profile || !p) return;
    if (isGuest) return needAccount();
    const roomId = await ensureDm({ uid: user.uid, displayName: profile.displayName, username: profile.username, profilePicUrl: profile.profilePicUrl }, p);
    router.push({ pathname: '/chatroom', params: { roomId, roomName: p.displayName, roomType: 'dm' } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={p?.username ? `@${p.username}` : tx('Profile')} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: DS.layout.screenPaddingH, paddingBottom: screenBottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} />}
      >
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : !p ? (
        <Text style={[s.empty, { color: colors.textSecondary }]}>{tx('This profile is not available.')}</Text>
      ) : (
        <>
          <View style={{ paddingTop: DS.space.md }}>
            <ProfileHead
              uid={p.uid} name={p.displayName} username={p.username} pfp={p.profilePicUrl} bio={p.bio} city={p.city}
              since={yearOf(p.createdAt)} posts={posts.length} followers={counts.followers} following={counts.following}
            />
          </View>
          <View style={s.actions}>
            <Button title={followed ? tx('Following') : tx('Follow')} variant={followed ? 'secondary' : 'primary'} size="md" icon={followed ? 'account-check-outline' : 'account-plus-outline'} loading={busy} onPress={toggleFollow} style={{ flex: 1 }} />
            <Button title={tx('Message')} variant="secondary" size="md" icon="message-outline" onPress={message} style={{ flex: 1 }} />
          </View>
          <View style={s.sectionRow}>
            <Text style={[s.section, { color: colors.text }]}>{tx('Posts')}</Text>
            {posts.length > 1 && <PostSort value={sort} onChange={setSort} />}
          </View>
          {posts.length ? <PostGrid posts={ordered} uid={p.uid} name={p.displayName} sort={sort} /> : (
            <Text style={[s.empty, { color: colors.textTertiary }]}>{tx('No posts yet')}</Text>
          )}
        </>
      )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10, marginTop: DS.space.lg },
  section: { fontSize: 15, fontWeight: '800' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
  empty: { textAlign: 'center', fontSize: 14, marginTop: 30 },
});
