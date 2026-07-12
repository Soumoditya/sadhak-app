import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Platform,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDialog } from '../contexts/DialogContext';
import { Header } from '../components/ui';
import { useDsInsets, DS } from '../constants/ds';
import NorthChart from '../components/charts/NorthChart';
import {
  computeAndSaveKundli, loadNatal, type BirthInput, type Kundli,
} from '../services/jyotish';

export default function JyotishScreen() {
  const { user, profile, updateProfile } = useAuth();
  const { colors } = useTheme();
  const dialog = useDialog();
  const { screenBottom } = useDsInsets();

  const [kundli, setKundli] = useState<Kundli | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

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
      if (natal) { prefill(natal.birth); setKundli(natal.kundli); } else { setEditing(true); }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user?.uid]);

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
    if (!coords) { dialog.alert('Set birth place', 'Tap "Locate" to pin your birth place on the map.'); return; }
    const tz = parseFloat(tzOffset);
    if (!Number.isFinite(tz) || tz < -12 || tz > 14) { dialog.alert('Timezone', 'Enter a valid timezone offset (e.g. 5.5 for India).'); return; }
    const birth: BirthInput = { date: dateStr, time: timeStr, hasTime, place: place.trim(), lat: coords.lat, lng: coords.lng, tzOffset: tz, gender };
    try {
      setSaving(true);
      // Birth details are sensitive → saved only in the owner-only jyotish
      // subcollection (inside computeAndSaveKundli), NOT on the public profile.
      const k = await computeAndSaveKundli(user!.uid, birth);
      await updateProfile({ hasBirthChart: true } as any); // non-sensitive flag
      setKundli(k);
      setEditing(false);
    } catch (e: any) {
      dialog.alert('Could not save', String(e?.message || e).slice(0, 160));
    } finally { setSaving(false); }
  };

  // ─────────── FORM ───────────
  if (editing || (!kundli && !loading)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Your Birth Details" subtitle="Used to compute your authentic Vedic chart" />
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
    ['Ayanamsa', `${b.lagnaHi ? '' : ''}Lahiri ${kundli.meta.ayanamsa}°`],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Jyotish" subtitle={`${b.rashi} · ${b.nakshatra}`} right={
        <TouchableOpacity onPress={() => setEditing(true)} hitSlop={8}><MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textSecondary} /></TouchableOpacity>
      } />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: screenBottom }} showsVerticalScrollIndicator={false}>
        {/* D1 chart */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder, alignItems: 'center' }]}>
          <Text style={[s.cardKicker, { color: colors.primary }]}>LAGNA CHART · D1 (राशि)</Text>
          <NorthChart kundli={kundli} size={300} colors={colors as any} />
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
          {kundli.planets.map((p) => (
            <View key={p.name} style={s.planetRow}>
              <Text style={[s.planetName, { color: colors.text }]}>{p.name}{p.retro ? ' ↺' : ''}</Text>
              <Text style={[s.planetPos, { color: colors.textSecondary }]}>{p.sign} {p.degree.toFixed(1)}°</Text>
              <Text style={[s.planetHouse, { color: colors.textTertiary }]}>H{p.house}</Text>
              <Text style={[s.planetNak, { color: colors.textTertiary }]} numberOfLines={1}>{p.nakshatra} {p.pada}</Text>
            </View>
          ))}
        </View>

        <Text style={{ color: colors.textTertiary, fontSize: 11.5, textAlign: 'center', marginTop: 8, lineHeight: 17 }}>
          Calculated with Swiss Ephemeris · Lahiri ayanamsa · whole-sign houses.{'\n'}More (D9, D10, dashas, yogas, predictions) coming next.
        </Text>
      </ScrollView>
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
});
