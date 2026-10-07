import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, ScrollView, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Ellipse, G } from 'react-native-svg';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Header } from '../components/ui';
import Emblem, { type EmblemName } from '../components/art/Emblem';
import { useDsInsets, DS } from '../constants/ds';
import { logEvent } from '../services/diagnostics';

type Deity = { key: string; name: string; hi: string; emblem: EmblemName; color: string; mantra: string; latin: string };
const DEITIES: Deity[] = [
  { key: 'ganesha', name: 'Ganesha', hi: 'गणेश', emblem: 'modak', color: '#C2410C', mantra: 'ॐ गं गणपतये नमः', latin: 'Om Gam Ganapataye Namah' },
  { key: 'shiva', name: 'Shiva', hi: 'शिव', emblem: 'trishul', color: '#3949AB', mantra: 'ॐ नमः शिवाय', latin: 'Om Namah Shivaya' },
  { key: 'vishnu', name: 'Vishnu', hi: 'विष्णु', emblem: 'chakra', color: '#1565C0', mantra: 'ॐ नमो नारायणाय', latin: 'Om Namo Narayanaya' },
  { key: 'lakshmi', name: 'Lakshmi', hi: 'लक्ष्मी', emblem: 'lotus', color: '#C2185B', mantra: 'ॐ श्रीं महालक्ष्म्यै नमः', latin: 'Om Shreem Mahalakshmyai Namah' },
  { key: 'durga', name: 'Durga', hi: 'दुर्गा', emblem: 'mukut', color: '#B71C1C', mantra: 'ॐ दुं दुर्गायै नमः', latin: 'Om Dum Durgayai Namah' },
  { key: 'hanuman', name: 'Hanuman', hi: 'हनुमान', emblem: 'gada', color: '#E65100', mantra: 'ॐ हं हनुमते नमः', latin: 'Om Ham Hanumate Namah' },
  { key: 'krishna', name: 'Krishna', hi: 'कृष्ण', emblem: 'flute', color: '#1E3A8A', mantra: 'ॐ नमो भगवते वासुदेवाय', latin: 'Om Namo Bhagavate Vasudevaya' },
  { key: 'saraswati', name: 'Saraswati', hi: 'सरस्वती', emblem: 'veena', color: '#0F766E', mantra: 'ॐ ऐं सरस्वत्यै नमः', latin: 'Om Aim Saraswatyai Namah' },
  { key: 'surya', name: 'Surya', hi: 'सूर्य', emblem: 'sun', color: '#D97706', mantra: 'ॐ सूर्याय नमः', latin: 'Om Suryaya Namah' },
];
// The deity of the weekday comes first (Sunday Surya, Monday Shiva…).
const BY_WEEKDAY = ['surya', 'shiva', 'hanuman', 'ganesha', 'vishnu', 'lakshmi', 'hanuman'];

type Step = 'flowers' | 'diya' | 'bell' | 'aarti' | 'mantra';
const STEPS: { key: Step; label: string; emblem: EmblemName }[] = [
  { key: 'flowers', label: 'Flowers', emblem: 'lotus' },
  { key: 'diya', label: 'Diya', emblem: 'diya' },
  { key: 'bell', label: 'Bell', emblem: 'bell' },
  { key: 'aarti', label: 'Aarti', emblem: 'flame' },
  { key: 'mantra', label: 'Mantra', emblem: 'om' },
];

type Petal = { id: number; x: number; drift: number; spin: number; end: number; kind: 0 | 1 | 2; anim: Animated.Value };
const PETAL_COLORS = [['#F59E0B', '#EA580C'], ['#FBBF24', '#D97706'], ['#E11D48', '#9F1239']];

