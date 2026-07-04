import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Alert, Linking, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDialog } from "../contexts/DialogContext";
import { useLanguage } from '../contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

interface Temple {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  distance?: number;
  type: 'temple' | 'bhandara';
}

type TabType = 'temples' | 'bhandara';

export default function TemplesScreen() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const dialog = useDialog();
  const { t } = useLanguage();
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('temples');
  const [userLat, setUserLat] = useState(0);
  const [userLon, setUserLon] = useState(0);
  const [locationError, setLocationError] = useState(false);
  const [searchRadius, setSearchRadius] = useState(10); // km

  useEffect(() => {
    fetchNearbyTemples();
  }, [searchRadius]);

  const fetchNearbyTemples = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setLocationError(false);

      let lat = profile?.location?.lat || 28.6139;
      let lon = profile?.location?.lng || 77.209;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
        } else {
          setLocationError(true);
        }
      } catch (e) {
        setLocationError(true);
      }

      setUserLat(lat);
      setUserLon(lon);

      const radiusMeters = searchRadius * 1000;
      const overpassQuery = `
        [out:json][timeout:30];
        (
          node["amenity"="place_of_worship"]["religion"="hindu"](around:${radiusMeters},${lat},${lon});
          way["amenity"="place_of_worship"]["religion"="hindu"](around:${radiusMeters},${lat},${lon});
        );
        out center body;
      `;

      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      const templeList: Temple[] = (data.elements || []).slice(0, 80).map((el: any, idx: number) => {
        const tlat = el.lat || el.center?.lat;
        const tlon = el.lon || el.center?.lon;
        const dist = tlat && tlon ? getDistance(lat, lon, tlat, tlon) : null;
        return {
          id: String(el.id || idx),
          name: el.tags?.name || el.tags?.['name:en'] || el.tags?.['name:hi'] || 'Hindu Temple',
          address: el.tags?.['addr:full'] || el.tags?.['addr:street'] || el.tags?.['addr:city'] || el.tags?.['addr:district'] || '',
          lat: tlat || 0,
          lon: tlon || 0,
          distance: dist,
          type: 'temple' as const,
        };
      });

      templeList.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      setTemples(templeList);
    } catch (error) {
      console.error('Error:', error);
      dialog.alert('Connection Error', 'Could not fetch nearby temples. Please check your internet connection.', [
        { text: 'Retry', onPress: () => fetchNearbyTemples() },
        { text: 'Cancel' },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  const openInMaps = (temple: Temple) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${temple.lat},${temple.lon}(${encodeURIComponent(temple.name)})`,
      android: `geo:${temple.lat},${temple.lon}?q=${temple.lat},${temple.lon}(${encodeURIComponent(temple.name)})`,
    });
    if (url) {
      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${temple.lat},${temple.lon}&travelmode=driving`);
      });
    }
  };

  const shareTemple = (temple: Temple) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${temple.lat},${temple.lon}`;
    Linking.openURL(url);
  };

  const filtered = temples.filter(t => {
    const matchSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  const distanceFormatted = (d?: number) => {
    if (!d) return '';
    if (d < 1) return `${Math.round(d * 1000)}m`;
    return `${d} km`;
  };

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? [colors.surfaceElevated, colors.background] : ['#D94F00', '#F07830']}
        style={st.header}
      >
        <View style={st.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={st.headerTitle}>Nearby Temples</Text>
            <Text style={st.headerSub}>{temples.length} temples within {searchRadius}km</Text>
          </View>
          <TouchableOpacity onPress={() => fetchNearbyTemples()} style={st.refreshBtn}>
            <MaterialCommunityIcons name="refresh" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Location warning */}
      {locationError && (
        <View style={[st.locationWarning, { backgroundColor: '#FFF3E0', borderColor: '#FFB300' }]}>
          <MaterialCommunityIcons name="map-marker-alert-outline" size={16} color="#FF8C00" />
          <Text style={{ flex: 1, fontSize: 12, color: '#BF6000' }}>Using approximate location. Enable GPS for better results.</Text>
        </View>
      )}

      {/* Search */}
      <View style={[st.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput style={[st.searchInput, { color: colors.text }]} placeholder="Search temples..." placeholderTextColor={colors.textTertiary} value={searchQuery} onChangeText={setSearchQuery} />
        {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={colors.textTertiary} /></TouchableOpacity> : null}
      </View>

      {/* Radius selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.radiusRow}>
        {[5, 10, 20, 50].map(r => (
          <TouchableOpacity key={r}
            style={[st.radiusChip, { backgroundColor: searchRadius === r ? colors.primary : colors.surface, borderColor: searchRadius === r ? colors.primary : colors.border }]}
            onPress={() => setSearchRadius(r)}>
            <MaterialCommunityIcons name="map-marker-radius" size={14} color={searchRadius === r ? '#FFF' : colors.textSecondary} />
            <Text style={[st.radiusText, { color: searchRadius === r ? '#FFF' : colors.text }]}>{r} km</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={st.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[st.loadingText, { color: colors.textSecondary }]}>Finding nearby temples...</Text>
          <Text style={[st.loadingSubtext, { color: colors.textTertiary }]}>Searching within {searchRadius}km radius</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={st.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNearbyTemples(true)} colors={[colors.primary]} />}
        >
          {filtered.length === 0 ? (
            <View style={st.empty}>
              <View style={[st.emptyCircle, { backgroundColor: isDark ? colors.surfaceElevated : '#FFF3E0' }]}>
                <MaterialCommunityIcons name="temple-hindu" size={40} color={colors.textTertiary} />
              </View>
              <Text style={[st.emptyTitle, { color: colors.text }]}>No temples found</Text>
              <Text style={[st.emptyText, { color: colors.textSecondary }]}>
                Try increasing the search radius or check your internet connection
              </Text>
              <TouchableOpacity style={[st.retryBtn, { backgroundColor: colors.primary + '12' }]} onPress={() => fetchNearbyTemples()}>
                <MaterialCommunityIcons name="refresh" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filtered.map((temple, idx) => (
              <TouchableOpacity
                key={temple.id}
                style={[st.templeCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                onPress={() => openInMaps(temple)}
                activeOpacity={0.7}
              >
                <View style={[st.templeIcon, { backgroundColor: colors.primary + '10' }]}>
                  <MaterialCommunityIcons name="temple-hindu" size={24} color={colors.primary} />
                </View>
                <View style={st.templeInfo}>
                  <Text style={[st.templeName, { color: colors.text }]} numberOfLines={2}>{temple.name}</Text>
                  {temple.address ? <Text style={[st.templeAddr, { color: colors.textSecondary }]} numberOfLines={1}>{temple.address}</Text> : null}
                  <View style={st.templeMeta}>
                    {temple.distance != null && (
                      <View style={[st.distBadge, { backgroundColor: colors.tulsiGreen + '10' }]}>
                        <MaterialCommunityIcons name="map-marker-distance" size={12} color={colors.tulsiGreen} />
                        <Text style={[st.distText, { color: colors.tulsiGreen }]}>{distanceFormatted(temple.distance)}</Text>
                      </View>
                    )}
                    <TouchableOpacity onPress={() => shareTemple(temple)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialCommunityIcons name="share-variant-outline" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[st.dirBtn, { backgroundColor: colors.tulsiGreen + '12' }]}>
                  <MaterialCommunityIcons name="navigation-variant-outline" size={20} color={colors.tulsiGreen} />
                </View>
              </TouchableOpacity>
            ))
          )}
          <Text style={[st.credit, { color: colors.textTertiary }]}>🗺️ Data from OpenStreetMap contributors</Text>
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  refreshBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },

  locationWarning: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 10, padding: 10, borderRadius: 10, borderWidth: 1 },

  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, height: 42, borderRadius: 12, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },

  radiusRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  radiusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  radiusText: { fontSize: 12, fontWeight: '600' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 15, fontWeight: '600' },
  loadingSubtext: { fontSize: 12 },

  list: { padding: 16, gap: 8, paddingBottom: 30 },
  templeCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, gap: 12 },
  templeIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  templeInfo: { flex: 1 },
  templeName: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  templeAddr: { fontSize: 12, marginTop: 2 },
  templeMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  distBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  distText: { fontSize: 12, fontWeight: '700' },
  dirBtn: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  empty: { alignItems: 'center', marginTop: 60, gap: 10, paddingHorizontal: 30 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 8 },

  credit: { textAlign: 'center', fontSize: 11, marginTop: 16, marginBottom: 20 },
});
