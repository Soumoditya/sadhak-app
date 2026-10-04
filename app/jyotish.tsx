import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Platform, BackHandler,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDialog } from '../contexts/DialogContext';
import { Header } from '../components/ui';
import { useDsInsets, DS } from '../constants/ds';
import NorthChart from '../components/charts/NorthChart';
import { router } from 'expo-router';
import {
  computeAndSaveKundli, computeKundli, saveKundli, loadNatal, getCachedDaily, getPrediction, KUNDLI_MAX_AGE_MS, localDateKey,
  type BirthInput, type Kundli, type Prediction, type PredictionPeriod,
} from '../services/jyotish';
import { exportKundliPdf } from '../services/jyotishPdf';
import { scheduleDailyAstroReminder, cancelDailyAstroReminder, getAstroReminder } from '../services/notifications';

export default function JyotishScreen() {
  const { user, profile, updateProfile } = useAuth();
  const { colors } = useTheme();
  const dialog = useDialog();
  const { screenBottom } = useDsInsets();

  const [kundli, setKundli] = useState<Kundli | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [chartTab, setChartTab] = useState<'d1' | 'd9' | 'd10' | 'moon'>('d1');
  const [pred, setPred] = useState<Prediction | null>(null);
  const [predPeriod, setPredPeriod] = useState<PredictionPeriod>('daily');
  const [predLoading, setPredLoading] = useState(false);
  const [predError, setPredError] = useState(false);
  const [savedBirth, setSavedBirth] = useState<BirthInput | null>(null);
  const birthEdited = useRef(false); // set once the user saves new birth details
  const [pdfBusy, setPdfBusy] = useState(false);
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
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);

  const prefill = (b: BirthInput) => {
    setDate(new Date(b.date + 'T00:00:00'));
    const [h, m] = (b.time || '06:00').split(':').map(Number);
    const td = new Date(); td.setHours(h, m, 0, 0); setTime(td);
    setHasTime(b.hasTime); setGender(b.gender); setPlace(b.place);
    setCoords({ lat: b.lat, lng: b.lng }); setTzOffset(String(b.tzOffset));
  };

  // Load the saved chart (from the owner-only subcollection) on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.uid) { setLoading(false); setEditing(true); return; }
      const natal = await loadNatal(user.uid);
      if (!active) return;
      if (natal) { prefill(natal.birth); setKundli(natal.kundli); setSavedBirth(natal.birth); } else { setEditing(true); }
      setLoading(false);
      // The running dasha + Sade Sati depend on today's date; refresh a stale
      // cached chart quietly so they don't stay frozen at the first compute.
      if (natal && (!natal.computedAt || Date.now() - natal.computedAt > KUNDLI_MAX_AGE_MS)) {
        try {
          const fresh = await computeKundli(natal.birth);
          // Don't clobber a chart the user re-entered while this was in flight.
          if (!birthEdited.current) {
            await saveKundli(user.uid, natal.birth, fresh);
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
    if (!kundli) return;
    try { setPdfBusy(true); await exportKundliPdf(kundli, savedBirth, profile?.displayName); }
    catch (e: any) { dialog.alert('PDF failed', String(e?.message || e).slice(0, 160)); }
    finally { setPdfBusy(false); }
  };

  // Load today's guidance once the chart is available (cached per-day).
  useEffect(() => {
    if (!kundli || !user?.uid) return;
    let active = true;
    setPredLoading(true); setPredPeriod('daily'); setPredError(false);
    getCachedDaily(user.uid, kundli, profile?.displayName?.split(' ')[0])
      .then((p) => { if (active) setPred(p); })
      .catch(() => { if (active) { setPred(null); setPredError(true); } })
      .finally(() => { if (active) setPredLoading(false); });
    return () => { active = false; };
  }, [kundli, user?.uid]);

  // While editing an existing chart, back (header or hardware) cancels the edit
  // instead of leaving the screen.
  useEffect(() => {
    if (!editing || !kundli) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setEditing(false); return true; });
    return () => sub.remove();
  }, [editing, kundli]);

  const loadPeriod = async (period: PredictionPeriod) => {
    if (!kundli) return;
    setPredPeriod(period); setPredLoading(true); setPredError(false);
    try {
      const p = period === 'daily' && user?.uid
        ? await getCachedDaily(user.uid, kundli, profile?.displayName?.split(' ')[0])
        : await getPrediction(kundli, period, profile?.displayName?.split(' ')[0]);
      setPred(p);
    } catch (e: any) {
      setPred(null); setPredError(true);
      dialog.alert('Could not load guidance', String(e?.message || e).slice(0, 160));
    } finally { setPredLoading(false); }
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timeStr = `${pad(time.getHours())}:${pad(time.getMinutes())}`;

  const geocode = async () => {
    if (!place.trim()) { dialog.alert('Enter a place', 'Type your birth city/town first.'); return; }
    try {
      setGeocoding(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`,
        { headers: { 'User-Agent': 'SadhakApp/1.0 (soumodityapramanik@gmail.com)' } },
      );
      const arr = await res.json();
      if (!arr?.length) { dialog.alert('Not found', 'Could not find that place — try adding the state/country.'); return; }
      setCoords({ lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) });
      setPlace(arr[0].display_name.split(',').slice(0, 3).join(', '));
    } catch {
      dialog.alert('Network error', 'Could not look up the place. Check your connection.');
    } finally { setGeocoding(false); }
  };

  const saveBirth = async () => {
    if (!user?.uid) { dialog.alert('Sign in needed', 'Please sign in to save your birth chart.'); return; }
    if (!coords) { dialog.alert('Set birth place', 'Tap "Locate" to pin your birth place on the map.'); return; }
    const tz = parseFloat(tzOffset);
    if (!Number.isFinite(tz) || tz < -12 || tz > 14) { dialog.alert('Timezone', 'Enter a valid timezone offset (e.g. 5.5 for India).'); return; }
    const birth: BirthInput = { date: dateStr, time: timeStr, hasTime, place: place.trim(), lat: coords.lat, lng: coords.lng, tzOffset: tz, gender };
    try {
      setSaving(true);
      birthEdited.current = true;
      // Birth details are sensitive → saved only in the owner-only jyotish
      // subcollection (inside computeAndSaveKundli), NOT on the public profile.
      const k = await computeAndSaveKundli(user.uid, birth);
      await updateProfile({ hasBirthChart: true } as any); // non-sensitive flag
      setKundli(k); setSavedBirth(birth);
      setEditing(false);
    } catch (e: any) {
      dialog.alert('Could not save', String(e?.message || e).slice(0, 160));
    } finally { setSaving(false); }
  };

  // ─────────── FORM ───────────
  if (editing || (!kundli && !loading)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Your Birth Details" subtitle="Used to compute your authentic Vedic chart" onBack={kundli ? () => setEditing(false) : undefined} />
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: screenBottom }} showsVerticalScrollIndicator={false}>
          <Text style={[s.label, { color: colors.textTertiary }]}>DATE OF BIRTH</Text>
          <TouchableOpacity style={[s.field, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]} onPress={() => setShowDate(true)}>
            <MaterialCommunityIcons name="calendar" size={18} color={colors.primary} />
            <Text style={[s.fieldText, { color: colors.text }]}>{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          </TouchableOpacity>
          {showDate && (
            <DateTimePicker value={date} mode="date" maximumDate={new Date()} onChange={(e, d) => { setShowDate(Platform.OS === 'ios'); if (d) setDate(d); }} />
          )}

          <View style={s.rowBetween}>
            <Text style={[s.label, { color: colors.textTertiary }]}>TIME OF BIRTH</Text>
            <TouchableOpacity onPress={() => setHasTime((v) => !v)} style={s.timeToggle}>
              <MaterialCommunityIcons name={hasTime ? 'checkbox-marked' : 'checkbox-blank-outline'} size={16} color={colors.primary} />
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>I know my birth time</Text>
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

          <Text style={[s.label, { color: colors.textTertiary }]}>BIRTH PLACE</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[s.field, { flex: 1, borderColor: colors.cardBorder, backgroundColor: colors.surface, color: colors.text }]}
              placeholder="City, State" placeholderTextColor={colors.textTertiary}
              value={place} onChangeText={(t) => { setPlace(t); setCoords(null); }}
            />
            <TouchableOpacity onPress={geocode} style={[s.locateBtn, { backgroundColor: colors.primary }]}>
              {geocoding ? <ActivityIndicator size="small" color="#FFF" /> : <><MaterialCommunityIcons name="map-marker" size={16} color="#FFF" /><Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Locate</Text></>}
            </TouchableOpacity>
          </View>
          {coords && <Text style={{ color: colors.tulsiGreen || '#2D6A4F', fontSize: 11.5, marginTop: 4 }}>✓ {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}</Text>}

          <Text style={[s.label, { color: colors.textTertiary }]}>TIMEZONE AT BIRTH (hours from UTC)</Text>
          <TextInput
            style={[s.field, { borderColor: colors.cardBorder, backgroundColor: colors.surface, color: colors.text }]}
            keyboardType="numbers-and-punctuation" value={tzOffset} onChangeText={setTzOffset} placeholder="5.5" placeholderTextColor={colors.textTertiary}
          />
          <Text style={{ color: colors.textTertiary, fontSize: 11.5, marginTop: 4 }}>India = 5.5. Change only if born in another timezone.</Text>

          <TouchableOpacity onPress={saveBirth} disabled={saving} style={[s.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}>
            {saving ? <ActivityIndicator color="#FFF" /> : <><MaterialCommunityIcons name="star-four-points" size={18} color="#FFF" /><Text style={s.saveBtnText}>Compute my chart</Text></>}
          </TouchableOpacity>
          {kundli && <TouchableOpacity onPress={() => setEditing(false)} style={{ alignItems: 'center', marginTop: 14 }}><Text style={{ color: colors.textSecondary }}>Cancel</Text></TouchableOpacity>}
        </ScrollView>
      </View>
    );
  }

  // ─────────── LOADING ───────────
  if (loading || !kundli) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Jyotish" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary }}>Casting your chart…</Text>
        </View>
      </View>
    );
  }

  // ─────────── DASHBOARD ───────────
  const b = kundli.basics;
  const infoRows: [string, string][] = [
    ['Lagna (Ascendant)', b.lagna], ['Rashi (Moon sign)', `${b.rashi} · lord ${b.rashiLord}`],
    ['Nakshatra', `${b.nakshatra} · pada ${b.pada}`], ['Nakshatra lord', b.nakLord],
    ['Gana', b.gana], ['Nadi', b.nadi], ['Yoni', b.yoni], ['Deity', b.deity],
    ['Ayanamsa', `Lahiri ${Number(kundli.meta.ayanamsa).toFixed(2)}°`],
  ];
  // Highlight the mahadasha running TODAY (the cached "current" can be stale).
  const todayKey = localDateKey();
  const runningMaha = kundli.dasha?.maha.find((m) => m.start <= todayKey && todayKey < m.end)?.lord ?? kundli.dasha?.current.maha;
  const runningAntar = runningMaha === kundli.dasha?.current.maha
    ? (kundli.dasha?.current.antarList?.find((a) => a.start <= todayKey && todayKey < a.end)?.lord ?? kundli.dasha?.current.antar)
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Jyotish" subtitle={`${b.rashi} · ${b.nakshatra}`} right={
        <TouchableOpacity onPress={() => setEditing(true)} hitSlop={8}><MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textSecondary} /></TouchableOpacity>
      } />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: screenBottom }} showsVerticalScrollIndicator={false}>
        {/* Charts — D1 / D9 / D10 / Moon */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder, alignItems: 'center' }]}>
          <View style={s.chartTabs}>
            {([
              ['d1', 'D1 · राशि'], ['d9', 'D9 · नवांश'], ['d10', 'D10 · दशांश'], ['moon', 'चन्द्र'],
            ] as const).map(([key, label]) => {
              const active = chartTab === key;
              const disabled = key !== 'd1' && !kundli.charts;
              return (
                <TouchableOpacity key={key} disabled={disabled} onPress={() => setChartTab(key)}
                  style={[s.chartTab, { backgroundColor: active ? colors.primary : 'transparent', borderColor: active ? colors.primary : colors.cardBorder, opacity: disabled ? 0.4 : 1 }]}>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: active ? '#FFF' : colors.textSecondary }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[s.chartSub, { color: colors.textTertiary }]}>
            {chartTab === 'd1' ? 'Birth chart — overall life & body' : chartTab === 'd9' ? 'Navamsa — marriage, dharma & inner strength' : chartTab === 'd10' ? 'Dasamsa — career & profession' : 'Moon chart — mind & emotions'}
          </Text>
          {chartTab === 'd1' ? (
            <NorthChart kundli={kundli} size={300} colors={colors as any} />
          ) : (
            <NorthChart
              kundli={kundli} size={300} colors={colors as any}
              planets={(chartTab === 'd9' ? kundli.charts!.d9 : chartTab === 'd10' ? kundli.charts!.d10 : kundli.charts!.moon).planets}
              lagnaSignIndex={(chartTab === 'd9' ? kundli.charts!.d9 : chartTab === 'd10' ? kundli.charts!.d10 : kundli.charts!.moon).lagnaSignIndex}
            />
          )}
        </View>

        {/* Guidance (daily / weekly / monthly / yearly) */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Text style={[s.cardKicker, { color: colors.primary }]}>YOUR GUIDANCE</Text>
          <View style={s.chartTabs}>
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => {
              const active = predPeriod === p;
              return (
                <TouchableOpacity key={p} onPress={() => loadPeriod(p)} disabled={predLoading}
                  style={[s.chartTab, { backgroundColor: active ? colors.primary : 'transparent', borderColor: active ? colors.primary : colors.cardBorder }]}>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: active ? '#FFF' : colors.textSecondary, textTransform: 'capitalize' }}>{p}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {predLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 18, gap: 8 }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.textTertiary, fontSize: 12 }}>Reading your transits…</Text>
            </View>
          ) : predError && !pred ? (
            <TouchableOpacity onPress={() => loadPeriod(predPeriod)} style={{ alignItems: 'center', paddingVertical: 16, gap: 6 }}>
              <MaterialCommunityIcons name="refresh" size={20} color={colors.primary} />
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Couldn't load your guidance. Tap to retry.</Text>
            </TouchableOpacity>
          ) : pred ? (
            <View style={{ gap: 12 }}>
              {!!pred.overview && <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21 }}>{pred.overview}</Text>}
              {!!pred.goodFor?.length && <GuideList title="Good for" icon="check-circle-outline" color={colors.tulsiGreen || '#2D6A4F'} items={pred.goodFor} colors={colors} />}
              {!!pred.avoid?.length && <GuideList title="Best to avoid" icon="close-circle-outline" color={colors.festival || '#DC2626'} items={pred.avoid} colors={colors} />}
              {!!pred.doToday?.length && <GuideList title="Do" icon="star-four-points-outline" color={colors.primary} items={pred.doToday} colors={colors} />}
              {!!pred.remedies?.length && <GuideList title="Remedies" icon="flower-tulip-outline" color="#7C3AED" items={pred.remedies} colors={colors} />}
              {!!pred.transit && <Text style={{ color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, fontStyle: 'italic' }}>Transit: {pred.transit}</Text>}
              {!!pred.lucky && (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {pred.lucky.color ? <View style={[s.luckyChip, { borderColor: colors.cardBorder }]}><Text style={{ color: colors.textSecondary, fontSize: 11.5 }}>Colour · {pred.lucky.color}</Text></View> : null}
                  {pred.lucky.number ? <View style={[s.luckyChip, { borderColor: colors.cardBorder }]}><Text style={{ color: colors.textSecondary, fontSize: 11.5 }}>Number · {pred.lucky.number}</Text></View> : null}
                  {pred.lucky.direction ? <View style={[s.luckyChip, { borderColor: colors.cardBorder }]}><Text style={{ color: colors.textSecondary, fontSize: 11.5 }}>Direction · {pred.lucky.direction}</Text></View> : null}
                </View>
              )}
              <Text style={{ color: colors.textTertiary, fontSize: 10.5, lineHeight: 15 }}>Guidance grounded in your exact chart & today's transits — reflective, not a guarantee.</Text>
            </View>
          ) : null}
        </View>

        {/* Chat about my chart */}
        <TouchableOpacity onPress={() => router.push('/ask?astro=1')} activeOpacity={0.85}
          style={[s.astroChat, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '35' }]}>
          <MaterialCommunityIcons name="creation" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 14.5, fontWeight: '800' }}>Chat about your chart</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Ask Sadhak AI anything — it reads your kundli.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Daily reminder + PDF */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="bell-ring-outline" size={19} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: colors.text, fontSize: 14.5, fontWeight: '700' }}>Daily guidance reminder</Text>
              <TouchableOpacity onPress={() => setShowRemPicker(true)} disabled={!remOn}>
                <Text style={{ color: remOn ? colors.primary : colors.textTertiary, fontSize: 12.5, marginTop: 1 }}>
                  {remOn ? `Every day at ${remTime.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} · tap to change` : 'Off'}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={toggleReminder} style={[s.switch, { backgroundColor: remOn ? colors.primary : colors.cardBorder }]}>
              <View style={[s.switchKnob, { alignSelf: remOn ? 'flex-end' : 'flex-start' }]} />
            </TouchableOpacity>
          </View>
          {showRemPicker && (
            <DateTimePicker value={remTime} mode="time" onChange={async (e, d) => {
              setShowRemPicker(Platform.OS === 'ios');
              if (d) { setRemTime(d); if (remOn) { try { await scheduleDailyAstroReminder(d.getHours(), d.getMinutes()); } catch {} } }
            }} />
          )}
          <View style={{ height: 1, backgroundColor: colors.cardBorder, marginVertical: 12 }} />
          <TouchableOpacity onPress={downloadPdf} disabled={pdfBusy} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {pdfBusy ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialCommunityIcons name="file-pdf-box" size={22} color={colors.primary} />}
            <Text style={{ color: colors.text, fontSize: 14.5, fontWeight: '700', flex: 1 }}>Download PDF report</Text>
            <Ionicons name="download-outline" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Basics */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Text style={[s.cardKicker, { color: colors.primary }]}>YOUR BIRTH DETAILS</Text>
          {infoRows.map(([k, v]) => (
            <View key={k} style={s.infoRow}>
              <Text style={[s.infoKey, { color: colors.textSecondary }]}>{k}</Text>
              <Text style={[s.infoVal, { color: colors.text }]}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Planet positions */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Text style={[s.cardKicker, { color: colors.primary }]}>GRAHA POSITIONS</Text>
          {kundli.planets.map((p) => {
            const dig = p.dignity && p.dignity !== '—' && p.dignity !== 'Neutral' ? p.dignity : '';
            const digColor = p.dignity === 'Exalted' || p.dignity === 'Own sign' ? (colors.tulsiGreen || '#2D6A4F') : p.dignity === 'Debilitated' ? (colors.error || '#DC2626') : colors.textTertiary;
            return (
              <View key={p.name} style={s.planetRow}>
                <Text style={[s.planetName, { color: colors.text }]}>{p.name}{p.retro ? ' ↺' : ''}</Text>
                <Text style={[s.planetPos, { color: colors.textSecondary }]}>{p.sign} {p.degree.toFixed(1)}°</Text>
                <Text style={[s.planetHouse, { color: colors.textTertiary }]}>H{p.house}</Text>
                {dig ? <Text style={[s.planetDig, { color: digColor }]} numberOfLines={1}>{dig}</Text>
                  : <Text style={[s.planetNak, { color: colors.textTertiary }]} numberOfLines={1}>{p.nakshatra} {p.pada}</Text>}
              </View>
            );
          })}
        </View>

        {/* Dasha */}
        {kundli.dasha && (
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[s.cardKicker, { color: colors.primary }]}>VIMSHOTTARI DASHA</Text>
            <View style={[s.dashaNow, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Running now</Text>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 2 }}>
                {runningMaha} Mahadasha{runningAntar ? ` · ${runningAntar} Antardasha` : ''}
              </Text>
            </View>
            {kundli.dasha.maha.map((m) => {
              const running = m.start <= todayKey && todayKey < m.end;
              return (
                <View key={m.lord + m.start} style={s.dashaRow}>
                  <Text style={[s.dashaLord, { color: running ? colors.primary : colors.text, fontWeight: running ? '800' : '600' }]}>{m.lord}</Text>
                  <Text style={[s.dashaSpan, { color: colors.textTertiary }]}>{m.start.slice(0, 4)} – {m.end.slice(0, 4)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Yogas */}
        {kundli.yogas && (
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[s.cardKicker, { color: colors.primary }]}>YOGAS IN YOUR CHART</Text>
            {kundli.yogas.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13.5 }}>No major classical yogas from this curated set. Every chart still has its own strengths — see the dashas and planet dignities above.</Text>
            ) : kundli.yogas.map((y) => (
              <View key={y.name} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="star-four-points" size={13} color={colors.primary} />
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>{y.name}</Text>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 3 }}>{y.desc}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Doshas */}
        {kundli.doshas && (
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[s.cardKicker, { color: colors.primary }]}>DOSHA CHECK</Text>
            {[
              { label: 'Mangal (Kuja) Dosha', on: kundli.doshas.mangal.present, detail: kundli.doshas.mangal.present ? `Mars in house ${kundli.doshas.mangal.house}` : 'Not present' },
              { label: 'Kaal Sarp Dosha', on: kundli.doshas.kaalSarp.present, detail: kundli.doshas.kaalSarp.present ? 'All planets between Rahu–Ketu' : 'Not present' },
              { label: 'Sade Sati', on: kundli.doshas.sadeSati.present, detail: kundli.doshas.sadeSati.present ? `${kundli.doshas.sadeSati.phase} phase · Saturn in ${kundli.doshas.sadeSati.saturnSign}` : 'Not active now' },
            ].map((d) => (
              <View key={d.label} style={s.infoRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 }}>
                  <View style={[s.doshaDot, { backgroundColor: d.on ? (colors.festival || '#DC2626') : (colors.tulsiGreen || '#2D6A4F') }]} />
                  <Text style={[s.infoKey, { color: colors.text }]}>{d.label}</Text>
                </View>
                <Text style={[s.infoVal, { color: d.on ? (colors.festival || '#DC2626') : colors.textSecondary }]}>{d.detail}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={{ color: colors.textTertiary, fontSize: 11.5, textAlign: 'center', marginTop: 4, lineHeight: 17 }}>
          Calculated with Swiss Ephemeris · Lahiri ayanamsa · whole-sign houses.
        </Text>

      </ScrollView>
    </View>
  );
}

function GuideList({ title, icon, color, items, colors }: { title: string; icon: any; color: string; items: string[]; colors: any }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <MaterialCommunityIcons name={icon} size={14} color={color} />
        <Text style={{ color, fontSize: 12, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' }}>{title}</Text>
      </View>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 7, paddingLeft: 2, marginBottom: 2 }}>
          <Text style={{ color, fontSize: 13 }}>•</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19, flex: 1 }}>{it}</Text>
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
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
  cardKicker: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, gap: 12 },
  infoKey: { fontSize: 13.5 },
  infoVal: { fontSize: 13.5, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  planetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8 },
  planetName: { fontSize: 13.5, fontWeight: '700', width: 74 },
  planetPos: { fontSize: 13, flex: 1 },
  planetHouse: { fontSize: 12, width: 30 },
  planetNak: { fontSize: 11.5, width: 96, textAlign: 'right' },
  planetDig: { fontSize: 11.5, width: 96, textAlign: 'right', fontWeight: '700' },
  chartTabs: { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap', justifyContent: 'center' },
  chartTab: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 100, borderWidth: 1 },
  chartSub: { fontSize: 11.5, marginBottom: 12, textAlign: 'center' },
  dashaNow: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  dashaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  dashaLord: { fontSize: 13.5 },
  dashaSpan: { fontSize: 12.5 },
  doshaDot: { width: 9, height: 9, borderRadius: 5 },
  luckyChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  astroChat: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 14 },
  switch: { width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  switchKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF' },
});
