import React, { useMemo, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
  Animated, Image, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { calculatePanchang, type PanchangData } from '../../services/panchang';
import { getDailyGroomingAdvice, getGroomingStatusColor, type DailyGroomingAdvice } from '../../services/groomingRules';
import { useLayoutInsets } from '../../constants/layout';

const { width: SCREEN_W } = Dimensions.get('window');

const SHLOKAS = [
  { text: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।', translation: 'You have the right to perform your duty, but not to the fruits of your actions.', source: 'Bhagavad Gita 2.47' },
  { text: 'यदा यदा हि धर्मस्य ग्लानिर्भवति भारत।', translation: 'Whenever there is a decline in righteousness, O Arjuna, I manifest myself.', source: 'Bhagavad Gita 4.7' },
  { text: 'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।', translation: 'Abandon all varieties of dharma and surrender unto Me alone.', source: 'Bhagavad Gita 18.66' },
  { text: 'वसुधैव कुटुम्बकम्।', translation: 'The whole world is one family.', source: 'Maha Upanishad 6.71' },
  { text: 'अहिंसा परमो धर्मः।', translation: 'Non-violence is the highest duty.', source: 'Mahabharata' },
  { text: 'सत्यमेव जयते नानृतं।', translation: 'Truth alone triumphs, not falsehood.', source: 'Mundaka Upanishad 3.1.6' },
  { text: 'योगः कर्मसु कौशलम्।', translation: 'Yoga is skill in action.', source: 'Bhagavad Gita 2.50' },
  { text: 'तमसो मा ज्योतिर्गमय।', translation: 'Lead me from darkness to light.', source: 'Brihadaranyaka Upanishad 1.3.28' },
  { text: 'श्रद्धावान् लभते ज्ञानम्।', translation: 'The one with faith attains knowledge.', source: 'Bhagavad Gita 4.39' },
  { text: 'उद्धरेदात्मनात्मानं नात्मानमवसादयेत्।', translation: 'Elevate yourself through the power of your mind, and do not degrade yourself.', source: 'Bhagavad Gita 6.5' },
  { text: 'ॐ सह नाववतु। सह नौ भुनक्तु।', translation: 'May we be protected together, may we be nourished together.', source: 'Taittiriya Upanishad' },
  { text: 'मनः एव मनुष्याणां कारणं बन्धमोक्षयोः।', translation: 'The mind alone is the cause of bondage and liberation of humans.', source: 'Amritabindu Upanishad' },
];

// ─── Today's Guidance Generator ─────────────────────────────────────────
interface DailyGuidance {
  toDo: string[];
  toAvoid: string[];
  observance: string | null;
  explanation: string;
}

function getTodaysGuidance(panchang: PanchangData, grooming: DailyGroomingAdvice): DailyGuidance {
  const dayOfWeek = panchang.vara.number;
  const tithiNum = panchang.tithi.number;
  const toDo: string[] = [];
  const toAvoid: string[] = [];
  let observance: string | null = null;
  let explanation = '';

  // Day-based guidance
  const dayGuidance: Record<number, { toDo: string[]; toAvoid: string[]; deity: string }> = {
    0: { toDo: ['Offer Arghya to Surya Dev', 'Wear red/orange clothes', 'Donate wheat or jaggery'], toAvoid: ['Oil hair massage', 'Eating non-veg'], deity: 'Surya Dev' },
    1: { toDo: ['Visit Shiva temple', 'Offer Bel patra', 'Chant Om Namah Shivaya', 'Fast for Lord Shiva'], toAvoid: ['Eating non-veg', 'Consuming alcohol'], deity: 'Lord Shiva' },
    2: { toDo: ['Visit Hanuman temple', 'Offer jasmine oil to Hanuman ji', 'Chant Hanuman Chalisa', 'Wear red clothes'], toAvoid: ['Grooming (haircut, shaving, nails)', 'Starting new ventures'], deity: 'Lord Hanuman' },
    3: { toDo: ['Worship Lord Ganesh', 'Offer Durva grass', 'Study and learning activities', 'Chant Ganesh mantra'], toAvoid: ['Unnecessary arguments', 'Wasting food'], deity: 'Lord Ganesh' },
    4: { toDo: ['Visit Vishnu temple', 'Offer Tulsi to Lord Vishnu', 'Chant Vishnu Sahasranama', 'Donate bananas'], toAvoid: ['Washing hair (some traditions)', 'Eating tamasic food'], deity: 'Lord Vishnu' },
    5: { toDo: ['Worship Maa Lakshmi/Santoshi Maa', 'Donate white items', 'Offer white flowers', 'Chant Lakshmi mantra'], toAvoid: ['Consuming sour foods (Santoshi vrat)', 'Starting legal matters'], deity: 'Maa Lakshmi' },
    6: { toDo: ['Visit Shani temple', 'Offer mustard oil', 'Donate to the needy', 'Light sesame oil lamp'], toAvoid: ['Grooming (haircut)', 'Buying iron/steel items', 'Starting new projects'], deity: 'Shani Dev' },
  };

  const dayInfo = dayGuidance[dayOfWeek] || dayGuidance[0];
  toDo.push(...dayInfo.toDo);
  toAvoid.push(...dayInfo.toAvoid);

  // Tithi-based special observances
  if (tithiNum === 11 || tithiNum === 26) { // Ekadashi
    observance = 'Ekadashi Vrat 🙏';
    toDo.push('Observe Ekadashi fast');
    toDo.push('Chant Vishnu mantras');
    toAvoid.push('Eating grains and rice');
    explanation = `Today is ${panchang.tithi.nameHi} — a sacred Ekadashi. Fasting on this day is considered highly meritorious and pleases Lord Vishnu.`;
  } else if (tithiNum === 4 || tithiNum === 19) { // Chaturthi
    observance = 'Vinayaka Chaturthi';
    toDo.push('Worship Lord Ganesh');
    explanation = `Today is ${panchang.tithi.nameHi}. Offer modak and prayers to Lord Ganesh for removal of obstacles.`;
  } else if (tithiNum === 14 || tithiNum === 29) { // Chaturdashi
    observance = 'Shivratri';
    toDo.push('Worship Lord Shiva');
    explanation = `Today is ${panchang.tithi.nameHi}. Offer Bilva patra and milk to Lord Shiva for blessings.`;
  } else if (tithiNum === 15) { // Purnima
    observance = 'Purnima (Full Moon) 🌕';
    toDo.push('Offer prayers to the Moon');
    toDo.push('Donate food and clothes');
    explanation = `Today is Purnima — the full moon day. An auspicious day for charity, meditation, and sattvic living.`;
  } else if (tithiNum === 30) { // Amavasya
    observance = 'Amavasya (New Moon) 🌑';
    toDo.push('Offer Tarpan to ancestors (Pitru)');
    toAvoid.push('Starting new ventures');
    toAvoid.push('Travelling long distances');
    explanation = `Today is Amavasya — the new moon day. Ideal for Pitru Tarpan and introspection. Avoid starting new work.`;
  } else {
    explanation = `Today is ${panchang.vara.nameHi} — dedicated to ${dayInfo.deity}. ${panchang.hinduMonth.nameHi} ${panchang.tithi.pakshaHi} ${panchang.tithi.nameHi}.`;
  }

  // Add grooming status as avoidance
  if (grooming.overallStatus === 'forbidden') {
    toAvoid.push('All grooming (haircut, shaving, nails)');
  } else if (grooming.overallStatus === 'avoid') {
    toAvoid.push('Grooming activities (caution advised)');
  }

  return { toDo: toDo.slice(0, 5), toAvoid: toAvoid.slice(0, 4), observance, explanation };
}

// ─── Component ─────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { headerPaddingTop, tabContentPadding } = useLayoutInsets();

  const today = new Date();
  const panchang = useMemo(() => {
    const lat = profile?.location?.lat || 28.6139;
    const lon = profile?.location?.lng || 77.209;
    return calculatePanchang(today, lat, lon);
  }, [today.toDateString()]);

  const grooming = useMemo(() => {
    return getDailyGroomingAdvice(today, profile?.gender || 'male', profile?.marriageStatus || 'unmarried', panchang.tithi.name);
  }, [today.toDateString(), profile?.gender, profile?.marriageStatus]);

  const todayShloka = SHLOKAS[today.getDate() % SHLOKAS.length];
  const greetingName = profile?.displayName?.split(' ')[0] || 'Sadhak';
  const guidance = useMemo(() => getTodaysGuidance(panchang, grooming), [panchang, grooming]);
  const groomingColor = getGroomingStatusColor(grooming.overallStatus);

  const quickActions = [
    { icon: 'calendar-month-outline', label: t('nav.calendar'), route: '/(tabs)/calendar', color: '#D94F00' },
    { icon: 'calendar-clock', label: t('feat.panchang'), route: '/panchang', color: '#7C3AED' },
    { icon: 'map-marker-radius', label: t('feat.temples'), route: '/temples', color: '#1B7A42' },
    { icon: 'counter', label: t('feat.japa'), route: '/japa', color: '#1565C0' },
    { icon: 'music-note', label: t('feat.aarti'), route: '/aarti', color: '#EA580C' },
    { icon: 'note-edit-outline', label: t('feat.notes'), route: '/notes', color: '#37474F' },
  ];

  // Staggered entrance animations
  const NUM_SECTIONS = 7;
  const fadeAnims = useRef([...Array(NUM_SECTIONS)].map(() => new Animated.Value(0))).current;
  const slideAnims = useRef([...Array(NUM_SECTIONS)].map(() => new Animated.Value(25))).current;

  useEffect(() => {
    fadeAnims.forEach((anim, i) => {
      Animated.parallel([
        Animated.timing(anim, { toValue: 1, duration: 400, delay: i * 70 + 150, useNativeDriver: true }),
        Animated.spring(slideAnims[i], { toValue: 0, friction: 8, tension: 65, delay: i * 70 + 150, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const Section = ({ index, children }: { index: number; children: React.ReactNode }) => (
    <Animated.View style={{ opacity: fadeAnims[index], transform: [{ translateY: slideAnims[index] }], marginHorizontal: 20, marginTop: index === 0 ? 16 : 12 }}>
      {children}
    </Animated.View>
  );

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabContentPadding }}>

        {/* ═══ 1. Header — Namaste + Name ═══ */}
        <LinearGradient
          colors={isDark ? [colors.surfaceElevated, colors.background] : ['#D94F00', '#F07830', '#F5A623']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[s.header, { paddingTop: headerPaddingTop }]}
        >
          <View style={s.headerTop}>
            <View style={s.headerLeft}>
              <Image source={require('../../assets/images/icon.png')} style={s.headerIcon} resizeMode="contain" />
              <View>
                <Text style={[s.greeting, { color: isDark ? colors.primary : 'rgba(255,255,255,0.85)' }]}>
                  {t('home.greeting')} 🙏
                </Text>
                <Text style={[s.greetingName, { color: isDark ? colors.text : '#FFF' }]}>
                  {greetingName}
                </Text>
              </View>
            </View>
            {profile?.role === 'admin' && (
              <TouchableOpacity style={s.adminBadge} onPress={() => router.push('/admin')} activeOpacity={0.7}>
                <MaterialCommunityIcons name="shield-crown-outline" size={16} color="#E8C34A" />
              </TouchableOpacity>
            )}
          </View>

          {/* Hindu date bar */}
          <View style={[s.hinduDateBar, { backgroundColor: isDark ? 'rgba(240,120,48,0.06)' : 'rgba(255,255,255,0.14)' }]}>
            <Text style={[s.hinduDate, { color: isDark ? colors.text : '#FFF' }]}>
              {panchang.hinduMonth.nameHi} • {panchang.tithi.pakshaHi} {panchang.tithi.nameHi}
            </Text>
            <Text style={[s.hinduDateSub, { color: isDark ? colors.textSecondary : 'rgba(255,255,255,0.7)' }]}>
              {panchang.vara.nameHi} • {panchang.nakshatra.nameHi}
            </Text>
          </View>
        </LinearGradient>

        {/* ═══ 2. Shloka of the Day ═══ */}
        <Section index={0}>
          <LinearGradient
            colors={isDark ? [colors.surfaceElevated, colors.surface] : ['#FFF8F0', '#FFF0E0']}
            style={[s.shlokaCard, { borderColor: colors.gold + '30' }]}
          >
            <View style={s.shlokaHeader}>
              <MaterialCommunityIcons name="book-open-variant" size={16} color={colors.gold} />
              <Text style={[s.shlokaLabel, { color: colors.gold }]}>{t('home.shloka').toUpperCase()}</Text>
            </View>
            <Text style={[s.shlokaText, { color: colors.text }]}>"{todayShloka.text}"</Text>
            <Text style={[s.shlokaTranslation, { color: colors.textSecondary }]}>{todayShloka.translation}</Text>
            <Text style={[s.shlokaSource, { color: colors.gold }]}>— {todayShloka.source}</Text>
          </LinearGradient>
        </Section>

        {/* ═══ 3. Quick Actions ═══ */}
        <Section index={1}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>{t('home.quickActions')}</Text>
          <View style={s.quickGrid}>
            {quickActions.map((action, idx) => (
              <TouchableOpacity
                key={idx}
                style={[s.quickCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[action.color, action.color + 'BB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[s.quickIcon, { shadowColor: action.color }]}
                >
                  <MaterialCommunityIcons name={action.icon as any} size={24} color="#FFF" />
                </LinearGradient>
                <Text style={[s.quickLabel, { color: colors.text }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* ═══ 4. Full Panchang ═══ */}
        <Section index={2}>
          <TouchableOpacity onPress={() => router.push('/panchang')} activeOpacity={0.7}>
            <View style={[s.panchangCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={s.panchangHeader}>
                <MaterialCommunityIcons name="calendar-star" size={20} color={colors.primary} />
                <Text style={[s.panchangTitle, { color: colors.text }]}>{t('home.today')}</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textTertiary} />
              </View>
              <View style={s.panchangGrid}>
                {[
                  { label: t('panch.tithi'), value: panchang.tithi.nameHi, sub: panchang.tithi.pakshaHi, icon: 'moon-waning-crescent', color: '#9C27B0' },
                  { label: t('panch.nakshatra'), value: panchang.nakshatra.nameHi, sub: panchang.nakshatra.lord, icon: 'star-four-points', color: '#FF6B00' },
                  { label: t('panch.yoga'), value: panchang.yoga.nameHi, sub: panchang.yoga.name, icon: 'yoga', color: '#2D6A4F' },
                  { label: t('panch.karana'), value: panchang.karana.nameHi, sub: panchang.karana.name, icon: 'circle-half-full', color: '#1565C0' },
                ].map((item, idx) => (
                  <View key={idx} style={[s.panchangItem, { backgroundColor: item.color + '08', borderColor: item.color + '18' }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
                    <Text style={[s.panchangLabel, { color: colors.textTertiary }]}>{item.label}</Text>
                    <Text style={[s.panchangValue, { color: colors.text }]} numberOfLines={1}>{item.value}</Text>
                    <Text style={[s.panchangSub, { color: colors.textTertiary }]} numberOfLines={1}>{item.sub}</Text>
                  </View>
                ))}
              </View>
              {/* Vara row */}
              <View style={[s.varaRow, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '15' }]}>
                <MaterialCommunityIcons name="calendar-today" size={16} color={colors.primary} />
                <Text style={[s.varaText, { color: colors.text }]}>{panchang.vara.nameHi}</Text>
                <Text style={[s.varaSub, { color: colors.textTertiary }]}>({panchang.vara.name} — {panchang.vara.deity})</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Section>

        {/* ═══ 5. Auspicious Timings ═══ */}
        <Section index={3}>
          <View style={[s.timingsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={s.timingsHeader}>
              <MaterialCommunityIcons name="clock-star-four-points-outline" size={18} color={colors.tulsiGreen || '#2D6A4F'} />
              <Text style={[s.timingsTitle, { color: colors.text }]}>Auspicious Timings</Text>
            </View>
            <View style={s.timingsGrid}>
              {[
                { icon: 'weather-sunset-up', label: t('panch.sunrise'), time: panchang.sunrise, color: '#FF8C00' },
                { icon: 'weather-sunset-down', label: t('panch.sunset'), time: panchang.sunset, color: '#7C3AED' },
                { icon: 'weather-night', label: t('panch.brahmaMuhurta'), time: `${panchang.brahmaMuhurta.start} – ${panchang.brahmaMuhurta.end}`, color: '#2D6A4F' },
                { icon: 'star-shooting', label: t('panch.abhijit'), time: `${panchang.abhijitMuhurta.start} – ${panchang.abhijitMuhurta.end}`, color: '#FFB300' },
              ].map((item, idx) => (
                <View key={idx} style={[s.timingItem, { backgroundColor: item.color + '08', borderColor: item.color + '20' }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
                  <Text style={[s.timingLabel, { color: colors.textTertiary }]}>{item.label}</Text>
                  <Text style={[s.timingTime, { color: item.color }]}>{item.time}</Text>
                </View>
              ))}
            </View>
            {/* Inauspicious warning */}
            <View style={[s.warningRow, { backgroundColor: '#EF4444' + '08', borderColor: '#EF4444' + '20' }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={[s.warningLabel, { color: '#EF4444' }]}>{t('panch.rahuKaal')}</Text>
                <Text style={[s.warningTime, { color: colors.textSecondary }]}>{panchang.rahuKaal.start} – {panchang.rahuKaal.end}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.warningLabel, { color: '#F59E0B' }]}>Yamaghanta</Text>
                <Text style={[s.warningTime, { color: colors.textSecondary }]}>{panchang.yamaghanta.start} – {panchang.yamaghanta.end}</Text>
              </View>
            </View>
          </View>
        </Section>

        {/* ═══ 6. Today's Grooming ═══ */}
        <Section index={4}>
          <View style={[s.groomingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderLeftColor: groomingColor, borderLeftWidth: 4 }]}>
            <View style={s.groomingHeader}>
              <View style={[s.groomingBadge, { backgroundColor: groomingColor + '15' }]}>
                <MaterialCommunityIcons
                  name={grooming.overallStatus === 'allowed' ? 'check-decagram' : grooming.overallStatus === 'avoid' ? 'alert-decagram' : 'close-octagon'}
                  size={20} color={groomingColor}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.groomingTitle, { color: colors.text }]}>{t('home.grooming')}</Text>
                <Text style={[s.groomingSummary, { color: groomingColor }]}>{grooming.summary}</Text>
              </View>
            </View>
            {/* Per-activity status chips (clear, non-repetitive) */}
            <View style={s.groomingChips}>
              {grooming.rules.slice(0, 3).map((rule, idx) => {
                const label = rule.type === 'haircut' ? 'Haircut' : rule.type === 'shaving' ? 'Shaving' : 'Nails';
                const word = rule.status === 'allowed' ? 'OK' : rule.status === 'avoid' ? 'Caution' : 'Avoid';
                const c = getGroomingStatusColor(rule.status);
                return (
                  <View key={idx} style={[s.groomingChip, { backgroundColor: c + '14', borderColor: c + '33' }]}>
                    <MaterialCommunityIcons
                      name={rule.type === 'haircut' ? 'content-cut' : rule.type === 'shaving' ? 'razor-double-edge' : 'hand-back-right-outline'}
                      size={13} color={c}
                    />
                    <Text style={[s.groomingChipLabel, { color: colors.text }]}>{label}</Text>
                    <Text style={[s.groomingChipWord, { color: c }]}>{word}</Text>
                  </View>
                );
              })}
            </View>

            {/* Reason shown once */}
            {!!grooming.rules[0]?.reason && (
              <Text style={[s.groomingReason, { color: colors.textSecondary }]} numberOfLines={2}>
                {grooming.rules[0].reason}
              </Text>
            )}

            {/* Gender + marital-status personalization */}
            {grooming.personalNotes.length > 0 && (
              <View style={[s.groomingPersonal, { borderTopColor: colors.divider }]}>
                <View style={s.groomingPersonalHead}>
                  <MaterialCommunityIcons name="account-heart-outline" size={13} color={colors.primary} />
                  <Text style={[s.groomingPersonalLabel, { color: colors.primary }]}>
                    For you · {grooming.audienceLabel}
                  </Text>
                </View>
                {grooming.personalNotes.map((note, i) => (
                  <Text key={i} style={[s.groomingPersonalText, { color: colors.textSecondary }]}>• {note}</Text>
                ))}
              </View>
            )}
          </View>
        </Section>

        {/* ═══ 7. Today's Guidance ═══ */}
        <Section index={5}>
          <View style={[s.guidanceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={s.guidanceHeader}>
              <MaterialCommunityIcons name="compass-outline" size={20} color="#7C3AED" />
              <Text style={[s.guidanceTitle, { color: colors.text }]}>Today's Guidance</Text>
            </View>

            {/* Observance */}
            {guidance.observance && (
              <View style={[s.observanceBadge, { backgroundColor: '#FFD700' + '15', borderColor: '#FFD700' + '30' }]}>
                <MaterialCommunityIcons name="star-four-points" size={16} color="#FFB300" />
                <Text style={[s.observanceText, { color: colors.text }]}>{guidance.observance}</Text>
              </View>
            )}

            {/* What to do */}
            <View style={s.guidanceSection}>
              <View style={s.guidanceSectionHeader}>
                <View style={[s.guidanceDot, { backgroundColor: '#4ADE80' }]} />
                <Text style={[s.guidanceSectionTitle, { color: '#2D6A4F' }]}>What to Do</Text>
              </View>
              {guidance.toDo.map((item, idx) => (
                <View key={idx} style={s.guidanceItem}>
                  <MaterialCommunityIcons name="check-circle-outline" size={14} color="#4ADE80" />
                  <Text style={[s.guidanceItemText, { color: colors.textSecondary }]}>{item}</Text>
                </View>
              ))}
            </View>

            {/* What to avoid */}
            <View style={s.guidanceSection}>
              <View style={s.guidanceSectionHeader}>
                <View style={[s.guidanceDot, { backgroundColor: '#EF4444' }]} />
                <Text style={[s.guidanceSectionTitle, { color: '#EF4444' }]}>What to Avoid</Text>
              </View>
              {guidance.toAvoid.map((item, idx) => (
                <View key={idx} style={s.guidanceItem}>
                  <MaterialCommunityIcons name="close-circle-outline" size={14} color="#EF4444" />
                  <Text style={[s.guidanceItemText, { color: colors.textSecondary }]}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Explanation */}
            <View style={[s.explanationBox, { backgroundColor: isDark ? colors.surfaceElevated : '#F8F4F0', borderColor: colors.divider }]}>
              <MaterialCommunityIcons name="lightbulb-outline" size={15} color="#FFB300" />
              <Text style={[s.explanationText, { color: colors.textSecondary }]}>{guidance.explanation}</Text>
            </View>
          </View>
        </Section>

      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const QUICK_GAP = 10;
const QUICK_W = (SCREEN_W - 40 - QUICK_GAP * 2) / 3;

const s = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 40, height: 40, borderRadius: 12 },
  greeting: { fontSize: 13, fontWeight: '600' },
  greetingName: { fontSize: 22, fontWeight: '800', letterSpacing: 0.3 },
  adminBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(232,195,74,0.15)', justifyContent: 'center', alignItems: 'center' },
  hinduDateBar: { marginTop: 14, borderRadius: 12, padding: 12, alignItems: 'center' },
  hinduDate: { fontSize: 15, fontWeight: '700' },
  hinduDateSub: { fontSize: 12, marginTop: 2 },

  // Section title
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },

  // Shloka
  shlokaCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  shlokaHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  shlokaLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  shlokaText: { fontSize: 18, fontWeight: '700', lineHeight: 28, fontStyle: 'italic' },
  shlokaTranslation: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  shlokaSource: { fontSize: 11, fontWeight: '600', marginTop: 6, textAlign: 'right' },

  // Quick Actions
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: QUICK_GAP },
  quickCard: { width: QUICK_W, alignItems: 'center', paddingVertical: 18, borderRadius: 18, borderWidth: 1 },
  quickIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 9, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4 },
  quickLabel: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.2 },

  // Panchang
  panchangCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  panchangHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  panchangTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  panchangGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  panchangItem: { width: '48%' as any, borderRadius: 12, padding: 10, borderWidth: 1, gap: 2 },
  panchangLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  panchangValue: { fontSize: 15, fontWeight: '700' },
  panchangSub: { fontSize: 10 },
  varaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10, borderRadius: 10, borderWidth: 1 },
  varaText: { fontSize: 15, fontWeight: '700' },
  varaSub: { fontSize: 12 },

  // Timings
  timingsCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  timingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  timingsTitle: { fontSize: 16, fontWeight: '700' },
  timingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timingItem: { width: '48%' as any, borderRadius: 12, padding: 10, borderWidth: 1, gap: 2 },
  timingLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  timingTime: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, padding: 10, borderRadius: 10, borderWidth: 1 },
  warningLabel: { fontSize: 11, fontWeight: '700' },
  warningTime: { fontSize: 12 },

  // Grooming
  groomingCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  groomingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  groomingBadge: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  groomingTitle: { fontSize: 15, fontWeight: '700' },
  groomingSummary: { fontSize: 13, fontWeight: '600' },
  groomingRule: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  groomingRuleText: { flex: 1, fontSize: 12, lineHeight: 16 },
  groomingChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  groomingChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  groomingChipLabel: { fontSize: 12, fontWeight: '600' },
  groomingChipWord: { fontSize: 11, fontWeight: '700' },
  groomingReason: { fontSize: 12, lineHeight: 17, marginTop: 10 },
  groomingPersonal: { marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  groomingPersonalHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  groomingPersonalLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  groomingPersonalText: { fontSize: 12, lineHeight: 17, marginTop: 2 },

  // Guidance
  guidanceCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  guidanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  guidanceTitle: { fontSize: 16, fontWeight: '700' },
  observanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, marginBottom: 12, borderWidth: 1 },
  observanceText: { fontSize: 14, fontWeight: '700' },
  guidanceSection: { marginBottom: 12 },
  guidanceSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  guidanceDot: { width: 8, height: 8, borderRadius: 4 },
  guidanceSectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  guidanceItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4, paddingLeft: 14 },
  guidanceItemText: { flex: 1, fontSize: 13, lineHeight: 18 },
  explanationBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  explanationText: { flex: 1, fontSize: 12, lineHeight: 17, fontStyle: 'italic' },
});
