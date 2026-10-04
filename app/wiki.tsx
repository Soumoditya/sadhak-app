import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, BackHandler } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Header } from '../components/ui';
import { useDsInsets } from '../constants/ds';
import { WIKI, WIKI_CATEGORIES, type WikiArticle, type WikiCat } from '../constants/hinduWiki';

export default function WikiScreen() {
  const { colors } = useTheme();
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
        <Header title={article.title} subtitle={c.label} onBack={() => setArticle(null)} />
        <ScrollView ref={readerRef} contentContainerStyle={{ padding: 20, paddingBottom: screenBottom }} showsVerticalScrollIndicator={false}>
          {!!article.titleHi && <Text style={[st.artHi, { color: c.color }]}>{article.titleHi}</Text>}
          <Text style={[st.artBody, { color: colors.text }]}>{article.body}</Text>
          {related.length > 0 && (
            <View style={{ marginTop: 26 }}>
              <Text style={[st.relLabel, { color: colors.textTertiary }]}>MORE IN {c.label.toUpperCase()}</Text>
              {related.map((r) => (
                <TouchableOpacity key={r.id} onPress={() => setArticle(r)} activeOpacity={0.8}
                  style={[st.relRow, { borderColor: colors.cardBorder }]}>
                  <Text style={[st.relTitle, { color: colors.text }]} numberOfLines={1}>{r.title}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity onPress={() => setArticle(null)} style={[st.back, { borderColor: colors.cardBorder }]}>
            <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Back to articles</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Index ──
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Hindu Wiki" subtitle="Deities · scriptures · festivals · concepts" />
      <View style={{ paddingHorizontal: 20 }}>
        <View style={[st.search, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={17} color={colors.textTertiary} />
          <TextInput style={[st.searchIn, { color: colors.text }]} placeholder="Search the wiki…" placeholderTextColor={colors.textTertiary} value={q} onChangeText={setQ} />
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
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: active ? '#FFF' : colors.textSecondary }}>{label}</Text>
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
              <View style={[st.cardIcon, { backgroundColor: c.color + '18' }]}><MaterialCommunityIcons name={c.icon as any} size={20} color={c.color} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[st.cardTitle, { color: colors.text }]}>{a.title}{a.titleHi ? <Text style={{ color: colors.textTertiary }}>  {a.titleHi}</Text> : null}</Text>
                <Text style={[st.cardSum, { color: colors.textSecondary }]} numberOfLines={2}>{a.summary}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
            </TouchableOpacity>
          );
        })}
        {list.length === 0 && <Text style={{ color: colors.textTertiary, textAlign: 'center', marginTop: 30 }}>No articles match your search.</Text>}
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
  artHi: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  artBody: { fontSize: 15, lineHeight: 25 },
  relLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginBottom: 6 },
  relRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1 },
  relTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  back: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 12, borderWidth: 1, marginTop: 22 },
});
