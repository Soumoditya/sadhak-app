import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SunCalc from 'suncalc';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { calculatePanchang } from '../services/panchang';
import { daySlots, liveNow, rituAyana, samvat, DISHA_SHOOL, HORA_HI, HORA_FOR, CH_HI } from '../services/hora';
import { lunarFestivalsOn, getFixedFestivals } from '../services/festivals';
import { defaultRegion, lunarMonth, regionalFestivals, solarMonthDays, toAmanta, REGIONS, type Region, type RegionalDay } from '../services/regional';
import { siderealLon, SIGNS, SIGNS_HI } from '../services/jyotishExtras';
import { holidaysOn } from '../constants/holidays';
import { Header, Icon } from '../components/ui';
import type { IconName } from '../components/ui/Icon';
import { useDsInsets, DS } from '../constants/ds';

const GOOD = '#1B7A42';
const BAD = '#DC2626';
const MID = '#B7791F';
const QC = { good: GOOD, neutral: MID, bad: BAD } as const;

const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const inRange = (now: number, s: string, e: string) => {
  const a = toMin(s), b = toMin(e);
  return a <= b ? now >= a && now < b : now >= a || now < b; // crosses midnight
};
const hhmm = (d?: Date | null) => (d && !isNaN(d.getTime()) ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '--:--');

