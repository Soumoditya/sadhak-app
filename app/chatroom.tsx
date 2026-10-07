import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Modal, Image, Dimensions, ActivityIndicator, Animated, Vibration, ScrollView,
} from 'react-native';
import { KeyboardAvoidingView, useKeyboardState } from 'react-native-keyboard-controller';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDialog } from '../contexts/DialogContext';
import { rtdb, ref, push, set, onValue, off, rtServerTimestamp, limitToLast, rtQuery, orderByChild } from '../config/firebase';
import { remove } from 'firebase/database';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { uploadToCloudinary } from '../services/cloudinary';

import { useLanguage } from '../contexts/LanguageContext';
import { Header } from '../components/ui';
import Avatar from '../components/community/Avatar';
import { touchDm, subscribeDmEntry, isDmRequest, acceptDm, deleteDm, blockUser, unblockUser, type DmEntry } from '../services/social';
import { QUICK_REACTIONS, EMOJI_GROUPS } from '../constants/emoji';

const GIPHY_API_KEY = 'wAKLYXMGICxFXZ3CZvycYzxk876dQDMM';
const { width } = Dimensions.get('window');


interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPfp?: string;
  type: 'text' | 'gif' | 'image';
  gifUrl?: string;
  imageUrl?: string;
  timestamp: number;
  replyTo?: { id: string; text: string; senderName: string };
  reactions?: { [emoji: string]: string[] }; // emoji -> [userIds]
}

interface GiphyResult {
  id: string;
  url: string;
  preview: string;
  title: string;
}

