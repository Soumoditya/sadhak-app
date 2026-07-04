import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function JapaScreen() {
  const { colors, isDark } = useTheme();
  const [count, setCount] = useState(0);
  const [targetMala, setTargetMala] = useState(108);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const increment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Bounce animation on tap
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.92, friction: 3, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    
    const newCount = count + 1;
    setCount(newCount);
    
    // Celebration on mala completion
    if (newCount % targetMala === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  };

  const reset = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setCount(0);
  };

  const malaComplete = Math.floor(count / targetMala);
  const currentInMala = count % targetMala;
  const progress = currentInMala / targetMala;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={isDark ? [colors.surfaceElevated, colors.surface] : ['#4A148C', '#7B1FA2', '#9C27B0']} style={styles.gradient}>
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>

        {/* Mala Counter */}
        <View style={styles.malaInfo}>
          <View style={styles.malaItem}>
            <Text style={styles.malaLabel}>Mala</Text>
            <Text style={styles.malaValue}>{malaComplete}</Text>
          </View>
          <View style={styles.malaDivider} />
          <View style={styles.malaItem}>
            <Text style={styles.malaLabel}>Total</Text>
            <Text style={styles.malaValue}>{count}</Text>
          </View>
        </View>

        {/* Main Counter Circle */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity style={styles.counterOuter} onPress={increment} activeOpacity={0.7}>
          <View style={styles.counterProgressBg}>
            <View style={styles.counterInner}>
              <Animated.Text style={[styles.counterNumber, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) }]}>{currentInMala}</Animated.Text>
              <Text style={styles.counterOf}>of {targetMala}</Text>
            </View>
          </View>
        </TouchableOpacity>
        </Animated.View>

        <Text style={styles.tapHint}>Tap the circle to count</Text>

        {/* Mala Selector */}
        <View style={styles.malaSelector}>
          {[27, 54, 108].map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.malaBtn, targetMala === m && styles.malaBtnActive]}
              onPress={() => { setTargetMala(m); setCount(0); }}
            >
              <Text style={[styles.malaBtnText, targetMala === m && styles.malaBtnTextActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reset */}
        <TouchableOpacity style={styles.resetBtn} onPress={reset}>
          <MaterialCommunityIcons name="refresh" size={22} color="#FFF" />
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>

        {/* Om Symbol */}
        <Text style={styles.om}>ॐ</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  backBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 44, left: 20, width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  malaInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 40, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 30, paddingVertical: 14, gap: 20 },
  malaItem: { alignItems: 'center' },
  malaLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' },
  malaValue: { color: '#FFD700', fontSize: 28, fontWeight: '800' },
  malaDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  counterOuter: { width: width * 0.55, height: width * 0.55, borderRadius: width * 0.275, borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  counterProgressBg: { width: '90%', height: '90%', borderRadius: width * 0.25, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  counterInner: { alignItems: 'center' },
  counterNumber: { fontSize: 64, fontWeight: '800', color: '#FFD700' },
  counterOf: { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginTop: -4 },
  tapHint: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 20 },
  malaSelector: { flexDirection: 'row', gap: 12, marginTop: 30 },
  malaBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  malaBtnActive: { backgroundColor: 'rgba(255,215,0,0.2)', borderColor: '#FFD700' },
  malaBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600' },
  malaBtnTextActive: { color: '#FFD700' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)' },
  resetText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  om: { fontSize: 40, color: 'rgba(255,215,0,0.3)', marginTop: 30 },
});
