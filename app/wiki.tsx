import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, BackHandler } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Header } from '../components/ui';
import { useDsInsets } from '../constants/ds';
import { WIKI, WIKI_CATEGORIES, type WikiArticle, type WikiCat } from '../constants/hinduWiki';
import Emblem, { type EmblemName } from '../components/art/Emblem';

const EMBLEM: Record<string, EmblemName> = {
  ganesha: 'modak', shiva: 'trishul', vishnu: 'chakra', durga: 'mukut', hanuman: 'gada', lakshmi: 'lotus',
  gita: 'flute', vedas: 'yajna', upanishads: 'om', ramayana: 'bow',
  diwali: 'diya', holi: 'colours', navratri: 'kalash', ekadashi: 'moon',
  dharma: 'dharmachakra', karma: 'scales', moksha: 'sun', atman: 'flame',
};
const emblemOf = (a: WikiArticle): EmblemName => EMBLEM[a.id] || (a.category === 'scriptures' ? 'book' : a.category === 'festivals' ? 'diya' : a.category === 'deities' ? 'om' : 'dharmachakra');

export default function WikiScreen() {
  const { colors, tone } = useTheme();
  const { t: tr, tx, native, language, display } = useLanguage();
  const { screenBottom } = useDsInsets();
  const [cat, setCat] = useState<WikiCat | 'all'>('all');
  const [q, setQ] = useState('');
  const [article, setArticle] = useState<WikiArticle | null>(null);

  // Hardware back closes the open article first.
  useEffect(() => {
    if (!article) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setArticle(null); return true; });
    return () => sub.remove();
  }, [article]);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return WIKI.filter((a) => (cat === 'all' || a.category === cat) &&
      (!query || a.title.toLowerCase().includes(query) || a.summary.toLowerCase().includes(query)));
  }, [cat, q]);

  // Reading another article should start at the top, not mid-scroll.
  const readerRef = React.useRef<ScrollView>(null);
  useEffect(() => { readerRef.current?.scrollTo({ y: 0, animated: false }); }, [article?.id]);

  // ── Article reader ──
  if (article) {
    const c = WIKI_CATEGORIES.find((x) => x.key === article.category)!;
    const related = WIKI.filter((a) => a.category === article.category && a.id !== article.id).slice(0, 4);
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title={tx(c.label)} subtitle={tr('f.wiki')} onBack={() => setArticle(null)} />
        <ScrollView ref={readerRef} contentContainerStyle={{ padding: 20, paddingBottom: screenBottom }} showsVerticalScrollIndicator={false}>
          <View style={[st.hero, { backgroundColor: tone(c.color).bg }]}>
            <Emblem name={emblemOf(article)} size={112} color={c.color} />
            <Text style={[st.heroTitle, { color: colors.text }, display]}>{native(article.title, article.titleHi)}</Text>
            <Text style={[st.heroSum, { color: colors.textSecondary }]}>{tx(article.summary)}</Text>
          </View>
          <Text style={[st.artBody, { color: colors.text }]}>{tx(article.body)}</Text>
          {related.length > 0 && (
            <View style={{ marginTop: 26 }}>
              <Text style={[st.relLabel, { color: colors.textTertiary }]}>{tx('More in')} {tx(c.label)}</Text>
              {related.map((r) => (
                <TouchableOpacity key={r.id} onPress={() => setArticle(r)} activeOpacity={0.8}
                  style={[st.relRow, { borderColor: colors.cardBorder }]}>
                  <Emblem name={emblemOf(r)} size={34} color={c.color} />
                  <Text style={[st.relTitle, { color: colors.text }]} numberOfLines={1}>{native(r.title, r.titleHi)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity onPress={() => setArticle(null)} style={[st.back, { borderColor: colors.cardBorder }]}>
            <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{tx('Back to articles')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Index ──
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={tr('f.wiki')} subtitle={tx('Deities · scriptures · festivals · concepts')} />
      <View style={{ paddingHorizontal: 20 }}>
        <View style={[st.search, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={17} color={colors.textTertiary} />
          <TextInput style={[st.searchIn, { color: colors.text }]} placeholder={tx('Search the wiki…')} placeholderTextColor={colors.textTertiary} value={q} onChangeText={setQ} />
        </View>
      </View>
      {/* Fixed-height, non-shrinking row: the old maxHeight-only ScrollView got
          squeezed by the list below and cut the chips in half. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 50, flexGrow: 0, flexShrink: 0, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, alignItems: 'center' }}>
        {([['all', 'All', 'view-grid-outline', colors.primary], ...WIKI_CATEGORIES.map((c) => [c.key, c.label, c.icon, c.color])] as any[]).map(([key, label, icon, color]) => {
          const active = cat === key;
          return (
            <TouchableOpacity key={key} onPress={() => setCat(key)} style={[st.catChip, { backgroundColor: active ? color : colors.surface, borderColor: active ? color : colors.cardBorder }]}>
              <MaterialCommunityIcons name={icon} size={14} color={active ? '#FFF' : color} />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: active ? '#FFF' : colors.textSecondary }}>{tx(label)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: screenBottom }} showsVerticalScrollIndicator={false}>
        {list.map((a) => {
          const c = WIKI_CATEGORIES.find((x) => x.key === a.category)!;
          return (
            <TouchableOpacity key={a.id} onPress={() => setArticle(a)} activeOpacity={0.8}
              style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <Emblem name={emblemOf(a)} size={52} color={c.color} />
              <View style={{ flex: 1 }}>
                <Text style={[st.cardTitle, { color: colors.text }]}>{native(a.title, a.titleHi)}</Text>
                <Text style={[st.cardSum, { color: colors.textSecondary }]} numberOfLines={2}>{tx(a.summary)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
            </TouchableOpacity>
          );
        })}
        {list.length === 0 && <Text style={{ color: colors.textTertiary, textAlign: 'center', marginTop: 30 }}>{tx('No articles match your search.')}</Text>}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 46 },
  searchIn: { flex: 1, fontSize: 15 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, height: 34, borderRadius: 100, borderWidth: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  cardIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardSum: { fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  hero: { alignItems: 'center', borderRadius: 22, padding: 20, marginBottom: 18, gap: 8 },
  heroTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  heroSum: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  artBody: { fontSize: 15, lineHeight: 25 },
  relLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginBottom: 6, textTransform: 'uppercase' },
  relRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  relTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  back: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 12, borderWidth: 1, marginTop: 22 },
});
