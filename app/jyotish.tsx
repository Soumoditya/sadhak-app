import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Platform, BackHandler, Switch, useWindowDimensions, InteractionManager,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDialog } from '../contexts/DialogContext';
import { Header, Icon } from '../components/ui';
import { useDsInsets, DS } from '../constants/ds';
import KundliChart, { ABBR, type ChartStyle } from '../components/charts/KundliChart';
import { router } from 'expo-router';
import {
  computeAndSaveKundli, computeKundli, saveKundli, loadNatal, getCachedDaily, getPrediction, KUNDLI_MAX_AGE_MS, localDateKey,
  type BirthInput, type Kundli, type Prediction, type PredictionPeriod,
} from '../services/jyotish';
import { downloadKundliPdf, shareKundliPdf } from '../services/jyotishPdf';
import { openFile } from '../services/downloads';
import { cacheNatal } from '../services/natalCache';
import { HORA_HI } from '../services/hora';
import { NAKSHATRA_NAMES } from '../services/panchang';
import { grahaFlags, analyse, SIGNS, SIGNS_HI, type Loc, saturnPeriods, antardashas, extraBirthDetails, fmtDeg, localPrediction, type SaturnPeriod } from '../services/jyotishExtras';
import { calculatePanchang } from '../services/panchang';
import { scheduleDailyAstroReminder, cancelDailyAstroReminder, getAstroReminder } from '../services/notifications';

