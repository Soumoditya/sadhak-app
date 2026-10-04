import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { calculatePanchang } from '../../services/panchang';
import { getDailyGroomingAdvice, getGroomingStatusColor } from '../../services/groomingRules';
import { Screen, Card, Section, Diya } from '../../components/ui';
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

const QUICK_ACTIONS = [
  { key: 'panchang', label: 'Panchang', icon: 'calendar-clock', color: '#7C3AED', route: '/panchang' },
  { key: 'temples', label: 'Temples', icon: 'temple-hindu', color: '#1B7A42', route: '/temples' },
  { key: 'aarti', label: 'Aarti', icon: 'candle', color: '#EA580C', route: '/aarti' },
  { key: 'japa', label: 'Japa', icon: 'counter', color: '#1565C0', route: '/japa' },
];

const MORE_MODULES = [
  { key: 'ai', label: 'Sadhak AI', icon: 'sparkles', color: '#D94F00', route: '/ask' },
  { key: 'jyotish', label: 'Jyotish', icon: 'star-four-points', color: '#C49A2C', route: '/jyotish' },
  { key: 'vastu', label: 'Vastu', icon: 'compass-outline', color: '#7C3AED', route: '/compass' },
  { key: 'puja', label: 'Puja Guide', icon: 'flower-tulip', color: '#DC2626', route: '/puja-guide' },
  { key: 'bhog', label: 'Satvik Bhog', icon: 'food-variant', color: '#2D6A4F', route: '/bhog' },
  { key: 'ayurveda', label: 'Ayurveda', icon: 'leaf', color: '#1B7A42', route: '/ayurveda' },
  { key: 'wiki', label: 'Hindu Wiki', icon: 'book-education-outline', color: '#1565C0', route: '/wiki' },
  { key: 'wallpaper', label: 'Wallpapers', icon: 'image-multiple-outline', color: '#0EA5E9', route: '/wallpapers' },
  { key: 'notes', label: 'Notes', icon: 'note-edit-outline', color: '#37474F', route: '/notes' },
  { key: 'feed', label: 'Feed', icon: 'compass', color: '#F59E0B', route: '/feed' },
];

