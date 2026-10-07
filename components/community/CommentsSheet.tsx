import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Modal, ActivityIndicator, Image, Pressable } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDialog } from '../../contexts/DialogContext';
import {
  subscribeComments, addComment, editComment, deleteComment, voteComment, commentScore, timeAgo,
  type Post, type PostComment,
} from '../../services/posts';
import { uploadToCloudinary } from '../../services/cloudinary';
import { ActionSheet } from '../ui';
import Avatar from './Avatar';
import ImageViewer from './ImageViewer';

type Sort = 'top' | 'new' | 'old';
type Row = { c: PostComment; depth: number; replies: number; hidden: number };

const MAX_DEPTH = 4; // deeper replies keep this indent so text never gets squeezed
const INDENT = 14;
const ms = (c: PostComment) => c.createdAt?.toMillis?.() ?? (typeof c.createdAt === 'number' ? c.createdAt : Date.now());

/** Reddit-style threaded comments: replies, votes, edit/delete, sort and photos. */
export default function CommentsSheet({ post, onClose, onAdded }: { post: Post | null; onClose: () => void; onAdded?: (postId: string, delta?: number) => void }) {
  const { colors } = useTheme();
  const { tx } = useLanguage();
  const dialog = useDialog();
  const { user, profile, isGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sort, setSort] = useState<Sort>('top');
  const [sortOpen, setSortOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [editing, setEditing] = useState<PostComment | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<PostComment | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);

  useEffect(() => {
    setLoaded(false); setReplyTo(null); setEditing(null); setImage(null); setText(''); setCollapsed(new Set());
    if (!post) { setComments([]); return; }
    return subscribeComments(post.id, (c) => { setComments(c); setLoaded(true); });
  }, [post?.id]);

  // Thread the flat list, sort each level, then flatten what is expanded.
  const { rows, total } = useMemo(() => {
    const ids = new Set(comments.map((c) => c.id));
    const kids = new Map<string, PostComment[]>();
    const roots: PostComment[] = [];
    for (const c of comments) {
      if (c.parentId && ids.has(c.parentId)) {
        const k = kids.get(c.parentId) || [];
        k.push(c); kids.set(c.parentId, k);
      } else roots.push(c);
    }
    const cmp = (a: PostComment, b: PostComment) =>
      sort === 'new' ? ms(b) - ms(a)
      : sort === 'old' ? ms(a) - ms(b)
      : commentScore(b) - commentScore(a) || ms(a) - ms(b);
    const count = (id: string): number => (kids.get(id) || []).reduce((n, k) => n + 1 + count(k.id), 0);
    const out: Row[] = [];
    const walk = (list: PostComment[], depth: number) => {
      for (const c of [...list].sort(cmp)) {
        // A deleted comment with no replies left has nothing to show.
        const replies = count(c.id);
        if (c.deleted && !replies) continue;
        const isCollapsed = collapsed.has(c.id);
        out.push({ c, depth, replies, hidden: isCollapsed ? replies : 0 });
        if (!isCollapsed) walk(kids.get(c.id) || [], depth + 1);
      }
    };
    walk(roots, 0);
    return { rows: out, total: comments.filter((c) => !c.deleted).length };
  }, [comments, sort, collapsed]);

  const toggle = (id: string) => setCollapsed((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const startReply = (c: PostComment) => { setEditing(null); setReplyTo(c); setTimeout(() => inputRef.current?.focus(), 50); };
  const startEdit = (c: PostComment) => { setReplyTo(null); setImage(null); setEditing(c); setText(c.text); setTimeout(() => inputRef.current?.focus(), 50); };
  const cancelContext = () => { if (editing) setText(''); setEditing(null); setReplyTo(null); };

  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!r.canceled && r.assets?.[0]) setImage(r.assets[0].uri);
  };

  const send = async () => {
    if (!user || !profile || !post || (!text.trim() && !image)) return;
    setSending(true);
    try {
      if (editing) {
        await editComment(post.id, editing.id, text);
        setEditing(null);
      } else {
        const imageUrl = image ? (await uploadToCloudinary(image, 'sadhak/comments', 'image')).secure_url : null;
        await addComment(post.id, { uid: user.uid, displayName: profile.displayName, profilePicUrl: profile.profilePicUrl }, text, { parentId: replyTo?.id || null, imageUrl });
        // Make sure the new reply is visible.
        if (replyTo) setCollapsed((prev) => { const n = new Set(prev); n.delete(replyTo.id); return n; });
        setReplyTo(null); setImage(null);
        onAdded?.(post.id, 1);
      }
      setText('');
    } catch (e: any) {
      dialog.alert(tx('Could not post'), String(e?.message || e).slice(0, 160));
    }
    setSending(false);
  };

  const vote = (c: PostComment, v: 1 | -1) => {
    if (!user || isGuest || !post || c.deleted) return;
    const mine = c.votes?.[user.uid] || 0;
    voteComment(post.id, c.id, user.uid, mine === v ? 0 : v).catch(() => {});
  };

  const remove = async (c: PostComment) => {
    if (!post) return;
    const ok = await dialog.confirm({ title: tx('Delete comment?'), message: tx('This can’t be undone.'), confirmText: tx('Delete'), cancelText: tx('Cancel'), destructive: true });
    if (!ok) return;
    const hasReplies = comments.some((x) => x.parentId === c.id);
    try { await deleteComment(post.id, c.id, hasReplies); onAdded?.(post.id, -1); } catch {}
  };

  const openUser = (uid: string) => { onClose(); router.push({ pathname: '/user/[uid]', params: { uid } }); };
  const SORT_LABEL: Record<Sort, string> = { top: tx('Top'), new: tx('Newest'), old: tx('Oldest') };

  const renderRow = ({ item }: { item: Row }) => {
    const { c, depth, replies, hidden } = item;
    const d = Math.min(depth, MAX_DEPTH);
    const myVote = user ? c.votes?.[user.uid] || 0 : 0;
    const score = commentScore(c);
    const isOp = c.authorId === post?.authorId;
    const canManage = !!user && !c.deleted && (c.authorId === user.uid || post?.authorId === user.uid);
    return (
      <View style={{ flexDirection: 'row', paddingLeft: d * INDENT }}>
        {/* Thread rails: one per level; tapping a rail folds that thread. */}
        {Array.from({ length: d }, (_, i) => (
          <View key={i} style={[s.rail, { left: i * INDENT + 6, backgroundColor: colors.divider }]} />
        ))}
        <View style={[s.row, { flex: 1 }]}>
          <Pressable onPress={() => !c.deleted && openUser(c.authorId)} hitSlop={4}>
            <Avatar uri={c.deleted ? null : c.authorPfp} name={c.deleted ? '?' : c.authorName} size={depth ? 26 : 32} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Pressable onPress={() => replies && toggle(c.id)} style={s.meta}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1} onPress={c.deleted ? undefined : () => openUser(c.authorId)}>
                {c.deleted ? tx('[deleted]') : c.authorName}
              </Text>
              {isOp && !c.deleted && <Text style={[s.op, { color: colors.primary, backgroundColor: colors.primary + '18' }]}>{tx('Author')}</Text>}
              <Text style={{ color: colors.textTertiary, fontSize: 12 }}>· {timeAgo(c.createdAt)}{c.editedAt ? ` · ${tx('edited')}` : ''}</Text>
            </Pressable>
            {c.deleted ? (
              <Text style={{ color: colors.textTertiary, fontSize: 14, fontStyle: 'italic', marginTop: 2 }}>{tx('This comment was deleted.')}</Text>
            ) : (<>
              {!!c.text && <Text style={{ color: colors.text, fontSize: 14.5, lineHeight: 20, marginTop: 2 }}>{c.text}</Text>}
              {!!c.imageUrl && (
                <Pressable onPress={() => setViewImage(c.imageUrl!)} style={{ marginTop: 6 }}>
                  <Image source={{ uri: c.imageUrl }} style={[s.thumb, { backgroundColor: colors.surfaceSecondary }]} resizeMode="cover" />
                </Pressable>
              )}
            </>)}
            <View style={s.actions}>
              {!c.deleted && (
                <View style={s.votes}>
                  <TouchableOpacity onPress={() => vote(c, 1)} hitSlop={8} accessibilityLabel={tx('Upvote')}>
                    <MaterialCommunityIcons name={myVote > 0 ? 'arrow-up-bold' : 'arrow-up-bold-outline'} size={19} color={myVote > 0 ? colors.primary : colors.textTertiary} />
                  </TouchableOpacity>
                  <Text style={[s.score, { color: myVote > 0 ? colors.primary : myVote < 0 ? '#5B6BD6' : colors.textSecondary }]}>{score}</Text>
                  <TouchableOpacity onPress={() => vote(c, -1)} hitSlop={8} accessibilityLabel={tx('Downvote')}>
                    <MaterialCommunityIcons name={myVote < 0 ? 'arrow-down-bold' : 'arrow-down-bold-outline'} size={19} color={myVote < 0 ? '#5B6BD6' : colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              )}
              {!c.deleted && !isGuest && (
                <TouchableOpacity onPress={() => startReply(c)} hitSlop={6} style={s.act}>
                  <Ionicons name="arrow-undo-outline" size={15} color={colors.textSecondary} />
                  <Text style={[s.actText, { color: colors.textSecondary }]}>{tx('Reply')}</Text>
                </TouchableOpacity>
              )}
              {!c.deleted && (
                <TouchableOpacity onPress={() => setMenuFor(c)} hitSlop={8} style={s.act} accessibilityLabel={tx('More')}>
                  <Ionicons name="ellipsis-horizontal" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
              {replies > 0 && !hidden && depth === 0 && (
                <TouchableOpacity onPress={() => toggle(c.id)} hitSlop={6} style={s.act}>
                  <Text style={[s.actText, { color: colors.textTertiary }]}>{tx('Hide replies')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {hidden > 0 && (
              <TouchableOpacity onPress={() => toggle(c.id)} style={s.more} hitSlop={6}>
                <View style={[s.moreLine, { backgroundColor: colors.divider }]} />
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>{tx('View')} {hidden} {tx(hidden === 1 ? 'reply' : 'replies')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const canSend = (!!text.trim() || !!image) && !sending;

  return (
    <Modal visible={!!post} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView style={s.overlay} behavior="padding">
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          <View style={[s.handle, { backgroundColor: colors.divider }]} />
          <View style={s.headRow}>
            <Text style={[s.title, { color: colors.text }]}>{tx('Comments')}{total ? ` · ${total}` : ''}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {total > 1 && (
                <TouchableOpacity onPress={() => setSortOpen(true)} style={[s.sortPill, { borderColor: colors.cardBorder }]} accessibilityLabel={tx('Sort')}>
                  <Ionicons name="swap-vertical" size={14} color={colors.textSecondary} />
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{SORT_LABEL[sort]}</Text>
                  <Ionicons name="chevron-down" size={13} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider }} />
          <FlatList
            data={rows}
            keyExtractor={(r) => r.c.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 12 }}
            keyboardShouldPersistTaps="handled"
            renderItem={renderRow}
            ListEmptyComponent={loaded ? (
              <View style={{ alignItems: 'center', marginTop: 50, gap: 8 }}>
                <MaterialCommunityIcons name="comment-text-outline" size={42} color={colors.textTertiary} />
                <Text style={{ color: colors.textTertiary, fontSize: 14 }}>{tx('Be the first to comment.')}</Text>
              </View>
            ) : <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />}
          />

          {(replyTo || editing) && (
            <View style={[s.context, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name={editing ? 'create-outline' : 'arrow-undo-outline'} size={15} color={colors.primary} />
              <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
                {editing ? tx('Editing your comment') : <>{tx('Replying to')} <Text style={{ color: colors.text, fontWeight: '700' }}>{replyTo!.authorName}</Text></>}
              </Text>
              <TouchableOpacity onPress={cancelContext} hitSlop={10}><Ionicons name="close" size={18} color={colors.textTertiary} /></TouchableOpacity>
            </View>
          )}
          {!!image && (
            <View style={s.preview}>
              <Image source={{ uri: image }} style={s.previewImg} />
              <TouchableOpacity onPress={() => setImage(null)} style={s.previewX} hitSlop={8}><Ionicons name="close" size={14} color="#FFF" /></TouchableOpacity>
            </View>
          )}
          <View style={[s.inputRow, { borderTopColor: colors.divider, paddingBottom: 10 + insets.bottom }]}>
            {isGuest ? (
              <Text style={{ flex: 1, color: colors.textTertiary, fontSize: 13.5, paddingVertical: 12 }}>{tx('Create an account to comment.')}</Text>
            ) : (
              <>
                {!editing && (
                  <TouchableOpacity onPress={pickImage} style={s.attach} accessibilityLabel={tx('Add photo')}>
                    <Ionicons name="image-outline" size={23} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
                <TextInput
                  ref={inputRef}
                  style={[s.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.cardBorder }]}
                  placeholder={replyTo ? `${tx('Reply to')} ${replyTo.authorName}…` : tx('Add a comment…')}
                  placeholderTextColor={colors.textTertiary}
                  value={text}
                  onChangeText={setText}
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity
                  onPress={send}
                  disabled={!canSend}
                  style={[s.send, { backgroundColor: colors.primary, opacity: canSend ? 1 : 0.45 }]}
                  accessibilityLabel={tx('Send')}
                >
                  {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name={editing ? 'checkmark' : 'arrow-up'} size={20} color="#FFF" />}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <ActionSheet
        visible={sortOpen}
        title={tx('Sort comments')}
        onClose={() => setSortOpen(false)}
        actions={([['top', 'trending-up'], ['new', 'time-outline'], ['old', 'hourglass-outline']] as const).map(([k, icon]) => ({
          label: `${SORT_LABEL[k]}${sort === k ? '  ✓' : ''}`, icon, onPress: () => setSort(k),
        }))}
      />
      <ActionSheet
        visible={!!menuFor}
        onClose={() => setMenuFor(null)}
        actions={menuFor ? [
          ...(menuFor.text ? [{ label: tx('Copy text'), icon: 'copy-outline' as const, onPress: () => { Clipboard.setStringAsync(menuFor.text).catch(() => {}); } }] : []),
          ...(user && menuFor.authorId === user.uid ? [{ label: tx('Edit'), icon: 'create-outline' as const, onPress: () => startEdit(menuFor) }] : []),
          ...(user && (menuFor.authorId === user.uid || post?.authorId === user.uid) ? [{ label: tx('Delete'), icon: 'trash-outline' as const, danger: true, onPress: () => remove(menuFor) }] : []),
          ...(menuFor.authorId !== user?.uid ? [{ label: tx('View profile'), icon: 'person-circle-outline' as const, onPress: () => openUser(menuFor.authorId) }] : []),
        ] : []}
      />
      <ImageViewer uri={viewImage} onClose={() => setViewImage(null)} />
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { height: '82%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  title: { fontSize: 16, fontWeight: '800' },
  sortPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 30, borderRadius: 15, borderWidth: 1 },
  rail: { position: 'absolute', top: 0, bottom: 0, width: 1.5, borderRadius: 1 },
  row: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', paddingTop: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  op: { fontSize: 10.5, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, overflow: 'hidden' },
  thumb: { width: 180, height: 180, borderRadius: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6 },
  votes: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  score: { fontSize: 13, fontWeight: '800', minWidth: 14, textAlign: 'center' },
  act: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actText: { fontSize: 12.5, fontWeight: '700' },
  more: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  moreLine: { width: 22, height: 1.5 },
  context: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 6 },
  preview: { alignSelf: 'flex-start', marginBottom: 6, marginLeft: 44 },
  previewImg: { width: 72, height: 72, borderRadius: 10 },
  previewX: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  attach: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 110, minHeight: 44 },
  send: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
