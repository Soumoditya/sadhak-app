import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, InteractionManager } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { calculatePanchang } from '../../services/panchang';
import { getDailyGroomingAdvice, getGroomingStatusColor } from '../../services/groomingRules';
import { getUpcomingObservances, type Observance } from '../../services/upcoming';
import { Screen, Icon, ToolTile, LanguageChip, ThemeToggle } from '../../components/ui';
import { TOOLS } from '../../constants/tools';
import { DS } from '../../constants/ds';

// ─── Rotating shlokas (one per day) ──────────────────────────────────
const SHLOKAS = [
  { text: 'योगः कर्मसु कौशलम्।', translation: 'Yoga is skill in action.', source: 'Bhagavad Gita 2.50' },
  { text: 'सत्यमेव जयते।', translation: 'Truth alone triumphs.', source: 'Mundaka Upanishad 3.1.6' },
  { text: 'वसुधैव कुटुम्बकम्।', translation: 'The world is one family.', source: 'Maha Upanishad 6.71' },
  { text: 'अहिंसा परमो धर्मः।', translation: 'Non-violence is the highest duty.', source: 'Mahabharata' },
  { text: 'तमसो मा ज्योतिर्गमय।', translation: 'Lead me from darkness to light.', source: 'Brihadaranyaka Upanishad 1.3.28' },
  { text: 'श्रद्धावान् लभते ज्ञानम्।', translation: 'The faithful attain knowledge.', source: 'Bhagavad Gita 4.39' },
  { text: 'ॐ सह नाववतु।', translation: 'May we be protected together.', source: 'Taittiriya Upanishad' },
];

const GRID_COLS = 4;

