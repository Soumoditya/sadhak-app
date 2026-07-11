import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, BackHandler } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useLayoutInsets } from '../constants/layout';
import { BHOG_RECIPES, type BhogRecipe } from '../constants/recipes';
import { getFoodImage } from '../constants/foodImages';

export default function BhogScreen() {
  const { colors, isDark } = useTheme();
  const { headerPaddingTop, screenBottomPadding } = useLayoutInsets();
  const [query, setQuery] = useState('');
  const [recipe, setRecipe] = useState<BhogRecipe | null>(null);

  useEffect(() => {
    if (!recipe) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setRecipe(null); return true; });
    return () => sub.remove();
  }, [recipe]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BHOG_RECIPES;
    // Match by name, occasion OR ingredient — "what can I make with sabudana?"
    return BHOG_RECIPES.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.nameHi.includes(q) ||
      r.occasion.toLowerCase().includes(q) ||
      r.ingredients.some(i => i.item.toLowerCase().includes(q)),
    );
  }, [query]);

  const surpriseMe = () => {
    const pick = BHOG_RECIPES[Math.floor(Math.random() * BHOG_RECIPES.length)];
    setRecipe(pick);
  };

  // ─── Detail ───
  if (recipe) {
    const heroImg = getFoodImage(recipe.id);
    return (
      <View style={[st.container, { backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: screenBottomPadding }}>
          <LinearGradient colors={[recipe.color, recipe.color + 'B3']} style={[st.dHeader, { paddingTop: headerPaddingTop }]}>
            <TouchableOpacity style={st.dBack} onPress={() => setRecipe(null)} hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            {heroImg ? (
              <View style={st.dHeroImgWrap}>
                <ExpoImage
                  source={heroImg.local ?? { uri: heroImg.url }}
                  placeholder={{ blurhash: heroImg.blurhash }}
                  style={st.dHeroImg}
                  contentFit="cover"
                  transition={280}
                  cachePolicy="disk"
                />
              </View>
            ) : (
              <MaterialCommunityIcons name={recipe.icon as any} size={34} color="#FFD700" />
            )}
            <Text style={st.dTitle}>{recipe.name}</Text>
            <Text style={st.dTitleHi}>{recipe.nameHi}</Text>
            <View style={st.dMeta}>
              <View style={st.dChip}><MaterialCommunityIcons name="clock-outline" size={12} color="#FFF" /><Text style={st.dChipText}>{recipe.time}</Text></View>
              <View style={st.dChip}><MaterialCommunityIcons name="leaf" size={12} color="#FFF" /><Text style={st.dChipText}>No onion · No garlic</Text></View>
            </View>
            <Text style={st.dOccasion}>{recipe.occasion}</Text>
          </LinearGradient>

          {/* Ingredients */}
          <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={st.sectionHead}>
              <MaterialCommunityIcons name="basket-outline" size={17} color={colors.primary} />
              <Text style={[st.sectionTitle, { color: colors.text }]}>Ingredients</Text>
            </View>
            {recipe.ingredients.map((ing, i) => (
              <View key={i} style={[st.ingRow, i > 0 && { borderTopColor: colors.divider, borderTopWidth: 1 }]}>
                <Text style={[st.ingName, { color: colors.textSecondary }]}>{ing.item}</Text>
                <Text style={[st.ingQty, { color: colors.text }]}>{ing.qty}</Text>
              </View>
            ))}
          </View>

          {/* Steps */}
          <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={st.sectionHead}>
              <MaterialCommunityIcons name="chef-hat" size={17} color="#2D6A4F" />
              <Text style={[st.sectionTitle, { color: colors.text }]}>Method</Text>
            </View>
            {recipe.steps.map((s, i) => (
              <View key={i} style={st.stepRow}>
                <View style={[st.stepNo, { backgroundColor: '#2D6A4F18' }]}>
                  <Text style={{ color: '#2D6A4F', fontWeight: '800', fontSize: 11 }}>{i + 1}</Text>
                </View>
                <Text style={[st.stepText, { color: colors.textSecondary }]}>{s}</Text>
              </View>
            ))}
          </View>

          {!!recipe.tips && (
            <View style={[st.tipCard, { backgroundColor: recipe.color + '0E', borderColor: recipe.color + '35' }]}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={recipe.color} />
              <Text style={[st.tipText, { color: colors.textSecondary }]}>{recipe.tips}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[st.watchBtn, { backgroundColor: recipe.color }]}
            onPress={() => router.push({ pathname: '/play', params: { query: recipe.playQuery, title: recipe.name } })}
          >
            <MaterialCommunityIcons name="play-circle-outline" size={19} color="#FFF" />
            <Text style={st.watchBtnText}>Watch it being made</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── List ───
  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? [colors.surfaceElevated, colors.background] : ['#2D6A4F', '#40916C']}
        style={[st.header, { paddingTop: headerPaddingTop }]}
      >
        <View style={st.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={st.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={st.headerTitle}>Satvik Bhog</Text>
            <Text style={st.headerSub}>सात्विक भोग — no onion, no garlic</Text>
          </View>
          <TouchableOpacity onPress={surpriseMe} style={st.randomBtn} hitSlop={6}>
            <MaterialCommunityIcons name="dice-5-outline" size={18} color="#FFF" />
            <Text style={st.randomText}>Random</Text>
          </TouchableOpacity>
        </View>
        <View style={st.searchBar}>
          <Ionicons name="search" size={17} color="rgba(255,255,255,0.85)" />
          <TextInput
            style={st.searchInput}
            placeholder="Search dish, occasion, ingredient…"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={query}
            onChangeText={setQuery}
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[st.list, { paddingBottom: screenBottomPadding }]}>
        {filtered.length === 0 && (
          <Text style={{ color: colors.textTertiary, textAlign: 'center', marginTop: 40, fontSize: 13 }}>
            Nothing matches "{query}" — try an ingredient like "makhana".
          </Text>
        )}
        {filtered.map((r) => {
          const img = getFoodImage(r.id);
          return (
          <TouchableOpacity
            key={r.id}
            style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            onPress={() => setRecipe(r)}
            activeOpacity={0.75}
          >
            <View style={[st.cardIcon, { backgroundColor: r.color + '14' }]}>
              {img ? (
                <ExpoImage
                  source={img.local ?? { uri: img.url }}
                  placeholder={{ blurhash: img.blurhash }}
                  style={st.cardIconImg}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="disk"
                />
              ) : (
                <MaterialCommunityIcons name={r.icon as any} size={24} color={r.color} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.cardTitle, { color: colors.text }]}>{r.name} <Text style={{ color: r.color, fontSize: 13 }}>{r.nameHi}</Text></Text>
              <Text style={[st.cardMeta, { color: colors.textTertiary }]} numberOfLines={1}>{r.occasion}</Text>
            </View>
            <View style={[st.timeChip, { backgroundColor: colors.background }]}>
              <MaterialCommunityIcons name="clock-outline" size={11} color={colors.textTertiary} />
              <Text style={[st.timeText, { color: colors.textSecondary }]}>{r.time}</Text>
            </View>
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
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 21, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  randomBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100 },
  randomText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 13, paddingHorizontal: 12, height: 42, marginTop: 12 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 13.5 },

  list: { padding: 16, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 16, borderWidth: 1, gap: 12 },
  cardIcon: { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  cardIconImg: { width: '100%', height: '100%', borderRadius: 13 },
  cardTitle: { fontSize: 14.5, fontWeight: '800' },
  cardMeta: { fontSize: 11.5, marginTop: 2 },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  timeText: { fontSize: 10.5, fontWeight: '600' },

  dHeader: { paddingBottom: 20, alignItems: 'center', borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  dHeroImgWrap: { width: 120, height: 120, borderRadius: 24, borderWidth: 3, borderColor: 'rgba(255,255,255,0.55)', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.12)' },
  dHeroImg: { width: '100%', height: '100%', borderRadius: 24 },
  dBack: { position: 'absolute', left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  dTitle: { fontSize: 21, fontWeight: '800', color: '#FFF', marginTop: 8 },
  dTitleHi: { fontSize: 15, color: '#FFD700', marginTop: 2 },
  dMeta: { flexDirection: 'row', gap: 8, marginTop: 10 },
  dChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  dChipText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  dOccasion: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 8, paddingHorizontal: 30, textAlign: 'center' },

  section: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, borderWidth: 1, padding: 15 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 14.5, fontWeight: '800' },
  ingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9 },
  ingName: { flex: 1, fontSize: 13.5 },
  ingQty: { fontSize: 13, fontWeight: '700' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 8 },
  stepNo: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, fontSize: 13, lineHeight: 19 },

  tipCard: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginHorizontal: 16, marginTop: 12, borderRadius: 14, borderWidth: 1, padding: 13 },
  tipText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  watchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 14, paddingVertical: 14, borderRadius: 14 },
  watchBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});
