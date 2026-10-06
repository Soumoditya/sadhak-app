import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Share, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDialog } from '../../contexts/DialogContext';
import { getLatestComments, deletePost, timeAgo, type Post, type PostComment } from '../../services/posts';
import { WEBSITE_URL } from '../../constants/appInfo';
import Avatar from './Avatar';

/**
 * One post, Instagram style: author row, photo (double-tap to like), actions,
 * caption, and the latest two comments inline with "View all".
 */
export default function PostCard({
  post, uid, onLike, onOpenComments, onDeleted, onImage, commentsVersion = 0,
}: {
  post: Post;
  uid?: string;
  onLike: (p: Post) => void;
  onOpenComments: (p: Post) => void;
  onDeleted?: (id: string) => void;
  onImage?: (url: string) => void;
  /** Bump to re-fetch the inline comment preview. */
  commentsVersion?: number;
}) {
  const { colors } = useTheme();
  const { tx } = useLanguage();
  const dialog = useDialog();
  const liked = !!uid && post.likedBy.includes(uid);
  const mine = !!uid && post.authorId === uid;
  const [preview, setPreview] = useState<PostComment[]>([]);
  const lastTap = useRef(0);

  useEffect(() => {
    if (!post.commentCount) { setPreview([]); return; }
    let on = true;
    getLatestComments(post.id, 2).then((c) => on && setPreview(c)).catch(() => {});
    return () => { on = false; };
  }, [post.id, post.commentCount, commentsVersion]);

  const openUser = (id: string) => router.push({ pathname: '/user/[uid]', params: { uid: id } });

  const tapImage = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) { if (!liked) onLike(post); lastTap.current = 0; return; }
    lastTap.current = now;
    setTimeout(() => { if (lastTap.current === now && post.imageUrl) onImage?.(post.imageUrl); }, 300);
  };

  const menu = async () => {
    const ok = await dialog.confirm({ title: tx('Delete this post?'), message: tx('This cannot be undone.'), confirmText: tx('Delete'), destructive: true, tone: 'danger' });
    if (!ok) return;
    try { await deletePost(post.id); onDeleted?.(post.id); } catch (e: any) { dialog.alert('Could not delete', String(e?.message || e).slice(0, 200)); }
  };

  const share = () => {
    Share.share({ message: `${post.authorName} on Sadhak:\n\n${post.text}${post.imageUrl ? `\n${post.imageUrl}` : ''}\n\n${WEBSITE_URL}` }).catch(() => {});
  };

  const caption = !!post.text ? (
        <Text style={[s.body, !post.imageUrl && s.bodyTop, { color: colors.text }]}>
          {!!post.imageUrl && <Text style={{ fontWeight: '800' }} onPress={() => openUser(post.authorId)}>{post.authorName}  </Text>}
          {post.text.split(/(#[\p{L}\p{N}_]+)/u).map((part, i) =>
            part.startsWith('#') ? <Text key={i} style={{ color: colors.primary, fontWeight: '600' }}>{part}</Text> : part,
          )}
        </Text>
      ) : null;

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => openUser(post.authorId)} style={s.author} activeOpacity={0.7}>
          <Avatar uri={post.authorPfp} name={post.authorName} size={38} />
          <View style={{ flex: 1 }}>
            <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>{post.authorName}</Text>
            <Text style={[s.meta, { color: colors.textTertiary }]} numberOfLines={1}>
              {post.authorUsername ? `@${post.authorUsername} · ` : ''}{timeAgo(post.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
        {mine && (
          <TouchableOpacity onPress={menu} hitSlop={10} accessibilityLabel={tx('Delete')}>
            <Ionicons name="trash-outline" size={19} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {!post.imageUrl && caption}

      {!!post.imageUrl && (
        <Pressable onPress={tapImage}>
          <Image source={{ uri: post.imageUrl }} style={[s.image, { backgroundColor: colors.surfaceSecondary }]} resizeMode="cover" />
        </Pressable>
      )}

      <View style={s.actions}>
        <TouchableOpacity style={s.action} onPress={() => onLike(post)} hitSlop={8} accessibilityLabel={tx('Like')}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={25} color={liked ? colors.error : colors.text} />
          {post.likeCount > 0 && <Text style={[s.count, { color: colors.text }]}>{post.likeCount}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.action} onPress={() => onOpenComments(post)} hitSlop={8} accessibilityLabel={tx('Comments')}>
          <Ionicons name="chatbubble-outline" size={23} color={colors.text} />
          {post.commentCount > 0 && <Text style={[s.count, { color: colors.text }]}>{post.commentCount}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.action} onPress={share} hitSlop={8} accessibilityLabel={tx('Share')}>
          <Ionicons name="paper-plane-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {!!post.imageUrl && caption}

      {post.commentCount > 2 && (
        <TouchableOpacity onPress={() => onOpenComments(post)} hitSlop={4}>
          <Text style={[s.viewAll, { color: colors.textTertiary }]}>{tx('View all comments')} ({post.commentCount})</Text>
        </TouchableOpacity>
      )}
      {preview.map((c) => (
        <Text key={c.id} style={[s.preview, { color: colors.textSecondary }]} numberOfLines={2} onPress={() => onOpenComments(post)}>
          <Text style={{ fontWeight: '800', color: colors.text }}>{c.authorName}  </Text>{c.text}
        </Text>
      ))}
      {!post.commentCount && (
        <TouchableOpacity onPress={() => onOpenComments(post)} hitSlop={4}>
          <Text style={[s.viewAll, { color: colors.textTertiary }]}>{tx('Add a comment…')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, paddingVertical: 12, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, marginBottom: 10 },
  author: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 14.5, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 1 },
  image: { width: '100%', aspectRatio: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 14, paddingTop: 10 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  count: { fontSize: 14, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingTop: 8 },
  bodyTop: { paddingTop: 0, paddingBottom: 4, fontSize: 15.5 },
  viewAll: { fontSize: 13.5, paddingHorizontal: 14, paddingTop: 6 },
  preview: { fontSize: 14, lineHeight: 20, paddingHorizontal: 14, paddingTop: 4 },
});
