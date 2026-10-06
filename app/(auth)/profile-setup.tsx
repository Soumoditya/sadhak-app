import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDialog } from "../../contexts/DialogContext";
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

import { useLanguage } from '../../contexts/LanguageContext';

export default function ProfileSetupScreen() {
  const { tx } = useLanguage();

  const { updateProfile } = useAuth();
  const { colors } = useTheme();
  const dialog = useDialog();
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [marriageStatus, setMarriageStatus] = useState<'married' | 'unmarried' | 'widowed' | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [location, setLocation] = useState<{ city: string; state: string; lat: number; lng: number; timezone: string } | null>(null);

  const fetchLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        dialog.alert('Permission Denied', 'Location permission is needed for accurate festival timings.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setLocation({
        city: address?.city || address?.subregion || 'Unknown',
        state: address?.region || 'Unknown',
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch (error) {
      dialog.alert('Error', 'Could not get your location. You can set it later.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!gender || !marriageStatus) {
      dialog.alert('Required', 'Please select your gender and marriage status for personalized guidance.');
      return;
    }
    try {
      setLoading(true);
      await updateProfile({ gender, marriageStatus, location });
      router.replace('/(tabs)');
    } catch (error) {
      dialog.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const SelectionButton = ({ selected, onPress, icon, label, iconLib = 'ion' }: any) => (
    <TouchableOpacity
      style={[
        styles.selectionBtn,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? `${colors.primary}15` : colors.surface,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {iconLib === 'mci' ? (
        <MaterialCommunityIcons name={icon} size={28} color={selected ? colors.primary : colors.textTertiary} />
      ) : (
        <Ionicons name={icon} size={28} color={selected ? colors.primary : colors.textTertiary} />
      )}
      <Text style={[styles.selectionLabel, { color: selected ? colors.primary : colors.text }]}>{label}</Text>
      {selected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={styles.checkIcon} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image source={require('../../assets/images/emblem.png')} style={styles.emblem} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{tx('Personalize Sadhak')}</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{tx('A few details for accurate Panchang and guidance')}</Text>
        </View>

        <View style={styles.content}>
          {/* Gender */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            <MaterialCommunityIcons name="gender-male-female" size={18} color={colors.primary} /> {tx('Gender')}</Text>
          <View style={styles.selectionRow}>
            <SelectionButton selected={gender === 'male'} onPress={() => setGender('male')} icon="human-male" label={tx('Male / पुरुष')} iconLib="mci" />
            <SelectionButton selected={gender === 'female'} onPress={() => setGender('female')} icon="human-female" label={tx('Female / स्त्री')} iconLib="mci" />
          </View>

          {/* Marriage Status */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
            <MaterialCommunityIcons name="ring" size={18} color={colors.primary} /> {tx('Marriage Status')}</Text>
          <View style={styles.selectionColumn}>
            <SelectionButton selected={marriageStatus === 'unmarried'} onPress={() => setMarriageStatus('unmarried')} icon="heart-outline" label={tx('Unmarried / अविवाहित')} iconLib="ion" />
            <SelectionButton selected={marriageStatus === 'married'} onPress={() => setMarriageStatus('married')} icon="heart" label={tx('Married / विवाहित')} iconLib="ion" />
            <SelectionButton selected={marriageStatus === 'widowed'} onPress={() => setMarriageStatus('widowed')} icon="heart-dislike-outline" label={tx('Widowed / विधवा/विधुर')} iconLib="ion" />
          </View>

          {/* Location */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
            <Ionicons name="location-outline" size={18} color={colors.primary} /> {tx('Location')}</Text>
          <Text style={[styles.locationHint, { color: colors.textSecondary }]}>{tx('For accurate sunrise/sunset, festival timings, and nearby temples')}</Text>
          {location ? (
            <View style={[styles.locationCard, { backgroundColor: `${colors.tulsiGreen}15`, borderColor: colors.tulsiGreen }]}>
              <Ionicons name="location" size={22} color={colors.tulsiGreen} />
              <Text style={[styles.locationText, { color: colors.tulsiGreen }]}>
                {location.city}, {location.state}
              </Text>
              <Ionicons name="checkmark-circle" size={20} color={colors.tulsiGreen} />
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.locationBtn, { borderColor: colors.primary }]}
              onPress={fetchLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="navigate-outline" size={20} color={colors.primary} />
                  <Text style={[styles.locationBtnText, { color: colors.primary }]}>{tx('Detect My Location')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Complete Button */}
          <TouchableOpacity onPress={handleComplete} disabled={loading} activeOpacity={0.8} style={{ marginTop: 32 }}>
            <LinearGradient colors={['#C2410C', '#E8743B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.completeBtn}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                <>
                  <MaterialCommunityIcons name="check-all" size={22} color="#FFFFFF" />
                  <Text style={styles.completeBtnText}>{tx('Start My Journey')}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: colors.textTertiary }]}>{tx('Skip for now')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: { paddingTop: 64, paddingBottom: 12, alignItems: 'center', paddingHorizontal: 24 },
  emblem: { width: 84, height: 84, marginBottom: 6 },
  headerTitle: { fontSize: 26, fontWeight: '800', marginTop: 10 },
  headerSub: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  selectionRow: { flexDirection: 'row', gap: 12 },
  selectionColumn: { gap: 10 },
  selectionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, padding: 16, gap: 10, minHeight: 56 },
  selectionLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  checkIcon: { position: 'absolute', top: 8, right: 8 },
  locationHint: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  locationCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  locationText: { fontSize: 15, fontWeight: '600', flex: 1 },
  locationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 14, padding: 16, gap: 8 },
  locationBtnText: { fontSize: 15, fontWeight: '600' },
  completeBtn: { borderRadius: 14, height: 56, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  completeBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  skipBtn: { alignItems: 'center', marginTop: 16, marginBottom: 40 },
  skipText: { fontSize: 14 },
});
