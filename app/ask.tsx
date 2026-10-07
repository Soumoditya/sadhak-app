import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Animated, Easing, Share } from 'react-native';
import { KeyboardAvoidingView, useKeyboardState } from 'react-native-keyboard-controller';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDialog } from '../contexts/DialogContext';
import { askSadhakAI, STARTER_QUESTIONS, type AiMessage } from '../services/ai';
import { loadNatal, chartSummary } from '../services/jyotish';
import { logEvent } from '../services/diagnostics';

const AI_HISTORY_KEY = 'sadhak_ai_history';

interface ChatItem extends AiMessage {
  id: string;
  error?: boolean;
  /** Question to resend when an error bubble's Retry is tapped. */
  retry?: string;
}

/** Three dots that bounce while Sadhak AI composes a reply. */
function TypingDots({ color }: { color: string }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const loops = dots.map((v, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 150),
      Animated.timing(v, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.delay(300 - i * 150),
    ])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 6 }}>
      {dots.map((v, i) => (
        <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }} />
      ))}
    </View>
  );
}

export default function AskScreen() {
  const { profile, user } = useAuth();
  const { colors, tones } = useTheme();
  const { t: tr, tx } = useLanguage();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const kbOpen = useKeyboardState((s) => s.isVisible);
  const astroMode = useLocalSearchParams().astro === '1';
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [astroCtx, setAstroCtx] = useState<string | undefined>(undefined);
  // Typewriter reveal for the newest reply.
  const [reveal, setReveal] = useState<{ id: string; n: number } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!astroMode || !user?.uid) return;
    loadNatal(user.uid).then((n) => { if (n?.kundli) setAstroCtx(chartSummary(n.kundli)); }).catch(() => {});
  }, [astroMode, user?.uid]);

  useEffect(() => {
    AsyncStorage.getItem(AI_HISTORY_KEY).then((raw) => { if (raw) setMessages(JSON.parse(raw)); }).catch(() => {});
  }, []);
  useEffect(() => {
    if (messages.length) AsyncStorage.setItem(AI_HISTORY_KEY, JSON.stringify(messages.slice(-50))).catch(() => {});
  }, [messages]);

  useEffect(() => {
    if (!reveal) return;
    const msg = messages.find((m) => m.id === reveal.id);
    if (!msg || reveal.n >= msg.text.length) { setReveal(null); return; }
    const id = setTimeout(() => setReveal({ id: reveal.id, n: Math.min(msg.text.length, reveal.n + Math.max(6, Math.ceil(msg.text.length / 60))) }), 16);
    return () => clearTimeout(id);
  }, [reveal, messages]);

  const newChat = async () => {
    const ok = await dialog.confirm({ title: tx('Start a new chat?'), message: tx('This clears the current conversation.'), confirmText: tx('New chat'), destructive: true });
    if (!ok) return;
    setMessages([]); setReveal(null);
    AsyncStorage.removeItem(AI_HISTORY_KEY).catch(() => {});
  };

  const send = async (textArg?: string, replaceId?: string) => {
    const text = (textArg ?? input).trim();
    if (!text || thinking) return;
    setInput('');
    const base = replaceId ? messages.filter((m) => m.id !== replaceId) : messages;
    const already = base.length && base[base.length - 1].role === 'user' && base[base.length - 1].text === text;
    const nextHistory = already ? base : [...base, { id: `u${Date.now()}`, role: 'user' as const, text }];
    setMessages(nextHistory);
    setThinking(true);
    const t0 = Date.now();
    try {
      const reply = await askSadhakAI(nextHistory.map(({ role, text: t }) => ({ role, text: t })), profile?.displayName?.split(' ')[0], astroMode ? astroCtx : undefined);
      const id = `m${Date.now()}`;
      setMessages((prev) => [...prev, { id, role: 'model', text: reply }]);
      setReveal({ id, n: 0 });
      logEvent('ai_reply', { ms: Date.now() - t0, chars: reply.length });
    } catch (e: any) {
      setMessages((prev) => [...prev, { id: `e${Date.now()}`, role: 'model', text: String(e?.message || e), error: true, retry: text }]);
      logEvent('ai_error', { ms: Date.now() - t0, msg: String(e?.message || e).slice(0, 120) });
    } finally {
      setThinking(false);
    }
  };

  const copy = async (m: ChatItem) => {
    try { await Clipboard.setStringAsync(m.text); setCopied(m.id); setTimeout(() => setCopied(null), 1500); } catch {}
  };

  // Inverted list: newest at the bottom, sticks above the composer.
  const data = useMemo(() => {
    const list: (ChatItem | { id: 'typing'; role: 'typing' })[] = [...messages];
    if (thinking) list.push({ id: 'typing', role: 'typing' });
    return list.reverse();
  }, [messages, thinking]);

  const renderItem = ({ item }: { item: any }) => {
    if (item.role === 'typing') {
      return (
        <View style={st.aiRow}>
          <View style={[st.aiAvatar, { backgroundColor: tones.plum.bg }]}><MaterialCommunityIcons name="creation" size={15} color={tones.plum.fg} /></View>
          <View style={[st.aiCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, paddingVertical: 12 }]}>
            <TypingDots color={tones.plum.fg} />
          </View>
        </View>
      );
    }
    const m = item as ChatItem;
    if (m.role === 'user') {
      return (
        <View style={st.userRow}>
          <View style={[st.userBubble, { backgroundColor: colors.primary }]}>
            <Text style={st.userText} selectable>{m.text}</Text>
          </View>
        </View>
      );
    }
    const shown = reveal?.id === m.id ? m.text.slice(0, reveal.n) : m.text;
    return (
      <View style={st.aiRow}>
        <View style={[st.aiAvatar, { backgroundColor: m.error ? colors.error + '18' : tones.plum.bg }]}>
          <MaterialCommunityIcons name={m.error ? 'alert-circle-outline' : 'creation'} size={15} color={m.error ? colors.error : tones.plum.fg} />
        </View>
        <View style={[st.aiCard, { backgroundColor: colors.surface, borderColor: m.error ? colors.error + '44' : colors.cardBorder }]}>
          <Text style={[st.aiText, { color: m.error ? colors.error : colors.text }]} selectable>{shown}</Text>
          {m.error ? (
            <TouchableOpacity onPress={() => send(m.retry, m.id)} style={[st.chipBtn, { borderColor: colors.cardBorder }]}>
              <Ionicons name="refresh" size={15} color={colors.text} />
              <Text style={[st.chipText, { color: colors.text }]}>{tx('Try again')}</Text>
            </TouchableOpacity>
          ) : reveal?.id !== m.id && (
            <View style={st.aiActions}>
              <TouchableOpacity onPress={() => copy(m)} hitSlop={8} style={st.actionBtn} accessibilityLabel={tx('Copy')}>
                <Ionicons name={copied === m.id ? 'checkmark' : 'copy-outline'} size={16} color={colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Share.share({ message: `${m.text}\n\n— Sadhak AI` }).catch(() => {})} hitSlop={8} style={st.actionBtn} accessibilityLabel={tx('Share')}>
                <Ionicons name="share-social-outline" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const empty = (
    <View style={[st.emptyWrap, { transform: [{ scaleY: -1 }] }]}>
      <View style={[st.emptyIcon, { backgroundColor: tones.plum.bg }]}>
        <MaterialCommunityIcons name="creation" size={30} color={tones.plum.fg} />
      </View>
      <Text style={[st.emptyTitle, { color: colors.text }]}>{tx('Namaste 🙏')}</Text>
      <Text style={[st.emptySub, { color: colors.textSecondary }]}>{tx(astroMode ? 'Ask about your birth chart, dasha or transits.' : 'Ask anything about dharma, scriptures, festivals, puja, mantras or daily practice.')}</Text>
      <View style={st.starters}>
        {STARTER_QUESTIONS.map(({ q, icon }) => (
          <TouchableOpacity key={q} style={[st.starter, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} onPress={() => send(tx(q))} activeOpacity={0.8}>
            <MaterialCommunityIcons name={icon as any} size={18} color={colors.primary} />
            <Text style={[st.starterText, { color: colors.text }]} numberOfLines={2}>{tx(q)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <Header
        title={tr('f.ai')}
        subtitle={tx(astroMode ? 'Reading your birth chart' : 'Your spiritual companion · scripture-grounded')}
        quick={false}
        right={messages.length > 0 ? (
          <TouchableOpacity onPress={newChat} style={[st.newBtn, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]} hitSlop={8} accessibilityLabel={tx('New chat')}>
            <Ionicons name="create-outline" size={18} color={colors.text} />
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{tx('New chat')}</Text>
          </TouchableOpacity>
        ) : undefined}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <FlatList
          inverted
          data={data}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          ListEmptyComponent={empty}
          contentContainerStyle={{ padding: 14, gap: 14, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        />
        <View style={[st.composer, { backgroundColor: colors.background, paddingBottom: 10 + (kbOpen ? 0 : insets.bottom) }]}>
          <View style={[st.inputWrap, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <TextInput
              style={[st.input, { color: colors.text }]}
              placeholder={tx('Ask about dharma, puja, mantra…')}
              placeholderTextColor={colors.textTertiary}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[st.sendBtn, { backgroundColor: input.trim() && !thinking ? colors.primary : colors.surfaceSecondary }]}
              onPress={() => send()}
              disabled={!input.trim() || thinking}
              accessibilityLabel={tx('Send')}
            >
              <Ionicons name="arrow-up" size={20} color={input.trim() && !thinking ? '#FFF' : colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <Text style={[st.disclaimer, { color: colors.textTertiary }]}>{tx('Sadhak AI can make mistakes. Check important details with a guru or scripture.')}</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 20 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 22, fontWeight: '800' },
  emptySub: { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 320 },
  starters: { marginTop: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  starter: { width: '47%', minHeight: 76, borderWidth: 1, borderRadius: 16, padding: 12, gap: 6 },
  starterText: { fontSize: 13.5, fontWeight: '600', lineHeight: 18 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  userBubble: { maxWidth: '84%', borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 15, paddingVertical: 10 },
  userText: { color: '#FFF', fontSize: 15.5, lineHeight: 22 },
  aiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  aiAvatar: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  aiCard: { flex: 1, borderRadius: 18, borderTopLeftRadius: 6, borderWidth: 1, paddingHorizontal: 15, paddingTop: 11, paddingBottom: 10 },
  aiText: { fontSize: 15.5, lineHeight: 23.5 },
  aiActions: { flexDirection: 'row', gap: 14, marginTop: 8 },
  actionBtn: { padding: 2 },
  chipBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 10, borderWidth: 1, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, fontWeight: '700' },
  composer: { paddingHorizontal: 12, paddingTop: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'flex-end', borderWidth: 1, borderRadius: 26, paddingLeft: 16, paddingRight: 5, paddingVertical: 5 },
  input: { flex: 1, fontSize: 15.5, maxHeight: 130, paddingTop: 9, paddingBottom: 9 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  disclaimer: { fontSize: 11, textAlign: 'center', marginTop: 6 },
});
