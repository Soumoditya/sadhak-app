import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, BackHandler } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { remote } from '../constants/remoteImage';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useLayoutInsets } from '../constants/layout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BHOG_RECIPES, ALLERGENS, allergensOf, type BhogRecipe, type Allergen } from '../constants/recipes';
import { getFoodImage } from '../constants/foodImages';
import { Header } from '../components/ui';
import { toneSolid } from '../constants/theme';

export default function BhogScreen() {
  const { colors, isDark, tone } = useTheme();
  const { t: tr, tx, native, language } = useLanguage();
  const { headerPaddingTop, screenBottomPadding } = useLayoutInsets();
  const [query, setQuery] = useState('');
  const [recipe, setRecipe] = useState<BhogRecipe | null>(null);
  const [avoid, setAvoid] = useState<Allergen[]>([]);
  useEffect(() => {
    AsyncStorage.getItem('sadhak_bhog_avoid').then((v) => { if (v) setAvoid(JSON.parse(v)); }).catch(() => {});
  }, []);
  const toggleAvoid = (a: Allergen) => setAvoid((cur) => {
    const next = cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a];
    AsyncStorage.setItem('sadhak_bhog_avoid', JSON.stringify(next)).catch(() => {});
    return next;
  });
  const allergenLabel = (a: Allergen) => tx(ALLERGENS.find((x) => x.key === a)!.label);

  useEffect(() => {
    if (!recipe) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setRecipe(null); return true; });
    return () => sub.remove();
  }, [recipe]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const safe = BHOG_RECIPES.filter((r) => !allergensOf(r).some((a) => avoid.includes(a)));
    if (!q) return safe;
    // Match by name, occasion OR ingredient: "what can I make with sabudana?"
    return safe.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.nameHi.includes(q) ||
      r.occasion.toLowerCase().includes(q) ||
      r.ingredients.some(i => i.item.toLowerCase().includes(q)),
    );
  }, [query, avoid]);

  const surpriseMe = () => {
    const pool = filtered.length ? filtered : BHOG_RECIPES;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setRecipe(pick);
  };

  // ─── Detail ───
  if (recipe) {
    const heroImg = getFoodImage(recipe.id);
    return (
      <View style={[st.container, { backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: screenBottomPadding }}>
          <LinearGradient colors={[toneSolid(recipe.color), toneSolid(recipe.color) + 'B3']} style={[st.dHeader, { paddingTop: headerPaddingTop }]}>
            <TouchableOpacity style={st.dBack} onPress={() => setRecipe(null)} hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            {heroImg ? (
              <View style={st.dHeroImgWrap}>
                <ExpoImage
                  source={heroImg.local ?? remote(heroImg.url)}
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
            <Text style={st.dTitle}>{native(recipe.name, recipe.nameHi)}</Text>
            <View style={st.dMeta}>
              <View style={st.dChip}><MaterialCommunityIcons name="clock-outline" size={12} color="#FFF" /><Text style={st.dChipText}>{recipe.time}</Text></View>
              <View style={st.dChip}><MaterialCommunityIcons name="leaf" size={12} color="#FFF" /><Text style={st.dChipText}>{tx('No onion · No garlic')}</Text></View>
            </View>
            <Text style={st.dOccasion}>{tx(recipe.occasion)}</Text>
          </LinearGradient>

          {allergensOf(recipe).length > 0 && (
            <View style={[st.allergyNote, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.warning || '#B7791F'} />
              <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 12.5, lineHeight: 18 }}>
                <Text style={{ fontWeight: '800', color: colors.text }}>{tx('Contains')}: </Text>{allergensOf(recipe).map(allergenLabel).join(', ')}
              </Text>
            </View>
          )}

          {/* Ingredients */}
          <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={st.sectionHead}>
              <MaterialCommunityIcons name="basket-outline" size={17} color={colors.primary} />
              <Text style={[st.sectionTitle, { color: colors.text }]}>{tx('Ingredients')}</Text>
            </View>
            {recipe.ingredients.map((ing, i) => (
              <View key={i} style={[st.ingRow, i > 0 && { borderTopColor: colors.divider, borderTopWidth: 1 }]}>
                <Text style={[st.ingName, { color: colors.textSecondary }]}>{tx(ing.item)}</Text>
                <Text style={[st.ingQty, { color: colors.text }]}>{ing.qty}</Text>
              </View>
            ))}
          </View>

          {/* Steps */}
          <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={st.sectionHead}>
              <MaterialCommunityIcons name="chef-hat" size={17} color="#2D6A4F" />
              <Text style={[st.sectionTitle, { color: colors.text }]}>{tx('Method')}</Text>
            </View>
            {recipe.steps.map((s, i) => (
              <View key={i} style={st.stepRow}>
                <View style={[st.stepNo, { backgroundColor: '#2D6A4F18' }]}>
                  <Text style={{ color: '#2D6A4F', fontWeight: '800', fontSize: 11 }}>{i + 1}</Text>
                </View>
                <Text style={[st.stepText, { color: colors.textSecondary }]}>{tx(s)}</Text>
              </View>
            ))}
          </View>

          {!!recipe.tips && (
            <View style={[st.tipCard, { backgroundColor: tone(recipe.color).bg, borderColor: tone(recipe.color).fg + '35' }]}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={tone(recipe.color).fg} />
              <Text style={[st.tipText, { color: colors.textSecondary }]}>{tx(recipe.tips)}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[st.watchBtn, { backgroundColor: toneSolid(recipe.color) }]}
            onPress={() => router.push({ pathname: '/play', params: { query: recipe.playQuery, title: recipe.name } })}
          >
            <MaterialCommunityIcons name="play-circle-outline" size={19} color="#FFF" />
            <Text style={st.watchBtnText}>{tx('Watch it being made')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── List ───
  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <Header
        title={tr('f.bhog')}
        subtitle={tx('No onion · No garlic')}
        right={
          <TouchableOpacity onPress={surpriseMe} accessibilityLabel={tx('Surprise me')} style={[st.randomBtn, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]} hitSlop={6}>
            <MaterialCommunityIcons name="dice-5-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      <View style={[st.searchBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <Ionicons name="search" size={17} color={colors.textTertiary} />
        <TextInput
          style={[st.searchInput, { color: colors.text }]}
          placeholder={tx('Search dish, occasion, ingredient…')}
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={st.avoidRow}>
        <Text style={[st.avoidLabel, { color: colors.textTertiary }]}>{tx('Avoid')}</Text>
        {ALLERGENS.map((a) => {
          const on = avoid.includes(a.key);
          return (
            <TouchableOpacity key={a.key} onPress={() => toggleAvoid(a.key)} style={[st.avoidChip, { borderColor: on ? colors.error : colors.cardBorder, backgroundColor: on ? colors.error + '14' : colors.surface }]}>
              {on && <Ionicons name="close" size={13} color={colors.error} />}
              <Text style={[st.avoidText, { color: on ? colors.error : colors.textSecondary }]}>{tx(a.label)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[st.list, { paddingBottom: screenBottomPadding }]}>
        {filtered.length === 0 && (
          <Text style={{ color: colors.textTertiary, textAlign: 'center', marginTop: 40, fontSize: 13, paddingHorizontal: 20 }}>
            {query ? `${tx('Nothing matches')} "${query}". ${tx('Try an ingredient like makhana.')}` : tx('No recipes without these ingredients yet.')}
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
            <View style={[st.cardIcon, { backgroundColor: tone(r.color).bg }]}>
              {img ? (
                <ExpoImage
                  source={img.local ?? remote(img.url)}
                  placeholder={{ blurhash: img.blurhash }}
                  style={st.cardIconImg}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="disk"
                />
              ) : (
                <MaterialCommunityIcons name={r.icon as any} size={24} color={tone(r.color).fg} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.cardTitle, { color: colors.text }]}>{native(r.name, r.nameHi)}</Text>
              <Text style={[st.cardMeta, { color: colors.textTertiary }]} numberOfLines={1}>{tx(r.occasion)}</Text>
              {allergensOf(r).length > 0 && (
                <Text style={[st.cardAllergen, { color: colors.textTertiary }]} numberOfLines={1}>{tx('Contains')}: {allergensOf(r).map(allergenLabel).join(', ')}</Text>
              )}
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
  randomBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 20 },
  randomText: { fontSize: 12.5, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 44, marginHorizontal: 20, marginBottom: 4 },
  searchInput: { flex: 1, fontSize: 14 },

  list: { padding: 16, gap: 8 },
  avoidRow: { paddingHorizontal: 20, paddingTop: 10, gap: 6, alignItems: 'center' },
  avoidLabel: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginRight: 2 },
  avoidChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 11, height: 30, borderRadius: 15, borderWidth: 1 },
  avoidText: { fontSize: 12, fontWeight: '700' },
  cardAllergen: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  allergyNote: { flexDirection: 'row', gap: 8, alignItems: 'center', marginHorizontal: 16, marginTop: 12, borderRadius: 14, borderWidth: 1, padding: 12 },
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
