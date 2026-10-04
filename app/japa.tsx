import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Animated, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDialog } from '../contexts/DialogContext';
import { goBackOrHome } from '../components/ui/Header';

const STORE_KEY = 'sadhak_japa_state';
const GOLD = '#F5B841';
const SAFFRON = '#E8650A';
const TARGETS = [27, 54, 108] as const;

export default function JapaScreen() {
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState<number>(108);
  const [loaded, setLoaded] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  // Keep the count if the user leaves mid-japa (it used to reset to 0).
  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY).then((v) => {
      if (v) { try { const s = JSON.parse(v); setCount(s.count || 0); setTarget(s.target || 108); } catch {} }
    }).catch(() => {}).finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORE_KEY, JSON.stringify({ count, target })).catch(() => {});
  }, [count, target, loaded]);

  const increment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 70, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    const next = count + 1;
    setCount(next);
    if (next % target === 0) {
      // Mala complete: stronger haptic + a soft golden flash.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]).start();
    }
  };

  const reset = () => {
    if (count === 0) return;
    dialog.alert('Reset count?', `This clears your ${count} chants.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); setCount(0); } },
    ]);
  };

  const malas = Math.floor(count / target);
  const inMala = count % target;
  const progress = inMala / target;

  const size = Math.min(width * 0.72, 300);
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <LinearGradient colors={['#16100A', '#0B0E13']} style={{ flex: 1 }}>
      {/* Top bar */}
      <View style={[st.top, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={st.iconBtn} onPress={goBackOrHome} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={st.title}>Japa Mala</Text>
        <TouchableOpacity style={[st.iconBtn, { opacity: count ? 1 : 0.4 }]} onPress={reset} hitSlop={8}>
          <MaterialCommunityIcons name="restore" size={21} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={st.stats}>
        <Stat label="Malas" value={malas} />
        <View style={st.statDivider} />
        <Stat label="Total chants" value={count} />
      </View>

      {/* The whole middle area is the tap target, not just the circle. */}
      <Pressable onPress={increment} style={st.tapArea} accessibilityRole="button" accessibilityLabel={`Count chant, ${inMala} of ${target}`}>
        <Animated.View style={{ transform: [{ scale }], width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: GOLD, opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] }) }]} />
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="rgba(255,255,255,0.03)" />
            <Circle
              cx={size / 2} cy={size / 2} r={r}
              stroke={GOLD} strokeWidth={stroke} fill="none" strokeLinecap="round"
              strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - progress)}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <Text style={st.count}>{inMala}</Text>
          <Text style={st.of}>of {target}</Text>
        </Animated.View>
        <Text style={st.hint}>Tap anywhere to count</Text>
      </Pressable>

      {/* Mala size */}
      <View style={[st.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={st.bottomLabel}>BEADS PER MALA</Text>
        <View style={st.targets}>
          {TARGETS.map((m) => {
            const active = target === m;
            return (
              <TouchableOpacity key={m} onPress={() => setTarget(m)} style={[st.target, active && st.targetActive]}>
                <Text style={[st.targetText, active && { color: '#1A1208' }]}>{m}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={st.om}>ॐ</Text>
      </View>
    </LinearGradient>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 90 }}>
      <Text style={st.statValue}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#FFF', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  stats: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', marginTop: 24, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statValue: { color: GOLD, fontSize: 26, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11.5, fontWeight: '600', marginTop: 2, letterSpacing: 0.3 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 8 },
  tapArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  count: { color: '#FFF', fontSize: 72, fontWeight: '800', letterSpacing: -1 },
  of: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '600', marginTop: -6 },
  hint: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 22 },
  bottom: { alignItems: 'center' },
  bottomLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  targets: { flexDirection: 'row', gap: 10 },
  target: { minWidth: 76, alignItems: 'center', paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  targetActive: { backgroundColor: GOLD, borderColor: GOLD },
  targetText: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '800' },
  om: { fontSize: 30, color: SAFFRON, opacity: 0.45, marginTop: 18 },
});
