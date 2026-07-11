import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  FlatList, ActivityIndicator, RefreshControl, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLayoutInsets } from '../constants/layout';
import {
  subscribeFeed, toggleLike, searchUsers, searchPosts,
  subscribeComments, addComment,
  type Post, type UserResult, type PostComment,
} from '../services/posts';

function timeAgo(createdAt: any): string {
  const ms = createdAt?.toMillis?.();
  if (!ms) return 'now';
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

export default function FeedScreen() {
  const { user, profile } = useAuth();
  const { colors, isDark } = useTheme();
  const { headerPaddingTop, backBtnTop, screenBottomPadding, bottomInset } = useLayoutInsets();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [term, setTerm] = useState('');
  const [searching, setSearching] = useState(false);
  // Fullscreen image viewer
  const [viewImage, setViewImage] = useState<string | null>(null);
  // Comments sheet
  const [commentsFor, setCommentsFor] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const searchTimer = useRef<any>(null);
  const isSearchMode = term.trim().length > 0;

  useEffect(() => {
    const unsub = subscribeFeed((p) => {
      setPosts(p);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!term.trim()) {
      setUserResults([]);
      setPostResults([]);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const [u, p] = await Promise.all([searchUsers(term), searchPosts(term)]);
        setUserResults(u);
        setPostResults(p);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => searchTimer.current && clearTimeout(searchTimer.current);
  }, [term]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  // Live comments for the open sheet
  useEffect(() => {
    if (!commentsFor) { setComments([]); return; }
    const unsub = subscribeComments(commentsFor.id, setComments);
    return unsub;
  }, [commentsFor?.id]);

  const sendComment = async () => {
    if (!user || !profile || !commentsFor || !commentText.trim()) return;
    setSendingComment(true);
    try {
      await addComment(commentsFor.id, {
        uid: user.uid,
        displayName: profile.displayName,
        profilePicUrl: profile.profilePicUrl,
      }, commentText);
      setCommentText('');
    } catch {}
    setSendingComment(false);
  };

  const like = useCallback(
    async (post: Post) => {
      if (!user) return;
      const liked = post.likedBy.includes(user.uid);
      // optimistic
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likeCount: p.likeCount + (liked ? -1 : 1), likedBy: liked ? p.likedBy.filter((u) => u !== user.uid) : [...p.likedBy, user.uid] }
            : p,
        ),
      );
      try {
        await toggleLike(post.id, user.uid, !liked);
      } catch {}
    },
    [user],
  );

  const renderPost = ({ item }: { item: Post }) => {
    const liked = !!user && item.likedBy.includes(user.uid);
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <View style={styles.cardHead}>
          {item.authorPfp ? (
            <Image source={{ uri: item.authorPfp }} style={styles.pfp} />
          ) : (
            <View style={[styles.pfp, styles.pfpFallback, { backgroundColor: colors.primaryMuted }]}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{(item.authorName || 'S')[0]}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.author, { color: colors.text }]}>{item.authorName}</Text>
            <Text style={[styles.handle, { color: colors.textTertiary }]}>
              {item.authorUsername ? `@${item.authorUsername} · ` : ''}{timeAgo(item.createdAt)}
            </Text>
          </View>
        </View>

        {!!item.text && <Text style={[styles.body, { color: colors.text }]}>{item.text}</Text>}

        {!!item.imageUrl && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => setViewImage(item.imageUrl!)}>
            <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode="cover" />
          </TouchableOpacity>
        )}

        {item.hashtags.length > 0 && (
          <View style={styles.tagRow}>
            {item.hashtags.map((t) => (
              <Text key={t} style={[styles.tag, { color: colors.primary }]}>#{t}</Text>
            ))}
          </View>
        )}

        <View style={[styles.actions, { borderTopColor: colors.divider }]}>
          <TouchableOpacity style={styles.action} onPress={() => like(item)} hitSlop={8}>
            <MaterialCommunityIcons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? colors.error : colors.textSecondary} />
            <Text style={[styles.actionText, { color: liked ? colors.error : colors.textSecondary }]}>{item.likeCount || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.action} onPress={() => setCommentsFor(item)} hitSlop={8}>
            <MaterialCommunityIcons name="comment-outline" size={19} color={colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>{item.commentCount || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSearch = () => (
    <FlatList
      keyboardShouldPersistTaps="handled"
      data={postResults}
      keyExtractor={(p) => 'p' + p.id}
      renderItem={renderPost}
      contentContainerStyle={{ padding: 14, paddingBottom: screenBottomPadding, gap: 12 }}
      ListHeaderComponent={
        <View>
          {searching && <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />}
          {userResults.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>PEOPLE</Text>
              {userResults.map((u) => (
                <View key={u.uid} style={[styles.userRow, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  {u.profilePicUrl ? (
                    <Image source={{ uri: u.profilePicUrl }} style={styles.pfpSm} />
                  ) : (
                    <View style={[styles.pfpSm, styles.pfpFallback, { backgroundColor: colors.primaryMuted }]}>
                      <Text style={{ color: colors.primary, fontWeight: '700' }}>{(u.displayName || 'S')[0]}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.author, { color: colors.text }]}>{u.displayName}</Text>
                    {!!u.username && <Text style={[styles.handle, { color: colors.textTertiary }]}>@{u.username}</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}
          {postResults.length > 0 && <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>POSTS</Text>}
        </View>
      }
      ListEmptyComponent={
        !searching && userResults.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>No results for “{term}”.</Text>
        ) : null
      }
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? [colors.surfaceElevated, colors.background] : ['#D94F00', '#F07830']}
        style={[styles.header, { paddingTop: headerPaddingTop }]}
      >
        <TouchableOpacity style={[styles.backBtn, { top: backBtnTop }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Explore</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.85)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people, #topics, posts…"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={term}
            onChangeText={setTerm}
            returnKeyType="search"
          />
          {isSearchMode && (
            <TouchableOpacity onPress={() => setTerm('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {isSearchMode ? (
        renderSearch()
      ) : loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={renderPost}
          contentContainerStyle={{ padding: 14, paddingBottom: screenBottomPadding, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="post-outline" size={54} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No posts yet</Text>
              <Text style={[styles.empty, { color: colors.textTertiary }]}>Be the first to share with the community.</Text>
            </View>
          }
        />
      )}

      {/* Compose FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: screenBottomPadding + 8 }]}
        activeOpacity={0.85}
        onPress={() => router.push('/create-post')}
      >
        <LinearGradient colors={['#D94F00', '#FF8C00']} style={styles.fabGrad}>
          <MaterialCommunityIcons name="feather" size={24} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ═══ Comments sheet — 75% height, Instagram-style layout ═══ */}
      <Modal visible={!!commentsFor} transparent animationType="slide" onRequestClose={() => setCommentsFor(null)}>
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setCommentsFor(null)} />
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.divider }]} />
            <View style={styles.sheetHeaderRow}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {comments.length > 0 ? `${comments.length} Comment${comments.length === 1 ? '' : 's'}` : 'Comments'}
              </Text>
              <TouchableOpacity onPress={() => setCommentsFor(null)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.sheetDivider, { backgroundColor: colors.divider }]} />
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              style={{ flex: 1 }}
              contentContainerStyle={{ gap: 14, paddingVertical: 12, paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 60, gap: 8 }}>
                  <MaterialCommunityIcons name="comment-text-outline" size={44} color={colors.textTertiary} />
                  <Text style={[styles.empty, { color: colors.textTertiary }]}>Be the first to comment.</Text>
                </View>
              }
              renderItem={({ item: c }) => (
                <View style={styles.commentRow}>
                  {c.authorPfp ? (
                    <Image source={{ uri: c.authorPfp }} style={styles.pfpSm} />
                  ) : (
                    <View style={[styles.pfpSm, styles.pfpFallback, { backgroundColor: colors.primaryMuted }]}>
                      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{(c.authorName || 'S')[0]}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.commentAuthor, { color: colors.text }]}>{c.authorName}</Text>
                    <Text style={[styles.commentText, { color: colors.textSecondary }]}>{c.text}</Text>
                  </View>
                </View>
              )}
            />
            <View style={[styles.commentInputRow, { borderTopColor: colors.divider, backgroundColor: colors.surface, paddingBottom: 12 + bottomInset }]}>
              <TextInput
                style={[styles.commentInput, { color: colors.text, backgroundColor: colors.background }]}
                placeholder="Write a comment…"
                placeholderTextColor={colors.textTertiary}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={sendComment}
                disabled={!commentText.trim() || sendingComment}
                style={[styles.commentSend, { backgroundColor: colors.primary, opacity: commentText.trim() ? 1 : 0.5 }]}
              >
                {sendingComment ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={16} color="#FFF" />}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══ Fullscreen image viewer ═══ */}
      <Modal visible={!!viewImage} transparent animationType="fade" onRequestClose={() => setViewImage(null)}>
        <View style={styles.imageViewer}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setViewImage(null)} />
          {viewImage && <Image source={{ uri: viewImage }} style={styles.imageViewerImg} resizeMode="contain" />}
          <TouchableOpacity style={styles.imageViewerClose} onPress={() => setViewImage(null)} hitSlop={12}>
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  imageViewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center', alignItems: 'center' },
  imageViewerImg: { width: '100%', height: '80%' },
  imageViewerClose: { position: 'absolute', top: 48, right: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center' },
  header: { paddingBottom: 14, paddingHorizontal: 20, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  backBtn: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', textAlign: 'center', marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 15 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  pfp: { width: 40, height: 40, borderRadius: 20 },
  pfpSm: { width: 38, height: 38, borderRadius: 19 },
  pfpFallback: { alignItems: 'center', justifyContent: 'center' },
  author: { fontSize: 14, fontWeight: '700' },
  handle: { fontSize: 12, marginTop: 1 },
  body: { fontSize: 15, lineHeight: 21 },
  postImage: { width: '100%', height: 260, borderRadius: 12, marginTop: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tag: { fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 22, marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 13, fontWeight: '600' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  empty: { textAlign: 'center', fontSize: 14, marginTop: 8 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  fab: { position: 'absolute', right: 20 },
  fabGrad: { width: 58, height: 58, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#D94F00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },

  // Comments sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  // 78% viewport so comments actually breathe, input is always in reach.
  sheet: { height: '78%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 10 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  sheetDivider: { height: StyleSheet.hairlineWidth },
  commentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  commentAuthor: { fontSize: 13, fontWeight: '700' },
  commentText: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  // Sits above the system nav bar; borderTop keeps it visually anchored.
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 10, paddingBottom: 22, borderTopWidth: StyleSheet.hairlineWidth },
  commentInput: { flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, fontSize: 14.5, maxHeight: 90, minHeight: 44 },
  commentSend: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
