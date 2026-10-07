import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '../components/ui';
import PostCard from '../components/community/PostCard';
import CommentsSheet from '../components/community/CommentsSheet';
import ImageViewer from '../components/community/ImageViewer';
import Avatar from '../components/community/Avatar';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLayoutInsets } from '../constants/layout';
import { usePostList } from '../hooks/usePostList';
import {
  subscribeFeed, searchUsers, searchPosts, rankPosts,
  type Post, type UserResult, type FeedSort, type TopPeriod,
} from '../services/posts';

const SORTS: { key: FeedSort; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'hot', label: 'Hot', icon: 'flame-outline' },
  { key: 'new', label: 'New', icon: 'time-outline' },
  { key: 'top', label: 'Top', icon: 'trending-up-outline' },
];
const PERIODS: { key: TopPeriod; label: string }[] = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'all', label: 'All time' },
];

export default function FeedScreen() {
  const { colors } = useTheme();
  const { t: tr, tx } = useLanguage();
  const { screenBottomPadding } = useLayoutInsets();
  const list = usePostList();

  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<FeedSort>('hot');
  const [period, setPeriod] = useState<TopPeriod>('week');
  const [term, setTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const searchTimer = useRef<any>(null);
  const isSearchMode = term.trim().length > 0;

  useEffect(() => subscribeFeed((p) => { list.setPosts(p); setLoading(false); }), []);

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!term.trim()) { setUserResults([]); setPostResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const [u, p] = await Promise.all([searchUsers(term), searchPosts(term)]);
        setUserResults(u); setPostResults(p);
      } catch {} finally { setSearching(false); }
    }, 350);
    return () => searchTimer.current && clearTimeout(searchTimer.current);
  }, [term]);

  const ranked = useMemo(() => rankPosts(list.posts, sort, period), [list.posts, sort, period]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // The feed is live; re-rank so "Hot" reflects the current time.
    list.setPosts((p) => [...p]);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard
      post={item}
      uid={list.uid}
      onLike={list.like}
      onOpenComments={list.setCommentsFor}
      onDeleted={list.onDeleted}
      onChanged={list.onChanged}
      onImage={setViewImage}
      commentsVersion={list.version}
    />
  );

  const sortBar = (
    <View style={{ marginBottom: 4 }}>
      <View style={s.sortRow}>
        {SORTS.map((o) => {
          const on = sort === o.key;
          return (
            <TouchableOpacity
              key={o.key}
              onPress={() => setSort(o.key)}
              style={[s.sortChip, { backgroundColor: on ? colors.primary : colors.surface, borderColor: on ? colors.primary : colors.cardBorder }]}
              accessibilityState={{ selected: on }}
            >
              <Ionicons name={o.icon} size={15} color={on ? '#FFF' : colors.textSecondary} />
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: on ? '#FFF' : colors.textSecondary }}>{tx(o.label)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {sort === 'top' && (
        <View style={[s.sortRow, { marginTop: 8 }]}>
          {PERIODS.map((o) => {
            const on = period === o.key;
            return (
              <TouchableOpacity key={o.key} onPress={() => setPeriod(o.key)} style={[s.periodChip, { borderColor: on ? colors.primary : 'transparent', backgroundColor: on ? colors.primary + '14' : 'transparent' }]}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: on ? colors.primary : colors.textTertiary }}>{tx(o.label)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  const people = userResults.length > 0 && (
    <View style={{ marginBottom: 8 }}>
      <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>{tx('People')}</Text>
      {userResults.map((u) => (
        <TouchableOpacity
          key={u.uid}
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: '/user/[uid]', params: { uid: u.uid } })}
          style={[s.userRow, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
        >
          <Avatar uri={u.profilePicUrl} name={u.displayName} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={[s.author, { color: colors.text }]}>{u.displayName}</Text>
            {!!u.username && <Text style={{ fontSize: 12.5, color: colors.textTertiary }}>@{u.username}</Text>}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <Header title={tr('t.explore')} subtitle={tx('Posts from the Sadhak community')} />
      <View style={[s.searchBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder={tx('Search people, #topics, posts…')}
          placeholderTextColor={colors.textTertiary}
          value={term}
          onChangeText={setTerm}
          returnKeyType="search"
        />
        {isSearchMode && (
          <TouchableOpacity onPress={() => setTerm('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {isSearchMode ? (
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={postResults}
          keyExtractor={(p) => 'p' + p.id}
          renderItem={renderPost}
          contentContainerStyle={{ padding: 14, paddingBottom: screenBottomPadding, gap: 14 }}
          ListHeaderComponent={
            <View>
              {searching && <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />}
              {people}
              {postResults.length > 0 && <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>{tx('Posts')}</Text>}
            </View>
          }
          ListEmptyComponent={!searching && userResults.length === 0 ? <Text style={[s.empty, { color: colors.textTertiary }]}>{tx('No results')}</Text> : null}
        />
      ) : loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={ranked}
          keyExtractor={(p) => p.id}
          renderItem={renderPost}
          ListHeaderComponent={sortBar}
          contentContainerStyle={{ padding: 14, paddingTop: 6, paddingBottom: screenBottomPadding + 70, gap: 14 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} />}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <MaterialCommunityIcons name="post-outline" size={54} color={colors.textTertiary} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>{sort === 'top' && list.posts.length ? tx('Nothing in this period') : tx('No posts yet')}</Text>
              <Text style={[s.empty, { color: colors.textTertiary }]}>{tx('Be the first to share with the community.')}</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={[s.fab, { bottom: screenBottomPadding + 8 }]} activeOpacity={0.85} onPress={() => router.push('/create-post')} accessibilityLabel={tx('New post')}>
        <LinearGradient colors={['#C2410C', '#E8743B']} style={s.fabGrad}>
          <MaterialCommunityIcons name="feather" size={24} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      <CommentsSheet post={list.commentsFor} onClose={() => list.setCommentsFor(null)} onAdded={list.onCommentAdded} />
      <ImageViewer uri={viewImage} onClose={() => setViewImage(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, height: 46, marginHorizontal: 14, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  sortRow: { flexDirection: 'row', gap: 8 },
  sortChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1 },
  periodChip: { paddingHorizontal: 12, height: 30, borderRadius: 15, borderWidth: 1, justifyContent: 'center' },
  author: { fontSize: 14.5, fontWeight: '700' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginBottom: 8, marginTop: 4, textTransform: 'uppercase' },
  empty: { textAlign: 'center', fontSize: 14, marginTop: 8 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  fab: { position: 'absolute', right: 20 },
  fabGrad: { width: 58, height: 58, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#C2410C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
});
