import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { Header } from '../components/ui';
import { useDsInsets } from '../constants/ds';
import { PRAKRITI_QUIZ, DOSHAS, type Dosha } from '../constants/ayurveda';
import { toneSolid } from '../constants/theme';

const STORE_KEY = 'sadhak_prakriti_result';
const ORDER: Dosha[] = ['vata', 'pitta', 'kapha'];

type Tally = Record<Dosha, number>;
interface Result { primary: Dosha; secondary: Dosha | null; tally: Tally }

// A second dosha counts as part of the constitution (e.g. "Vata-Pitta") when it
// is within one answer of the leader, the classical dual-dosha prakriti.
function buildResult(tally: Tally): Result {
  const ranked = [...ORDER].sort((a, b) => tally[b] - tally[a]);
  const secondary = tally[ranked[0]] - tally[ranked[1]] <= 1 && tally[ranked[1]] > 0 ? ranked[1] : null;
  return { primary: ranked[0], secondary, tally };
}

// Older versions stored just the dosha name.
function parseStored(v: string): Result | null {
  if (ORDER.includes(v as Dosha)) {
    const tally: Tally = { vata: 0, pitta: 0, kapha: 0 };
    tally[v as Dosha] = 1;
    return { primary: v as Dosha, secondary: null, tally };
  }
  try { const r = JSON.parse(v); return r?.primary ? r : null; } catch { return null; }
}