export default function PanchangScreen() {
  const { profile } = useAuth();
  const { colors, tones, tone } = useTheme();
  const { t, tf, tx, native, locale, noTrack, display, language } = useLanguage();
  const { screenBottom } = useDsInsets();
  const [offset, setOffset] = useState(0); // days from today
  const [table, setTable] = useState<'chogh' | 'hora'>('chogh');
  const [half, setHalf] = useState<'day' | 'night'>(() => {
    const h = new Date().getHours();
    return h >= 6 && h < 18 ? 'day' : 'night';
  });
  const [region, setRegion] = useState<Region>(() => defaultRegion(language));
  useEffect(() => {
    AsyncStorage.getItem('sadhak_calendar_region').then((v) => {
      setRegion(v && REGIONS.some((r) => r.key === v) ? (v as Region) : defaultRegion(language));
    }).catch(() => {});
  }, [language]);

  const lat = profile?.location?.lat || 28.6139;
  const lon = profile?.location?.lng || 77.209;
  const date = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + offset); return d; }, [offset]);
  const dayKey = date.toDateString();
  const isToday = offset === 0;
  const p = useMemo(() => calculatePanchang(date, lat, lon), [dayKey, lat, lon]);
  const slots = useMemo(() => daySlots(date, lat, lon), [dayKey, lat, lon]);
  const live = useMemo(() => { try { return isToday ? liveNow(new Date(), lat, lon) : null; } catch { return null; } }, [isToday, lat, lon]);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const extra = useMemo(() => {
    const sunSign = Math.floor(siderealLon('Sun', slots.sunrise) / 30) % 12;
    const moonSign = Math.floor(siderealLon('Moon', slots.sunrise) / 30) % 12;
    const amanta = toAmanta(p.hinduMonth.name, p.tithi.paksha).en;
    const moonset = SunCalc.getMoonTimes(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12), lat, lon).set;
    let rd: RegionalDay | undefined;
    try {
      if (REGIONS.find((x) => x.key === region)?.solar) rd = solarMonthDays(date.getFullYear(), date.getMonth(), region, lat, lon, language)[date.getDate()];
    } catch {}
    return { sunSign, moonSign, ...rituAyana(sunSign), sv: samvat(date, amanta), moonset, rd, regional: rd?.label || '' };
  }, [dayKey, lat, lon, region, language]);

  const month = lunarMonth(region, p.hinduMonth.name, p.tithi.paksha);
  const pakshaWord = native(p.tithi.paksha === 'shukla' ? 'Shukla' : 'Krishna', p.tithi.pakshaHi);

  const festivals = useMemo(() => {
    const out: { name: string; note?: string }[] = [];
    const seen = new Set<string>();
    const add = (name: string, note?: string) => { if (!seen.has(name)) { seen.add(name); out.push({ name, note }); } };
    try {
      [...lunarFestivalsOn(date, lat, lon), ...getFixedFestivals(date.getMonth() + 1, date.getDate())]
        .filter((f) => f.type !== 'ekadashi' && f.type !== 'pradosh')
        .forEach((f) => add(native(f.name, f.nameHi)));
      regionalFestivals(region, date, lat, lon, extra.rd)
        .forEach((f) => add(language === 'bn' || language === 'as' ? (f.bn || native(f.name, f.hi)) : native(f.name, f.hi), tx(f.note)));
      holidaysOn(date).forEach((h) => add(language === 'hi' || language === 'mr' ? h.hi : language === 'bn' || language === 'as' ? h.bn : h.name));
    } catch {}
    if (/ekadashi/i.test(p.tithi.name)) add(`${pakshaWord} ${native('Ekadashi', 'एकादशी')}`, tx('Fasting day for Vishnu'));
    if (p.tithi.name === 'Purnima') add(native('Purnima', 'पूर्णिमा'), tx('Full moon'));
    if (p.tithi.name === 'Amavasya') add(native('Amavasya', 'अमावस्या'), tx('New moon'));
    return out;
  }, [dayKey, lat, lon, region, language]);

  const timings = [
    { key: 'brahma', label: t('mu.brahma'), hint: t('mu.brahmaHint'), t: p.brahmaMuhurta, good: true },
    { key: 'abhijit', label: t('mu.abhijit'), hint: t('mu.abhijitHint'), t: p.abhijitMuhurta, good: true },
    { key: 'rahu', label: t('ui.rahuKaal'), hint: t('mu.rahuHint'), t: p.rahuKaal, good: false },
    { key: 'yama', label: t('mu.yama'), hint: t('mu.yamaHint'), t: p.yamaghanta, good: false },
    { key: 'gulika', label: t('mu.gulika'), hint: t('mu.gulikaHint'), t: p.gulikaKaal, good: false },
  ].sort((a, b) => toMin(a.t.start) - toMin(b.t.start));
  const active = isToday ? timings.find((x) => inRange(nowMin, x.t.start, x.t.end)) : undefined;

  const elements: { label: string; value: string; extra?: string; icon: IconName; color: string }[] = [
    { label: t('el.tithi'), value: `${pakshaWord} ${native(p.tithi.name, p.tithi.nameHi)}`, extra: p.tithi.endTime !== '--:--' ? tf('panch.until', { t: p.tithi.endTime }) : undefined, icon: 'moon', color: 'plum' },
    { label: t('el.nakshatra'), value: native(p.nakshatra.name, p.nakshatra.nameHi), extra: p.nakshatra.endTime !== '--:--' ? tf('panch.until', { t: p.nakshatra.endTime }) : undefined, icon: 'star-four', color: 'saffron' },
    { label: t('el.yoga'), value: native(p.yoga.name, p.yoga.nameHi), icon: 'yin-yang', color: GOOD },
    { label: t('el.karana'), value: native(p.karana.name, p.karana.nameHi), icon: 'hourglass', color: 'neel' },
    { label: t('el.vara'), value: native(p.vara.name, p.vara.nameHi), extra: tx(p.vara.deity), icon: 'calendar-star', color: 'kumkum' },
  ];

  const facts: { label: string; value: string; icon: IconName; color: string }[] = [
    { label: tx('Sun sign'), value: native(SIGNS[extra.sunSign], SIGNS_HI[extra.sunSign]), icon: 'sun', color: 'saffron' },
    { label: tx('Moon sign'), value: native(SIGNS[extra.moonSign], SIGNS_HI[extra.moonSign]), icon: 'moon', color: 'neel' },
    { label: tx('Ritu'), value: native(extra.ritu.en, extra.ritu.hi), icon: 'leaf', color: GOOD },
    { label: tx('Ayana'), value: native(extra.ayana.en, extra.ayana.hi), icon: 'sun-horizon', color: 'plum' },
    { label: tx('Disha shool'), value: tx(DISHA_SHOOL[date.getDay()]), icon: 'compass', color: 'kumkum' },
    { label: tx('Moonset'), value: hhmm(extra.moonset), icon: 'moon-stars', color: 'neel' },
  ];

  const rows = table === 'chogh'
    ? slots.chogh.filter((c) => c.night === (half === 'night')).map((c) => ({ key: `c${+c.start}`, name: native(c.name, CH_HI[c.name]), sub: tx(c.quality === 'good' ? 'Auspicious' : c.quality === 'bad' ? 'Avoid new work' : 'Neutral, fine for travel'), color: QC[c.quality], start: c.start, end: c.end }))
    : slots.hora.slice(half === 'day' ? 0 : 12, half === 'day' ? 12 : 24).map((h) => ({ key: `h${+h.start}`, name: native(h.name, HORA_HI[h.name]), sub: tx(HORA_FOR[h.name]), color: tones.neel.fg, start: h.start, end: h.end }));
  const isLive = (s: Date, e: Date) => isToday && now >= s && now < e;

  const Section = ({ title }: { title: string }) => <Text style={[st.section, { color: colors.text }, display]}>{title}</Text>;
  const Seg = <T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) => (
    <View style={[st.seg, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}>
      {options.map(([k, label]) => (
        <TouchableOpacity key={k} onPress={() => onChange(k)} style={[st.segBtn, value === k && { backgroundColor: colors.primary }]}>
          <Text style={[st.segText, { color: value === k ? '#FFF' : colors.textSecondary }]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={t('f.panchang')} subtitle={profile?.location?.city ? tf('panch.for', { city: profile.location.city }) : t('panch.subtitle')} quick={false} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: DS.layout.screenPaddingH, paddingBottom: screenBottom }} showsVerticalScrollIndicator={false}>
        {/* Day navigator */}
        <View style={[st.nav, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <TouchableOpacity onPress={() => setOffset((o) => o - 1)} style={st.navBtn} hitSlop={8} accessibilityLabel={tx('Previous day')}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setOffset(0)} style={{ flex: 1, alignItems: 'center' }} disabled={isToday}>
            <Text style={[st.navKicker, { color: isToday ? colors.primary : colors.textTertiary }, noTrack]}>{t(isToday ? 'ui.today' : offset === 1 ? 'ui.tomorrow' : offset === -1 ? 'ui.yesterday' : 'ui.tapForToday').toUpperCase()}</Text>
            <Text style={[st.navDate, { color: colors.text }]}>{date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setOffset((o) => o + 1)} style={st.navBtn} hitSlop={8} accessibilityLabel={tx('Next day')}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Hero: Hindu date */}
        <View style={[st.hero, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Text style={[st.heroMonth, { color: colors.textSecondary }, noTrack]}>{native(month.en, month.hi)} · {pakshaWord}</Text>
          <Text style={[st.heroTithi, { color: colors.primary }, language === 'en' ? { fontFamily: DS.font.display } : language === 'hi' || language === 'mr' ? { fontFamily: DS.font.deva } : { fontWeight: '800' }]}>
            {native(p.tithi.name, p.tithi.nameHi)}
          </Text>
          <Text style={[st.heroSub, { color: colors.textSecondary }]}>
            {[extra.regional, `${tx('Vikram Samvat')} ${extra.sv.vikram}`, `${tx('Shaka')} ${extra.sv.shaka}`].filter(Boolean).join(' · ')}
          </Text>
          <View style={[st.sunRow, { borderTopColor: colors.primary + '25' }]}>
            {([
              { icon: 'sun-horizon', label: t('ui.sunrise'), v: p.sunrise, c: tones.saffron.fg },
              { icon: 'sun-dim', label: t('ui.sunset'), v: p.sunset, c: tones.plum.fg },
              { icon: 'moon-stars', label: t('ui.moonrise'), v: p.moonrise, c: tones.neel.fg },
            ] as { icon: IconName; label: string; v: string; c: string }[]).map((x) => (
              <View key={x.label} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                <Icon name={x.icon} size={20} color={x.c} />
                <Text style={[st.sunLabel, { color: colors.textTertiary }, noTrack]}>{x.label}</Text>
                <Text style={[st.sunVal, { color: colors.text }]}>{x.v || '-'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Festivals and observances */}
        {festivals.length > 0 && (
          <View style={[st.fest, { backgroundColor: tones.saffron.bg, borderColor: tones.saffron.fg + '40' }]}>
            <Icon name="confetti" size={20} color={tones.saffron.fg} />
            <View style={{ flex: 1, gap: 4 }}>
              {festivals.map((f) => (
                <Text key={f.name} style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>
                  <Text style={{ fontWeight: '800' }}>{f.name}</Text>{f.note ? <Text style={{ color: colors.textSecondary }}>{`  ${f.note}`}</Text> : null}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Right now */}
        {isToday && live && (
          <View style={[st.nowCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={st.nowCell}>
              <Text style={[st.nowKicker, { color: colors.textTertiary }, noTrack]}>{tx('Hora').toUpperCase()}</Text>
              <Text style={[st.nowVal, { color: colors.text }]} numberOfLines={1}>{native(live.hora.name, HORA_HI[live.hora.name])}</Text>
              <Text style={[st.nowSub, { color: colors.textSecondary }]} numberOfLines={2}>{tx(HORA_FOR[live.hora.name])}</Text>
              <Text style={[st.nowSub, { color: colors.textTertiary }]}>{tf('panch.until', { t: hhmm(live.hora.end) })}</Text>
            </View>
            <View style={[st.nowDivider, { backgroundColor: colors.divider }]} />
            <View style={st.nowCell}>
              <Text style={[st.nowKicker, { color: colors.textTertiary }, noTrack]}>{tx('Choghadiya').toUpperCase()}</Text>
              <Text style={[st.nowVal, { color: QC[live.choghadiya.quality] }]} numberOfLines={1}>{native(live.choghadiya.name, CH_HI[live.choghadiya.name])}</Text>
              <Text style={[st.nowSub, { color: colors.textSecondary }]} numberOfLines={2}>
                {active ? `${active.label}: ${tf('panch.until', { t: active.t.end })}` : live.nextGoodChoghadiya && live.choghadiya.quality !== 'good' ? `${tx('Next good')}: ${hhmm(live.nextGoodChoghadiya.start)}` : tx(live.choghadiya.quality === 'good' ? 'Auspicious' : 'Neutral, fine for travel')}
              </Text>
              <Text style={[st.nowSub, { color: colors.textTertiary }]}>{tf('panch.until', { t: hhmm(live.choghadiya.end) })}</Text>
            </View>
          </View>
        )}

        {/* Five elements */}
        <Section title={t('panch.fiveElements')} />
        <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {elements.map((e, i) => (
            <View key={e.label} style={[st.elRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
              <View style={[st.elIcon, { backgroundColor: tone(e.color).bg }]}>
                <Icon name={e.icon} size={22} color={tone(e.color).fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.elLabel, { color: colors.textTertiary }, noTrack]}>{e.label.toUpperCase()}</Text>
                <Text style={[st.elValue, { color: colors.text }]}>{e.value}</Text>
              </View>
              {!!e.extra && <Text style={[st.elExtra, { color: colors.textTertiary }]}>{e.extra}</Text>}
            </View>
          ))}
        </View>

        {/* Sky and season */}
        <Section title={tx('Sky and season')} />
        <View style={st.grid}>
          {facts.map((f) => (
            <View key={f.label} style={[st.fact, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <Icon name={f.icon} size={18} color={tone(f.color).fg} />
              <Text style={[st.factLabel, { color: colors.textTertiary }, noTrack]}>{f.label}</Text>
              <Text style={[st.factVal, { color: colors.text }]} numberOfLines={2}>{f.value}</Text>
            </View>
          ))}
        </View>

        {/* Muhurta timeline */}
        <Section title={t('panch.muhurta')} />
        <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {timings.map((x, i) => {
            const c = x.good ? GOOD : BAD;
            const on = isToday && inRange(nowMin, x.t.start, x.t.end);
            return (
              <View key={x.key} style={[st.tRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                <View style={[st.tBar, { backgroundColor: c }]} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[st.tLabel, { color: colors.text }]}>{x.label}</Text>
                    {on && <View style={[st.liveTag, { backgroundColor: c }]}><Text style={st.liveText}>{t('panch.now')}</Text></View>}
                  </View>
                  <Text style={[st.tHint, { color: colors.textSecondary }]}>{x.hint}</Text>
                </View>
                <Text style={[st.tTime, { color: c }]}>{x.t.start}–{x.t.end}</Text>
              </View>
            );
          })}
        </View>

        {/* Choghadiya / Hora tables */}
        <Section title={tx('Hour by hour')} />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <Seg value={table} onChange={setTable} options={[['chogh', tx('Choghadiya')], ['hora', tx('Hora')]]} />
          <Seg value={half} onChange={setHalf} options={[['day', tx('Day')], ['night', tx('Night')]]} />
        </View>
        <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {rows.map((r, i) => {
            const on = isLive(r.start, r.end);
            return (
              <View key={r.key} style={[st.sRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }, on && { backgroundColor: colors.primary + '12' }]}>
                <View style={[st.sDot, { backgroundColor: r.color }]} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[st.sName, { color: colors.text }]}>{r.name}</Text>
                    {on && <View style={[st.liveTag, { backgroundColor: colors.primary }]}><Text style={st.liveText}>{t('panch.now')}</Text></View>}
                  </View>
                  <Text style={[st.tHint, { color: colors.textSecondary }]} numberOfLines={1}>{r.sub}</Text>
                </View>
                <Text style={[st.sTime, { color: colors.text }]}>{hhmm(r.start)}–{hhmm(r.end)}</Text>
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
  heroMonth: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  heroTithi: { fontSize: 38, lineHeight: 56, marginTop: 2, textAlign: 'center' },
  heroSub: { fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  sunRow: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 16, paddingTop: 14, borderTopWidth: 1 },
  sunLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  sunVal: { fontSize: 14, fontWeight: '800' },
  fest: { flexDirection: 'row', gap: 10, marginTop: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  nowCard: { flexDirection: 'row', marginTop: 12, borderRadius: 16, borderWidth: 1, paddingVertical: 14 },
  nowCell: { flex: 1, paddingHorizontal: 14, gap: 2 },
  nowDivider: { width: 1 },
  nowKicker: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1 },
  nowVal: { fontSize: 18, fontWeight: '800' },
  nowSub: { fontSize: 12, lineHeight: 17 },
  section: { fontSize: 17, fontWeight: '800', marginTop: 22, marginBottom: 10 },
  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  elRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  elIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  elLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8 },
  elValue: { fontSize: 15.5, fontWeight: '800', marginTop: 1 },
  elExtra: { fontSize: 11.5, fontWeight: '700', maxWidth: 110, textAlign: 'right' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fact: { width: '47%', flexGrow: 1, borderRadius: 14, borderWidth: 1, padding: 12, gap: 4 },
  factLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  factVal: { fontSize: 14, fontWeight: '800' },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingRight: 14 },
  tBar: { width: 4, alignSelf: 'stretch', borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  tLabel: { fontSize: 14.5, fontWeight: '800' },
  tHint: { fontSize: 12, marginTop: 2 },
  tTime: { fontSize: 13.5, fontWeight: '800' },
  seg: { flex: 1, flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 3 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 9 },
  segText: { fontSize: 13, fontWeight: '800' },
  sRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14 },
  sDot: { width: 10, height: 10, borderRadius: 5 },
  sName: { fontSize: 14.5, fontWeight: '800' },
  sTime: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  liveTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  liveText: { color: '#FFF', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6 },
  foot: { fontSize: 11.5, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
