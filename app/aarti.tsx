import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useLayoutInsets } from '../constants/layout';
import {
  DEVOTIONAL_CATEGORIES, getDevotionalByCategory,
  type DevotionalCategory, type DevotionalItem,
} from '../constants/devotional';
import { getDeityImage } from '../constants/deityImages';

export default function DevotionalScreen() {
  const { colors, isDark } = useTheme();
  const { headerPaddingTop, screenBottomPadding } = useLayoutInsets();
  const [category, setCategory] = useState<DevotionalCategory>('aarti');
  const [selected, setSelected] = useState<DevotionalItem | null>(null);

  // Hardware back closes the open text first (was popping the whole screen).
  useEffect(() => {
    if (!selected) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelected(null);
      return true;
    });
    return () => sub.remove();
  }, [selected]);

  const items = getDevotionalByCategory(category);

  const openPlayer = (item: DevotionalItem) =>
    router.push({ pathname: '/play', params: { query: item.playQuery, title: item.title } });

  // ─── Detail view ───
  if (selected) {
    const deityImg = getDeityImage(selected.deity);
    return (
      <View style={[st.container, { backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: screenBottomPadding }}>
          {/* Calm dark hero — deity color used only as a soft radial glow behind
              the candle emblem, not a wall of color. Keeps the app's dark aesthetic. */}
          <View style={[st.detailHero, { paddingTop: headerPaddingTop, backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={[st.detailBack, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              onPress={() => setSelected(null)}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>

            {/* Emblem: dark ambient panel with a soft radial glow behind
                the deity painting (or the candle fallback if no image). */}
            <View style={st.emblemWrap}>
              <View style={[st.emblemGlow, { backgroundColor: selected.color, opacity: 0.18 }]} />
              <View style={[st.emblemRing, { borderColor: selected.color + '66' }]} />
              <View style={[st.emblemCore, { backgroundColor: colors.surfaceElevated, borderColor: selected.color + '55' }]}>
                {deityImg ? (
                  <ExpoImage
                    source={{ uri: deityImg.url }}
                    placeholder={{ blurhash: deityImg.blurhash }}
                    style={st.emblemImage}
                    contentFit="cover"
                    transition={280}
                    cachePolicy="disk"
                  />
                ) : (
                  <MaterialCommunityIcons name="candle" size={34} color={selected.color} />
                )}
              </View>
            </View>

            <Text style={[st.detailTitle, { color: colors.text }]}>{selected.title}</Text>
            <Text style={[st.detailTitleHi, { color: selected.color }]}>{selected.titleHi}</Text>
            <Text style={[st.detailDeity, { color: colors.textTertiary }]}>{selected.deity}</Text>

            <TouchableOpacity style={[st.listenBtn, { backgroundColor: selected.color }]} onPress={() => openPlayer(selected)} activeOpacity={0.85}>
              <MaterialCommunityIcons name="play-circle" size={19} color="#FFF" />
              <Text style={st.listenBtnText}>Listen / Watch</Text>
            </TouchableOpacity>
          </View>

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
        {items.map((item) => {
          const img = getDeityImage(item.deity);
          return (
          <TouchableOpacity
            key={item.id}
            style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            onPress={() => setSelected(item)}
            activeOpacity={0.7}
          >
            {/* Deity avatar with a thin colored ring, or the category icon fallback */}
            <View style={[st.cardIcon, { backgroundColor: item.color + '18', borderColor: item.color + '55', borderWidth: 1 }]}>
              {img ? (
                <ExpoImage
                  source={{ uri: img.url }}
                  placeholder={{ blurhash: img.blurhash }}
                  style={st.cardIconImage}
                  contentFit="cover"
                  transition={220}
                  cachePolicy="disk"
                />
              ) : (
                <MaterialCommunityIcons
                  name={DEVOTIONAL_CATEGORIES.find(c => c.key === item.category)?.icon as any}
                  size={22} color={item.color}
                />
              )}
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
          );
        })}
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
  cardIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  cardIconImage: { width: '100%', height: '100%', borderRadius: 14 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardTitleHi: { fontSize: 13.5, lineHeight: 20, fontWeight: '600', marginTop: 2 },
  cardDeity: { fontSize: 11.5, marginTop: 2 },
  playBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  // Old header (kept for reference — now unused). New hero below.
  detailHeader: { paddingBottom: 24, alignItems: 'center', borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  // Redesigned hero — dark ambient, deity color only as a soft glow.
  detailHero: { paddingHorizontal: 24, paddingBottom: 28, alignItems: 'center', position: 'relative' },
  detailBack: { position: 'absolute', left: 16, top: undefined, marginTop: 6, width: 38, height: 38, borderRadius: 19, borderWidth: 1, justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start', zIndex: 2 },
  emblemWrap: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center', marginTop: 18, marginBottom: 18 },
  emblemGlow: { position: 'absolute', width: 160, height: 160, borderRadius: 80 },
  emblemRing: { position: 'absolute', width: 112, height: 112, borderRadius: 56, borderWidth: 1 },
  emblemCore: { width: 88, height: 88, borderRadius: 44, borderWidth: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  emblemImage: { width: '100%', height: '100%', borderRadius: 44 },
  detailTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center', paddingHorizontal: 12 },
  detailTitleHi: { fontSize: 17, lineHeight: 26, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  detailDeity: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 8 },
  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 100, marginTop: 20 },
  listenBtnText: { fontSize: 14.5, fontWeight: '800', color: '#FFF' },

  lyricsCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 18, padding: 20, borderWidth: 1 },
  lyricsText: { fontSize: 17.5, lineHeight: 34, fontWeight: '500' },
  meaningCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 16, borderWidth: 1 },
  meaningHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  meaningLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2 },
  meaningText: { fontSize: 13.5, lineHeight: 21 },
});
