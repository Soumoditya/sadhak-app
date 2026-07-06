import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useLayoutInsets } from '../constants/layout';
import {
  DEVOTIONAL_CATEGORIES, getDevotionalByCategory,
  type DevotionalCategory, type DevotionalItem,
} from '../constants/devotional';

export default function DevotionalScreen() {
  const { colors, isDark } = useTheme();
  const { headerPaddingTop, screenBottomPadding } = useLayoutInsets();
  const [category, setCategory] = useState<DevotionalCategory>('aarti');
  const [selected, setSelected] = useState<DevotionalItem | null>(null);

  const items = getDevotionalByCategory(category);

  const openPlayer = (item: DevotionalItem) =>
    router.push({ pathname: '/play', params: { query: item.playQuery, title: item.title } });

  // ─── Detail view ───
  if (selected) {
    return (
      <View style={[st.container, { backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: screenBottomPadding }}>
          <LinearGradient
            colors={[selected.color, selected.color + 'B3']}
            style={[st.detailHeader, { paddingTop: headerPaddingTop }]}
          >
            <TouchableOpacity style={st.detailBack} onPress={() => setSelected(null)} hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <MaterialCommunityIcons name="candle" size={34} color="#FFD700" />
            <Text style={st.detailTitle}>{selected.title}</Text>
            <Text style={st.detailTitleHi}>{selected.titleHi}</Text>
            <Text style={st.detailDeity}>{selected.deity}</Text>

            <TouchableOpacity style={st.listenBtn} onPress={() => openPlayer(selected)} activeOpacity={0.85}>
              <MaterialCommunityIcons name="play-circle" size={20} color={selected.color} />
              <Text style={[st.listenBtnText, { color: selected.color }]}>Listen / Watch</Text>
            </TouchableOpacity>
          </LinearGradient>

          <View style={[st.lyricsCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[st.lyricsText, { color: colors.text }]}>{selected.text}</Text>
          </View>

          {!!selected.meaning && (
            <View style={[st.meaningCard, { backgroundColor: colors.primary + '0C', borderColor: colors.primary + '26' }]}>
              <View style={st.meaningHead}>
                <MaterialCommunityIcons name="book-open-page-variant-outline" size={15} color={colors.primary} />
                <Text style={[st.meaningLabel, { color: colors.primary }]}>MEANING</Text>
              </View>
              <Text style={[st.meaningText, { color: colors.textSecondary }]}>{selected.meaning}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ─── List view ───
  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? [colors.surfaceElevated, colors.background] : ['#D94F00', '#F07830']}
        style={[st.header, { paddingTop: headerPaddingTop }]}
      >
        <View style={st.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={st.headerBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text style={st.headerTitle}>Devotional Library</Text>
            <Text style={st.headerSub}>Aarti · Chalisa · Mantra · Stotra</Text>
          </View>
        </View>

        {/* Category tabs */}
        <View style={st.tabs}>
          {DEVOTIONAL_CATEGORIES.map((cat) => {
            const active = category === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[st.tab, active && st.tabActive]}
                onPress={() => setCategory(cat.key)}
              >
                <MaterialCommunityIcons name={cat.icon as any} size={15} color={active ? '#D94F00' : 'rgba(255,255,255,0.8)'} />
                <Text style={[st.tabText, { color: active ? '#D94F00' : 'rgba(255,255,255,0.9)' }]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[st.list, { paddingBottom: screenBottomPadding }]}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            onPress={() => setSelected(item)}
            activeOpacity={0.7}
          >
            <View style={[st.cardIcon, { backgroundColor: item.color + '15' }]}>
              <MaterialCommunityIcons
                name={DEVOTIONAL_CATEGORIES.find(c => c.key === item.category)?.icon as any}
                size={24} color={item.color}
              />
            </View>
            <View style={st.cardInfo}>
              <Text style={[st.cardTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[st.cardTitleHi, { color: colors.primary }]} numberOfLines={1}>{item.titleHi}</Text>
              <Text style={[st.cardDeity, { color: colors.textSecondary }]}>{item.deity}</Text>
            </View>
            <TouchableOpacity onPress={() => openPlayer(item)} hitSlop={8} style={[st.playBtn, { backgroundColor: item.color + '14' }]}>
              <MaterialCommunityIcons name="play" size={20} color={item.color} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 14, paddingHorizontal: 20, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerBack: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 21, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 14 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.14)' },
  tabActive: { backgroundColor: '#FFF' },
  tabText: { fontSize: 12, fontWeight: '700' },

  list: { padding: 16, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, gap: 12 },
  cardIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardTitleHi: { fontSize: 13.5, fontWeight: '600', marginTop: 1 },
  cardDeity: { fontSize: 11.5, marginTop: 2 },
  playBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  detailHeader: { paddingBottom: 24, alignItems: 'center', borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  detailBack: { position: 'absolute', left: 16, bottom: undefined, top: undefined, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start', marginTop: 0, transform: [{ translateY: 0 }] },
  detailTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', marginTop: 10, textAlign: 'center', paddingHorizontal: 30 },
  detailTitleHi: { fontSize: 17, color: '#FFD700', marginTop: 4, textAlign: 'center' },
  detailDeity: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FFF', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100, marginTop: 14 },
  listenBtnText: { fontSize: 14, fontWeight: '800' },

  lyricsCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 18, padding: 20, borderWidth: 1 },
  lyricsText: { fontSize: 17.5, lineHeight: 34, fontWeight: '500' },
  meaningCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 16, borderWidth: 1 },
  meaningHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  meaningLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2 },
  meaningText: { fontSize: 13.5, lineHeight: 21 },
});
