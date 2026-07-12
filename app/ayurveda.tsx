import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { Header } from '../components/ui';
import { useDsInsets } from '../constants/ds';
import { PRAKRITI_QUIZ, DOSHAS, type Dosha } from '../constants/ayurveda';

const STORE_KEY = 'sadhak_prakriti_result';

export default function AyurvedaScreen() {
  const { colors } = useTheme();
  const { screenBottom } = useDsInsets();
  const [answers, setAnswers] = useState<Record<number, Dosha>>({});
  const [result, setResult] = useState<Dosha | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY).then((v) => { if (v) setResult(v as Dosha); }).catch(() => {});
  }, []);

  const compute = async () => {
    const tally: Record<Dosha, number> = { vata: 0, pitta: 0, kapha: 0 };
    Object.values(answers).forEach((d) => { tally[d]++; });
    const top = (Object.keys(tally) as Dosha[]).sort((a, b) => tally[b] - tally[a])[0];
    setResult(top);
    await AsyncStorage.setItem(STORE_KEY, top).catch(() => {});
  };

  const retake = async () => { setResult(null); setAnswers({}); await AsyncStorage.removeItem(STORE_KEY).catch(() => {}); };
  const allAnswered = Object.keys(answers).length === PRAKRITI_QUIZ.length;

  // ── RESULT ──
  if (result) {
    const p = DOSHAS[result];
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Your Ayurvedic Type" subtitle={`${p.name} · ${p.nameHi}`} />
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: screenBottom }} showsVerticalScrollIndicator={false}>
          <View style={[st.hero, { backgroundColor: p.color + '14', borderColor: p.color + '35' }]}>
            <View style={[st.heroIcon, { backgroundColor: p.color + '22' }]}><MaterialCommunityIcons name={p.icon as any} size={34} color={p.color} /></View>
            <Text style={[st.heroName, { color: colors.text }]}>{p.name} <Text style={{ color: p.color }}>{p.nameHi}</Text></Text>
            <Text style={[st.heroEl, { color: colors.textSecondary }]}>{p.elements}</Text>
            <Text style={[st.heroNature, { color: colors.textSecondary }]}>{p.nature}</Text>
          </View>

          <Sec title="When balanced" icon="white-balance-sunny" color={colors.tulsiGreen || '#2D6A4F'} colors={colors}><Text style={[st.body, { color: colors.textSecondary }]}>{p.balanced}</Text></Sec>
          <Sec title="Signs of imbalance" icon="alert-circle-outline" color={colors.festival || '#DC2626'} colors={colors}><Text style={[st.body, { color: colors.textSecondary }]}>{p.imbalanced}</Text></Sec>
          <Sec title="Favour these" icon="check-circle-outline" color={colors.tulsiGreen || '#2D6A4F'} colors={colors}><List items={p.favor} color={colors.tulsiGreen || '#2D6A4F'} colors={colors} /></Sec>
          <Sec title="Reduce these" icon="minus-circle-outline" color={colors.festival || '#DC2626'} colors={colors}><List items={p.reduce} color={colors.festival || '#DC2626'} colors={colors} /></Sec>
          <Sec title="Daily routine (dinacharya)" icon="weather-sunset" color={colors.primary} colors={colors}><List items={p.routine} color={colors.primary} colors={colors} /></Sec>

          <TouchableOpacity onPress={retake} style={[st.retake, { borderColor: colors.cardBorder }]}>
            <MaterialCommunityIcons name="refresh" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Retake the assessment</Text>
          </TouchableOpacity>
          <Text style={[st.disc, { color: colors.textTertiary }]}>Educational wellness guidance rooted in Ayurveda — not a substitute for medical advice.</Text>
        </ScrollView>
      </View>
    );
  }

  // ── QUIZ ──
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Discover Your Prakriti" subtitle="Your Ayurvedic mind-body constitution" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: screenBottom }} showsVerticalScrollIndicator={false}>
        <Text style={[st.intro, { color: colors.textSecondary }]}>
          Answer honestly, choosing what has been true for most of your life (not just today). {Object.keys(answers).length}/{PRAKRITI_QUIZ.length} answered.
        </Text>
        {PRAKRITI_QUIZ.map((item, qi) => (
          <View key={qi} style={[st.qCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[st.qText, { color: colors.text }]}>{qi + 1}. {item.q}</Text>
            {item.options.map((o, oi) => {
              const active = answers[qi] === o.dosha;
              return (
                <TouchableOpacity key={oi} onPress={() => setAnswers((a) => ({ ...a, [qi]: o.dosha }))}
                  style={[st.opt, { borderColor: active ? colors.primary : colors.cardBorder, backgroundColor: active ? colors.primary + '12' : 'transparent' }]}>
                  <MaterialCommunityIcons name={active ? 'radiobox-marked' : 'radiobox-blank'} size={17} color={active ? colors.primary : colors.textTertiary} />
                  <Text style={[st.optText, { color: active ? colors.text : colors.textSecondary }]}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        <TouchableOpacity onPress={compute} disabled={!allAnswered}
          style={[st.cta, { backgroundColor: allAnswered ? colors.primary : colors.cardBorder }]}>
          <MaterialCommunityIcons name="leaf" size={18} color="#FFF" />
          <Text style={st.ctaText}>{allAnswered ? 'Reveal my constitution' : `Answer all ${PRAKRITI_QUIZ.length} questions`}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Sec({ title, icon, color, colors, children }: any) {
  return (
    <View style={[st.sec, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
      <View style={st.secHead}><MaterialCommunityIcons name={icon} size={16} color={color} /><Text style={[st.secTitle, { color: colors.text }]}>{title}</Text></View>
      {children}
    </View>
  );
}
function List({ items, color, colors }: { items: string[]; color: string; colors: any }) {
  return <>{items.map((it, i) => (
    <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: 5 }}>
      <Text style={{ color, fontSize: 13 }}>•</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 13.5, lineHeight: 20, flex: 1 }}>{it}</Text>
    </View>
  ))}</>;
}

const st = StyleSheet.create({
  intro: { fontSize: 13.5, lineHeight: 20, marginBottom: 16 },
  qCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  qText: { fontSize: 15, fontWeight: '700', marginBottom: 10, lineHeight: 21 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 7 },
  optText: { fontSize: 13.5, flex: 1, lineHeight: 19 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 14, marginTop: 10 },
  ctaText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  hero: { borderRadius: 20, borderWidth: 1, padding: 20, alignItems: 'center', marginBottom: 14 },
  heroIcon: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  heroName: { fontSize: 24, fontWeight: '800' },
  heroEl: { fontSize: 13, marginTop: 2, letterSpacing: 1 },
  heroNature: { fontSize: 13.5, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  sec: { borderRadius: 16, borderWidth: 1, padding: 15, marginBottom: 12 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  secTitle: { fontSize: 14.5, fontWeight: '800' },
  body: { fontSize: 13.5, lineHeight: 21 },
  retake: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12, borderWidth: 1, marginTop: 6 },
  disc: { fontSize: 11, textAlign: 'center', marginTop: 14, lineHeight: 16, paddingHorizontal: 20 },
});
