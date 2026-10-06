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
import { getUserPosts } from '../services/posts';
import { usePostList } from '../hooks/usePostList';

/** A person's posts as a vertical feed, opened at the tapped post. */
export default function PostsScreen() {
  const { uid, start, name } = useLocalSearchParams<{ uid: string; start?: string; name?: string }>();
  const { colors } = useTheme();
  const { tx } = useLanguage();
  const { insets } = useDsInsets();
  const list = usePostList();
  const [loading, setLoading] = useState(true);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const ref = useRef<FlatList>(null);

  useEffect(() => {
    if (!uid) return;
    getUserPosts(uid).then((p) => {
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
          contentContainerStyle={{ padding: 14, gap: 14, paddingBottom: 24 + insets.bottom }}
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
