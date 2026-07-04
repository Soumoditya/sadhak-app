import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform, Modal, Image, Dimensions, ActivityIndicator,
  Animated, Alert, Vibration,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDialog } from '../contexts/DialogContext';
import { rtdb, ref, push, set, onValue, off, rtServerTimestamp, limitToLast, rtQuery, orderByChild } from '../config/firebase';
import * as ImagePicker from 'expo-image-picker';

const GIPHY_API_KEY = 'wAKLYXMGICxFXZ3CZvycYzxk876dQDMM';
const { width } = Dimensions.get('window');

const REACTIONS = ['🙏', '❤️', '🕉️', '🔥', '👍', '😂'];

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
  const { roomId, roomName, roomType } = useLocalSearchParams<{ roomId: string; roomName: string; roomType: string }>();
  const { user, profile } = useAuth();
  const { colors, isDark } = useTheme();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [showGiphy, setShowGiphy] = useState(false);
  const [giphySearch, setGiphySearch] = useState('');
  const [giphyResults, setGiphyResults] = useState<GiphyResult[]>([]);
  const [giphyLoading, setGiphyLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [othersTyping, setOthersTyping] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sendBtnAnim = useRef(new Animated.Value(0)).current;

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

      // Clear typing indicator
      set(ref(rtdb, `typing/${roomId}/${user.uid}`), { isTyping: false, timestamp: Date.now() });

      // Scroll to bottom
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
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

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
  };

  // Send image
  const sendImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const uri = result.assets[0].uri;
      const newMsgRef = push(ref(rtdb, `messages/${roomId}`));
      await set(newMsgRef, {
        text: '',
        senderId: user!.uid,
        senderName: profile?.displayName || 'Sadhak',
        senderPfp: profile?.profilePicUrl || null,
        type: 'image',
        imageUrl: uri,
        timestamp: Date.now(),
      });

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (e) {
      console.error(e);
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

    await set(ref(rtdb, `messages/${roomId}/${msgId}/reactions`), reactions);
    setShowReactions(null);
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

  // ─── RENDER MESSAGE ─────────────────────────────────────────────
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const mine = isMe(item.senderId);
    const showAvatar = !mine && (index === 0 || messages[index - 1]?.senderId !== item.senderId);
    const reactionEntries = Object.entries(item.reactions || {});

    return (
      <View style={[styles.msgRow, mine && styles.msgRowMine]}>
        {/* Avatar */}
        {!mine && (
          <View style={styles.avatarCol}>
            {showAvatar ? (
              item.senderPfp ? (
                <Image source={{ uri: item.senderPfp }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                    {(item.senderName || 'S')[0].toUpperCase()}
                  </Text>
                </View>
              )
            ) : <View style={styles.avatarSpacer} />}
          </View>
        )}

        <View style={[styles.msgBubbleWrap, mine && styles.msgBubbleWrapMine]}>
          {/* Sender Name */}
          {showAvatar && !mine && (
            <Text style={[styles.senderName, { color: colors.primary }]}>{item.senderName}</Text>
          )}

          {/* Reply Preview */}
          {item.replyTo && (
            <View style={[styles.replyPreview, { backgroundColor: mine ? 'rgba(255,255,255,0.15)' : colors.primary + '10', borderLeftColor: colors.primary }]}>
              <Text style={[styles.replyName, { color: colors.primary }]}>{item.replyTo.senderName}</Text>
              <Text style={[styles.replyText, { color: mine ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]} numberOfLines={1}>
                {item.replyTo.text}
              </Text>
            </View>
          )}

          {/* Message Bubble */}
          <TouchableOpacity
            style={[
              styles.msgBubble,
              mine ? [styles.msgBubbleMine, { backgroundColor: colors.primary }]
                : [styles.msgBubbleOther, { backgroundColor: colors.surface, borderColor: colors.cardBorder }],
            ]}
            onLongPress={() => setShowReactions(item.id)}
            onPress={() => showReactions === item.id ? setShowReactions(null) : null}
            activeOpacity={0.8}
          >
            {item.type === 'gif' && item.gifUrl ? (
              <Image source={{ uri: item.gifUrl }} style={styles.gifImage} resizeMode="cover" />
            ) : item.type === 'image' && item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.chatImage} resizeMode="cover" />
            ) : (
              <Text style={[styles.msgText, { color: mine ? '#FFF' : colors.text }]}>{item.text}</Text>
            )}

            {/* Timestamp */}
            <Text style={[styles.msgTime, { color: mine ? 'rgba(255,255,255,0.5)' : colors.textTertiary }]}>
              {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </TouchableOpacity>

          {/* Reactions Display */}
          {reactionEntries.length > 0 && (
            <View style={styles.reactionsRow}>
              {reactionEntries.map(([emoji, users]) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.reactionChip, {
                    backgroundColor: (users as string[]).includes(user?.uid || '') ? colors.primary + '20' : colors.surface,
                    borderColor: (users as string[]).includes(user?.uid || '') ? colors.primary : colors.border,
                  }]}
                  onPress={() => reactToMessage(item.id, emoji)}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  <Text style={[styles.reactionCount, { color: colors.textSecondary }]}>{(users as string[]).length}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Reaction Picker */}
          {showReactions === item.id && (
            <View style={[styles.reactionPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {REACTIONS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionPickBtn}
                  onPress={() => reactToMessage(item.id, emoji)}
                >
                  <Text style={styles.reactionPickEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.reactionPickBtn} onPress={() => { setReplyingTo(item); setShowReactions(null); }}>
                <MaterialCommunityIcons name="reply" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: roomName || 'Chat', headerShown: true }} />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />

        {/* Typing Indicator */}
        {othersTyping.length > 0 && (
          <View style={[styles.typingBar, { backgroundColor: colors.surface }]}>
            <View style={styles.typingDots}>
              {[0, 1, 2].map(i => (
                <Animated.View key={i} style={[styles.typingDot, { backgroundColor: colors.primary }]} />
              ))}
            </View>
            <Text style={[styles.typingText, { color: colors.textSecondary }]}>
              {othersTyping.join(', ')} {othersTyping.length === 1 ? 'is' : 'are'} typing...
            </Text>
          </View>
        )}

        {/* Reply Preview */}
        {replyingTo && (
          <View style={[styles.replyBar, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <View style={styles.replyBarContent}>
              <MaterialCommunityIcons name="reply" size={16} color={colors.primary} />
              <View style={styles.replyBarInfo}>
                <Text style={[styles.replyBarName, { color: colors.primary }]}>{replyingTo.senderName}</Text>
                <Text style={[styles.replyBarText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {replyingTo.text || (replyingTo.type === 'gif' ? 'GIF' : 'Image')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: 8 + insets.bottom }]}>
          <TouchableOpacity style={styles.attachBtn} onPress={sendImage}>
            <MaterialCommunityIcons name="image-outline" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachBtn} onPress={() => setShowGiphy(true)}>
            <MaterialCommunityIcons name="gif" size={26} color={colors.textTertiary} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: isDark ? colors.surfaceElevated : '#F5F5F5' }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textTertiary}
            value={inputText}
            onChangeText={handleTyping}
            multiline
            maxLength={2000}
          />
          <Animated.View style={{
            transform: [{ scale: sendBtnAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
            opacity: sendBtnAnim,
          }}>
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.primary }]}
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <Ionicons name="send" size={18} color="#FFF" />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* GIPHY Modal */}
        <Modal visible={showGiphy} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.giphyContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.giphyHeader, { borderColor: colors.border }]}>
              <Text style={[styles.giphyTitle, { color: colors.text }]}>Send a GIF</Text>
              <TouchableOpacity onPress={() => setShowGiphy(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.giphySearch, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.giphySearchInput, { color: colors.text }]}
                placeholder="Search GIFs..."
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
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.giphyItem} onPress={() => sendGif(item)}>
                    <Image source={{ uri: item.preview || item.url }} style={styles.giphyPreview} />
                  </TouchableOpacity>
                )}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.giphyGrid}
              />
            )}
            <Text style={[styles.giphyPowered, { color: colors.textTertiary }]}>Powered by GIPHY</Text>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messagesList: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end' },
  msgRowMine: { justifyContent: 'flex-end' },
  avatarCol: { width: 32, marginRight: 6 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarPlaceholder: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 13, fontWeight: '700' },
  avatarSpacer: { width: 28 },
  msgBubbleWrap: { maxWidth: '75%' },
  msgBubbleWrapMine: { alignItems: 'flex-end' },
  senderName: { fontSize: 11, fontWeight: '700', marginBottom: 2, marginLeft: 10 },
  replyPreview: { marginBottom: 2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderLeftWidth: 3, marginHorizontal: 4 },
  replyName: { fontSize: 11, fontWeight: '700' },
  replyText: { fontSize: 11, marginTop: 1 },
  msgBubble: { paddingHorizontal: 14, paddingVertical: 8, maxWidth: '100%' },
  msgBubbleMine: { borderRadius: 18, borderBottomRightRadius: 4 },
  msgBubbleOther: { borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 0.5 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  gifImage: { width: 200, height: 150, borderRadius: 12 },
  chatImage: { width: 200, height: 200, borderRadius: 12 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4, marginHorizontal: 4 },
  reactionChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1, gap: 2 },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 11, fontWeight: '600' },
  reactionPicker: { flexDirection: 'row', gap: 4, padding: 6, borderRadius: 20, borderWidth: 1, marginTop: 4, marginHorizontal: 4, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  reactionPickBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  reactionPickEmoji: { fontSize: 20 },
  typingBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
  typingDots: { flexDirection: 'row', gap: 3 },
  typingDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.6 },
  typingText: { fontSize: 12, fontStyle: 'italic' },
  replyBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderLeftWidth: 3, marginHorizontal: 8, marginBottom: 4, borderRadius: 8 },
  replyBarContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyBarInfo: { flex: 1 },
  replyBarName: { fontSize: 12, fontWeight: '700' },
  replyBarText: { fontSize: 12 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 8, borderTopWidth: 0.5, gap: 4 },
  attachBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, minHeight: 36, maxHeight: 100, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 15 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  giphyContainer: { flex: 1, paddingTop: 50 },
  giphyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 0.5 },
  giphyTitle: { fontSize: 18, fontWeight: '700' },
  giphySearch: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, height: 42, borderRadius: 21, borderWidth: 1, gap: 8 },
  giphySearchInput: { flex: 1, fontSize: 14 },
  giphyGrid: { padding: 8 },
  giphyItem: { flex: 1, margin: 4, borderRadius: 12, overflow: 'hidden' },
  giphyPreview: { width: '100%', height: 120, borderRadius: 12 },
  giphyPowered: { textAlign: 'center', fontSize: 11, paddingVertical: 10 },
});