export default function HomeScreen() {
  const { profile } = useAuth();
  const { colors, tones, isDark } = useTheme();
  const { t, tf, locale, noTrack, display, language } = useLanguage();
  const today = new Date();
  const lat = profile?.location?.lat || 28.6139;
  const lng = profile?.location?.lng || 77.209;

  const panchang = useMemo(() => calculatePanchang(today, lat, lng), [today.toDateString(), lat, lng]);
  const grooming = useMemo(
    () => getDailyGroomingAdvice(today, profile?.gender || 'male', profile?.marriageStatus || 'unmarried', panchang.tithi.name),
    [panchang.tithi.name, profile?.gender, profile?.marriageStatus],
  );

  // Upcoming observances scan ~45 days of panchang; do it after first paint.
  const [upcoming, setUpcoming] = useState<Observance[] | null>(null);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      try { setUpcoming(getUpcomingObservances(new Date(), lat, lng, 3)); } catch { setUpcoming([]); }
    });
    return () => task.cancel();
  }, [today.toDateString(), lat, lng]);

  const shloka = SHLOKAS[today.getDate() % SHLOKAS.length];
  const firstName = profile?.displayName?.split(' ')[0] || 'Sadhak';
  const hour = today.getHours();
  const greeting = t(hour < 4 ? 'ui.greet.night' : hour < 12 ? 'ui.greet.morning' : hour < 17 ? 'ui.greet.day' : hour < 20 ? 'ui.greet.evening' : 'ui.greet.night');
  const groomingColor = getGroomingStatusColor(grooming.overallStatus);
  const groomingLabel = t(grooming.overallStatus === 'allowed' ? 'grooming.ok' : grooming.overallStatus === 'avoid' ? 'grooming.caution' : 'grooming.avoid');

  // Festival names exist in English and Hindi; lead with the one that
  // matches the reader's script.
  const deva = language === 'hi' || language === 'mr';
  const [gridW, setGridW] = useState(0);
  const tileW = gridW ? Math.floor(gridW / GRID_COLS) : 0;

  const hero = isDark ? (['#6E2A0C', '#2E160B'] as const) : (['#C2410C', '#E3732F'] as const);

  return (
    <Screen scroll tabbed edges={{ top: true, bottom: false }}>
      {/* ═══ Top bar: avatar + greeting, language + theme ═══ */}
      <View style={s.top}>
        <Pressable onPress={() => router.push('/(tabs)/profile')} accessibilityRole="button" accessibilityLabel={t('nav.profile')} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          {profile?.profilePicUrl ? (
            <Image source={{ uri: profile.profilePicUrl }} style={[s.avatar, { borderColor: colors.cardBorder }]} />
          ) : (
            <View style={[s.avatar, s.avatarFallback, { backgroundColor: tones.saffron.bg, borderColor: colors.cardBorder }]}>
              <Text style={[s.avatarText, { color: tones.saffron.fg }]}>{firstName[0]?.toUpperCase()}</Text>
            </View>
          )}
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.greeting, { color: colors.textTertiary }, noTrack]} numberOfLines={1}>{greeting}</Text>
          <Text style={[s.name, { color: colors.text }, display]} numberOfLines={1}>{firstName}</Text>
        </View>
        <View style={s.topRight}>
          <LanguageChip />
          <ThemeToggle />
        </View>
      </View>

      {/* ═══ Today hero ═══ */}
      <Pressable onPress={() => router.push('/panchang')} accessibilityRole="button" style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
        <LinearGradient colors={hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
          {/* Rising-sun rings, purely decorative */}
          <Svg width={220} height={220} style={s.heroRings} pointerEvents="none">
            {[105, 80, 55, 30].map((r, i) => (
              <Circle key={r} cx={160} cy={60} r={r} fill="#FFFFFF" opacity={0.05 + i * 0.025} />
            ))}
          </Svg>
          <Text style={[s.heroOver, noTrack]} numberOfLines={1}>
            {t('ui.today')} · {today.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <Text style={s.heroTithi} numberOfLines={1} adjustsFontSizeToFit>
            {panchang.tithi.nameHi}
          </Text>
          <Text style={s.heroSub} numberOfLines={1}>
            {panchang.hinduMonth.nameHi} {panchang.tithi.pakshaHi} · {panchang.nakshatra.nameHi}
          </Text>
          {language === 'en' && (
            <Text style={s.heroSubEn} numberOfLines={1}>
              {panchang.hinduMonth.name} · {panchang.tithi.paksha === 'shukla' ? 'Shukla' : 'Krishna'} {panchang.tithi.name}
            </Text>
          )}
          <View style={s.heroTimes}>
            <HeroTime icon="sun-horizon" label={t('ui.sunrise')} value={panchang.sunrise} />
            <HeroTime icon="moon-stars" label={t('ui.sunset')} value={panchang.sunset} />
            <HeroTime icon="warning" label={t('ui.rahuKaal')} value={`${panchang.rahuKaal.start.slice(0, 5)}–${panchang.rahuKaal.end.slice(0, 5)}`} />
          </View>
          <View style={s.heroCta}>
            <Text style={[s.heroCtaText, noTrack]}>{t('home.fullPanchang')}</Text>
            <Icon name="arrow-right" size={14} color="#FFFFFF" weight="regular" />
          </View>
        </LinearGradient>
      </Pressable>

      {/* ═══ Every tool, right here ═══ */}
      <View style={s.sectionHead}>
        <Text style={[s.sectionTitle, { color: colors.text }, display]}>{t('home.tools')}</Text>
        <Pressable onPress={() => router.push('/(tabs)/tools')} hitSlop={8} style={s.sectionAction}>
          <Text style={[s.sectionActionText, { color: colors.primary }]}>{t('home.allTools')}</Text>
          <Icon name="caret-right" size={13} color={colors.primary} weight="regular" />
        </Pressable>
      </View>
      <View
        style={[s.grid, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
        onLayout={(e) => setGridW(e.nativeEvent.layout.width - 16)}
      >
        {!!tileW && TOOLS.map((tool) => <ToolTile key={tool.key} tool={tool} width={tileW} />)}
      </View>

      {/* ═══ Coming up ═══ */}
      {upcoming && upcoming.length > 0 && (
        <>
          <View style={s.sectionHead}>
            <Text style={[s.sectionTitle, { color: colors.text }, display]}>{t('home.comingUp')}</Text>
            <Pressable onPress={() => router.push('/(tabs)/calendar')} hitSlop={8} style={s.sectionAction}>
              <Text style={[s.sectionActionText, { color: colors.primary }]}>{t('nav.calendar')}</Text>
              <Icon name="caret-right" size={13} color={colors.primary} weight="regular" />
            </Pressable>
          </View>
          <View style={[s.list, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            {upcoming.map((o, i) => {
              const tone = o.kind === 'festival' ? tones.kumkum : o.kind === 'ekadashi' ? tones.plum : o.kind === 'purnima' ? tones.haldi : tones.neel;
              const when = o.daysAway === 0 ? t('ui.today') : o.daysAway === 1 ? t('ui.tomorrow') : tf('home.inDays', { n: o.daysAway });
              return (
                <Pressable
                  key={o.name + o.date.toDateString()}
                  onPress={() => router.push('/(tabs)/calendar')}
                  style={({ pressed }) => [s.obs, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <View style={[s.obsDate, { backgroundColor: tone.bg }]}>
                    <Text style={[s.obsDay, { color: tone.fg }]}>{o.date.getDate()}</Text>
                    <Text style={[s.obsMon, { color: tone.fg }, noTrack]}>{o.date.toLocaleDateString(locale, { month: 'short' })}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.obsName, { color: colors.text }]} numberOfLines={1}>{deva ? o.nameHi : o.name}</Text>
                    <Text style={[s.obsSub, { color: colors.textTertiary }]} numberOfLines={1}>
                      {deva ? o.name : o.nameHi} · {o.date.toLocaleDateString(locale, { weekday: 'long' })}
                    </Text>
                  </View>
                  <View style={[s.obsWhen, { backgroundColor: o.daysAway <= 1 ? tone.bg : colors.surfaceSecondary }]}>
                    <Text style={[s.obsWhenText, { color: o.daysAway <= 1 ? tone.fg : colors.textSecondary }]}>{when}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {/* ═══ Today for you: grooming + jyotish ═══ */}
      <View style={s.pair}>
        <Pressable
          onPress={() => router.push('/(tabs)/calendar')}
          style={({ pressed }) => [s.pairCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[s.pairIcon, { backgroundColor: groomingColor + '1C' }]}>
            <Icon name="scissors" size={20} color={groomingColor} />
          </View>
          <Text style={[s.pairOver, { color: colors.textTertiary }, noTrack]} numberOfLines={1}>{t('home.grooming')}</Text>
          <Text style={[s.pairTitle, { color: groomingColor }]} numberOfLines={1}>{groomingLabel}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/jyotish')}
          style={({ pressed }) => [s.pairCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[s.pairIcon, { backgroundColor: tones.haldi.bg }]}>
            <Icon name="star-four" size={20} color={tones.haldi.fg} />
          </View>
          <Text style={[s.pairOver, { color: colors.textTertiary }, noTrack]} numberOfLines={1}>{t('f.jyotish')}</Text>
          <Text style={[s.pairTitle, { color: colors.text }]} numberOfLines={1}>
            {t(profile?.hasBirthChart ? 'home.myChart' : 'home.makeChart')}
          </Text>
        </Pressable>
      </View>

      {/* ═══ Shloka of the day ═══ */}
      <View style={[s.shloka, { backgroundColor: isDark ? colors.surface : '#FFF8EE', borderColor: isDark ? colors.cardBorder : '#F1DEC4' }]}>
        <Text style={[s.shlokaOm, { color: colors.primary }]}>ॐ</Text>
        <Text style={[s.shlokaLabel, { color: colors.primary }, noTrack]}>{t('home.shlokaOfDay')}</Text>
        <Text style={[s.shlokaText, { color: colors.text }]}>{shloka.text}</Text>
        <Text style={[s.shlokaTrans, { color: colors.textSecondary }]}>{shloka.translation}</Text>
        <Text style={[s.shlokaSrc, { color: colors.textTertiary }]}>{shloka.source}</Text>
      </View>
    </Screen>
  );
}

function HeroTime({ icon, label, value }: { icon: 'sun-horizon' | 'moon-stars' | 'warning'; label: string; value: string }) {
  const { noTrack } = useLanguage();
  return (
    <View style={s.heroTime}>
      <Icon name={icon} size={16} color="#FFFFFF" />
      <Text style={[s.heroTimeLabel, noTrack]} numberOfLines={1}>{label}</Text>
      <Text style={s.heroTimeValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, marginBottom: 18 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 19, fontWeight: '800' },
  greeting: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.4 },
  name: { fontSize: 24, lineHeight: 32 },
  topRight: { flexDirection: 'row', gap: 8 },

  hero: { borderRadius: 28, padding: 20, overflow: 'hidden' },
  heroRings: { position: 'absolute', top: -20, right: -40 },
  heroOver: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, fontWeight: '700', letterSpacing: 0.3 },
  heroTithi: { color: '#FFFFFF', fontSize: 42, lineHeight: 62, fontFamily: DS.font.deva, marginTop: 6 },
  heroSub: { color: 'rgba(255,255,255,0.92)', fontSize: 14.5, lineHeight: 22, fontFamily: DS.font.deva },
  heroSubEn: { color: 'rgba(255,255,255,0.72)', fontSize: 12.5, marginTop: 2 },
  heroTimes: { flexDirection: 'row', gap: 8, marginTop: 16 },
  heroTime: { flex: 1, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', gap: 2 },
  heroTimeLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 },
  heroTimeValue: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, alignSelf: 'flex-start' },
  heroCtaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
  sectionTitle: { fontSize: 20, lineHeight: 28 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { fontSize: 13, fontWeight: '800' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 24, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 8, rowGap: 6 },

  list: { borderRadius: 22, borderWidth: 1, paddingHorizontal: 14 },
  obs: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  obsDate: { width: 46, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  obsDay: { fontSize: 18, fontWeight: '800', lineHeight: 21 },
  obsMon: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  obsName: { fontSize: 15, fontWeight: '800' },
  obsSub: { fontSize: 12.5, marginTop: 2 },
  obsWhen: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  obsWhenText: { fontSize: 11.5, fontWeight: '800' },

  pair: { flexDirection: 'row', gap: 12, marginTop: 14 },
  pairCard: { flex: 1, borderRadius: 22, borderWidth: 1, padding: 14 },
  pairIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  pairOver: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  pairTitle: { fontSize: 15, fontWeight: '800', marginTop: 3 },

  shloka: { marginTop: 14, borderRadius: 24, borderWidth: 1, padding: 20, alignItems: 'center', overflow: 'hidden' },
  shlokaOm: { position: 'absolute', right: 14, top: -14, fontSize: 96, opacity: 0.07, fontFamily: DS.font.deva },
  shlokaLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  shlokaText: { fontSize: 24, lineHeight: 42, marginTop: 8, textAlign: 'center', fontFamily: DS.font.deva },
  shlokaTrans: { fontSize: 14, lineHeight: 21, marginTop: 4, textAlign: 'center' },
  shlokaSrc: { fontSize: 12, fontWeight: '700', marginTop: 8, textAlign: 'center' },
});
