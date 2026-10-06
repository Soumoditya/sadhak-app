import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Modal, ActivityIndicator } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeComments, addComment, timeAgo, type Post, type PostComment } from '../../services/posts';
import Avatar from './Avatar';

/** Instagram-style comments sheet with a keyboard-safe input row. */
export default function CommentsSheet({ post, onClose, onAdded }: { post: Post | null; onClose: () => void; onAdded?: (postId: string) => void }) {
  const { colors } = useTheme();
  const { tx } = useLanguage();
  const { user, profile, isGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!post) { setComments([]); return; }
    return subscribeComments(post.id, setComments);
  }, [post?.id]);

  const send = async () => {
    if (!user || !profile || !post || !text.trim()) return;
    setSending(true);
    try {
      await addComment(post.id, { uid: user.uid, displayName: profile.displayName, profilePicUrl: profile.profilePicUrl }, text);
      setText('');
      onAdded?.(post.id);
    } catch {}
    setSending(false);
  };

  const openUser = (uid: string) => { onClose(); router.push({ pathname: '/user/[uid]', params: { uid } }); };

  return (
    <Modal visible={!!post} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView style={s.overlay} behavior="padding">
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          <View style={[s.handle, { backgroundColor: colors.divider }]} />
          <View style={s.headRow}>
            <Text style={[s.title, { color: colors.text }]}>{tx('Comments')}{comments.length ? ` · ${comments.length}` : ''}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider }} />
          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: 16, paddingVertical: 14 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 50, gap: 8 }}>
                <MaterialCommunityIcons name="comment-text-outline" size={42} color={colors.textTertiary} />
                <Text style={{ color: colors.textTertiary, fontSize: 14 }}>{tx('Be the first to comment.')}</Text>
              </View>
            }
            renderItem={({ item: c }) => (
              <View style={s.row}>
                <TouchableOpacity onPress={() => openUser(c.authorId)}><Avatar uri={c.authorPfp} name={c.authorName} size={36} /></TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }} onPress={() => openUser(c.authorId)}>
                    {c.authorName} <Text style={{ color: colors.textTertiary, fontWeight: '500' }}>· {timeAgo(c.createdAt)}</Text>
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 14.5, lineHeight: 20, marginTop: 2 }}>{c.text}</Text>
                </View>
              </View>
            )}
          />
          <View style={[s.inputRow, { borderTopColor: colors.divider, paddingBottom: 10 + insets.bottom }]}>
            {isGuest ? (
              <Text style={{ flex: 1, color: colors.textTertiary, fontSize: 13.5, paddingVertical: 12 }}>{tx('Create an account to comment.')}</Text>
            ) : (
              <>
                <Avatar uri={profile?.profilePicUrl} name={profile?.displayName} size={34} />
                <TextInput
                  style={[s.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.cardBorder }]}
                  placeholder={tx('Add a comment…')}
                  placeholderTextColor={colors.textTertiary}
                  value={text}
                  onChangeText={setText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  onPress={send}
                  disabled={!text.trim() || sending}
                  style={[s.send, { backgroundColor: colors.primary, opacity: text.trim() ? 1 : 0.45 }]}
                  accessibilityLabel={tx('Send')}
                >
                  {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="arrow-up" size={20} color="#FFF" />}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { height: '78%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  title: { fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, minHeight: 44 },
  send: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
