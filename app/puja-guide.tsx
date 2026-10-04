import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { remote } from '../constants/remoteImage';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useLayoutInsets } from '../constants/layout';
import { PUJA_GUIDES, type PujaGuide } from '../constants/pujaGuides';
import { Diya } from '../components/ui';
import { resolveDeityImage } from '../constants/deityImages';
import { Header } from '../components/ui';

export default function PujaGuideScreen() {
  const { colors, isDark } = useTheme();
  const { t: tr } = useLanguage();
  const { headerPaddingTop, screenBottomPadding } = useLayoutInsets();
  const [guide, setGuide] = useState<PujaGuide | null>(null);

  useEffect(() => {
    if (!guide) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setGuide(null); return true; });
    return () => sub.remove();
  }, [guide]);

  // ─── Detail ───
  if (guide) {
    const heroImg = resolveDeityImage(guide.deity);
    return (
      <View style={[st.container, { backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: screenBottomPadding }}>
          <LinearGradient colors={[guide.color, guide.color + 'B3']} style={[st.dHeader, { paddingTop: headerPaddingTop }]}>
            <TouchableOpacity style={st.dBack} onPress={() => setGuide(null)} hitSlop={8}>
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
              <MaterialCommunityIcons name={guide.icon as any} size={36} color="#FFD700" />
            )}
            <Text style={st.dTitle}>{guide.deity}</Text>
            <Text style={st.dTitleHi}>{guide.deityHi}</Text>
            <View style={st.dDayChip}>
              <MaterialCommunityIcons name="calendar-star" size={13} color="#FFF" />
              <Text style={st.dDayText}>{guide.day}</Text>
            </View>
          </LinearGradient>

          {/* Samagri checklist */}
          <Section title="Samagri — what you need" icon="basket-outline" color={colors.primary} colors={colors}>
            {guide.samagri.map((s, i) => (
              <Row key={i} icon="checkbox-blank-circle-outline" color={colors.primary} text={s} colors={colors} />
            ))}
          </Section>

          {/* Offerings */}
          <Section title="Favourite offerings" icon="flower-outline" color="#2D6A4F" colors={colors}>
            {guide.offerings.map((s, i) => (
              <Row key={i} icon="heart-outline" color="#2D6A4F" text={s} colors={colors} />
            ))}
          </Section>

          {/* Strictly avoid */}
          <Section title="Strictly avoid" icon="cancel" color={colors.festival} colors={colors} accent>
            {guide.strictlyAvoid.map((s, i) => (
              <Row key={i} icon="close-circle-outline" color={colors.festival} text={s} colors={colors} />
            ))}
          </Section>

          {/* Vidhi steps */}
          <Section title="Puja vidhi — step by step" icon="format-list-numbered" color="#7C3AED" colors={colors}>
            {guide.steps.map((s, i) => (
              <View key={i} style={st.stepRow}>
                <View style={[st.stepNo, { backgroundColor: '#7C3AED18' }]}>
                  <Text style={{ color: '#7C3AED', fontWeight: '800', fontSize: 11 }}>{i + 1}</Text>
                </View>
                <Text style={[st.rowText, { color: colors.textSecondary }]}>{s}</Text>
              </View>
            ))}
          </Section>

          {/* Mantra */}
          <View style={[st.mantraCard, { backgroundColor: guide.color + '0E', borderColor: guide.color + '35' }]}>
            <Text style={[st.mantraLabel, { color: guide.color }]}>MOOL MANTRA</Text>
            <Text style={[st.mantraText, { color: colors.text }]}>{guide.mantra}</Text>
          </View>

          {/* Actions */}
          <View style={st.actions}>
            <TouchableOpacity
              style={[st.actionBtn, { backgroundColor: guide.color }]}
              onPress={() => router.push({ pathname: '/play', params: { query: guide.playQuery, title: `${guide.deity} Puja` } })}
            >
              <MaterialCommunityIcons name="play-circle-outline" size={18} color="#FFF" />
              <Text style={st.actionBtnText}>Watch vidhi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.actionBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }]}
              onPress={() => router.push('/aarti')}
            >
              <Diya size={20} color={colors.primary} />
              <Text style={[st.actionBtnText, { color: colors.text }]}>Aarti & mantra</Text>
            </TouchableOpacity>
          </View>

          <Text style={[st.note, { color: colors.textTertiary }]}>
            Traditions vary by region and family — your kula-parampara comes first. 🙏
          </Text>
        </ScrollView>
      </View>
    );
  }

  // ─── Deity grid ───
  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <Header title={tr('f.puja')} subtitle="किसकी पूजा करनी है? Choose the deity" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[st.grid, { paddingBottom: screenBottomPadding }]}>
        {PUJA_GUIDES.map((g) => {
          const img = resolveDeityImage(g.deity);
          return (
          <TouchableOpacity
            key={g.id}
            style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            onPress={() => setGuide(g)}
            activeOpacity={0.75}
          >
            <View style={[st.cardIcon, { backgroundColor: g.color + '14', borderColor: g.color + '44', borderWidth: img ? 1 : 0 }]}>
              {img ? (
                <ExpoImage
                  source={img.local ?? remote(img.url)}
                  placeholder={{ blurhash: img.blurhash }}
                  style={st.cardIconImg}
                  contentFit="cover"
                  transition={220}
                  cachePolicy="disk"
                />
              ) : (
                <MaterialCommunityIcons name={g.icon as any} size={26} color={g.color} />
              )}
            </View>
            <Text style={[st.cardTitle, { color: colors.text }]} numberOfLines={1}>{g.deity.replace('Lord ', '').replace('Goddess ', '').replace('Maa ', '')}</Text>
            <Text style={[st.cardHi, { color: g.color }]}>{g.deityHi}</Text>
            <Text style={[st.cardDay, { color: colors.textTertiary }]} numberOfLines={1}>{g.day}</Text>
          </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Section({ title, icon, color, colors, accent, children }: any) {
  return (
    <View style={[st.section, { backgroundColor: colors.surface, borderColor: accent ? color + '55' : colors.cardBorder }]}>
      <View style={st.sectionHead}>
        <MaterialCommunityIcons name={icon} size={17} color={color} />
        <Text style={[st.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({ icon, color, text, colors }: any) {
  return (
    <View style={st.row}>
      <MaterialCommunityIcons name={icon} size={14} color={color} style={{ marginTop: 2 }} />
      <Text style={[st.rowText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 21, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 },
  card: { flexBasis: '47%', flexGrow: 1, alignItems: 'center', padding: 16, borderRadius: 18, borderWidth: 1 },
  cardIcon: { width: 54, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8, overflow: 'hidden' },
  cardIconImg: { width: '100%', height: '100%', borderRadius: 16 },
  cardTitle: { fontSize: 14.5, fontWeight: '800' },
  cardHi: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  cardDay: { fontSize: 10.5, marginTop: 4 },

  dHeader: { paddingBottom: 22, alignItems: 'center', borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  dHeroImgWrap: { width: 92, height: 92, borderRadius: 46, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.15)' },
  dHeroImg: { width: '100%', height: '100%', borderRadius: 46 },
  dBack: { position: 'absolute', left: 16, top: 0, marginTop: 0, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  dTitle: { fontSize: 21, fontWeight: '800', color: '#FFF', marginTop: 8 },
  dTitleHi: { fontSize: 15, color: '#FFD700', marginTop: 2 },
  dDayChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, marginTop: 10 },
  dDayText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  section: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, borderWidth: 1, padding: 15 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  sectionTitle: { fontSize: 14.5, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 5 },
  rowText: { flex: 1, fontSize: 13, lineHeight: 19 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 8 },
  stepNo: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 0 },

  mantraCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, borderWidth: 1, padding: 16 },
  mantraLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  mantraText: { fontSize: 16, lineHeight: 28, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 14 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 14 },
  actionBtnText: { color: '#FFF', fontSize: 13.5, fontWeight: '800' },
  note: { textAlign: 'center', fontSize: 11.5, marginTop: 16, paddingHorizontal: 40, lineHeight: 16 },
});