export default function JyotishScreen() {
  const { user, profile, updateProfile } = useAuth();
  const { colors, tones } = useTheme();
  const { t: tr, tx, language, display, native, locale } = useLanguage();
  // Localiser for the on-device readings (yogas, doshas, guidance).
  const loc = useMemo<Loc>(() => ({
    t: (str, v) => { const base = tx(str); return v ? base.replace(/\{(\w+)\}/g, (_, k) => (v[k] != null ? String(v[k]) : `{${k}}`)) : base; },
    planet: (n) => native(n, HORA_HI[n]),
    sign: (i) => native(SIGNS[i], SIGNS_HI[i]),
    nak: (i) => native(NAKSHATRA_NAMES[i].en, NAKSHATRA_NAMES[i].hi),
    ord: (n) => (language === 'hi' || language === 'mr' ? `${n}वें` : language === 'bn' || language === 'as' ? `${n} নম্বর` : `${n}${['th', 'st', 'nd', 'rd'][((n % 100) - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th'}`),
    locale,
  }), [tx, native, language, locale]);
  const { width } = useWindowDimensions();
  const dialog = useDialog();
  const { screenBottom } = useDsInsets();

  const [kundli, setKundli] = useState<Kundli | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [chartTab, setChartTab] = useState<'d1' | 'd9' | 'd10' | 'moon'>('d1');
  const [pred, setPred] = useState<Prediction | null>(null);
  const [predPeriod, setPredPeriod] = useState<PredictionPeriod>('daily');
  const [tab, setTab] = useState<'overview' | 'planets' | 'dasha' | 'yogas' | 'details'>('overview');
  const [predSource, setPredSource] = useState<'local' | 'ai'>('local');
  const [aiBusy, setAiBusy] = useState(false);
  const [chartStyle, setChartStyle] = useState<ChartStyle>(language === 'bn' || language === 'as' || language === 'od' ? 'east' : 'north');
  const [openMaha, setOpenMaha] = useState<string | null>(null);
  const [saturn, setSaturn] = useState<SaturnPeriod[]>([]);
  const [savedBirth, setSavedBirth] = useState<BirthInput | null>(null);
  const birthEdited = useRef(false); // set once the user saves new birth details
  const [pdfBusy, setPdfBusy] = useState<false | 'save' | 'share'>(false);
  const [remOn, setRemOn] = useState(false);
  const [remTime, setRemTime] = useState<Date>(() => { const d = new Date(); d.setHours(7, 0, 0, 0); return d; });
  const [showRemPicker, setShowRemPicker] = useState(false);

  // ── Birth-form state (defaults; prefilled from the saved natal record) ──
  const [date, setDate] = useState<Date>(new Date(1995, 0, 1));
  const [time, setTime] = useState<Date>(() => { const d = new Date(); d.setHours(6, 0, 0, 0); return d; });
  const [hasTime, setHasTime] = useState(true);
  const [gender, setGender] = useState<'male' | 'female'>(profile?.gender || 'male');
  const [place, setPlace] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [tzOffset, setTzOffset] = useState('5.5');
  const [tzOther, setTzOther] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);

  const prefill = (b: BirthInput) => {
    setDate(new Date(b.date + 'T00:00:00'));
    const [h, m] = (b.time || '06:00').split(':').map(Number);
    const td = new Date(); td.setHours(h, m, 0, 0); setTime(td);
    setHasTime(b.hasTime); setGender(b.gender); setPlace(b.place);
    setCoords({ lat: b.lat, lng: b.lng }); setTzOffset(String(b.tzOffset)); setTzOther(b.tzOffset !== 5.5);
  };

  // Load the saved chart (from the owner-only subcollection) on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.uid) { setLoading(false); setEditing(true); return; }
      const natal = await loadNatal(user.uid);
      if (!active) return;
      if (natal) { prefill(natal.birth); setKundli(natal.kundli); setSavedBirth(natal.birth); cacheNatal(user.uid, natal.kundli); } else { setEditing(true); }
      setLoading(false);
      // The running dasha + Sade Sati depend on today's date; refresh a stale
      // cached chart quietly so they don't stay frozen at the first compute.
      if (natal && (!natal.computedAt || Date.now() - natal.computedAt > KUNDLI_MAX_AGE_MS)) {
        try {
          const fresh = await computeKundli(natal.birth);
          // Don't clobber a chart the user re-entered while this was in flight.
          if (!birthEdited.current) {
            await saveKundli(user.uid, natal.birth, fresh);
            cacheNatal(user.uid, fresh);
            if (active && !birthEdited.current) setKundli(fresh);
          }
        } catch {}
      }
    })();
    return () => { active = false; };
  }, [user?.uid]);

  // Load the saved daily-reminder time (if any).
  useEffect(() => {
    getAstroReminder().then((r) => {
      if (r) { setRemOn(true); const d = new Date(); d.setHours(r.hour, r.minute, 0, 0); setRemTime(d); }
    }).catch(() => {});
  }, []);

  const toggleReminder = async () => {
    try {
      if (remOn) { await cancelDailyAstroReminder(); setRemOn(false); }
      else { await scheduleDailyAstroReminder(remTime.getHours(), remTime.getMinutes()); setRemOn(true); }
    } catch (e: any) { dialog.alert('Reminder', String(e?.message || e).slice(0, 160)); }
  };

  const downloadPdf = async () => {
    if (!kundli || pdfBusy) return;
    try {
      setPdfBusy('save');
      const r = await downloadKundliPdf(kundli, savedBirth, profile?.displayName);
      if (r.saved) {
        dialog.alert('Saved to Downloads', `${r.fileName}`, [
          { text: 'OK', style: 'cancel' },
          { text: 'Open', onPress: () => openFile(r.savedUri!, 'application/pdf', r.uri) },
        ], { tone: 'success' });
      } else {
        dialog.alert('Downloads not chosen', 'Pick the Downloads folder to save there, or share the PDF instead.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Share instead', onPress: sharePdf },
        ]);
      }
    } catch (e: any) { dialog.alert('PDF failed', String(e?.message || e).slice(0, 160)); }
    finally { setPdfBusy(false); }
  };
  const sharePdf = async () => {
    if (!kundli) return;
    try { setPdfBusy('share'); await shareKundliPdf(kundli, savedBirth, profile?.displayName); }
    catch (e: any) { dialog.alert('PDF failed', String(e?.message || e).slice(0, 160)); }
    finally { setPdfBusy(false); }
  };

  // Chart style preference (North / South / East).
  useEffect(() => {
    AsyncStorage.getItem('sadhak_chart_style').then((v) => { if (v === 'north' || v === 'south' || v === 'east') setChartStyle(v); }).catch(() => {});
  }, []);
  const pickStyle = (st: ChartStyle) => { setChartStyle(st); AsyncStorage.setItem('sadhak_chart_style', st).catch(() => {}); };

  // On-device analysis: flags, yogas/doshas, birth panchang, Saturn periods.
  const flags = useMemo(() => (kundli ? grahaFlags(kundli) : {}), [kundli]);
  const analysis = useMemo(() => (kundli ? analyse(kundli, loc) : { yogas: [], doshas: [] }), [kundli, loc]);
  const birthPanchang = useMemo<[string, string][]>(() => {
    if (!savedBirth) return [];
    try {
      const [y, m, d] = savedBirth.date.split('-').map(Number);
      const [hh, mm] = (savedBirth.hasTime ? savedBirth.time : '12:00').split(':').map(Number);
      const p = calculatePanchang(new Date(y, m - 1, d, hh, mm), savedBirth.lat, savedBirth.lng);
      return [
        ['Tithi at birth', `${p.tithi.paksha === 'shukla' ? 'Shukla' : 'Krishna'} ${p.tithi.name}`],
        ['Yoga at birth', p.yoga.name], ['Karana at birth', p.karana.name], ['Weekday of birth', p.vara.name],
      ];
    } catch { return []; }
  }, [savedBirth]);
  useEffect(() => {
    if (!kundli) return;
    const task = InteractionManager.runAfterInteractions(() => {
      try { const y = new Date().getFullYear(); setSaturn(saturnPeriods(kundli, y - 35, y + 45)); } catch { setSaturn([]); }
    });
    return () => task.cancel();
  }, [kundli]);

  // Guidance: an on-device reading from today's transits shows at once; the
  // Sadhak AI reading replaces it when the server answers (it can be slow or
  // overloaded, which used to leave this card stuck on "couldn't load").
  const aiSeq = useRef(0);
  const showPeriod = (period: PredictionPeriod) => {
    if (!kundli) return;
    setPredPeriod(period);
    setPred(localPrediction(kundli, period, new Date(), loc));
    setPredSource('local');
    const seq = ++aiSeq.current;
    setAiBusy(true);
    const first = profile?.displayName?.split(' ')[0];
    // The AI reading is English-only; other languages keep the on-device one.
    if (language !== 'en') { setAiBusy(false); return; }
    const ai = period === 'daily' && user?.uid ? getCachedDaily(user.uid, kundli, first) : getPrediction(kundli, period, first);
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 25000));
    Promise.race([ai, timeout])
      .then((p) => { if (seq === aiSeq.current && p?.overview) { setPred(p); setPredSource('ai'); } })
      .catch(() => {})
      .finally(() => { if (seq === aiSeq.current) setAiBusy(false); });
  };
  useEffect(() => { if (kundli) showPeriod(predPeriod || 'daily'); }, [kundli, user?.uid, language]);

  // While editing an existing chart, back (header or hardware) cancels the edit
  // instead of leaving the screen.
  useEffect(() => {
    if (!editing || !kundli) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setEditing(false); return true; });
    return () => sub.remove();
  }, [editing, kundli]);

  const loadPeriod = (period: PredictionPeriod) => showPeriod(period);

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timeStr = `${pad(time.getHours())}:${pad(time.getMinutes())}`;

  // Returns the coordinates so "Compute" can locate the place itself when the
  // user typed a city but didn't tap Locate.
  const geocode = async (): Promise<{ lat: number; lng: number } | null> => {
    if (!place.trim()) { dialog.alert('Enter a place', 'Type your birth city/town first.'); return null; }
    try {
      setGeocoding(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`,
        { headers: { 'User-Agent': 'SadhakApp/1.0 (soumodityapramanik@gmail.com)' } },
      );
      const arr = await res.json();
      if (!arr?.length) { dialog.alert('Not found', 'Could not find that place. Try adding the state or country.'); return null; }
      const c = { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
      setCoords(c);
      setPlace(arr[0].display_name.split(',').slice(0, 3).join(', '));
      return c;
    } catch {
      dialog.alert('Network error', 'Could not look up the place. Check your connection.');
      return null;
    } finally { setGeocoding(false); }
  };

  const saveBirth = async () => {
    if (!user?.uid) { dialog.alert('Sign in needed', 'Please sign in to save your birth chart.'); return; }
    const where = coords ?? (place.trim() ? await geocode() : null);
    if (!where) { if (!place.trim()) dialog.alert('Set birth place', 'Type the city or town you were born in.'); return; }
    const tz = parseFloat(tzOffset);
    if (!Number.isFinite(tz) || tz < -12 || tz > 14) { dialog.alert('Timezone', 'Enter a valid timezone offset (e.g. 5.5 for India).'); return; }
    const birth: BirthInput = { date: dateStr, time: timeStr, hasTime, place: place.trim(), lat: where.lat, lng: where.lng, tzOffset: tz, gender };
    try {
      setSaving(true);
      birthEdited.current = true;
      // Birth details are sensitive → saved only in the owner-only jyotish
      // subcollection (inside computeAndSaveKundli), NOT on the public profile.
      const k = await computeAndSaveKundli(user.uid, birth);
      await updateProfile({ hasBirthChart: true } as any); // non-sensitive flag
      setKundli(k); setSavedBirth(birth);
      if (user?.uid) cacheNatal(user.uid, k);
      setEditing(false);
    } catch (e: any) {
      dialog.alert('Could not save', String(e?.message || e).slice(0, 160));
    } finally { setSaving(false); }
  };

  // ─────────── FORM ───────────
  if (editing || (!kundli && !loading)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title={tx('Your Birth Details')} subtitle={tx('Used to compute your authentic Vedic chart')} onBack={kundli ? () => setEditing(false) : undefined} />
        <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ padding: 20, paddingBottom: screenBottom }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[s.privacy, { backgroundColor: colors.primary + '0E', borderColor: colors.primary + '25' }]}>
            <MaterialCommunityIcons name="lock-outline" size={16} color={colors.primary} />
            <Text style={{ color: colors.textSecondary, fontSize: 12.5, flex: 1, lineHeight: 18 }}>{tx(
              'Private to you. Birth details are stored only in your account and never shown on your profile.'
            )}</Text>
          </View>
          <Text style={[s.label, { color: colors.textTertiary }]}>{tx('DATE OF BIRTH')}</Text>
          <TouchableOpacity style={[s.field, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]} onPress={() => setShowDate(true)}>
            <MaterialCommunityIcons name="calendar" size={18} color={colors.primary} />
            <Text style={[s.fieldText, { color: colors.text }]}>{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          </TouchableOpacity>
          {showDate && (
            <DateTimePicker value={date} mode="date" maximumDate={new Date()} onChange={(e, d) => { setShowDate(Platform.OS === 'ios'); if (d) setDate(d); }} />
          )}

          <View style={s.rowBetween}>
            <Text style={[s.label, { color: colors.textTertiary }]}>{tx('TIME OF BIRTH')}</Text>
            <TouchableOpacity onPress={() => setHasTime((v) => !v)} style={s.timeToggle}>
              <MaterialCommunityIcons name={hasTime ? 'checkbox-marked' : 'checkbox-blank-outline'} size={16} color={colors.primary} />
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{tx('I know my birth time')}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity disabled={!hasTime} style={[s.field, { borderColor: colors.cardBorder, backgroundColor: colors.surface, opacity: hasTime ? 1 : 0.5 }]} onPress={() => setShowTime(true)}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={colors.primary} />
            <Text style={[s.fieldText, { color: colors.text }]}>{hasTime ? time.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : 'Unknown — chart uses noon (lagna approximate)'}</Text>
          </TouchableOpacity>
          {showTime && hasTime && (
            <DateTimePicker value={time} mode="time" onChange={(e, d) => { setShowTime(Platform.OS === 'ios'); if (d) setTime(d); }} />
          )}

          <Text style={[s.label, { color: colors.textTertiary }]}>GENDER</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['male', 'female'] as const).map((g) => {
              const active = gender === g;
              return (
                <TouchableOpacity key={g} onPress={() => setGender(g)} style={[s.genderChip, { borderColor: active ? colors.primary : colors.cardBorder, backgroundColor: active ? colors.primary + '15' : colors.surface }]}>
                  <MaterialCommunityIcons name={g === 'male' ? 'gender-male' : 'gender-female'} size={17} color={active ? colors.primary : colors.textSecondary} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: active ? colors.primary : colors.text }}>{g === 'male' ? 'Male' : 'Female'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[s.label, { color: colors.textTertiary }]}>{tx('BIRTH PLACE')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[s.field, { flex: 1, borderColor: colors.cardBorder, backgroundColor: colors.surface, color: colors.text }]}
              placeholder={tx('City, State')} placeholderTextColor={colors.textTertiary}
              value={place} onChangeText={(t) => { setPlace(t); setCoords(null); }}
            />
            <TouchableOpacity onPress={() => { geocode(); }} style={[s.locateBtn, { backgroundColor: colors.primary }]}>
              {geocoding ? <ActivityIndicator size="small" color="#FFF" /> : <><MaterialCommunityIcons name="map-marker" size={16} color="#FFF" /><Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>{tx('Locate')}</Text></>}
            </TouchableOpacity>
          </View>
          {coords && <Text style={{ color: colors.tulsiGreen || '#2D6A4F', fontSize: 11.5, marginTop: 4 }}>✓ {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}</Text>}

          <Text style={[s.label, { color: colors.textTertiary }]}>{tx('TIMEZONE AT BIRTH')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {([['india', 'India (IST +5:30)'], ['other', 'Other']] as const).map(([k, label]) => {
              const active = k === 'india' ? !tzOther : tzOther;
              return (
                <TouchableOpacity key={k} onPress={() => { setTzOther(k === 'other'); if (k === 'india') setTzOffset('5.5'); }}
                  style={[s.genderChip, { borderColor: active ? colors.primary : colors.cardBorder, backgroundColor: active ? colors.primary + '15' : colors.surface }]}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: active ? colors.primary : colors.text }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {tzOther && (
            <>
              <TextInput
                style={[s.field, { marginTop: 10, borderColor: colors.cardBorder, backgroundColor: colors.surface, color: colors.text }]}
                keyboardType="numbers-and-punctuation" value={tzOffset} onChangeText={setTzOffset} placeholder={tx('e.g. 5.75 or -5')} placeholderTextColor={colors.textTertiary}
              />
              <Text style={{ color: colors.textTertiary, fontSize: 11.5, lineHeight: 16, marginTop: 4 }}>{tx('Hours from UTC at the place of birth (Nepal 5.75, UK 0, New York -5).')}</Text>
            </>
          )}

          <TouchableOpacity onPress={saveBirth} disabled={saving} style={[s.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}>
            {saving ? <ActivityIndicator color="#FFF" /> : <><MaterialCommunityIcons name="star-four-points" size={18} color="#FFF" /><Text style={s.saveBtnText}>{tx('Compute my chart')}</Text></>}
          </TouchableOpacity>
          {kundli && <TouchableOpacity onPress={() => setEditing(false)} style={{ alignItems: 'center', marginTop: 14 }}><Text style={{ color: colors.textSecondary }}>{tx('Cancel')}</Text></TouchableOpacity>}
        </KeyboardAwareScrollView>
      </View>
    );
  }

  // ─────────── LOADING ───────────
  if (loading || !kundli) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title={tr('f.jyotish')} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary }}>{tx('Casting your chart…')}</Text>
        </View>
      </View>
    );
  }

  // ─────────── DASHBOARD ───────────
  const b = kundli.basics;
  const todayKey = localDateKey();
  const maha = kundli.dasha?.maha.find((m) => m.start <= todayKey && todayKey < m.end);
  const antars = maha ? antardashas(maha) : [];
  const antar = antars.find((a) => a.start <= todayKey && todayKey < a.end);
  const sadeNow = saturn.find((p) => p.kind === 'sadeSati' && p.start <= new Date() && new Date() < p.end);
  const sadeNext = saturn.find((p) => p.kind === 'sadeSati' && p.start > new Date());
  const sadePast = [...saturn].reverse().find((p) => p.kind === 'sadeSati' && p.end <= new Date());
  const dhaiyaNext = saturn.find((p) => p.kind !== 'sadeSati' && p.end > new Date());
  const presentYogas = analysis.yogas.filter((y) => y.present);
  const presentDoshas = analysis.doshas.filter((d) => d.present);
  const chartData = chartTab === 'd1' ? null : chartTab === 'd9' ? kundli.charts?.d9 : chartTab === 'd10' ? kundli.charts?.d10 : kundli.charts?.moon;
  const pct = (s: string, e: string) => {
    const a = new Date(s + 'T00:00:00').getTime(), z = new Date(e + 'T00:00:00').getTime();
    return Math.max(0, Math.min(1, (Date.now() - a) / (z - a)));
  };
  const deva = language === 'hi' || language === 'mr';
  const infoRows: [string, string][] = [
    ['Lagna (Ascendant)', native(b.lagna, b.lagnaHi)], ['Rashi (Moon sign)', `${native(b.rashi, b.rashiHi)} · ${loc.planet(b.rashiLord)}`],
    ['Nakshatra', `${native(b.nakshatra, b.nakshatraHi)} · ${tx('pada')} ${b.pada}`], ['Nakshatra lord', loc.planet(b.nakLord)],
    ...extraBirthDetails(kundli),
    ['Gana', tx(b.gana)], ['Nadi', tx(b.nadi)], ['Yoni', tx(b.yoni)], ['Deity', tx(b.deity)],
    ...birthPanchang,
    ['Ayanamsa', `Lahiri ${Number(kundli.meta.ayanamsa).toFixed(2)}°`],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={tr('f.jyotish')} subtitle={`${native(b.rashi, b.rashiHi)} · ${native(b.nakshatra, b.nakshatraHi)}`} right={
        <TouchableOpacity onPress={() => setEditing(true)} hitSlop={8} accessibilityLabel="Edit birth details"
          style={[s.iconBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Icon name="note-pencil" size={18} color={colors.text} />
        </TouchableOpacity>
      } />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={s.tabBar}>
        {([['overview', 'Overview'], ['planets', 'Planets'], ['dasha', 'Dasha'], ['yogas', 'Yogas & doshas'], ['details', 'Birth details']] as const).map(([k, label]) => {
          const on = tab === k;
          return (
            <TouchableOpacity key={k} onPress={() => setTab(k)} style={[s.tabPill, { backgroundColor: on ? colors.primary : colors.surface, borderColor: on ? colors.primary : colors.cardBorder }]} accessibilityState={{ selected: on }}>
              <Text style={{ color: on ? '#FFF' : colors.textSecondary, fontWeight: '800', fontSize: 13.5 }}>{tx(label)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 6, paddingBottom: screenBottom }} showsVerticalScrollIndicator={false}>
        {tab === 'overview' && (<>
        <View style={s.chipRow}>
          {maha && (
            <View style={[s.statusChip, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <Icon name="hourglass" size={14} color={colors.primary} />
              <Text style={[s.statusText, { color: colors.text }]}>{loc.planet(maha.lord)}{antar ? ` / ${loc.planet(antar.lord)}` : ''} {tx('dasha')}</Text>
            </View>
          )}
          <View style={[s.statusChip, { backgroundColor: sadeNow ? tones.kumkum.bg : colors.surface, borderColor: sadeNow ? tones.kumkum.fg + '44' : colors.cardBorder }]}>
            <Icon name="clock" size={14} color={sadeNow ? tones.kumkum.fg : colors.textSecondary} />
            <Text style={[s.statusText, { color: sadeNow ? tones.kumkum.fg : colors.text }]}>
              {sadeNow ? `${tx('Sade Sati')} · ${sadeNow.phases?.find((ph) => ph.start <= new Date() && new Date() < ph.end)?.name || ''}` : tx('No Sade Sati now')}
            </Text>
          </View>
        </View>

        </>)}

        {/* Chart */}
        {tab === 'overview' && (
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <View style={s.cardHead}>
            <Text style={[s.cardTitle, { color: colors.text }, display]}>{tx('Birth chart')}</Text>
            <View style={[s.segment, { backgroundColor: colors.surfaceSecondary }]}>
              {(['north', 'south', 'east'] as const).map((st) => (
                <TouchableOpacity key={st} onPress={() => pickStyle(st)} style={[s.segBtn, chartStyle === st && { backgroundColor: colors.surface }]}>
                  <Text style={[s.segText, { color: chartStyle === st ? colors.primary : colors.textSecondary }]}>{tx(st === 'north' ? 'North' : st === 'south' ? 'South' : 'East')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={s.chartTabs}>
            {([['d1', 'D1 · ' + tx('Rashi')], ['d9', 'D9 · ' + tx('Navamsa')], ['d10', 'D10 · ' + tx('Dasamsa')], ['moon', tx('Moon chart')]] as const).map(([key, label]) => {
              const active = chartTab === key;
              const disabled = key !== 'd1' && !kundli.charts;
              return (
                <TouchableOpacity key={key} disabled={disabled} onPress={() => setChartTab(key)}
                  style={[s.chartTab, { backgroundColor: active ? colors.primary : 'transparent', borderColor: active ? colors.primary : colors.cardBorder, opacity: disabled ? 0.4 : 1 }]}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#FFF' : colors.textSecondary }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[s.glance, { color: colors.text }]} numberOfLines={2}>
            {tx('Lagna')} <Text style={{ fontWeight: '800' }}>{native(b.lagna, b.lagnaHi)}</Text>
            {'  ·  '}{tx('Moon')} <Text style={{ fontWeight: '800' }}>{native(b.rashi, b.rashiHi)}</Text>
            {'  ·  '}<Text style={{ fontWeight: '800' }}>{native(b.nakshatra, b.nakshatraHi)}</Text> {b.pada}
          </Text>
          <Text style={[s.chartSub, { color: colors.textTertiary }]}>
            {tx(chartTab === 'd1' ? 'Birth chart: overall life and body' : chartTab === 'd9' ? 'Navamsa: marriage, dharma and inner strength' : chartTab === 'd10' ? 'Dasamsa: career and profession' : 'Moon chart: mind and emotions')}
          </Text>
          <View style={{ alignItems: 'center' }}>
            <KundliChart
              grahas={chartData ? chartData.planets : kundli.planets}
              lagnaSignIndex={chartData ? chartData.lagnaSignIndex : kundli.lagna.signIndex}
              flags={chartData ? undefined : flags}
              style={chartStyle}
              size={Math.min(width - 72, 320)}
              lang={language}
              colors={colors as any}
            />
          </View>
          <Text style={[s.legend, { color: colors.textTertiary }]}>{tx('R retrograde · C combust · V vargottama')}</Text>
        </View>

        )}

        {tab === 'overview' && (<>
        {/* Guidance */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <View style={s.cardHead}>
            <Text style={[s.cardTitle, { color: colors.text }, display]}>{tx('Your guidance')}</Text>
            {predSource === 'ai' && <Text style={[s.srcTag, { color: tones.plum.fg, backgroundColor: tones.plum.bg }]}>Sadhak AI</Text>}
          </View>
          <View style={[s.segment, { backgroundColor: colors.surfaceSecondary, alignSelf: 'stretch', marginBottom: 12 }]}>
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => (
              <TouchableOpacity key={p} onPress={() => loadPeriod(p)} style={[s.segBtn, { flex: 1 }, predPeriod === p && { backgroundColor: colors.surface }]}>
                <Text style={[s.segText, { color: predPeriod === p ? colors.primary : colors.textSecondary }]}>{tx(p === 'daily' ? 'Today' : p === 'weekly' ? 'Week' : p === 'monthly' ? 'Month' : 'Year')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {pred ? (
            <View style={{ gap: 12 }}>
              {!!pred.overview && <Text style={{ color: colors.text, fontSize: 14.5, lineHeight: 22 }}>{pred.overview}</Text>}
              {!!pred.goodFor?.length && <GuideList title={tx('Good for')} icon="check-circle" color={tones.tulsi.fg} items={pred.goodFor} colors={colors} />}
              {!!pred.avoid?.length && <GuideList title={tx('Best to avoid')} icon="x-circle" color={tones.kumkum.fg} items={pred.avoid} colors={colors} />}
              {!!pred.doToday?.length && <GuideList title={tx('Do')} icon="star-four" color={colors.primary} items={pred.doToday} colors={colors} />}
              {!!pred.remedies?.length && <GuideList title={tx('Remedies')} icon="flower-lotus" color={tones.plum.fg} items={pred.remedies} colors={colors} />}
              {!!pred.transit && <Text style={{ color: colors.textSecondary, fontSize: 12.5, lineHeight: 18 }}>{tx('Transit:')} {pred.transit}</Text>}
              {!!pred.lucky && (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {!!pred.lucky.color && <View style={[s.luckyChip, { borderColor: colors.cardBorder }]}><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{tx('Colour ·')} {pred.lucky.color}</Text></View>}
                  {!!pred.lucky.number && <View style={[s.luckyChip, { borderColor: colors.cardBorder }]}><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{tx('Number ·')} {pred.lucky.number}</Text></View>}
                  {!!pred.lucky.direction && <View style={[s.luckyChip, { borderColor: colors.cardBorder }]}><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{tx('Direction ·')} {pred.lucky.direction}</Text></View>}
                </View>
              )}
              {aiBusy && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{tx('Sadhak AI is refining this reading…')}</Text>
                </View>
              )}
              <Text style={{ color: colors.textTertiary, fontSize: 11, lineHeight: 16 }}>{tx(predSource === 'ai'
                ? 'Guidance grounded in your exact chart & today\'s transits — reflective, not a guarantee.'
                : 'Worked out from today\'s planetary transits over your chart (Moon tara, gochara and dasha). Reflective, not a guarantee.')}</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 18 }}><ActivityIndicator color={colors.primary} /></View>
          )}
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <ActionTile icon="sparkle" label={tx('Ask about my chart')} tone={tones.plum} onPress={() => router.push('/ask?astro=1')} colors={colors} />
          <ActionTile icon="file-text" label={pdfBusy === 'save' ? tx('Saving…') : tx('Save PDF')} tone={tones.saffron} onPress={downloadPdf} busy={pdfBusy === 'save'} colors={colors} />
          <ActionTile icon="share-network" label={pdfBusy === 'share' ? tx('Preparing…') : tx('Share PDF')} tone={tones.neel} onPress={sharePdf} busy={pdfBusy === 'share'} colors={colors} />
        </View>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder, flexDirection: 'row', alignItems: 'center' }]}>
          <Icon name="bell-ringing" size={20} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: colors.text, fontSize: 14.5, fontWeight: '700' }}>{tx('Daily guidance reminder')}</Text>
            <TouchableOpacity onPress={() => setShowRemPicker(true)} disabled={!remOn}>
              <Text style={{ color: remOn ? colors.primary : colors.textTertiary, fontSize: 12.5, marginTop: 1 }}>
                {remOn ? `${remTime.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} · ${tx('tap to change')}` : tx('Off')}
              </Text>
            </TouchableOpacity>
          </View>
          <Switch value={remOn} onValueChange={toggleReminder} trackColor={{ true: colors.primary + '80', false: colors.cardBorder }} thumbColor={remOn ? colors.primary : '#F3F4F6'} />
          {showRemPicker && (
            <DateTimePicker value={remTime} mode="time" onChange={async (e, d) => {
              setShowRemPicker(Platform.OS === 'ios');
              if (d) { setRemTime(d); if (remOn) { try { await scheduleDailyAstroReminder(d.getHours(), d.getMinutes()); } catch {} } }
            }} />
          )}
        </View>

        </>)}

        {/* Birth details */}
        {tab === 'details' && (<Section2 title={tx('Birth details')} colors={colors} display={display}>
          {infoRows.map(([k, v], i) => (
            <View key={k} style={[s.infoRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
              <Text style={[s.infoKey, { color: colors.textSecondary }]}>{tx(k)}</Text>
              <Text style={[s.infoVal, { color: colors.text }]}>{v}</Text>
            </View>
          ))}
        </Section2>

        )}

        {/* Grahas */}
        {tab === 'planets' && (<Section2 title={tx('Planets')} colors={colors} display={display}>
          {kundli.planets.map((p, i) => {
            const f = flags[p.name] || {};
            const dig = p.dignity && p.dignity !== '—' && p.dignity !== 'Neutral' ? p.dignity : null;
            const tone = dig === 'Exalted' || dig === 'Own sign' ? tones.tulsi : dig === 'Debilitated' ? tones.kumkum : tones.neel;
            return (
              <View key={p.name} style={[s.graha, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
                <View style={[s.grahaBadge, { backgroundColor: p.name === 'Sun' || p.name === 'Moon' ? tones.saffron.bg : colors.surfaceSecondary }]}>
                  <Text style={[s.grahaAbbr, { color: p.name === 'Sun' || p.name === 'Moon' ? tones.saffron.fg : colors.text }]}>{(ABBR[language === 'mr' ? 'hi' : language === 'as' ? 'bn' : language] || ABBR.en)[p.name] || p.name.slice(0, 2)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.grahaName, { color: colors.text }]}>{loc.planet(p.name)} <Text style={{ color: colors.textTertiary, fontWeight: '600' }}>· {loc.sign(p.signIndex)} {fmtDeg(p.degree)}</Text></Text>
                  <Text style={[s.grahaSub, { color: colors.textSecondary }]}>{tx('House')} {p.house} · {tx(HOUSE_MEANING[p.house])} · {typeof p.nakshatraIndex === 'number' ? loc.nak(p.nakshatraIndex) : p.nakshatra} {p.pada}</Text>
                  {(dig || f.retro || f.combust || f.vargottama) && (
                    <View style={s.tagRow}>
                      {dig && <Tag text={tx(dig)} tone={tone} />}
                      {f.retro && <Tag text={tx('Retrograde')} tone={tones.plum} />}
                      {f.combust && <Tag text={tx('Combust')} tone={tones.saffron} />}
                      {f.vargottama && <Tag text={tx('Vargottama')} tone={tones.haldi} />}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </Section2>

        )}

        {tab === 'dasha' && (<>
        {/* Dasha */}
        {kundli.dasha && (
          <Section2 title={tx('Vimshottari dasha')} colors={colors} display={display}>
            {maha && (
              <View style={[s.dashaNow, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{tx('Running now')}</Text>
                <Text style={{ color: colors.text, fontSize: 16.5, fontWeight: '800', marginTop: 2 }}>
                  {loc.planet(maha.lord)} {tx('Mahadasha')}{antar ? ` · ${loc.planet(antar.lord)} ${tx('Antardasha')}` : ''}
                </Text>
                <View style={[s.bar, { backgroundColor: colors.primary + '22' }]}><View style={[s.barFill, { backgroundColor: colors.primary, width: `${pct(maha.start, maha.end) * 100}%` }]} /></View>
                <Text style={{ color: colors.textTertiary, fontSize: 11.5, marginTop: 4 }}>{fmtShort(maha.start)} – {fmtShort(maha.end)}</Text>
              </View>
            )}
            {!!antars.length && (
              <>
                <Text style={[s.subHead, { color: colors.textSecondary }]}>{tx('Antardasha timeline')}</Text>
                {antars.map((a) => {
                  const on = a.start <= todayKey && todayKey < a.end;
                  const past = a.end <= todayKey;
                  return (
                    <View key={a.lord + a.start} style={s.timeRow}>
                      <View style={[s.timeDot, { backgroundColor: on ? colors.primary : past ? colors.cardBorder : colors.surface, borderColor: on ? colors.primary : colors.textTertiary }]} />
                      <Text style={[s.timeLord, { color: on ? colors.primary : past ? colors.textTertiary : colors.text, fontWeight: on ? '800' : '600' }]}>{loc.planet(maha!.lord)} / {loc.planet(a.lord)}</Text>
                      <Text style={[s.timeSpan, { color: colors.textTertiary }]}>{fmtShort(a.start)} – {fmtShort(a.end)}</Text>
                    </View>
                  );
                })}
              </>
            )}
            <Text style={[s.subHead, { color: colors.textSecondary }]}>{tx('All mahadashas')}</Text>
            {kundli.dasha.maha.map((m) => {
              const on = m.start <= todayKey && todayKey < m.end;
              const open = openMaha === m.start;
              return (
                <View key={m.lord + m.start}>
                  <TouchableOpacity onPress={() => setOpenMaha(open ? null : m.start)} style={s.timeRow}>
                    <Icon name={open ? 'caret-down' : 'caret-right'} size={13} color={colors.textTertiary} weight="regular" />
                    <Text style={[s.timeLord, { color: on ? colors.primary : colors.text, fontWeight: on ? '800' : '600' }]}>{loc.planet(m.lord)}</Text>
                    <Text style={[s.timeSpan, { color: colors.textTertiary }]}>{m.start.slice(0, 4)} – {m.end.slice(0, 4)}</Text>
                  </TouchableOpacity>
                  {open && antardashas(m).map((a) => (
                    <View key={a.start} style={[s.timeRow, { paddingLeft: 24 }]}>
                      <Text style={[s.timeLord, { color: colors.textSecondary, fontSize: 13 }]}>{loc.planet(m.lord)} / {loc.planet(a.lord)}</Text>
                      <Text style={[s.timeSpan, { color: colors.textTertiary }]}>{fmtShort(a.start)} – {fmtShort(a.end)}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </Section2>
        )}

        {/* Sade Sati */}
        <Section2 title={tx('Sade Sati')} colors={colors} display={display}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 10 }}>
            {tx('Saturn passing over your Moon sign and the signs on either side, about 7½ years in all.')}
          </Text>
          {!saturn.length ? <ActivityIndicator color={colors.primary} /> : (
            [sadePast && { p: sadePast, label: tx('Last') }, sadeNow && { p: sadeNow, label: tx('Now') }, sadeNext && { p: sadeNext, label: tx('Next') }]
              .filter(Boolean).map((x: any) => (
                <View key={x.label} style={[s.sadeCard, { borderColor: x.p === sadeNow ? tones.kumkum.fg + '55' : colors.cardBorder, backgroundColor: x.p === sadeNow ? tones.kumkum.bg : 'transparent' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: x.p === sadeNow ? tones.kumkum.fg : colors.textSecondary, fontSize: 12, fontWeight: '800' }}>{x.label}</Text>
                    <Text style={{ color: colors.text, fontSize: 13.5, fontWeight: '800' }}>{fmtShort(x.p.start)} – {fmtShort(x.p.end)}</Text>
                  </View>
                  {(x.p.phases || []).map((ph: any) => (
                    <Text key={ph.name} style={{ color: colors.textSecondary, fontSize: 12.5, marginTop: 4 }}>{tx(ph.name)}: {fmtShort(ph.start)} – {fmtShort(ph.end)}</Text>
                  ))}
                </View>
              ))
          )}
          {dhaiyaNext && (
            <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 6 }}>
              {tx('Shani Dhaiya')} ({dhaiyaNext.kind === 'dhaiya4' ? '4th' : '8th'}): {fmtShort(dhaiyaNext.start)} – {fmtShort(dhaiyaNext.end)}
            </Text>
          )}
        </Section2>

        </>)}

        {tab === 'yogas' && (<>
        {/* Yogas */}
        <Section2 title={tx('Yogas')} colors={colors} display={display}>
          {presentYogas.length === 0 && <Text style={{ color: colors.textSecondary, fontSize: 13.5, lineHeight: 19 }}>{tx('None of the major classical yogas are formed. Every chart still has its own strengths: see the dashas and planet dignities above.')}</Text>}
          {presentYogas.map((y, i) => (
            <View key={y.name} style={[s.finding, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider, paddingTop: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="check-circle" size={15} color={tones.tulsi.fg} weight="fill" />
                <Text style={{ color: colors.text, fontSize: 14.5, fontWeight: '800', flexShrink: 1 }}>{native(y.name, y.nameHi)}</Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 3 }}>{y.detail}{y.note ? `. ${y.note}` : ''}</Text>
            </View>
          ))}
        </Section2>

        {/* Doshas */}
        <Section2 title={tx('Doshas')} colors={colors} display={display}>
          {presentDoshas.length === 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="check-circle" size={16} color={tones.tulsi.fg} weight="fill" />
              <Text style={{ color: colors.textSecondary, fontSize: 13.5, flex: 1 }}>{tx('No major dosha in your chart.')}</Text>
            </View>
          )}
          {presentDoshas.map((d, i) => (
            <View key={d.name} style={[s.finding, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider, paddingTop: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="warning" size={15} color={tones.kumkum.fg} weight="fill" />
                <Text style={{ color: colors.text, fontSize: 14.5, fontWeight: '800', flexShrink: 1 }}>{native(d.name, d.nameHi)}</Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 3 }}>{d.detail}</Text>
              {!!d.note && <Text style={{ color: tones.plum.fg, fontSize: 12.5, lineHeight: 18, marginTop: 3 }}>{d.note}</Text>}
            </View>
          ))}
        </Section2>

        </>)}

        <Text style={{ color: colors.textTertiary, fontSize: 11.5, textAlign: 'center', marginTop: 4, lineHeight: 17 }}>{tx('Calculated with Swiss Ephemeris · Lahiri ayanamsa · whole-sign houses.')}</Text>
      </ScrollView>
    </View>
  );
}

const HOUSE_MEANING: Record<number, string> = {
  1: 'self & health', 2: 'wealth & family', 3: 'courage & siblings', 4: 'home & mother', 5: 'children & intellect', 6: 'health & rivals',
  7: 'marriage & partners', 8: 'longevity & change', 9: 'fortune & dharma', 10: 'career & status', 11: 'gains & friends', 12: 'expenses & moksha',
};
const fmtShort = (d: string | Date) => new Date(typeof d === 'string' ? d + 'T00:00:00' : d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

function Section2({ title, children, colors, display }: { title: string; children: React.ReactNode; colors: any; display: any }) {
  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
      <Text style={[s.cardTitle, { color: colors.text, marginBottom: 10 }, display]}>{title}</Text>
      {children}
    </View>
  );
}

function Tag({ text, tone }: { text: string; tone: { fg: string; bg: string } }) {
  return <Text style={[s.tag, { color: tone.fg, backgroundColor: tone.bg }]}>{text}</Text>;
}

function ActionTile({ icon, label, tone, onPress, busy, colors }: { icon: any; label: string; tone: { fg: string; bg: string }; onPress: () => void; busy?: boolean; colors: any }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={busy} activeOpacity={0.8} style={[s.action, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
      <View style={[s.actionIcon, { backgroundColor: tone.bg }]}>
        {busy ? <ActivityIndicator size="small" color={tone.fg} /> : <Icon name={icon} size={20} color={tone.fg} />}
      </View>
      <Text style={[s.actionText, { color: colors.text }]} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

function GuideList({ title, icon, color, items, colors }: { title: string; icon: any; color: string; items: string[]; colors: any }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Icon name={icon} size={15} color={color} weight="fill" />
        <Text style={{ color, fontSize: 12, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' }}>{title}</Text>
      </View>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 7, paddingLeft: 2, marginBottom: 2 }}>
          <Text style={{ color, fontSize: 13 }}>•</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13.5, lineHeight: 20, flex: 1 }}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 52 },
  fieldText: { fontSize: 15, flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 18, marginBottom: 8 },
  genderChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 12, borderWidth: 1 },
  locateBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, borderRadius: 12, height: 52, justifyContent: 'center' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 14, marginTop: 26 },
  saveBtnText: { color: '#FFF', fontSize: 15.5, fontWeight: '800' },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { flexDirection: 'row', borderRadius: 22, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 8 },
  heroKey: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  heroVal: { fontSize: 17, fontWeight: '800', marginTop: 4, paddingHorizontal: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 14 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },
  statusText: { fontSize: 12.5, fontWeight: '700' },
  card: { borderRadius: 22, borderWidth: 1, padding: 16, marginBottom: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  cardTitle: { fontSize: 18, lineHeight: 26 },
  srcTag: { fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, overflow: 'hidden' },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 2 },
  segBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, alignItems: 'center' },
  segText: { fontSize: 12, fontWeight: '800' },
  chartTabs: { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap', justifyContent: 'center' },
  chartTab: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 100, borderWidth: 1 },
  tabBar: { paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
  tabPill: { height: 38, paddingHorizontal: 15, borderRadius: 19, borderWidth: 1, justifyContent: 'center' },
  glanceCard: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  glanceTile: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center' },
  glanceKey: { fontSize: 11.5, fontWeight: '700' },
  glanceVal: { fontSize: 16, fontWeight: '800', marginTop: 3 },
  chartSub: { fontSize: 12, marginBottom: 12, textAlign: 'center' },
  glance: { fontSize: 13.5, textAlign: 'center', marginBottom: 4, lineHeight: 20 },
  legend: { fontSize: 11.5, textAlign: 'center', marginTop: 10 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  action: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 12, alignItems: 'center', gap: 8 },
  actionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 12.5, fontWeight: '700', textAlign: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, gap: 12 },
  infoKey: { fontSize: 13.5 },
  infoVal: { fontSize: 13.5, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  graha: { flexDirection: 'row', gap: 12, paddingVertical: 11 },
  grahaBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  grahaAbbr: { fontSize: 15, fontFamily: DS.font.deva },
  grahaName: { fontSize: 14.5, fontWeight: '800' },
  grahaSub: { fontSize: 12.5, marginTop: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tag: { fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, overflow: 'hidden' },
  dashaNow: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 6 },
  bar: { height: 6, borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  subHead: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 14, marginBottom: 6 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  timeDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  timeLord: { fontSize: 13.5, flex: 1 },
  timeSpan: { fontSize: 12.5 },
  sadeCard: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
  finding: { paddingBottom: 10 },
  luckyChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
});
