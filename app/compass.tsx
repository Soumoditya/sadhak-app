import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Magnetometer, DeviceMotion, Accelerometer } from 'expo-sensors';
import { logEvent } from '../services/diagnostics';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line, Path, Text as SvgText, G } from 'react-native-svg';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Header } from '../components/ui';
import { useDsInsets } from '../constants/ds';

// Vastu Shastra direction knowledge: deity (dikpala), element and guidance.
const VASTU: {
  key: string; label: string; labelHi: string; center: number;
  dikpala: string; element: string; good: string; avoid: string; color: string;
}[] = [
  { key: 'N',  label: 'North',      labelHi: 'उत्तर',  center: 0,   dikpala: 'Kubera (wealth)', element: 'Water',         good: 'Cash locker, valuables, water source; keep light & open', avoid: 'Heavy storage, clutter, toilets', color: '#1565C0' },
  { key: 'NE', label: 'North-East', labelHi: 'ईशान',   center: 45,  dikpala: 'Ishana (Shiva)',  element: 'Water + Ether', good: 'Puja room / mandir, meditation, study: the most sacred corner', avoid: 'Toilet, kitchen, heavy furniture, shoes', color: '#7C3AED' },
  { key: 'E',  label: 'East',       labelHi: 'पूर्व',   center: 90,  dikpala: 'Indra',           element: 'Air',           good: 'Main entrance, windows, morning surya arghya', avoid: 'Blocking walls, storage that darkens it', color: '#D97706' },
  { key: 'SE', label: 'South-East', labelHi: 'आग्नेय', center: 135, dikpala: 'Agni',            element: 'Fire',          good: 'Kitchen (cook facing east), electrical appliances', avoid: 'Water tank, puja room, bedroom for couples', color: '#C2410C' },
  { key: 'S',  label: 'South',      labelHi: 'दक्षिण', center: 180, dikpala: 'Yama',            element: 'Earth',         good: 'Heavy storage, master bedroom (sleep with head to the south)', avoid: 'Main entrance (unless vastu-corrected), water bodies', color: '#9F1239' },
  { key: 'SW', label: 'South-West', labelHi: 'नैऋत्य', center: 225, dikpala: 'Nirriti',         element: 'Earth',         good: "Master bedroom, heavy almirahs, family elders' room", avoid: "Kitchen, toilets, children's room, entrance", color: '#78350F' },
  { key: 'W',  label: 'West',       labelHi: 'पश्चिम', center: 270, dikpala: 'Varuna',          element: 'Water',         good: "Dining, children's bedroom, study desks facing east", avoid: 'Excess openings; main door without vastu advice', color: '#2D6A4F' },
  { key: 'NW', label: 'North-West', labelHi: 'वायव्य', center: 315, dikpala: 'Vayu',            element: 'Air',           good: "Guest room, unmarried daughters' room, finished-goods storage", avoid: 'Puja room; long-term storage of valuables', color: '#475569' },
];

const norm = (d: number) => ((d % 360) + 360) % 360;
const directionFor = (deg: number) => VASTU[Math.round(norm(deg) / 45) % 8];

type Source = 'fused' | 'motion' | 'magnetometer' | 'none';

