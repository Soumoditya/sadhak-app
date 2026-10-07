import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Share, Pressable, Modal, TextInput, ActivityIndicator } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as Clipboard from 'expo-clipboard';
import ActionSheet, { type SheetAction } from '../ui/ActionSheet';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDialog } from '../../contexts/DialogContext';
import { getLatestComments, deletePost, timeAgo, updatePostText, setPostPinned, type Post, type PostComment } from '../../services/posts';
import { shareText } from '../../services/shareApp';
import Avatar from './Avatar';

/**
 * One post, Instagram style: author row, photo (double-tap to like), actions,
 * caption, and the latest two comments inline with "View all".
 */
export default function PostCard({
  post, uid, onLike, onOpenComments, onDeleted, onImage, onChanged, commentsVersion = 0, flat = false,
}: {
  post: Post;
  uid?: string;
  onLike: (p: Post) => void;
  onOpenComments: (p: Post) => void;
  onDeleted?: (id: string) => void;
  onImage?: (url: string) => void;
  /** Post was edited or (un)pinned. */
  onChanged?: (p: Post) => void;
  /** Bump to re-fetch the inline comment preview. */
  commentsVersion?: number;
  /** Edge to edge, no card frame (a person's posts opened from their grid). */
  flat?: boolean;
}) {
  const { colors } = useTheme();
  const { tx } = useLanguage();
  const dialog = useDialog();
  const liked = !!uid && post.likedBy.includes(uid);
  const mine = !!uid && post.authorId === uid;
  const [preview, setPreview] = useState<PostComment[]>([]);
  const lastTap = useRef(0);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.text);
  const [saving, setSaving] = useState(false);

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

  const remove = async () => {
    const ok = await dialog.confirm({ title: tx('Delete this post?'), message: tx('This cannot be undone.'), confirmText: tx('Delete'), destructive: true, tone: 'danger' });
    if (!ok) return;
    try { await deletePost(post.id); onDeleted?.(post.id); } catch (e: any) { dialog.alert('Could not delete', String(e?.message || e).slice(0, 200)); }
  };

  const togglePin = async () => {
    try { await setPostPinned(post.id, !post.pinned); onChanged?.({ ...post, pinned: !post.pinned, pinnedAt: post.pinned ? null : Date.now() }); }
    catch (e: any) { dialog.alert('Could not update', String(e?.message || e).slice(0, 200)); }
  };

  const saveEdit = async () => {
    setSaving(true);
    try { await updatePostText(post.id, draft); onChanged?.({ ...post, text: draft.trim(), editedAt: Date.now() }); setEditing(false); }
    catch (e: any) { dialog.alert('Could not save', String(e?.message || e).slice(0, 200)); }
    finally { setSaving(false); }
  };

  const share = () => {
    shareText(`${post.authorName} on Sadhak:\n\n${post.text}${post.imageUrl ? `\n${post.imageUrl}` : ''}`);
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
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }, flat && s.flat]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => openUser(post.authorId)} style={s.author} activeOpacity={0.7}>
          <Avatar uri={post.authorPfp} name={post.authorName} size={38} />
          <View style={{ flex: 1 }}>
            <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>{post.authorName}</Text>
            <Text style={[s.meta, { color: colors.textTertiary }]} numberOfLines={1}>
              {post.authorUsername ? `@${post.authorUsername} · ` : ''}{timeAgo(post.createdAt)}{post.editedAt ? ` · ${tx('edited')}` : ''}
            </Text>
          </View>
        </TouchableOpacity>
        {post.pinned && <Ionicons name="pin" size={16} color={colors.primary} />}
        <TouchableOpacity onPress={() => setMenu(true)} hitSlop={10} accessibilityLabel={tx('More options')}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
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
      {preview.filter((c) => !c.deleted).map((c) => (
        <Text key={c.id} style={[s.preview, { color: colors.textSecondary }]} numberOfLines={2} onPress={() => onOpenComments(post)}>
          <Text style={{ fontWeight: '800', color: colors.text }}>{c.authorName}  </Text>{c.text || (c.imageUrl ? '📷' : '')}
        </Text>
      ))}
      {!post.commentCount && (
        <TouchableOpacity onPress={() => onOpenComments(post)} hitSlop={4}>
          <Text style={[s.viewAll, { color: colors.textTertiary }]}>{tx('Add a comment…')}</Text>
        </TouchableOpacity>
      )}

      <ActionSheet
        visible={menu}
        onClose={() => setMenu(false)}
        actions={[
          ...(mine ? [
            { label: tx(post.pinned ? 'Unpin from profile' : 'Pin to profile'), icon: (post.pinned ? 'pin-outline' : 'pin') as any, onPress: togglePin },
            { label: tx('Edit caption'), icon: 'create-outline' as any, onPress: () => { setDraft(post.text); setEditing(true); } },
          ] : [
            { label: tx('View profile'), icon: 'person-circle-outline' as any, onPress: () => openUser(post.authorId) },
          ]),
          { label: tx('Share'), icon: 'share-social-outline', onPress: share },
          ...(post.text ? [{ label: tx('Copy text'), icon: 'copy-outline' as any, onPress: () => { Clipboard.setStringAsync(post.text).catch(() => {}); } }] : []),
          ...(mine ? [{ label: tx('Delete'), icon: 'trash-outline' as any, onPress: remove, danger: true }] : []),
        ] as SheetAction[]}
      />
      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)} statusBarTranslucent navigationBarTranslucent>
        <KeyboardAvoidingView behavior="padding" style={s.editOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setEditing(false)} />
          <View style={[s.editSheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.editTitle, { color: colors.text }]}>{tx('Edit caption')}</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              autoFocus
              maxLength={2000}
              style={[s.editInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background }]}
              placeholderTextColor={colors.textTertiary}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity onPress={() => setEditing(false)} style={[s.editBtn, { borderColor: colors.cardBorder }]}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{tx('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} disabled={saving} style={[s.editBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '800' }}>{tx('Save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, paddingVertical: 12, overflow: 'hidden' },
  flat: { borderRadius: 0, borderWidth: 0, backgroundColor: 'transparent', paddingBottom: 18 },
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
  editOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  editSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 28 },
  editTitle: { fontSize: 17, fontWeight: '800', marginBottom: 10 },
  editInput: { minHeight: 120, maxHeight: 260, borderWidth: 1, borderRadius: 14, padding: 12, fontSize: 15.5, textAlignVertical: 'top' },
  editBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