export default function AyurvedaScreen() {
  const { colors, tone } = useTheme();
  const { screenBottom } = useDsInsets();
  const [answers, setAnswers] = useState<Record<number, Dosha>>({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [view, setView] = useState<Dosha>('vata');
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY).then((v) => {
      const r = v ? parseStored(v) : null;
      if (r) { setResult(r); setView(r.primary); }
    }).catch(() => {});
    return () => { if (advance.current) clearTimeout(advance.current); };
  }, []);

  // Hardware back steps back through the quiz before leaving the screen.
  useEffect(() => {
    if (result || step === 0) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setStep((s) => s - 1); return true; });
    return () => sub.remove();
  }, [result, step]);

  const total = PRAKRITI_QUIZ.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === total;

  const pick = (qi: number, d: Dosha) => {
    setAnswers((a) => ({ ...a, [qi]: d }));
    if (advance.current) clearTimeout(advance.current);
    // Brief pause so the selection registers visually before moving on.
    if (qi < total - 1) advance.current = setTimeout(() => setStep(qi + 1), 260);
  };

  const compute = async () => {
    const tally: Tally = { vata: 0, pitta: 0, kapha: 0 };
    Object.values(answers).forEach((d) => { tally[d]++; });
    const r = buildResult(tally);
    setResult(r); setView(r.primary);
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(r)).catch(() => {});
  };

  const retake = async () => {
    setResult(null); setAnswers({}); setStep(0);
    await AsyncStorage.removeItem(STORE_KEY).catch(() => {});
  };

  // ── RESULT ──
  if (result) {
    const p = DOSHAS[result.primary];
    const sec = result.secondary ? DOSHAS[result.secondary] : null;
    const sum = ORDER.reduce((n, d) => n + result.tally[d], 0) || 1;
    const g = DOSHAS[view];
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Your Ayurvedic Type" subtitle={sec ? `${p.name}-${sec.name} prakriti` : `${p.name} · ${p.nameHi}`} />
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: screenBottom }} showsVerticalScrollIndicator={false}>
          <View style={[st.hero, { backgroundColor: tone(p.color).bg, borderColor: tone(p.color).fg + '35' }]}>
            <View style={[st.heroIcon, { backgroundColor: tone(p.color).bg }]}><MaterialCommunityIcons name={p.icon as any} size={34} color={tone(p.color).fg} /></View>
            <Text style={[st.heroName, { color: colors.text }]}>
              {p.name}{sec ? <Text style={{ color: tone(sec.color).fg }}>-{sec.name}</Text> : null}
            </Text>
            <Text style={[st.heroEl, { color: colors.textSecondary }]}>{p.elements}{sec ? ` · ${sec.elements}` : ''}</Text>
            <Text style={[st.heroNature, { color: colors.textSecondary }]}>{p.nature}</Text>

            {/* Dosha balance */}
            <View style={st.bars}>
              {ORDER.map((d) => {
                const pct = Math.round((result.tally[d] / sum) * 100);
                return (
                  <View key={d} style={st.barRow}>
                    <Text style={[st.barLabel, { color: colors.text }]}>{DOSHAS[d].name}</Text>
                    <View style={[st.barTrack, { backgroundColor: colors.cardBorder }]}>
                      <View style={[st.barFill, { width: `${pct}%`, backgroundColor: toneSolid(DOSHAS[d].color) }]} />
                    </View>
                    <Text style={[st.barPct, { color: colors.textSecondary }]}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Guidance for each dosha; defaults to the dominant one */}
          <View style={st.viewTabs}>
            {ORDER.map((d) => {
              const active = view === d;
              const c = DOSHAS[d].color;
              return (
                <TouchableOpacity key={d} onPress={() => setView(d)} activeOpacity={0.8}
                  style={[st.viewTab, { borderColor: active ? c : colors.cardBorder, backgroundColor: active ? c + '18' : colors.surface }]}>
                  <Text style={{ color: active ? c : colors.textSecondary, fontWeight: '800', fontSize: 13 }}>{DOSHAS[d].name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Sec title="When balanced" icon="white-balance-sunny" color={colors.tulsiGreen || '#2D6A4F'} colors={colors}><Text style={[st.body, { color: colors.textSecondary }]}>{g.balanced}</Text></Sec>
          <Sec title="Signs of imbalance" icon="alert-circle-outline" color={colors.festival || '#DC2626'} colors={colors}><Text style={[st.body, { color: colors.textSecondary }]}>{g.imbalanced}</Text></Sec>
          <Sec title="Favour these" icon="check-circle-outline" color={colors.tulsiGreen || '#2D6A4F'} colors={colors}><List items={g.favor} color={colors.tulsiGreen || '#2D6A4F'} colors={colors} /></Sec>
          <Sec title="Reduce these" icon="minus-circle-outline" color={colors.festival || '#DC2626'} colors={colors}><List items={g.reduce} color={colors.festival || '#DC2626'} colors={colors} /></Sec>
          <Sec title="Daily routine (dinacharya)" icon="weather-sunset" color={colors.primary} colors={colors}><List items={g.routine} color={colors.primary} colors={colors} /></Sec>

          <TouchableOpacity onPress={retake} style={[st.retake, { borderColor: colors.cardBorder }]}>
            <MaterialCommunityIcons name="refresh" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Retake the assessment</Text>
          </TouchableOpacity>
          <Text style={[st.disc, { color: colors.textTertiary }]}>Educational wellness guidance rooted in Ayurveda, not a substitute for medical advice.</Text>
        </ScrollView>
      </View>
    );
  }

  // ── QUIZ (one question at a time) ──
  const item = PRAKRITI_QUIZ[step];
  const isLast = step === total - 1;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Discover Your Prakriti" subtitle="Your Ayurvedic mind-body constitution" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: screenBottom }} showsVerticalScrollIndicator={false}>
        <View style={st.progressHead}>
          <Text style={[st.progressText, { color: colors.textSecondary }]}>Question {step + 1} of {total}</Text>
          <Text style={[st.progressText, { color: colors.textTertiary }]}>{answeredCount}/{total} answered</Text>
        </View>
        <View style={[st.progressTrack, { backgroundColor: colors.cardBorder }]}>
          <View style={[st.progressFill, { width: `${((step + (answers[step] ? 1 : 0)) / total) * 100}%`, backgroundColor: colors.primary }]} />
        </View>

        {step === 0 && (
          <Text style={[st.intro, { color: colors.textSecondary }]}>
            Choose what has been true for most of your life, not just today.
          </Text>
        )}

        <View style={[st.qCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Text style={[st.qText, { color: colors.text }]}>{item.q}</Text>
          {item.options.map((o, oi) => {
            const active = answers[step] === o.dosha;
            return (
              <TouchableOpacity key={oi} onPress={() => pick(step, o.dosha)} activeOpacity={0.8}
                style={[st.opt, { borderColor: active ? colors.primary : colors.cardBorder, backgroundColor: active ? colors.primary + '12' : 'transparent' }]}>
                <MaterialCommunityIcons name={active ? 'radiobox-marked' : 'radiobox-blank'} size={19} color={active ? colors.primary : colors.textTertiary} />
                <Text style={[st.optText, { color: active ? colors.text : colors.textSecondary }]}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={st.navRow}>
          <TouchableOpacity onPress={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
            style={[st.navBtn, { borderColor: colors.cardBorder, opacity: step === 0 ? 0.35 : 1 }]}>
            <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Back</Text>
          </TouchableOpacity>
          {isLast ? (
            <TouchableOpacity onPress={compute} disabled={!allAnswered}
              style={[st.cta, { backgroundColor: allAnswered ? colors.primary : colors.cardBorder }]}>
              <MaterialCommunityIcons name="leaf" size={18} color="#FFF" />
              <Text style={st.ctaText}>{allAnswered ? 'Reveal my prakriti' : `${total - answeredCount} left`}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setStep((s) => s + 1)} disabled={!answers[step]}
              style={[st.navBtn, { borderColor: colors.cardBorder, opacity: answers[step] ? 1 : 0.35 }]}>
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Next</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
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
  intro: { fontSize: 13.5, lineHeight: 20, marginTop: 16 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 12.5, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  qCard: { borderRadius: 18, borderWidth: 1, padding: 18, marginTop: 18 },
  qText: { fontSize: 19, fontWeight: '800', marginBottom: 10, lineHeight: 26 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 15, marginTop: 9 },
  optText: { fontSize: 14.5, flex: 1, lineHeight: 20 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, gap: 12 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 46, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  cta: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14 },
  ctaText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  hero: { borderRadius: 20, borderWidth: 1, padding: 20, alignItems: 'center', marginBottom: 14 },
  heroIcon: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  heroName: { fontSize: 26, fontWeight: '800' },
  heroEl: { fontSize: 13, marginTop: 2, letterSpacing: 0.5, textAlign: 'center' },
  heroNature: { fontSize: 13.5, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  bars: { alignSelf: 'stretch', marginTop: 16, gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 48, fontSize: 12.5, fontWeight: '700' },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barPct: { width: 38, fontSize: 12, textAlign: 'right', fontWeight: '700' },
  viewTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  viewTab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  sec: { borderRadius: 16, borderWidth: 1, padding: 15, marginBottom: 12 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  secTitle: { fontSize: 14.5, fontWeight: '800' },
  body: { fontSize: 13.5, lineHeight: 21 },
  retake: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12, borderWidth: 1, marginTop: 6 },
  disc: { fontSize: 11, textAlign: 'center', marginTop: 14, lineHeight: 16, paddingHorizontal: 20 },
});