export default function CompassScreen() {
  const { colors, isDark } = useTheme();
  const { t: tr, tx, native, language } = useLanguage();
  const { screenBottom } = useDsInsets();
  const { width } = useWindowDimensions();
  const SIZE = Math.min(width - 48, 320);

  const [heading, setHeading] = useState(0);
  const [source, setSource] = useState<Source | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null); // Android: 0 (unreliable) – 3 (high)
  const [trueNorth, setTrueNorth] = useState(false);
  const [held, setHeld] = useState<number | null>(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const smooth = useRef<number | null>(null);
  const unwrapped = useRef(0);
  const heldRef = useRef<number | null>(null);
  heldRef.current = held;

  // Circular low-pass filter: kills jitter without lagging across 359°→0°.
  const feed = (raw: number) => {
    if (heldRef.current != null) return;
    const prev = smooth.current;
    let next = raw;
    if (prev != null) {
      const delta = ((raw - prev + 540) % 360) - 180;
      next = norm(prev + delta * 0.25);
    }
    smooth.current = next;
    setHeading(next);
    // Rotate the dial the short way round (no 360° spin at north).
    const delta = ((((-next - unwrapped.current) % 360) + 540) % 360) - 180;
    unwrapped.current += delta;
    Animated.timing(rotation, { toValue: unwrapped.current, duration: 90, easing: Easing.linear, useNativeDriver: true }).start();
  };

  // Every heading source runs at once. Some phones grant a source and then
  // never update it (frozen fused heading, dead rotation sensor), so the
  // screen follows whichever source is alive and actually moving.
  const stats = useRef<Record<Exclude<Source, 'none'>, { last: number; hist: { t: number; v: number }[]; n: number }>>({
    fused: { last: 0, hist: [], n: 0 }, motion: { last: 0, hist: [], n: 0 }, magnetometer: { last: 0, hist: [], n: 0 },
  }).current;
  const active = useRef<Exclude<Source, 'none'> | null>(null);
  const pinned = useRef<Exclude<Source, 'none'> | null>(null);
  const [rate, setRate] = useState(0);

  const swing = (h: { t: number; v: number }[]) => {
    if (h.length < 2) return 0;
    const v0 = h[0].v;
    return h.reduce((m, x) => Math.max(m, Math.abs(((x.v - v0 + 540) % 360) - 180)), 0);
  };
  const ORDER: Exclude<Source, 'none'>[] = ['fused', 'motion', 'magnetometer'];
  const onReading = (src: Exclude<Source, 'none'>, v: number) => {
    const now = Date.now();
    const st0 = stats[src];
    st0.last = now; st0.n++;
    st0.hist.push({ t: now, v });
    while (st0.hist.length && now - st0.hist[0].t > 3000) st0.hist.shift();
    const alive = (k: Exclude<Source, 'none'>) => now - stats[k].last < 1500;
    let cur = pinned.current && alive(pinned.current) ? pinned.current : active.current;
    if (!pinned.current) {
      if (!cur || !alive(cur)) cur = ORDER.find(alive) || src;
      // Stuck source: flat for 3 s while another one is clearly turning.
      else if (stats[cur].hist.length > 5 && swing(stats[cur].hist) < 0.3) {
        const moving = ORDER.find((k) => k !== cur && alive(k) && swing(stats[k].hist) > 4);
        if (moving) { logEvent('compass_switch', { from: cur, to: moving }); cur = moving; }
      }
    }
    if (cur !== active.current) { active.current = cur; setSource(cur); }
    if (src === cur) feed(v);
  };

  useEffect(() => {
    const subs: { remove: () => void }[] = [];
    let cancelled = false;
    (async () => {
      // 1) Android's fused heading (tilt-compensated, true north with location).
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted' && !cancelled) {
          const sub = await Location.watchHeadingAsync((h) => {
            const useTrue = h.trueHeading != null && h.trueHeading >= 0;
            const v = useTrue ? h.trueHeading : h.magHeading;
            if (v == null || v < 0) return;
            if (active.current === 'fused' || !active.current) {
              setTrueNorth(useTrue);
              setAccuracy(typeof h.accuracy === 'number' ? h.accuracy : null);
            }
            onReading('fused', v);
          });
          if (cancelled) sub.remove(); else subs.push(sub);
        }
      } catch {}
      // 2) Rotation-vector sensor (no location needed).
      try {
        if (!cancelled && (await DeviceMotion.isAvailableAsync())) {
          DeviceMotion.setUpdateInterval(60);
          subs.push(DeviceMotion.addListener((m) => {
            const a = m.rotation?.alpha;
            if (typeof a !== 'number') return;
            onReading('motion', norm((-a * 180) / Math.PI));
          }));
        }
      } catch {}
      // 3) Magnetometer, tilt-compensated with the accelerometer on Android
      //    (same maths as SensorManager.getRotationMatrix + getOrientation).
      try {
        if (!cancelled && (await Magnetometer.isAvailableAsync())) {
          const g = { x: 0, y: 0, z: 1 };
          if (Platform.OS === 'android' && (await Accelerometer.isAvailableAsync())) {
            Accelerometer.setUpdateInterval(60);
            subs.push(Accelerometer.addListener((a) => { g.x = g.x * 0.8 + a.x * 0.2; g.y = g.y * 0.8 + a.y * 0.2; g.z = g.z * 0.8 + a.z * 0.2; }));
          }
          Magnetometer.setUpdateInterval(60);
          subs.push(Magnetometer.addListener(({ x: ex, y: ey, z: ez }) => {
            const hx = ey * g.z - ez * g.y, hy = ez * g.x - ex * g.z, hz = ex * g.y - ey * g.x;
            const hn = Math.hypot(hx, hy, hz), an = Math.hypot(g.x, g.y, g.z);
            if (hn < 0.1 || an < 0.1) return;
            const Hx = hx / hn, Hy = hy / hn, Hz = hz / hn;
            const Ax = g.x / an, Ay = g.y / an, Az = g.z / an;
            const My = Az * Hx - Ax * Hz;
            onReading('magnetometer', norm((Math.atan2(Hy, My) * 180) / Math.PI));
          }));
        }
      } catch {}
      // Nothing reported after 3 s: no usable sensor.
      setTimeout(() => { if (!cancelled && !active.current) { setSource('none'); logEvent('compass_none'); } }, 3000);
    })();
    // Readings per second of the active source, for the status line.
    let prevN = 0;
    const tick = setInterval(() => {
      const k = active.current;
      if (!k) return;
      setRate(stats[k].n - prevN); prevN = stats[k].n;
    }, 1000);
    return () => { cancelled = true; clearInterval(tick); subs.forEach((x) => x.remove()); };
  }, []);

  const cycleSource = () => {
    const alive = ORDER.filter((k) => Date.now() - stats[k].last < 1500);
    if (!alive.length) return;
    const i = pinned.current ? alive.indexOf(pinned.current) : -1;
    const next = i + 1 < alive.length ? alive[i + 1] : null; // last step returns to auto
    pinned.current = next;
    active.current = next || active.current;
    setSource(next || active.current);
    setPinnedState(next);
    Haptics.selectionAsync().catch(() => {});
  };
  const [pinnedState, setPinnedState] = useState<Source | null>(null);

  const shown = held ?? heading;
  const dir = directionFor(shown);
  const spin = rotation.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });
  // Android reports 0 until the sensor first calls back, so only a confirmed
  // LOW (1) reading triggers the calibration hint.
  const lowAccuracy = Platform.OS === 'android' && accuracy === 1;

  const toggleHold = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setHeld((h) => (h == null ? heading : null));
  };

  // ── Dial geometry (SVG, rotates as one piece) ──
  const R = SIZE / 2;
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  const polar = (deg: number, r: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return { x: R + r * Math.cos(a), y: R + r * Math.sin(a) };
  };
  const sector = (center: number, r0: number, r1: number) => {
    const a = polar(center - 22.5, r1), b = polar(center + 22.5, r1), c = polar(center + 22.5, r0), d = polar(center - 22.5, r0);
    return `M${a.x},${a.y} A${r1},${r1} 0 0 1 ${b.x},${b.y} L${c.x},${c.y} A${r0},${r0} 0 0 0 ${d.x},${d.y} Z`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={tr('t.compass')} subtitle={tx('Vastu directions for your home')} />
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: screenBottom, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        {source === 'none' ? (
          <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 20 }}>
            <MaterialCommunityIcons name="compass-off-outline" size={52} color={colors.textTertiary} />
            <Text style={[st.emptyTitle, { color: colors.text }]}>{tx('Compass sensor not available')}</Text>
            <Text style={[st.emptySub, { color: colors.textSecondary }]}>{tx(
              'This phone doesn\'t report a heading. Allow location access, or try on a phone with a compass sensor.'
            )}</Text>
          </View>
        ) : (
          <>
            {/* Readout */}
            <View style={{ alignItems: 'center', marginTop: 6 }}>
              <Text style={[st.deg, { color: colors.text }]}>{Math.round(shown)}°</Text>
              <Text style={[st.dirName, { color: dir.color }]}>{native(dir.label, dir.labelHi)}</Text>
              <View style={st.chips}>
                <View style={[st.chip, { borderColor: colors.cardBorder }]}>
                  <MaterialCommunityIcons name={trueNorth ? 'earth' : 'magnet'} size={13} color={colors.textSecondary} />
                  <Text style={[st.chipText, { color: colors.textSecondary }]}>{tx(trueNorth ? 'True north' : 'Magnetic north')}</Text>
                </View>
                {source && (
                  <View style={[st.chip, { borderColor: lowAccuracy ? '#F59E0B' : colors.cardBorder, backgroundColor: lowAccuracy ? '#F59E0B14' : 'transparent' }]}>
                    <MaterialCommunityIcons name={lowAccuracy ? 'alert-outline' : 'check-circle-outline'} size={13} color={lowAccuracy ? '#D97706' : colors.tulsiGreen || '#2D6A4F'} />
                    <Text style={[st.chipText, { color: lowAccuracy ? '#D97706' : colors.textSecondary }]}>{tx(lowAccuracy ? 'Needs calibration' : source === 'magnetometer' && Platform.OS !== 'android' ? 'Hold phone flat' : 'Tilt-corrected')}</Text>
                  </View>
                )}
              </View>
              {/* Which sensor drives the dial; tap to try another if it seems stuck. */}
              {source && (
                <TouchableOpacity onPress={cycleSource} hitSlop={8} style={{ marginTop: 8 }}>
                  <Text style={{ color: colors.textTertiary, fontSize: 11.5 }}>
                    {tx('Sensor')}: {tx(source === 'fused' ? 'Fused heading' : source === 'motion' ? 'Rotation sensor' : 'Magnetometer')} · {rate}/s · {tx(pinnedState ? 'Fixed' : 'Auto')} ({tx('tap to switch')})
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Dial */}
            <View style={{ width: SIZE, height: SIZE + 18, marginTop: 16, alignItems: 'center' }}>
              {/* Fixed lubber line: the direction the top of the phone points */}
              <View style={[st.lubber, { borderBottomColor: colors.primary }]} />
              <Animated.View style={{ width: SIZE, height: SIZE, marginTop: 18, transform: [{ rotate: spin }] }}>
                <Svg width={SIZE} height={SIZE}>
                  <Circle cx={R} cy={R} r={R - 1} fill={colors.surface} stroke={colors.cardBorder} strokeWidth={1.5} />
                  {VASTU.map((v) => (
                    <Path key={v.key} d={sector(v.center, R * 0.56, R * 0.74)} fill={v.color} opacity={v.key === dir.key ? (isDark ? 0.55 : 0.4) : isDark ? 0.16 : 0.1} />
                  ))}
                  {ticks.map((t) => {
                    const major = t % 30 === 0;
                    const p0 = polar(t, R - 4), p1 = polar(t, R - (major ? 16 : 10));
                    return <Line key={t} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={t === 0 ? '#DC2626' : colors.textTertiary} strokeWidth={major ? 2 : 1} />;
                  })}
                  {[30, 60, 120, 150, 210, 240, 300, 330].map((t) => {
                    const p = polar(t, R - 28);
                    return <SvgText key={t} x={p.x} y={p.y + 4} fontSize={10} fill={colors.textTertiary} textAnchor="middle">{t}</SvgText>;
                  })}
                  {VASTU.map((v) => {
                    const cardinal = v.key.length === 1;
                    const p = polar(v.center, R * 0.65);
                    return (
                      <G key={v.key}>
                        <SvgText x={p.x} y={p.y + (cardinal ? 2 : 1)} fontSize={cardinal ? 17 : 12} fontWeight="800" fill={v.key === 'N' ? '#DC2626' : colors.text} textAnchor="middle">{v.key}</SvgText>
                        <SvgText x={p.x} y={p.y + (cardinal ? 15 : 13)} fontSize={8.5} fill={colors.textSecondary} textAnchor="middle">{language === 'en' ? '' : native(v.label, v.labelHi)}</SvgText>
                      </G>
                    );
                  })}
                  <Circle cx={R} cy={R} r={R * 0.3} fill={colors.background} stroke={colors.cardBorder} strokeWidth={1} />
                </Svg>
              </Animated.View>
              {/* Static centre (doesn't rotate) */}
              <View pointerEvents="none" style={[st.centerMark, { top: 18 + R - 26, left: R - 26 }]}>
                <Text style={{ fontSize: 24, color: colors.primary }}>ॐ</Text>
              </View>
            </View>

            {/* Hold */}
            <TouchableOpacity onPress={toggleHold} activeOpacity={0.85}
              style={[st.holdBtn, held != null ? { backgroundColor: colors.primary } : { borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
              <MaterialCommunityIcons name={held != null ? 'lock' : 'lock-open-variant-outline'} size={17} color={held != null ? '#FFF' : colors.text} />
              <Text style={{ color: held != null ? '#FFF' : colors.text, fontWeight: '800', fontSize: 14 }}>{held != null ? `${Math.round(held)}° · ${tx('tap to release')}` : tx('Hold this reading')}</Text>
            </TouchableOpacity>

            {/* Guidance */}
            <View style={[st.card, { backgroundColor: colors.surface, borderColor: dir.color + '55' }]}>
              <View style={st.cardHead}>
                <View style={[st.badge, { backgroundColor: dir.color + '18' }]}>
                  <Text style={{ color: dir.color, fontWeight: '800', fontSize: 15 }}>{dir.key}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.cardTitle, { color: colors.text }]}>{native(dir.label, dir.labelHi)}{language === 'en' ? ` (${dir.labelHi})` : ''}</Text>
                  <Text style={[st.cardSub, { color: colors.textSecondary }]}>{tx('Dikpala')} {tx(dir.dikpala)} · {tx(dir.element)}</Text>
                </View>
              </View>
              <View style={st.row}>
                <MaterialCommunityIcons name="check-circle-outline" size={16} color={colors.tulsiGreen || '#2D6A4F'} />
                <Text style={[st.rowText, { color: colors.textSecondary }]}><Text style={{ fontWeight: '800', color: colors.text }}>{tx('Best for:')} </Text>{tx(dir.good)}</Text>
              </View>
              <View style={st.row}>
                <MaterialCommunityIcons name="close-circle-outline" size={16} color="#DC2626" />
                <Text style={[st.rowText, { color: colors.textSecondary }]}><Text style={{ fontWeight: '800', color: colors.text }}>{tx('Avoid:')} </Text>{tx(dir.avoid)}</Text>
              </View>
            </View>

            <View style={[st.tips, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <Text style={[st.tipsTitle, { color: colors.text }]}>{tx('How to read a room')}</Text>
              <Text style={[st.tipText, { color: colors.textSecondary }]}>{tx(
                '1. Stand at the centre of the room or home and point the top of the phone at the door or wall you want to check.'
              )}</Text>
              <Text style={[st.tipText, { color: colors.textSecondary }]}>{tx('2. Tap "Hold this reading" so you can read it comfortably.')}</Text>
              <Text style={[st.tipText, { color: colors.textSecondary }]}>{tx(
                '3. Keep away from fridges, speakers and steel almirahs. If it says "Needs calibration", move the phone in a figure-8 a few times.'
              )}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  deg: { fontSize: 52, fontWeight: '800', letterSpacing: -1 },
  dirName: { fontSize: 16, fontWeight: '800', marginTop: -2 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  chipText: { fontSize: 11.5, fontWeight: '700' },
  lubber: { position: 'absolute', top: 0, width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 16, borderLeftColor: 'transparent', borderRightColor: 'transparent', zIndex: 3 },
  centerMark: { position: 'absolute', width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  holdBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, height: 46, borderRadius: 100, marginTop: 18 },
  card: { marginTop: 18, borderRadius: 18, borderWidth: 1.5, padding: 16, alignSelf: 'stretch' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  badge: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16.5, fontWeight: '800' },
  cardSub: { fontSize: 12.5, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  rowText: { flex: 1, fontSize: 13.5, lineHeight: 20 },
  tips: { marginTop: 14, borderRadius: 18, borderWidth: 1, padding: 16, alignSelf: 'stretch', gap: 6 },
  tipsTitle: { fontSize: 14.5, fontWeight: '800', marginBottom: 2 },
  tipText: { fontSize: 13, lineHeight: 19 },
  emptyTitle: { fontWeight: '800', fontSize: 16, marginTop: 12, textAlign: 'center' },
  emptySub: { fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 19 },
});
