import React, { useEffect, useRef, useState } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '../components/ui';
import PostCard from '../components/community/PostCard';
import CommentsSheet from '../components/community/CommentsSheet';
import ImageViewer from '../components/community/ImageViewer';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useDsInsets } from '../constants/ds';
import { getUserPosts, rankPosts, withPinnedFirst, takeHandoff, type FeedSort, type Post } from '../services/posts';
import { usePostList } from '../hooks/usePostList';

/** A person's posts as a vertical feed, opened at the tapped post. */
export default function PostsScreen() {
  const { uid, start, name, sort } = useLocalSearchParams<{ uid: string; start?: string; name?: string; sort?: string }>();
  const { colors } = useTheme();
  const { tx } = useLanguage();
  const { insets } = useDsInsets();
  // Like Instagram: the grid hands over its posts, so the list opens at once
  // with the tapped post on top. Earlier posts are added above it a moment
  // later without moving the view, so you can scroll up to them too.
  const [handed] = useState<Post[] | undefined>(() => (uid ? takeHandoff(uid) : undefined));
  const startIdx = Math.max(0, handed && start ? handed.findIndex((x) => x.id === start) : 0);
  const list = usePostList(handed ? handed.slice(startIdx) : []);
  const [loading, setLoading] = useState(!handed);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const ref = useRef<FlatList>(null);

  useEffect(() => {
    if (!uid) return;
    if (handed) {
      const t = setTimeout(() => list.setPosts((cur) => [...handed.slice(0, startIdx), ...cur]), 350);
      // Refresh counts quietly, keeping the order the person is looking at.
      getUserPosts(uid).then((fresh) => {
        const byId = new Map(fresh.map((p) => [p.id, p]));
        list.setPosts((cur) => cur.filter((p) => byId.has(p.id)).map((p) => byId.get(p.id)!));
      }).catch(() => {});
      return () => clearTimeout(t);
    }
    getUserPosts(uid).then((raw) => {
      const p = withPinnedFirst(rankPosts(raw, (sort as FeedSort) || 'new', 'all'));
      list.setPosts(p);
      const i = start ? p.findIndex((x) => x.id === start) : -1;
      if (i > 0) setTimeout(() => ref.current?.scrollToIndex({ index: i, animated: false }), 60);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [uid]);

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <Header title={tx('Posts')} subtitle={name || undefined} />
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          ref={ref}
          data={list.posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 + insets.bottom }}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={(e) => {
            ref.current?.scrollToOffset({ offset: e.averageItemLength * e.index, animated: false });
            setTimeout(() => ref.current?.scrollToIndex({ index: e.index, animated: false }), 120);
          }}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              uid={list.uid}
              onLike={list.like}
              onOpenComments={list.setCommentsFor}
              onDeleted={list.onDeleted}
              onChanged={list.onChanged}
              flat
              onImage={setViewImage}
              commentsVersion={list.version}
            />
          )}
        />
      )}
      <CommentsSheet post={list.commentsFor} onClose={() => list.setCommentsFor(null)} onAdded={list.onCommentAdded} />
      <ImageViewer uri={viewImage} onClose={() => setViewImage(null)} />
    </View>
  );
}

const s = StyleSheet.create({ root: { flex: 1 } });