export default function HomeScreen() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const today = new Date();

  const panchang = useMemo(
    () => calculatePanchang(today, profile?.location?.lat || 28.6139, profile?.location?.lng || 77.209),
    [today.toDateString()],
  );
  const grooming = useMemo(
    () => getDailyGroomingAdvice(today, profile?.gender || 'male', profile?.marriageStatus || 'unmarried', panchang.tithi.name),
    [panchang.tithi.name],
  );

  const shloka = SHLOKAS[today.getDate() % SHLOKAS.length];
  const firstName = profile?.displayName?.split(' ')[0] || 'Sadhak';
  const hour = today.getHours();
  // Morning 4–11, afternoon 12–16 (Namaste), evening/Sandhya starts at dusk
  // (17), night from 20. Fixes "Shubh Sandhya" showing at 4:32pm.
  const timeGreeting = hour < 4 ? 'Shubh Ratri' : hour < 12 ? 'Shubh Prabhat' : hour < 17 ? 'Namaste' : hour < 20 ? 'Shubh Sandhya' : 'Shubh Ratri';
  const groomingColor = getGroomingStatusColor(grooming.overallStatus);
  // This pill is GROOMING guidance only (haircut/shave/nails per vaara) — not a
  // verdict on the whole day. Labelled + scissors-iconed so it reads that way.
  const groomingLabel = grooming.overallStatus === 'allowed' ? 'OK' : grooming.overallStatus === 'avoid' ? 'Caution' : 'Avoid';
  // 4-column launcher grid sized from the measured width, so tiles never
  // stretch (the old 3-col flexGrow grid blew the 10th tile up to full width).
  const [gridW, setGridW] = useState(0);
  const GAP = 10;
  const tileW = gridW ? Math.floor((gridW - GAP * 3) / 4) : 0;

  return (
    <Screen scroll tabbed edges={{ top: true, bottom: false }}>

      {/* ═══ 1. Header — greeting + avatar ═══ */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={[s.greeting, { color: colors.textTertiary }]}>{timeGreeting} 🙏</Text>
          <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>{firstName}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
          {profile?.profilePicUrl ? (
            <Image source={{ uri: profile.profilePicUrl }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback, { backgroundColor: colors.primary + '20' }]}>
              <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 18 }}>{firstName[0]?.toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ═══ 2. TODAY hero — the primary content of Home ═══ */}
      <Card onPress={() => router.push('/(tabs)/calendar')} style={{ marginTop: DS.space.md }}>
        <View style={s.todayHead}>
          <View style={[s.todayIcon, { backgroundColor: colors.primary + '18' }]}>
            <MaterialCommunityIcons name="white-balance-sunny" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.todayLabel, { color: colors.textTertiary }]}>TODAY</Text>
            <Text style={[s.todayDate, { color: colors.text }]}>
              {today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <View style={[s.statusPill, { backgroundColor: groomingColor + '18', borderColor: groomingColor + '35' }]}>
            <MaterialCommunityIcons name="content-cut" size={11} color={groomingColor} />
            <Text style={[s.statusText, { color: groomingColor }]}>{groomingLabel}</Text>
          </View>
        </View>

        <Text style={[s.hinduDate, { color: colors.text }]}>
          {panchang.hinduMonth.nameHi} {panchang.tithi.pakshaHi} {panchang.tithi.nameHi}
        </Text>
        <Text style={[s.nakYoga, { color: colors.textSecondary }]}>
          {panchang.nakshatra.nameHi} · {panchang.yoga.nameHi}
        </Text>

        <View style={[s.timeRow, { borderTopColor: colors.divider }]}>
          <View style={s.timeCol}>
            <MaterialCommunityIcons name="weather-sunset-up" size={15} color="#FF8C00" />
            <Text style={[s.timeLabel, { color: colors.textTertiary }]}>Sunrise</Text>
            <Text style={[s.timeValue, { color: colors.text }]}>{panchang.sunrise}</Text>
          </View>
          <View style={s.timeCol}>
            <MaterialCommunityIcons name="weather-sunset-down" size={15} color="#7C3AED" />
            <Text style={[s.timeLabel, { color: colors.textTertiary }]}>Sunset</Text>
            <Text style={[s.timeValue, { color: colors.text }]}>{panchang.sunset}</Text>
          </View>
          <View style={s.timeCol}>
            <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#EF4444" />
            <Text style={[s.timeLabel, { color: colors.textTertiary }]}>Rahu Kaal</Text>
            <Text style={[s.timeValue, { color: '#EF4444' }]}>{panchang.rahuKaal.start.slice(0, 5)}–{panchang.rahuKaal.end.slice(0, 5)}</Text>
          </View>
        </View>
      </Card>

      {/* ═══ 2b. Personal Jyotish entry ═══ */}
      <TouchableOpacity
        onPress={() => router.push('/jyotish')}
        activeOpacity={0.85}
        style={[s.astro, { backgroundColor: isDark ? '#C49A2C14' : '#C49A2C10', borderColor: '#C49A2C40' }]}
      >
        <View style={[s.astroIcon, { backgroundColor: '#C49A2C22' }]}>
          <MaterialCommunityIcons name="star-four-points" size={20} color="#C49A2C" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.astroTitle, { color: colors.text }]}>
            {profile?.hasBirthChart ? "Your day in the stars" : 'Discover your birth chart'}
          </Text>
          <Text style={[s.astroSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {profile?.hasBirthChart ? "Today's guidance from your kundli" : 'Free Vedic kundli, dasha & daily guidance'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </TouchableOpacity>

      {/* ═══ 3. Quick actions — 4 primary tiles ═══ */}
      <Section title="Quick Access" compact>
        <View style={s.quickGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.key}
              style={[s.quick, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.85}
            >
              <View style={[s.quickIcon, { backgroundColor: a.color + '18' }]}>
                {a.icon === 'candle' ? (
                  <Diya size={24} color={a.color} />
                ) : (
                  <MaterialCommunityIcons name={a.icon as any} size={22} color={a.color} />
                )}
              </View>
              <Text style={[s.quickLabel, { color: colors.text }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      {/* ═══ 4. Shloka of the day ═══ */}
      <Card style={{ marginTop: DS.layout.sectionGap, borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 20 }}>
        <Text style={[s.shlokaLabel, { color: colors.primary }]}>SHLOKA OF THE DAY</Text>
        <Text style={[s.shlokaText, { color: colors.text }]}>{shloka.text}</Text>
        <Text style={[s.shlokaTrans, { color: colors.textSecondary }]}>{shloka.translation}</Text>
        <Text style={[s.shlokaSrc, { color: colors.textTertiary }]}>— {shloka.source}</Text>
      </Card>

      {/* ═══ 5. More — full feature tiles ═══ */}
      <Section title="More">
        <View style={[s.moreGrid, { gap: GAP }]} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
          {!!tileW && MORE_MODULES.map((a) => (
            <TouchableOpacity
              key={a.key}
              style={[s.moreItem, { width: tileW, backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.85}
            >
              <View style={[s.moreIcon, { backgroundColor: a.color + '18' }]}>
                {a.key === 'ai' ? (
                  <Ionicons name="sparkles" size={22} color={a.color} />
                ) : (
                  <MaterialCommunityIcons name={a.icon as any} size={22} color={a.color} />
                )}
              </View>
              <Text style={[s.moreLabel, { color: colors.text }]} numberOfLines={1}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

    </Screen>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 12 },
  greeting: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  name: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4, marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },

  // Today hero
  todayHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  todayLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2 },
  todayDate: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11.5, fontWeight: '800' },
  hinduDate: { fontSize: 17, fontWeight: '700', marginTop: 14 },
  nakYoga: { fontSize: 13.5, marginTop: 4 },
  timeRow: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  timeCol: { flex: 1, alignItems: 'center', gap: 3 },
  timeLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  timeValue: { fontSize: 13, fontWeight: '700' },

  // Quick tiles
  quickGrid: { flexDirection: 'row', gap: 10 },
  quick: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: DS.radius.lg, borderWidth: 1, gap: 8 },
  quickIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '700' },

  // Shloka
  shlokaLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2 },
  // No italic: Devanagari has no true italic, so it renders as a synthetic slant.
  shlokaText: { fontSize: 21, fontWeight: '700', lineHeight: 36, marginTop: 8 },
  shlokaTrans: { fontSize: 13.5, lineHeight: 20, marginTop: 6 },
  shlokaSrc: { fontSize: 11.5, fontWeight: '600', marginTop: 6 },

  // More grid
  moreGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  moreItem: { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderRadius: DS.radius.lg, borderWidth: 1, gap: 8 },
  moreIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  moreLabel: { fontSize: 11.5, fontWeight: '700' },

  // Jyotish entry
  astro: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: DS.space.md, padding: 14, borderRadius: DS.radius.lg, borderWidth: 1 },
  astroIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  astroTitle: { fontSize: 15, fontWeight: '800' },
  astroSub: { fontSize: 12.5, marginTop: 2 },
});
