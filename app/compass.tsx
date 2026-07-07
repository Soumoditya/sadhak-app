import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Dimensions, ScrollView } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useLayoutInsets } from '../constants/layout';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W } = Dimensions.get('window');
const DIAL = Math.min(SCREEN_W - 80, 300);

// Vastu Shastra direction knowledge — deity (dikpala), element and guidance.
const VASTU: {
  key: string; label: string; labelHi: string; from: number; to: number;
  dikpala: string; element: string; good: string; avoid: string; color: string;
}[] = [
  { key: 'N',  label: 'North',      labelHi: 'उत्तर',        from: 337.5, to: 22.5,  dikpala: 'Kubera (धन)',        element: 'Water',        good: 'Cash locker, valuables, water source; keep light & open', avoid: 'Heavy storage, clutter, toilets', color: '#1565C0' },
  { key: 'NE', label: 'North-East', labelHi: 'ईशान',         from: 22.5,  to: 67.5,  dikpala: 'Ishana (Shiva)',     element: 'Water + Ether', good: 'Puja room / mandir, meditation, study — the most sacred corner', avoid: 'Toilet, kitchen, heavy furniture, shoes', color: '#7C3AED' },
  { key: 'E',  label: 'East',       labelHi: 'पूर्व',         from: 67.5,  to: 112.5, dikpala: 'Indra',              element: 'Air',          good: 'Main entrance, windows, morning surya arghya', avoid: 'Blocking walls, storage that darkens it', color: '#F59E0B' },
  { key: 'SE', label: 'South-East', labelHi: 'आग्नेय',        from: 112.5, to: 157.5, dikpala: 'Agni',               element: 'Fire',         good: 'Kitchen (cook facing east), electrical appliances', avoid: 'Water tank, puja room, bedroom for couples', color: '#D94F00' },
  { key: 'S',  label: 'South',      labelHi: 'दक्षिण',        from: 157.5, to: 202.5, dikpala: 'Yama',               element: 'Earth',        good: 'Heavy storage, master bedroom (head southward while sleeping)', avoid: 'Main entrance (unless vastu-corrected), water bodies', color: '#8B1A1A' },
  { key: 'SW', label: 'South-West', labelHi: 'नैऋत्य',        from: 202.5, to: 247.5, dikpala: 'Nirriti',            element: 'Earth',        good: 'Master bedroom, heavy almirahs, family elders\' room', avoid: 'Kitchen, toilets, children\'s room, entrance', color: '#5D4037' },
  { key: 'W',  label: 'West',       labelHi: 'पश्चिम',        from: 247.5, to: 292.5, dikpala: 'Varuna',             element: 'Water',        good: 'Dining, children\'s bedroom, study desks facing east', avoid: 'Main door if inauspicious per chart; excess openings', color: '#2D6A4F' },
  { key: 'NW', label: 'North-West', labelHi: 'वायव्य',        from: 292.5, to: 337.5, dikpala: 'Vayu',               element: 'Air',          good: 'Guest room, unmarried daughters\' room, finished-goods storage', avoid: 'Puja room; long-term storage of valuables', color: '#455A64' },
];

function directionFor(deg: number) {
  const d = ((deg % 360) + 360) % 360;
  return VASTU.find(v => (v.from > v.to ? d >= v.from || d < v.to : d >= v.from && d < v.to)) || VASTU[0];
}

