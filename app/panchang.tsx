import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { calculatePanchang } from '../services/panchang';
import { useLayoutInsets } from '../constants/layout';

export default function PanchangScreen() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const { headerPaddingTop, screenBottomPadding } = useLayoutInsets();
  const today = new Date();

  const panchang = useMemo(() => {
    return calculatePanchang(today, profile?.location?.lat || 28.6139, profile?.location?.lng || 77.209);
  }, [today.toDateString()]);

  const PanchangItem = ({ icon, label, value, valueHi, color }: any) => (
    <View style={[styles.panchangItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
      <View style={[styles.itemIcon, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.itemValue, { color: colors.text }]}>{value}</Text>
        {valueHi && <Text style={[styles.itemValueHi, { color: colors.primary }]}>{valueHi}</Text>}
      </View>
    </View>
  );

  const TimeItem = ({ icon, label, time, color, warning }: any) => (
    <View style={[styles.timeItem, { backgroundColor: (warning ? colors.error : color) + '10', borderColor: (warning ? colors.error : color) + '30' }]}>
      <MaterialCommunityIcons name={icon} size={20} color={warning ? colors.error : color} />
      <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.timeValue, { color: warning ? colors.error : color }]}>{time}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed Header */}
      <LinearGradient colors={isDark ? [colors.surfaceElevated, colors.surface] : ['#4A148C', '#7B1FA2']} style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <MaterialCommunityIcons name="calendar-star" size={32} color="#FFD700" />
            <Text style={styles.headerTitle}>Today's Panchang</Text>
            <Text style={styles.headerDate}>{today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            <Text style={styles.headerHindu}>{panchang.hinduMonth.nameHi} | {panchang.tithi.pakshaHi}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

      {/* Five Elements */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Five Elements of Panchang</Text>
      <PanchangItem icon="moon-waning-crescent" label="Tithi (तिथि)" value={panchang.tithi.name} valueHi={`${panchang.tithi.pakshaHi} ${panchang.tithi.nameHi}`} color="#9C27B0" />
      <PanchangItem icon="star-four-points" label="Nakshatra (नक्षत्र)" value={`${panchang.nakshatra.name} (Lord: ${panchang.nakshatra.lord})`} valueHi={panchang.nakshatra.nameHi} color="#FF6B00" />
      <PanchangItem icon="yoga" label="Yoga (योग)" value={panchang.yoga.name} valueHi={panchang.yoga.nameHi} color="#2D6A4F" />
      <PanchangItem icon="circle-half-full" label="Karana (करण)" value={panchang.karana.name} valueHi={panchang.karana.nameHi} color="#1565C0" />
      <PanchangItem icon="calendar-today" label="Vara (वार)" value={`${panchang.vara.name} (${panchang.vara.deity})`} valueHi={panchang.vara.nameHi} color="#D94F00" />

      {/* Sun Timings */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Sun & Moon</Text>
      <View style={styles.timeGrid}>
        <TimeItem icon="weather-sunset-up" label="Sunrise" time={panchang.sunrise} color="#FF8C00" />
        <TimeItem icon="weather-sunset-down" label="Sunset" time={panchang.sunset} color="#D94F00" />
      </View>

      {/* Muhurtas */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Auspicious Timings</Text>
      <View style={styles.timeGrid}>
        <TimeItem icon="weather-night" label="Brahma Muhurta" time={`${panchang.brahmaMuhurta.start} - ${panchang.brahmaMuhurta.end}`} color="#4A148C" />
        <TimeItem icon="star-shooting" label="Abhijit Muhurta" time={`${panchang.abhijitMuhurta.start} - ${panchang.abhijitMuhurta.end}`} color="#FFD700" />
      </View>

      {/* Inauspicious Timings */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Inauspicious Timings</Text>
      <View style={styles.timeGrid}>
        <TimeItem icon="alert-circle" label="Rahu Kaal" time={`${panchang.rahuKaal.start} - ${panchang.rahuKaal.end}`} color="#D32F2F" warning />
        <TimeItem icon="skull-outline" label="Yamaghanta" time={`${panchang.yamaghanta.start} - ${panchang.yamaghanta.end}`} color="#D32F2F" warning />
        <TimeItem icon="spider-web" label="Gulika Kaal" time={`${panchang.gulikaKaal.start} - ${panchang.gulikaKaal.end}`} color="#D32F2F" warning />
      </View>

      <View style={{ height: screenBottomPadding }} />
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', marginTop: 8 },
  headerDate: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  headerHindu: { fontSize: 16, fontWeight: '600', color: '#FFD700', marginTop: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginHorizontal: 16, marginTop: 24, marginBottom: 10 },
  panchangItem: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14, borderWidth: 1, gap: 12, alignItems: 'center' },
  itemIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemLabel: { fontSize: 12, fontWeight: '500' },
  itemValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  itemValueHi: { fontSize: 14, fontWeight: '600', marginTop: 1 },
  // flexBasis+grow (no side margins): '47%' width + margins + gap overflowed
  // 100% and every card wrapped alone into a half-width single column.
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 },
  timeItem: { flexBasis: '45%', flexGrow: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 4 },
  timeLabel: { fontSize: 12, fontWeight: '500' },
  timeValue: { fontSize: 15, fontWeight: '700' },
});
