import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDialog } from '../contexts/DialogContext';
import { useLayoutInsets } from '../constants/layout';
import { askSadhakAI, STARTER_QUESTIONS, type AiMessage } from '../services/ai';

const AI_HISTORY_KEY = 'sadhak_ai_history';

interface ChatItem extends AiMessage {
  id: string;
  error?: boolean;
}

export default function AskScreen() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const dialog = useDialog();
  const { headerPaddingTop, backBtnTop, bottomInset, insets } = useLayoutInsets();
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Load saved chat history on mount so the conversation persists across visits.
  useEffect(() => {
    AsyncStorage.getItem(AI_HISTORY_KEY)
      .then((raw) => { if (raw) setMessages(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  // Persist whenever messages change (skip the empty initial state).
  useEffect(() => {
    if (messages.length) AsyncStorage.setItem(AI_HISTORY_KEY, JSON.stringify(messages.slice(-50))).catch(() => {});
  }, [messages]);

  const clearChat = () => {
    dialog.alert('Clear chat?', 'This removes your Sadhak AI conversation history.', [
      { text: 'Cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        setMessages([]);
        await AsyncStorage.removeItem(AI_HISTORY_KEY);
      }},
    ]);
  };

  const send = async (textArg?: string) => {
    const text = (textArg ?? input).trim();
    if (!text || thinking) return;
    setInput('');
    const userMsg: ChatItem = { id: `u${Date.now()}`, role: 'user', text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setThinking(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const reply = await askSadhakAI(
        nextHistory.map(({ role, text }) => ({ role, text })),
        profile?.displayName?.split(' ')[0],
      );
      setMessages((prev) => [...prev, { id: `m${Date.now()}`, role: 'model', text: reply }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { id: `e${Date.now()}`, role: 'model', text: String(e?.message || e), error: true }]);
    } finally {
      setThinking(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const renderItem = ({ item }: { item: ChatItem }) => {
    const mine = item.role === 'user';
    return (
      <View style={[st.row, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
        {!mine && (
          <View style={[st.aiAvatar, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '35' }]}>
            <MaterialCommunityIcons name="creation" size={15} color={colors.primary} />
          </View>
        )}
        <View
          style={[
            st.bubble,
            mine
              ? { backgroundColor: colors.primary, borderBottomRightRadius: 5 }
              : { backgroundColor: colors.surface, borderColor: item.error ? colors.error + '55' : colors.cardBorder, borderWidth: 1, borderBottomLeftRadius: 5 },
          ]}
        >
          <Text style={[st.bubbleText, { color: mine ? '#FFF' : item.error ? colors.error : colors.text }]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? [colors.surfaceElevated, colors.background] : ['#D94F00', '#F07830']}
        style={[st.header, { paddingTop: headerPaddingTop }]}
      >
        <TouchableOpacity style={[st.backBtn, { top: backBtnTop }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        {messages.length > 0 && (
          <TouchableOpacity style={[st.clearBtn, { top: backBtnTop }]} onPress={clearChat} hitSlop={8}>
            <MaterialCommunityIcons name="broom" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
        <View style={st.headerCenter}>
          <View style={st.headerTitleRow}>
            <MaterialCommunityIcons name="creation" size={20} color="#FFD9A0" />
            <Text style={st.headerTitle}>Sadhak AI</Text>
          </View>
          <Text style={st.headerSub}>Your spiritual companion · scripture-grounded</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : insets.top + 56}
      >
        {messages.length === 0 ? (
          <View style={st.emptyWrap}>
            <Image source={require('../assets/images/icon.png')} style={st.emptyEmblem} />
            <Text style={[st.emptyTitle, { color: colors.text }]}>Namaste 🙏</Text>
            <Text style={[st.emptySub, { color: colors.textSecondary }]}>
              Ask anything about dharma, scriptures, festivals, puja, mantras or daily practice.
            </Text>
            <View style={st.starters}>
              {STARTER_QUESTIONS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[st.starter, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                  onPress={() => send(q)}
                >
                  <Text style={[st.starterText, { color: colors.text }]}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 14, gap: 10 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {thinking && (
          <View style={[st.thinkingBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ color: colors.textSecondary, fontSize: 12.5 }}>Sadhak AI is reflecting…</Text>
          </View>
        )}

        {/* Input */}
        <View style={[st.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.divider, paddingBottom: 10 + bottomInset }]}>
          <TextInput
            style={[st.input, { color: colors.text, backgroundColor: isDark ? colors.surfaceElevated : '#F5F1EC' }]}
            placeholder="Ask about dharma, puja, mantra…"
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[st.sendBtn, { backgroundColor: colors.primary, opacity: input.trim() && !thinking ? 1 : 0.5 }]}
            onPress={() => send()}
            disabled={!input.trim() || thinking}
          >
            <Ionicons name="send" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, alignItems: 'center' },
  backBtn: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  clearBtn: { position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  headerCenter: { alignItems: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 11.5, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  emptyWrap: { flex: 1, alignItems: 'center', paddingTop: 34, paddingHorizontal: 22 },
  emptyEmblem: { width: 74, height: 74, borderRadius: 37, marginBottom: 14 },
  emptyTitle: { fontSize: 21, fontWeight: '800' },
  emptySub: { fontSize: 13.5, textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 300 },
  starters: { marginTop: 22, gap: 8, width: '100%' },
  starter: { borderWidth: 1, borderRadius: 13, paddingVertical: 11, paddingHorizontal: 14 },
  starterText: { fontSize: 13.5, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  bubble: { maxWidth: '82%', borderRadius: 17, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontSize: 14.5, lineHeight: 21 },
  thinkingBar: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginLeft: 14, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, minHeight: 42, maxHeight: 110, textAlignVertical: 'center' },
  sendBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
});