const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export default function VirtualPujaScreen() {
  const { colors } = useTheme();
  const { tx, native, language, noTrack } = useLanguage();
  const { screenBottom } = useDsInsets();
  const { width } = useWindowDimensions();
  const W = Math.min(width - 32, 420);
  const H = Math.round(W * 1.05);

  const [deity, setDeity] = useState<Deity>(() => DEITIES.find((d) => d.key === BY_WEEKDAY[new Date().getDay()]) || DEITIES[0]);
  const [done, setDone] = useState<Record<Step, boolean>>({ flowers: false, diya: false, bell: false, aarti: false, mantra: false });
  const [petals, setPetals] = useState<Petal[]>([]);
  const [lit, setLit] = useState(false);
  const [aartiOn, setAartiOn] = useState(false);
  const [chants, setChants] = useState(0);
  const [showMantra, setShowMantra] = useState(false);
  const [streak, setStreak] = useState(0);
  const petalId = useRef(0);

  const bell = useAudioPlayer(require('../assets/sounds/bell.wav'));
  const shankh = useAudioPlayer(require('../assets/sounds/shankh.wav'));
  const play = (p: typeof bell, vol = 1) => { try { p.volume = vol; p.seekTo(0); p.play(); } catch {} };

  const bellSwing = useRef(new Animated.Value(0)).current;
  const flicker = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem('sadhak_vpuja').then((v) => {
      if (!v) return;
      const s = JSON.parse(v);
      const y = new Date(); y.setDate(y.getDate() - 1);
      setStreak(s.last === dayKey() || s.last === dayKey(y) ? s.streak : 0);
    }).catch(() => {});
  }, []);

  // Changing deity starts a fresh puja.
  const pick = (d: Deity) => {
    if (d.key === deity.key) return;
    setDeity(d); setPetals([]); setLit(false); setAartiOn(false); setChants(0); setShowMantra(false);
    setDone({ flowers: false, diya: false, bell: false, aarti: false, mantra: false });
    halo.setValue(0);
  };

  const mark = (s: Step) => setDone((cur) => (cur[s] ? cur : { ...cur, [s]: true }));
  const complete = Object.values(done).every(Boolean);

  useEffect(() => {
    if (!complete) return;
    play(shankh, 0.9);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    logEvent('vpuja_done', { deity: deity.key });
    AsyncStorage.getItem('sadhak_vpuja').then((v) => {
      const s = v ? JSON.parse(v) : { last: '', streak: 0 };
      if (s.last === dayKey()) { setStreak(s.streak); return; }
      const y = new Date(); y.setDate(y.getDate() - 1);
      const next = { last: dayKey(), streak: s.last === dayKey(y) ? s.streak + 1 : 1 };
      setStreak(next.streak);
      AsyncStorage.setItem('sadhak_vpuja', JSON.stringify(next)).catch(() => {});
    }).catch(() => {});
  }, [complete]);

  // ── Offerings ──
  const offerFlowers = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const batch: Petal[] = Array.from({ length: 12 }, () => ({
      id: petalId.current++,
      x: W * 0.2 + Math.random() * W * 0.6,
      drift: (Math.random() - 0.5) * 60,
      spin: (Math.random() - 0.5) * 720,
      end: H * 0.74 + Math.random() * H * 0.08,
      kind: (Math.floor(Math.random() * 3) as 0 | 1 | 2),
      anim: new Animated.Value(0),
    }));
    setPetals((p) => [...p, ...batch].slice(-48));
    batch.forEach((p, i) => Animated.timing(p.anim, { toValue: 1, duration: 1500 + Math.random() * 900, delay: i * 70, easing: Easing.out(Easing.quad), useNativeDriver: true }).start());
    mark('flowers');
  };

  const lightDiya = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setLit(true);
    Animated.timing(halo, { toValue: 1, duration: 900, useNativeDriver: true }).start();
    mark('diya');
  };
  useEffect(() => {
    if (!lit) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(flicker, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(flicker, { toValue: 0.3, duration: 200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(flicker, { toValue: 0.8, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(flicker, { toValue: 0, duration: 240, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [lit]);

  const ringBell = () => {
    play(bell);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    bellSwing.setValue(0);
    Animated.sequence([
      Animated.timing(bellSwing, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(bellSwing, { toValue: -0.8, duration: 200, useNativeDriver: true }),
      Animated.timing(bellSwing, { toValue: 0.5, duration: 180, useNativeDriver: true }),
      Animated.timing(bellSwing, { toValue: -0.25, duration: 160, useNativeDriver: true }),
      Animated.timing(bellSwing, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start();
    mark('bell');
  };

  const doAarti = () => {
    if (aartiOn) return;
    if (!lit) lightDiya();
    setAartiOn(true);
    orbit.setValue(0);
    let rings = 0;
    const tick = setInterval(() => { if (rings++ < 5) ringBell(); }, 1300);
    Animated.timing(orbit, { toValue: 3, duration: 7200, easing: Easing.linear, useNativeDriver: true }).start(() => {
      clearInterval(tick);
      setAartiOn(false);
      mark('aarti');
    });
  };

  const chant = () => {
    setShowMantra(true);
    Haptics.selectionAsync().catch(() => {});
    setChants((c) => {
      const n = c + 1;
      if (n >= 11) mark('mantra');
      return n;
    });
  };

  const actions: Record<Step, () => void> = { flowers: offerFlowers, diya: lightDiya, bell: ringBell, aarti: doAarti, mantra: chant };

  // Aarti thali path: clockwise circles in front of the deity.
  const R = W * 0.3;
  const N = 16;
  const ins = Array.from({ length: 3 * N + 1 }, (_, i) => i / N);
  const ox = orbit.interpolate({ inputRange: ins, outputRange: ins.map((v) => R * Math.sin(v * 2 * Math.PI)) });
  const oy = orbit.interpolate({ inputRange: ins, outputRange: ins.map((v) => -R * 0.8 * Math.cos(v * 2 * Math.PI)) });

  const swing = bellSwing.interpolate({ inputRange: [-1, 1], outputRange: ['-22deg', '22deg'] });
  const flame = flicker.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] });
  const garland = useMemo(() => Array.from({ length: 15 }, (_, i) => {
    const t = i / 14;
    const x = W * 0.12 + t * W * 0.76;
    const y = H * 0.08 + Math.sin(t * Math.PI * 3) ** 2 * 18 + 6;
    return { x, y, c: i % 2 ? '#F59E0B' : '#EA580C' };
  }), [W, H]);

  const Bell = ({ left }: { left: boolean }) => (
    <Animated.View style={[st.bell, { left: left ? W * 0.1 : undefined, right: left ? undefined : W * 0.1, transform: [{ translateY: -24 }, { rotate: swing }, { translateY: 24 }] }]}>
      <Svg width={34} height={64} viewBox="0 0 34 64">
        <Path d="M17 0 L17 22" stroke="#C9A227" strokeWidth={2} />
        <Path d="M6 50 C6 34 8 24 17 24 C26 24 28 34 28 50 Z" fill="#D4A72C" stroke="#9A7417" strokeWidth={1.5} />
        <Path d="M3 51 L31 51" stroke="#9A7417" strokeWidth={3} strokeLinecap="round" />
        <Circle cx={17} cy={57} r={4} fill="#9A7417" />
      </Svg>
    </Animated.View>
  );

  const Diya = ({ left }: { left: boolean }) => (
    <View style={[st.diya, { left: left ? W * 0.08 : undefined, right: left ? undefined : W * 0.08, top: H * 0.66 }]}>
      {lit && (
        <Animated.View style={{ alignItems: 'center', transform: [{ scaleY: flame }, { translateY: 4 }] }}>
          <Svg width={22} height={34} viewBox="0 0 22 34">
            <Path d="M11 0 C3 12 3 22 11 30 C19 22 19 12 11 0 Z" fill="#FBBF24" />
            <Path d="M11 12 C7 18 7 23 11 27 C15 23 15 18 11 12 Z" fill="#FFF7D6" />
          </Svg>
        </Animated.View>
      )}
      <Svg width={58} height={26} viewBox="0 0 58 26" style={{ marginTop: lit ? -6 : 28 }}>
        <Path d="M2 4 Q29 34 56 4 Z" fill="#B45309" stroke="#7C2D12" strokeWidth={1.5} />
        <Ellipse cx={29} cy={5} rx={26} ry={3.5} fill="#92400E" />
      </Svg>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={tx('Virtual puja')} subtitle={native(deity.name, deity.hi)} />
      <ScrollView contentContainerStyle={{ paddingBottom: screenBottom }} showsVerticalScrollIndicator={false}>
        {/* Deity picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.pickRow}>
          {DEITIES.map((d) => {
            const on = d.key === deity.key;
            return (
              <TouchableOpacity key={d.key} onPress={() => pick(d)} style={[st.pick, on && { backgroundColor: d.color + '18', borderColor: d.color }, !on && { borderColor: colors.cardBorder }]} activeOpacity={0.8}>
                <Emblem name={d.emblem} size={40} color={d.color} />
                <Text style={[st.pickText, { color: on ? d.color : colors.textSecondary }]} numberOfLines={1}>{native(d.name, d.hi)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Shrine */}
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <View style={{ width: W, height: H, borderRadius: 28, overflow: 'hidden' }}>
            <LinearGradient colors={['#3B0D0C', '#6B1D0E', '#A8461A']} style={StyleSheet.absoluteFill} />
            {/* Arch and garland */}
            <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
              <Path d={`M${W * 0.08} ${H} L${W * 0.08} ${H * 0.36} Q${W * 0.08} ${H * 0.1} ${W * 0.5} ${H * 0.06} Q${W * 0.92} ${H * 0.1} ${W * 0.92} ${H * 0.36} L${W * 0.92} ${H}`} fill="none" stroke="#E8B04A" strokeWidth={3} opacity={0.75} />
              <Path d={`M${W * 0.14} ${H} L${W * 0.14} ${H * 0.38} Q${W * 0.14} ${H * 0.16} ${W * 0.5} ${H * 0.12} Q${W * 0.86} ${H * 0.16} ${W * 0.86} ${H * 0.38} L${W * 0.86} ${H}`} fill="none" stroke="#E8B04A" strokeWidth={1.2} opacity={0.5} />
              <Path d={`M${W * 0.04} ${H * 0.86} L${W * 0.96} ${H * 0.86}`} stroke="#E8B04A" strokeWidth={2} opacity={0.5} />
              <G>
                {garland.map((g, i) => <Circle key={i} cx={g.x} cy={g.y} r={7} fill={g.c} />)}
              </G>
            </Svg>
            <Bell left />
            <Bell left={false} />

            {/* Deity */}
            <View style={[st.center, { top: H * 0.2 }]}>
              <Animated.View style={[st.halo, { width: W * 0.58, height: W * 0.58, borderRadius: W * 0.29, opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.3] }) }]} />
              <Emblem name={deity.emblem} size={W * 0.46} color={deity.color} />
            </View>

            <Diya left />
            <Diya left={false} />

            {/* Aarti thali */}
            {aartiOn && (
              <Animated.View pointerEvents="none" style={[st.thali, { left: W / 2 - 34, top: H * 0.2 + W * 0.23 - 18, transform: [{ translateX: ox }, { translateY: oy }] }]}>
                <Svg width={68} height={40} viewBox="0 0 68 40">
                  <Ellipse cx={34} cy={30} rx={32} ry={8} fill="#D4A72C" stroke="#9A7417" strokeWidth={1.5} />
                  <Circle cx={22} cy={27} r={3} fill="#DC2626" />
                  <Circle cx={46} cy={27} r={3} fill="#F59E0B" />
                  <Path d="M26 26 Q34 34 42 26 Z" fill="#B45309" />
                  <Path d="M34 6 C29 14 29 19 34 24 C39 19 39 14 34 6 Z" fill="#FBBF24" />
                </Svg>
              </Animated.View>
            )}

            {/* Flowers */}
            {petals.map((p) => {
              const [a, b] = PETAL_COLORS[p.kind];
              return (
                <Animated.View key={p.id} pointerEvents="none" style={{
                  position: 'absolute', left: p.x, top: 0,
                  transform: [
                    { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [-30, p.end] }) },
                    { translateX: p.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.drift, p.drift * 0.6] }) },
                    { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
                  ],
                }}>
                  {p.kind === 2
                    ? <View style={{ width: 10, height: 16, borderRadius: 8, backgroundColor: a, borderWidth: 1, borderColor: b }} />
                    : <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: a, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: b }} /></View>}
                </Animated.View>
              );
            })}

            {/* Mantra */}
            {showMantra && (
              <View style={[st.mantra, { bottom: 12 }]}>
                <Text style={st.mantraText}>{language === 'en' ? deity.latin : deity.mantra}</Text>
                <Text style={st.mantraSub}>{chants} / 11 {tx('chants')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={[st.actions, { width: W, alignSelf: 'center' }]}>
          {STEPS.map((s) => (
            <TouchableOpacity key={s.key} onPress={actions[s.key]} style={st.action} activeOpacity={0.75} accessibilityLabel={tx(s.label)}>
              <View style={[st.actionRing, { borderColor: done[s.key] ? '#22A35A' : colors.cardBorder, backgroundColor: colors.surface }]}>
                <Emblem name={s.emblem} size={34} color={deity.color} plain />
                {done[s.key] && <View style={st.tick}><Ionicons name="checkmark" size={11} color="#FFF" /></View>}
              </View>
              <Text style={[st.actionText, { color: colors.text }]} numberOfLines={1}>{tx(s.label)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {complete ? (
          <View style={[st.blessing, { backgroundColor: deity.color + '14', borderColor: deity.color + '40' }]}>
            <Text style={[st.blessTitle, { color: colors.text }, language === 'en' ? { fontFamily: DS.font.display } : null]}>{tx('Puja complete')} 🙏</Text>
            <Text style={[st.blessSub, { color: colors.textSecondary }]}>{tx('May the divine bless you and your family.')}</Text>
            {streak > 0 && <Text style={[st.streak, { color: deity.color }, noTrack]}>{streak} {tx(streak === 1 ? 'day' : 'days in a row')}</Text>}
          </View>
        ) : (
          <Text style={[st.hint, { color: colors.textTertiary }]}>{tx('Offer flowers, light the diya, ring the bell, do aarti and chant the mantra 11 times.')}</Text>
        )}

        <TouchableOpacity onPress={() => router.push('/puja-guide')} style={[st.guide, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]} activeOpacity={0.8}>
          <Emblem name="kalash" size={36} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14.5 }}>{tx('Doing the puja at home?')}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12.5, marginTop: 2 }}>{tx('Samagri list and step-by-step vidhi')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  pickRow: { paddingHorizontal: 16, gap: 8, paddingVertical: 6 },
  pick: { alignItems: 'center', width: 74, paddingVertical: 8, borderRadius: 16, borderWidth: 1, gap: 4 },
  pickText: { fontSize: 11.5, fontWeight: '800' },
  bell: { position: 'absolute', top: 30 },
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', backgroundColor: '#FDE68A' },
  diya: { position: 'absolute', alignItems: 'center', width: 58 },
  thali: { position: 'absolute' },
  mantra: { position: 'absolute', left: 16, right: 16, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 14, paddingVertical: 8 },
  mantraText: { color: '#FFF1DA', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  mantraSub: { color: 'rgba(255,241,218,0.75)', fontSize: 11.5, marginTop: 2 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  action: { alignItems: 'center', width: 64, gap: 6 },
  actionRing: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tick: { position: 'absolute', right: -2, top: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#22A35A', alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 12, fontWeight: '800' },
  hint: { fontSize: 12.5, textAlign: 'center', marginTop: 14, paddingHorizontal: 30, lineHeight: 18 },
  blessing: { marginHorizontal: 16, marginTop: 16, borderRadius: 18, borderWidth: 1, padding: 16, alignItems: 'center', gap: 4 },
  blessTitle: { fontSize: 20, fontWeight: '800' },
  blessSub: { fontSize: 13, textAlign: 'center' },
  streak: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 },
  guide: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 16, padding: 12, borderRadius: 16, borderWidth: 1 },
});