export default function CompassScreen() {
  const { colors, isDark } = useTheme();
  const { headerPaddingTop, screenBottomPadding } = useLayoutInsets();
  const [heading, setHeading] = useState(0);
  const [available, setAvailable] = useState<boolean | null>(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const lastDeg = useRef(0);

  useEffect(() => {
    let sub: any;
    (async () => {
      const ok = await Magnetometer.isAvailableAsync();
      setAvailable(ok);
      if (!ok) return;
      Magnetometer.setUpdateInterval(120);
      sub = Magnetometer.addListener(({ x, y }) => {
        // Convert magnetometer vector to compass heading (degrees from North).
        let deg = Math.atan2(-x, y) * (180 / Math.PI);
        deg = ((deg % 360) + 360) % 360;
        setHeading(deg);
        // Rotate the dial opposite to the heading, taking the short way around.
        let target = -deg;
        const prev = lastDeg.current;
        while (target - prev > 180) target -= 360;
        while (target - prev < -180) target += 360;
        lastDeg.current = target;
        Animated.timing(rotation, { toValue: target, duration: 120, easing: Easing.linear, useNativeDriver: true }).start();
      });
    })();
    return () => sub && sub.remove();
  }, []);

  const dir = directionFor(heading);
  const spin = rotation.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? [colors.surfaceElevated, colors.background] : ['#4A148C', '#7B1FA2']}
        style={[st.header, { paddingTop: headerPaddingTop }]}
      >
        <View style={st.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={st.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text style={st.headerTitle}>Vastu Compass</Text>
            <Text style={st.headerSub}>वास्तु दिशा दर्शक</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: screenBottomPadding }} showsVerticalScrollIndicator={false}>
        {available === false ? (
          <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 40 }}>
            <MaterialCommunityIcons name="compass-off-outline" size={52} color={colors.textTertiary} />
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 12, textAlign: 'center' }}>
              No magnetometer on this device
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
              This phone doesn't have the compass sensor needed for live direction.
            </Text>
          </View>
        ) : (
          <>
            {/* Live heading */}
            <Text style={[st.headingDeg, { color: colors.text }]}>{Math.round(heading)}°</Text>
            <Text style={[st.headingDir, { color: dir.color }]}>{dir.label} · {dir.labelHi}</Text>

            {/* Dial */}
            <View style={[st.dialWrap, { width: DIAL + 30, height: DIAL + 30 }]}>
              {/* Fixed needle */}
              <View style={st.needle}>
                <MaterialCommunityIcons name="triangle" size={22} color={colors.primary} />
              </View>
              <Animated.View
                style={[
                  st.dial,
                  {
                    width: DIAL, height: DIAL, borderRadius: DIAL / 2,
                    backgroundColor: colors.surface, borderColor: colors.cardBorder,
                    transform: [{ rotate: spin }],
                  },
                ]}
              >
                {VASTU.map((v, i) => {
                  const angle = (i * 45 * Math.PI) / 180;
                  const r = DIAL / 2 - 34;
                  return (
                    <View
                      key={v.key}
                      style={{
                        position: 'absolute',
                        left: DIAL / 2 + r * Math.sin(angle) - 22,
                        top: DIAL / 2 - r * Math.cos(angle) - 14,
                        width: 44, alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: v.key === 'N' ? colors.festival : colors.text, fontWeight: '800', fontSize: v.key.length === 1 ? 16 : 12 }}>
                        {v.key}
                      </Text>
                      <Text style={{ color: colors.textTertiary, fontSize: 8.5 }}>{v.labelHi}</Text>
                    </View>
                  );
                })}
                <View style={[st.dialCenter, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
                  <Text style={{ fontSize: 22 }}>🕉️</Text>
                </View>
              </Animated.View>
            </View>

            {/* Direction guidance card */}
            <View style={[st.card, { backgroundColor: colors.surface, borderColor: dir.color + '55' }]}>
              <View style={st.cardHead}>
                <View style={[st.cardBadge, { backgroundColor: dir.color + '16' }]}>
                  <MaterialCommunityIcons name="compass-rose" size={20} color={dir.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.cardTitle, { color: colors.text }]}>{dir.label} ({dir.labelHi})</Text>
                  <Text style={[st.cardSub, { color: colors.textSecondary }]}>Dikpala: {dir.dikpala} · Element: {dir.element}</Text>
                </View>
              </View>
              <View style={st.row}>
                <MaterialCommunityIcons name="check-circle-outline" size={15} color="#2D6A4F" />
                <Text style={[st.rowText, { color: colors.textSecondary }]}>{dir.good}</Text>
              </View>
              <View style={st.row}>
                <MaterialCommunityIcons name="close-circle-outline" size={15} color={colors.festival} />
                <Text style={[st.rowText, { color: colors.textSecondary }]}>{dir.avoid}</Text>
              </View>
            </View>

            <Text style={[st.tip, { color: colors.textTertiary }]}>
              Hold the phone flat, away from magnets & metal. Wave it in a figure-8 to calibrate.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 21, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  headingDeg: { fontSize: 44, fontWeight: '800', marginTop: 18 },
  headingDir: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  dialWrap: { marginTop: 18, alignItems: 'center', justifyContent: 'center' },
  needle: { position: 'absolute', top: -6, zIndex: 5, transform: [{ rotate: '180deg' }] },
  dial: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dialCenter: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { marginTop: 22, marginHorizontal: 20, borderRadius: 18, borderWidth: 1.5, padding: 16, alignSelf: 'stretch' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 10 },
  cardBadge: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16.5, fontWeight: '800' },
  cardSub: { fontSize: 12, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 6 },
  rowText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  tip: { fontSize: 11.5, textAlign: 'center', marginTop: 14, paddingHorizontal: 44, lineHeight: 16 },
});
