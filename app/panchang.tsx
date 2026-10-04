import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { calculatePanchang } from '../services/panchang';
import { Header, Icon } from '../components/ui';
import type { IconName } from '../components/ui/Icon';
import { useDsInsets, DS } from '../constants/ds';

const GOOD = '#1B7A42';
const BAD = '#DC2626';

const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const inRange = (now: number, s: string, e: string) => {
  const a = toMin(s), b = toMin(e);
  return a <= b ? now >= a && now < b : now >= a || now < b; // crosses midnight
};

export default function PanchangScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const { t, tf, locale, noTrack } = useLanguage();
  const { screenBottom } = useDsInsets();
  const [offset, setOffset] = useState(0); // days from today

  const date = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + offset); return d; }, [offset]);
  const isToday = offset === 0;
  const p = useMemo(
    () => calculatePanchang(date, profile?.location?.lat || 28.6139, profile?.location?.lng || 77.209),
    [date.toDateString(), profile?.location?.lat, profile?.location?.lng],
  );
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const timings = [
    { key: 'brahma', label: t('mu.brahma'), hint: t('mu.brahmaHint'), icon: 'weather-night', t: p.brahmaMuhurta, good: true },
    { key: 'abhijit', label: t('mu.abhijit'), hint: t('mu.abhijitHint'), icon: 'white-balance-sunny', t: p.abhijitMuhurta, good: true },
    { key: 'rahu', label: t('ui.rahuKaal'), hint: t('mu.rahuHint'), icon: 'alert-circle-outline', t: p.rahuKaal, good: false },
    { key: 'yama', label: t('mu.yama'), hint: t('mu.yamaHint'), icon: 'timer-sand', t: p.yamaghanta, good: false },
    { key: 'gulika', label: t('mu.gulika'), hint: t('mu.gulikaHint'), icon: 'circle-off-outline', t: p.gulikaKaal, good: false },
  ].sort((a, b) => toMin(a.t.start) - toMin(b.t.start));

  // "Right now" banner (today only): the active window, else the next one.
  const active = isToday ? timings.find((x) => inRange(nowMin, x.t.start, x.t.end)) : undefined;
  const next = isToday && !active ? timings.find((x) => toMin(x.t.start) > nowMin) : undefined;

  const elements: { label: string; hi: string; value: string; valueHi: string; extra?: string; icon: IconName; color: string }[] = [
    { label: t('el.tithi'), hi: 'तिथि', value: p.tithi.name, valueHi: `${p.tithi.pakshaHi} ${p.tithi.nameHi}`, extra: p.tithi.endTime ? tf('panch.until', { t: p.tithi.endTime }) : undefined, icon: 'moon', color: '#7C3AED' },
    { label: t('el.nakshatra'), hi: 'नक्षत्र', value: p.nakshatra.name, valueHi: `${p.nakshatra.nameHi} · lord ${p.nakshatra.lord}`, extra: p.nakshatra.endTime ? tf('panch.until', { t: p.nakshatra.endTime }) : undefined, icon: 'star-four', color: '#EA580C' },
    { label: t('el.yoga'), hi: 'योग', value: p.yoga.name, valueHi: p.yoga.nameHi, icon: 'yin-yang', color: GOOD },
    { label: t('el.karana'), hi: 'करण', value: p.karana.name, valueHi: p.karana.nameHi, icon: 'hourglass', color: '#1565C0' },
    { label: t('el.vara'), hi: 'वार', value: p.vara.name, valueHi: `${p.vara.nameHi} · ${p.vara.deity}`, icon: 'calendar-star', color: '#C2410C' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={t('f.panchang')} subtitle={profile?.location?.city ? tf('panch.for', { city: profile.location.city }) : t('panch.subtitle')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: DS.layout.screenPaddingH, paddingBottom: screenBottom }} showsVerticalScrollIndicator={false}>
        {/* Day navigator */}
        <View style={[st.nav, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <TouchableOpacity onPress={() => setOffset((o) => o - 1)} style={st.navBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setOffset(0)} style={{ flex: 1, alignItems: 'center' }} disabled={isToday}>
            <Text style={[st.navKicker, { color: isToday ? colors.primary : colors.textTertiary }, noTrack]}>{t(isToday ? 'ui.today' : offset === 1 ? 'ui.tomorrow' : offset === -1 ? 'ui.yesterday' : 'ui.tapForToday').toUpperCase()}</Text>
            <Text style={[st.navDate, { color: colors.text }]}>{date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setOffset((o) => o + 1)} style={st.navBtn} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Hero: Hindu date */}
        <View style={[st.hero, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Text style={[st.heroHi, { color: colors.text }]}>{p.hinduMonth.nameHi} {p.tithi.pakshaHi}</Text>
          <Text style={[st.heroTithi, { color: colors.primary }]}>{p.tithi.nameHi}</Text>
          <Text style={[st.heroEn, { color: colors.textSecondary }]}>{p.hinduMonth.name} · {p.tithi.paksha === 'shukla' ? 'Shukla' : 'Krishna'} {p.tithi.name}</Text>
          <View style={[st.sunRow, { borderTopColor: colors.primary + '25' }]}>
            {([
              { icon: 'sun-horizon', label: t('ui.sunrise'), v: p.sunrise, c: '#EA8C00' },
              { icon: 'moon-stars', label: t('ui.sunset'), v: p.sunset, c: '#7C3AED' },
              { icon: 'moon', label: t('ui.moonrise'), v: p.moonrise, c: '#475569' },
            ] as { icon: IconName; label: string; v: string; c: string }[]).map((x) => (
              <View key={x.label} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                <Icon name={x.icon} size={20} color={x.c} />
                <Text style={[st.sunLabel, { color: colors.textTertiary }, noTrack]}>{x.label}</Text>
                <Text style={[st.sunVal, { color: colors.text }]}>{x.v || '-'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Right now */}
        {(active || next) && (
          <View style={[st.now, { backgroundColor: (active ? (active.good ? GOOD : BAD) : colors.textTertiary) + '12', borderColor: (active ? (active.good ? GOOD : BAD) : colors.cardBorder) + '55' }]}>
            <View style={[st.nowDot, { backgroundColor: active ? (active.good ? GOOD : BAD) : colors.textTertiary }]} />
            <Text style={{ flex: 1, color: colors.text, fontSize: 13.5, lineHeight: 19 }}>
              {active
                ? <><Text style={{ fontWeight: '800' }}>{tf('panch.activeNow', { name: active.label })}</Text> · {tf('panch.until', { t: active.t.end })}. {active.hint}.</>
                : <><Text style={{ fontWeight: '800' }}>{tf('panch.next', { name: next!.label })}</Text> {tf('panch.at', { t: next!.t.start })}</>}
            </Text>
          </View>
        )}

        {/* Five elements */}
        <Text style={[st.section, { color: colors.text }]}>{t('panch.fiveElements')}</Text>
        <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {elements.map((e, i) => (
            <View key={e.label} style={[st.elRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
              <View style={[st.elIcon, { backgroundColor: e.color + '15' }]}>
                <Icon name={e.icon} size={22} color={e.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.elLabel, { color: colors.textTertiary }, noTrack]}>{e.label.toUpperCase()}{e.label === e.hi ? '' : ` · ${e.hi}`}</Text>
                <Text style={[st.elValue, { color: colors.text }]}>{e.value}</Text>
                <Text style={[st.elHi, { color: colors.textSecondary }]}>{e.valueHi}</Text>
              </View>
              {!!e.extra && <Text style={[st.elExtra, { color: colors.textTertiary }]}>{e.extra}</Text>}
            </View>
          ))}
        </View>

        {/* Muhurta timeline */}
        <Text style={[st.section, { color: colors.text }]}>{t('panch.muhurta')}</Text>
        <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {timings.map((x, i) => {
            const c = x.good ? GOOD : BAD;
            const live = isToday && inRange(nowMin, x.t.start, x.t.end);
            return (
              <View key={x.key} style={[st.tRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                <View style={[st.tBar, { backgroundColor: c }]} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[st.tLabel, { color: colors.text }]}>{x.label}</Text>
                    {live && <View style={[st.liveTag, { backgroundColor: c }]}><Text style={st.liveText}>{t('panch.now')}</Text></View>}
                  </View>
                  <Text style={[st.tHint, { color: colors.textSecondary }]}>{x.hint}</Text>
                </View>
                <Text style={[st.tTime, { color: c }]}>{x.t.start}–{x.t.end}</Text>
              </View>
            );
          })}
        </View>
        <Text style={[st.foot, { color: colors.textTertiary }]}>{t('panch.foot')}</Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 8 },
  navBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navKicker: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2 },
  navDate: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  hero: { marginTop: 14, borderRadius: 20, borderWidth: 1, padding: 18, alignItems: 'center' },
  heroHi: { fontSize: 17, fontWeight: '700', lineHeight: 28 },
  heroTithi: { fontSize: 30, fontWeight: '800', lineHeight: 44 },
  heroEn: { fontSize: 13, marginTop: 2 },
  sunRow: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 16, paddingTop: 14, borderTopWidth: 1 },
  sunLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  sunVal: { fontSize: 14, fontWeight: '800' },
  now: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  nowDot: { width: 9, height: 9, borderRadius: 5 },
  section: { fontSize: 17, fontWeight: '800', marginTop: 22, marginBottom: 10 },
  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  elRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  elIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  elLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8 },
  elValue: { fontSize: 15.5, fontWeight: '800', marginTop: 1 },
  elHi: { fontSize: 13, marginTop: 1, lineHeight: 20 },
  elExtra: { fontSize: 11.5, fontWeight: '700' },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingRight: 14 },
  tBar: { width: 4, alignSelf: 'stretch', borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  tLabel: { fontSize: 14.5, fontWeight: '800' },
  tHint: { fontSize: 12, marginTop: 2 },
  tTime: { fontSize: 13.5, fontWeight: '800' },
  liveTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  liveText: { color: '#FFF', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6 },
  foot: { fontSize: 11.5, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