export default function ChatRoomScreen() {
  const { tx } = useLanguage();

  const { roomId, roomName, roomType } = useLocalSearchParams<{ roomId: string; roomName: string; roomType: string }>();
  const isDm = roomType === 'dm' || String(roomId || '').startsWith('dm_');
  const { user, profile } = useAuth();
  const { colors, isDark } = useTheme();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const kbOpen = useKeyboardState((st) => st.isVisible);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [showGiphy, setShowGiphy] = useState(false);
  const [giphySearch, setGiphySearch] = useState('');
  const [giphyResults, setGiphyResults] = useState<GiphyResult[]>([]);
  const [giphyLoading, setGiphyLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [actionFor, setActionFor] = useState<Message | null>(null);
  const [emojiFor, setEmojiFor] = useState<string | null>(null);
  const [emojiTab, setEmojiTab] = useState(EMOJI_GROUPS[0].key);
  const [isTyping, setIsTyping] = useState(false);
  const [othersTyping, setOthersTyping] = useState<string[]>([]);
  const [viewMedia, setViewMedia] = useState<{ url: string; kind: 'gif' | 'image' } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendBtnAnim = useRef(new Animated.Value(0)).current;
  const me = user ? { uid: user.uid, displayName: profile?.displayName, profilePicUrl: profile?.profilePicUrl } : undefined;

  // DM state: a message request waits for Accept / Delete / Block before the
  // input appears; a blocked chat offers Unblock.
  const [dmEntry, setDmEntry] = useState<DmEntry | null>(null);
  useEffect(() => {
    if (!isDm || !user?.uid || !roomId) return;
    return subscribeDmEntry(user.uid, String(roomId), setDmEntry);
  }, [isDm, user?.uid, roomId]);
  const isRequest = !!dmEntry && isDmRequest(dmEntry);
  const isBlocked = !!dmEntry?.blocked;

  // Animate send button
  useEffect(() => {
    Animated.spring(sendBtnAnim, {
      toValue: inputText.trim().length > 0 ? 1 : 0,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [inputText]);

  // Listen for messages
  useEffect(() => {
    if (!roomId) return;
    const messagesRef = rtQuery(ref(rtdb, `messages/${roomId}`), orderByChild('timestamp'), limitToLast(100));

    onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: Message[] = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
        }));
        list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(list);
      }
    });

    return () => off(ref(rtdb, `messages/${roomId}`));
  }, [roomId]);

  // Listen for typing indicators
  useEffect(() => {
    if (!roomId || !user) return;
    const typingRef = ref(rtdb, `typing/${roomId}`);
    
    onValue(typingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const names: string[] = [];
        Object.entries(data).forEach(([uid, val]: [string, any]) => {
          if (uid !== user.uid && val.isTyping && Date.now() - val.timestamp < 5000) {
            names.push(val.name || 'Someone');
          }
        });
        setOthersTyping(names);
      } else {
        setOthersTyping([]);
      }
    });

    return () => off(typingRef);
  }, [roomId, user]);

  // Send typing indicator
  const handleTyping = (text: string) => {
    setInputText(text);

    if (!user || !roomId) return;

    // Set typing = true
    set(ref(rtdb, `typing/${roomId}/${user.uid}`), {
      isTyping: true,
      name: profile?.displayName || 'Sadhak',
      timestamp: Date.now(),
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    // Set typing = false after 3 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      set(ref(rtdb, `typing/${roomId}/${user.uid}`), {
        isTyping: false,
        name: profile?.displayName || 'Sadhak',
        timestamp: Date.now(),
      });
    }, 3000);
  };

  // Send message
  const sendMessage = async () => {
    if (!inputText.trim() || !user || !roomId) return;

    const msgData: any = {
      text: inputText.trim(),
      senderId: user.uid,
      senderName: profile?.displayName || 'Sadhak',
      senderPfp: profile?.profilePicUrl || null,
      type: 'text',
      timestamp: Date.now(),
    };

    if (replyingTo) {
      msgData.replyTo = {
        id: replyingTo.id,
        text: replyingTo.text?.slice(0, 100) || (replyingTo.type === 'gif' ? 'GIF' : 'Image'),
        senderName: replyingTo.senderName,
      };
    }

    // Optimistically clear the input so typing feels instant.
    const pending = { ...msgData };
    setInputText('');
    setReplyingTo(null);

    try {
      const newMsgRef = push(ref(rtdb, `messages/${roomId}`));
      await set(newMsgRef, pending);
      if (isDm) touchDm(roomId, pending.text, me);

      // Clear typing indicator
      set(ref(rtdb, `typing/${roomId}/${user.uid}`), { isTyping: false, timestamp: Date.now() });

    } catch (e: any) {
      // Restore the text so the user doesn't lose it, and surface the real reason
      // (most commonly: Realtime Database security rules are not deployed).
      setInputText(pending.text);
      const permission = String(e?.message || e).toLowerCase().includes('permission');
      dialog.alert(
        'Message not sent',
        permission
          ? 'The chat database is rejecting writes. The Realtime Database security rules need to be published in Firebase.'
          : 'Could not send your message. Please check your connection and try again.',
      );
    }
  };

  // Send GIF
  const sendGif = async (gif: GiphyResult) => {
    if (!user || !roomId) return;
    setShowGiphy(false);

    const newMsgRef = push(ref(rtdb, `messages/${roomId}`));
    await set(newMsgRef, {
      text: '',
      senderId: user.uid,
      senderName: profile?.displayName || 'Sadhak',
      senderPfp: profile?.profilePicUrl || null,
      type: 'gif',
      gifUrl: gif.url,
      timestamp: Date.now(),
    });
    if (isDm) touchDm(roomId, 'GIF', me);
  };

  // Send image
  const sendImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const localUri = result.assets[0].uri;
      // CRITICAL: upload to Cloudinary first. Saving the local file:// URI meant
      // media showed only on the sender's device and vanished after cache clear —
      // everyone else (and the sender, later) saw a broken image.
      setUploadingImage(true);
      const uploaded = await uploadToCloudinary(localUri, 'sadhak/chat', 'image');
      const remoteUrl = uploaded.secure_url;

      const newMsgRef = push(ref(rtdb, `messages/${roomId}`));
      await set(newMsgRef, {
        text: '',
        senderId: user!.uid,
        senderName: profile?.displayName || 'Sadhak',
        senderPfp: profile?.profilePicUrl || null,
        type: 'image',
        imageUrl: remoteUrl,
        timestamp: Date.now(),
      });
      if (isDm) touchDm(roomId, '📷 Photo', me);
    } catch (e: any) {
      dialog.alert('Upload failed', String(e?.message || e).slice(0, 200));
    } finally {
      setUploadingImage(false);
    }
  };

  // React to message
  const reactToMessage = async (msgId: string, emoji: string) => {
    if (!user || !roomId) return;
    Vibration.vibrate(20);
    
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const reactions = { ...(msg.reactions || {}) };
    const users = reactions[emoji] || [];

    if (users.includes(user.uid)) {
      reactions[emoji] = users.filter(u => u !== user.uid);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, user.uid];
    }

    setActionFor(null);
    setEmojiFor(null);
    await set(ref(rtdb, `messages/${roomId}/${msgId}/reactions`), reactions);
  };

  // Search GIPHY
  const searchGiphy = async (q: string) => {
    setGiphySearch(q);
    if (q.length < 2) { setGiphyResults([]); return; }

    setGiphyLoading(true);
    try {
      const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=20&rating=g`);
      const data = await res.json();
      setGiphyResults(data.data?.map((g: any) => ({
        id: g.id,
        url: g.images?.fixed_height?.url || g.images?.original?.url,
        preview: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url,
        title: g.title,
      })) || []);
    } catch (e) { console.error(e); }
    setGiphyLoading(false);
  };

  const isMe = (senderId: string) => senderId === user?.uid;

  const deleteMessage = (msgId: string) => {
    setActionFor(null);
    dialog.alert('Delete message', 'Remove this message for everyone?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await remove(ref(rtdb, `messages/${roomId}/${msgId}`)); } catch {}
      }},
    ]);
  };

  const copyMessage = async (text: string) => {
    setActionFor(null);
    try { await Clipboard.setStringAsync(text); } catch {}
  };

  const dayKey = (ts?: number) => (ts ? new Date(ts).toDateString() : '');
  const dayLabel = (ts: number) => {
    const d = new Date(ts);
    const today = new Date();
    const yest = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return tx('Today');
    if (d.toDateString() === yest.toDateString()) return tx('Yesterday');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // Inverted list: newest first, so the latest message sits just above the
  // input and stays there when the keyboard opens.
  const data = useMemo(() => [...messages].reverse(), [messages]);
  const openUser = (uid: string) => { if (uid && uid !== user?.uid) router.push({ pathname: '/user/[uid]', params: { uid } }); };
  const dmOther = isDm ? String(roomId).replace(/^dm_/, '').split('_').find((u) => u !== user?.uid) : undefined;
  const otherPfp = isDm ? messages.find((m) => m.senderId === dmOther)?.senderPfp : undefined;

  // ─── RENDER MESSAGE ─────────────────────────────────────────────
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const mine = isMe(item.senderId);
    const older = data[index + 1];
    const newer = data[index - 1];
    const firstOfRun = !older || older.senderId !== item.senderId || dayKey(older.timestamp) !== dayKey(item.timestamp);
    const lastOfRun = !newer || newer.senderId !== item.senderId || dayKey(newer.timestamp) !== dayKey(item.timestamp);
    const reactionEntries = Object.entries(item.reactions || {}).filter(([, u]) => (u as string[]).length);
    const showDay = !!item.timestamp && (!older || dayKey(older.timestamp) !== dayKey(item.timestamp));
    const media = item.type === 'gif' ? item.gifUrl : item.type === 'image' ? item.imageUrl : undefined;

    return (
      <View>
        {showDay && (
          <View style={styles.dayRow}>
            <View style={[styles.dayChip, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <Text style={[styles.dayChipText, { color: colors.textTertiary }]}>{dayLabel(item.timestamp)}</Text>
            </View>
          </View>
        )}
        <View style={[styles.msgRow, mine && styles.msgRowMine, { marginTop: firstOfRun ? 8 : 2 }]}>
          {!mine && !isDm && (
            <View style={styles.avatarCol}>
              {lastOfRun ? (
                <TouchableOpacity onPress={() => openUser(item.senderId)}><Avatar uri={item.senderPfp} name={item.senderName} size={30} /></TouchableOpacity>
              ) : null}
            </View>
          )}

          <View style={[styles.msgBubbleWrap, mine && styles.msgBubbleWrapMine]}>
            {firstOfRun && !mine && !isDm && (
              <Text style={[styles.senderName, { color: colors.primary }]} onPress={() => openUser(item.senderId)}>{item.senderName}</Text>
            )}

            <TouchableOpacity
              style={[
                styles.msgBubble,
                media && styles.mediaBubble,
                mine ? [styles.msgBubbleMine, { backgroundColor: colors.primary }]
                  : [styles.msgBubbleOther, { backgroundColor: colors.surface, borderColor: colors.cardBorder }],
                !lastOfRun && (mine ? { borderBottomRightRadius: 18 } : { borderBottomLeftRadius: 18 }),
              ]}
              onLongPress={() => { Vibration.vibrate(15); setActionFor(item); }}
              delayLongPress={250}
              onPress={() => { if (media) setViewMedia({ url: media, kind: item.type as 'gif' | 'image' }); }}
              activeOpacity={0.85}
            >
              {item.replyTo && (
                <View style={[styles.replyPreview, { backgroundColor: mine ? 'rgba(255,255,255,0.16)' : colors.primary + '12', borderLeftColor: mine ? '#FFF' : colors.primary }]}>
                  <Text style={[styles.replyName, { color: mine ? '#FFF' : colors.primary }]}>{item.replyTo.senderName}</Text>
                  <Text style={[styles.replyText, { color: mine ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]} numberOfLines={2}>{item.replyTo.text}</Text>
                </View>
              )}
              {media ? (
                <Image source={{ uri: media }} style={item.type === 'gif' ? styles.gifImage : styles.chatImage} resizeMode="cover" />
              ) : (
                <Text style={[styles.msgText, { color: mine ? '#FFF' : colors.text }]}>{item.text}</Text>
              )}
              <Text style={[styles.msgTime, media && { paddingHorizontal: 8, paddingBottom: 4 }, { color: mine ? 'rgba(255,255,255,0.65)' : colors.textTertiary }]}>
                {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </Text>
            </TouchableOpacity>

            {reactionEntries.length > 0 && (
              <View style={[styles.reactionsRow, mine && { justifyContent: 'flex-end' }]}>
                {reactionEntries.map(([emoji, users]) => {
                  const me = (users as string[]).includes(user?.uid || '');
                  return (
                    <TouchableOpacity
                      key={emoji}
                      style={[styles.reactionChip, { backgroundColor: me ? colors.primary + '20' : colors.surface, borderColor: me ? colors.primary : colors.cardBorder }]}
                      onPress={() => reactToMessage(item.id, emoji)}
                    >
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                      {(users as string[]).length > 1 && <Text style={[styles.reactionCount, { color: colors.textSecondary }]}>{(users as string[]).length}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const subtitle = isDm ? tx('Direct message') : roomType === 'broadcast' ? tx('Channel') : roomType === 'group' ? tx('Group') : tx('Community room');
  const emojiList = EMOJI_GROUPS.find((g) => g.key === emojiTab)?.list || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={roomName ? tx(roomName) : tx('Chat')}
        subtitle={othersTyping.length ? `${othersTyping.join(', ')} ${tx('typing…')}` : subtitle}
        quick={false}
        right={isDm && dmOther ? (
          <TouchableOpacity onPress={() => openUser(dmOther)} accessibilityLabel={tx('View profile')}>
            <Avatar uri={otherPfp} name={roomName} size={38} />
          </TouchableOpacity>
        ) : undefined}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <FlatList
          ref={flatListRef}
          inverted
          data={data}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        />
        {data.length === 0 && (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }]}>
            <View style={styles.emptyChat}>
              <Text style={{ fontSize: 38 }}>🙏</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14.5, textAlign: 'center' }}>{isDm ? tx('Say namaste to start the conversation.') : tx('No messages yet. Start the satsang.')}</Text>
            </View>
          </View>
        )}

        {replyingTo && (
          <View style={[styles.replyBar, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
            <View style={styles.replyBarContent}>
              <MaterialCommunityIcons name="reply" size={18} color={colors.primary} />
              <View style={styles.replyBarInfo}>
                <Text style={[styles.replyBarName, { color: colors.primary }]}>{tx('Replying to')} {replyingTo.senderName}</Text>
                <Text style={[styles.replyBarText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {replyingTo.text || (replyingTo.type === 'gif' ? 'GIF' : tx('Photo'))}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={10}>
              <Ionicons name="close" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {(isRequest || isBlocked) && user && dmEntry ? (
          <View style={[styles.requestBar, { backgroundColor: colors.surface, borderColor: colors.divider, paddingBottom: 12 + insets.bottom }]}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, textAlign: 'center' }}>
              {isBlocked ? tx('You blocked this person') : `${dmEntry.otherName || roomName} ${tx('wants to message you')}`}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 3 }}>
              {isBlocked ? tx('They can’t reach you here until you unblock them.') : tx('Accept to reply. They won’t know you’ve seen it until you do.')}
            </Text>
            <View style={styles.requestBtns}>
              {isBlocked ? (
                <TouchableOpacity style={[styles.requestBtn, { backgroundColor: colors.primary }]} onPress={() => unblockUser(user.uid, dmEntry.otherUid, String(roomId)).catch(() => {})}>
                  <Text style={styles.requestBtnText}>{tx('Unblock')}</Text>
                </TouchableOpacity>
              ) : (<>
                <TouchableOpacity style={[styles.requestBtn, { borderWidth: 1, borderColor: colors.error }]}
                  onPress={async () => { if (await dialog.confirm({ title: tx('Block'), message: tx('They won’t be able to message you, and this chat is hidden.'), confirmText: tx('Block'), cancelText: tx('Cancel'), destructive: true })) { await blockUser(user.uid, dmEntry.otherUid, String(roomId)).catch(() => {}); router.back(); } }}>
                  <Text style={[styles.requestBtnText, { color: colors.error }]}>{tx('Block')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.requestBtn, { borderWidth: 1, borderColor: colors.cardBorder }]} onPress={async () => { await deleteDm(user.uid, String(roomId)).catch(() => {}); router.back(); }}>
                  <Text style={[styles.requestBtnText, { color: colors.text }]}>{tx('Delete')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.requestBtn, { backgroundColor: colors.primary }]} onPress={() => acceptDm(user.uid, String(roomId)).catch(() => {})}>
                  <Text style={styles.requestBtnText}>{tx('Accept')}</Text>
                </TouchableOpacity>
              </>)}
            </View>
          </View>
        ) : (
        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderColor: colors.divider, paddingBottom: 8 + (kbOpen ? 0 : insets.bottom) }]}>
          <TouchableOpacity style={styles.attachBtn} onPress={sendImage} disabled={uploadingImage} accessibilityLabel={tx('Send photo')}>
            {uploadingImage ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="image-outline" size={24} color={colors.textSecondary} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachBtn} onPress={() => setShowGiphy(true)} accessibilityLabel="GIF">
            <View style={[styles.gifBadge, { borderColor: colors.textSecondary }]}>
              <Text style={[styles.gifBadgeText, { color: colors.textSecondary }]}>GIF</Text>
            </View>
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.cardBorder }]}
            placeholder={tx('Message')}
            placeholderTextColor={colors.textTertiary}
            value={inputText}
            onChangeText={handleTyping}
            multiline
            maxLength={2000}
          />
          <Animated.View style={{ transform: [{ scale: sendBtnAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }], opacity: sendBtnAnim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }}>
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={sendMessage} disabled={!inputText.trim()} accessibilityLabel={tx('Send')}>
              <Ionicons name="arrow-up" size={21} color="#FFF" />
            </TouchableOpacity>
          </Animated.View>
        </View>
        )}
      </KeyboardAvoidingView>

      {/* ═══ Long-press sheet: quick reactions, more emoji, reply/copy/delete ═══ */}
      <Modal visible={!!actionFor} transparent animationType="fade" onRequestClose={() => setActionFor(null)} statusBarTranslucent navigationBarTranslucent>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setActionFor(null)}>
          <View style={[styles.actionSheet, { backgroundColor: colors.surface, paddingBottom: 16 + insets.bottom }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.divider }]} />
            <View style={styles.quickRow}>
              {QUICK_REACTIONS.map((e) => (
                <TouchableOpacity key={e} style={[styles.quickBtn, { backgroundColor: colors.background }]} onPress={() => actionFor && reactToMessage(actionFor.id, e)}>
                  <Text style={{ fontSize: 26 }}>{e}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.quickBtn, { backgroundColor: colors.background }]} onPress={() => { const id = actionFor?.id || null; setActionFor(null); setEmojiFor(id); }} accessibilityLabel={tx('More emoji')}>
                <Ionicons name="add" size={26} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {[
              { icon: 'arrow-undo-outline', label: tx('Reply'), on: () => { setReplyingTo(actionFor); setActionFor(null); } },
              ...(actionFor?.type === 'text' && actionFor.text ? [{ icon: 'copy-outline', label: tx('Copy'), on: () => copyMessage(actionFor.text) }] : []),
              ...(actionFor && !isMe(actionFor.senderId) && !isDm ? [{ icon: 'person-circle-outline', label: tx('View profile'), on: () => { const id = actionFor.senderId; setActionFor(null); openUser(id); } }] : []),
              ...(actionFor && isMe(actionFor.senderId) ? [{ icon: 'trash-outline', label: tx('Delete'), danger: true, on: () => deleteMessage(actionFor.id) }] : []),
            ].map((a: any) => (
              <TouchableOpacity key={a.label} style={styles.actionRow} onPress={a.on}>
                <Ionicons name={a.icon} size={21} color={a.danger ? colors.error : colors.text} />
                <Text style={{ fontSize: 16, color: a.danger ? colors.error : colors.text, fontWeight: '600' }}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ═══ Full emoji picker ═══ */}
      <Modal visible={!!emojiFor} transparent animationType="slide" onRequestClose={() => setEmojiFor(null)} statusBarTranslucent navigationBarTranslucent>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setEmojiFor(null)} />
          <View style={[styles.emojiSheet, { backgroundColor: colors.surface, paddingBottom: 10 + insets.bottom }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.divider }]} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiTabs}>
              {EMOJI_GROUPS.map((g) => {
                const on = g.key === emojiTab;
                return (
                  <TouchableOpacity key={g.key} onPress={() => setEmojiTab(g.key)} style={[styles.emojiTab, { backgroundColor: on ? colors.primary + '18' : 'transparent', borderColor: on ? colors.primary : colors.cardBorder }]}>
                    <Text style={{ fontSize: 16 }}>{g.icon}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: on ? colors.primary : colors.textSecondary }}>{tx(g.label)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <FlatList
              key={emojiTab}
              data={emojiList}
              numColumns={8}
              keyExtractor={(e, i) => e + i}
              style={{ flex: 1 }}
              renderItem={({ item: e }) => (
                <TouchableOpacity style={styles.emojiCell} onPress={() => emojiFor && reactToMessage(emojiFor, e)}>
                  <Text style={{ fontSize: 28 }}>{e}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* GIPHY Modal */}
      <Modal visible={showGiphy} animationType="slide" onRequestClose={() => setShowGiphy(false)} statusBarTranslucent navigationBarTranslucent>
        <View style={[styles.giphyContainer, { backgroundColor: colors.background, paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}>
          <View style={[styles.giphyHeader, { borderColor: colors.divider }]}>
            <Text style={[styles.giphyTitle, { color: colors.text }]}>{tx('Send a GIF')}</Text>
            <TouchableOpacity onPress={() => setShowGiphy(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={[styles.giphySearch, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.giphySearchInput, { color: colors.text }]}
              placeholder={tx('Search GIFs...')}
              placeholderTextColor={colors.textTertiary}
              value={giphySearch}
              onChangeText={searchGiphy}
              autoFocus
            />
          </View>
          {giphyLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={giphyResults}
              numColumns={2}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.giphyItem} onPress={() => sendGif(item)}>
                  <Image source={{ uri: item.preview || item.url }} style={styles.giphyPreview} />
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.giphyGrid}
            />
          )}
          <Text style={[styles.giphyPowered, { color: colors.textTertiary }]}>{tx('Powered by GIPHY')}</Text>
        </View>
      </Modal>

      {/* ═══ Fullscreen media viewer ═══ */}
      <Modal visible={!!viewMedia} transparent animationType="fade" onRequestClose={() => setViewMedia(null)} statusBarTranslucent navigationBarTranslucent>
        <View style={styles.mediaViewer}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setViewMedia(null)} />
          {viewMedia && <Image source={{ uri: viewMedia.url }} style={styles.mediaViewerImg} resizeMode="contain" />}
          <TouchableOpacity style={[styles.mediaViewerClose, { top: insets.top + 12 }]} onPress={() => setViewMedia(null)} hitSlop={10}>
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  requestBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 14 },
  requestBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  requestBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  requestBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14.5 },
  container: { flex: 1 },
  messagesList: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, flexGrow: 1 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  mediaBubble: { paddingHorizontal: 4, paddingVertical: 4 },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 14 },
  actionSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8 },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  quickBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 6 },
  emojiSheet: { height: '55%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 10, paddingTop: 8 },
  emojiTabs: { gap: 8, paddingHorizontal: 4, paddingBottom: 10 },
  emojiTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 18, borderWidth: 1 },
  emojiCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  mediaViewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  mediaViewerImg: { width: '96%', height: '80%' },
  mediaViewerClose: { position: 'absolute', right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  dayRow: { alignItems: 'center', marginVertical: 10 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  dayChipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end' },
  msgRowMine: { justifyContent: 'flex-end' },
  avatarCol: { width: 34, marginRight: 4 },
  msgBubbleWrap: { maxWidth: '78%' },
  msgBubbleWrapMine: { alignItems: 'flex-end' },
  senderName: { fontSize: 12, fontWeight: '700', marginBottom: 3, marginLeft: 12 },
  replyPreview: { marginBottom: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderLeftWidth: 3 },
  replyName: { fontSize: 12, fontWeight: '700' },
  replyText: { fontSize: 12.5, marginTop: 1 },
  msgBubble: { paddingHorizontal: 14, paddingVertical: 9, maxWidth: '100%' },
  msgBubbleMine: { borderRadius: 18, borderBottomRightRadius: 6 },
  msgBubbleOther: { borderRadius: 18, borderBottomLeftRadius: 6, borderWidth: 1 },
  msgText: { fontSize: 15.5, lineHeight: 21.5 },
  msgTime: { fontSize: 10.5, marginTop: 3, textAlign: 'right' },
  gifImage: { width: 220, height: 165, borderRadius: 14 },
  chatImage: { width: 220, height: 220, borderRadius: 14 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: -6, marginHorizontal: 8 },
  reactionChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, borderWidth: 1, gap: 3 },
  reactionEmoji: { fontSize: 15 },
  reactionCount: { fontSize: 11, fontWeight: '600' },
  replyBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderLeftWidth: 3, marginHorizontal: 8, marginBottom: 6, borderRadius: 10 },
  replyBarContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyBarInfo: { flex: 1 },
  replyBarName: { fontSize: 13, fontWeight: '700' },
  replyBarText: { fontSize: 13 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, gap: 4 },
  attachBtn: { width: 40, height: 44, justifyContent: 'center', alignItems: 'center' },
  gifBadge: { borderWidth: 1.5, borderRadius: 5, paddingHorizontal: 4, paddingVertical: 1 },
  gifBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 15.5 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 2 },
  giphyContainer: { flex: 1 },
  giphyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 0.5 },
  giphyTitle: { fontSize: 18, fontWeight: '700' },
  giphySearch: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, height: 42, borderRadius: 21, borderWidth: 1, gap: 8 },
  giphySearchInput: { flex: 1, fontSize: 14 },
  giphyGrid: { padding: 8 },
  giphyItem: { flex: 1, margin: 4, borderRadius: 12, overflow: 'hidden' },
  giphyPreview: { width: '100%', height: 120, borderRadius: 12 },
  giphyPowered: { textAlign: 'center', fontSize: 11, paddingVertical: 10 },
});
