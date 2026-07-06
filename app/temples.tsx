import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Alert, Linking, Platform, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDialog } from "../contexts/DialogContext";
import { useLanguage } from '../contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLayoutInsets } from '../constants/layout';
import TempleMap, { type TempleMapHandle, type MapPin } from '../components/TempleMap';
import { useRef } from 'react';
import { getNearbyCommunityPlaces, addCommunityPlace, type CommunityPlace } from '../services/communityPlaces';

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
  const { headerPaddingTop, backBtnTop, bottomInset } = useLayoutInsets();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selected, setSelected] = useState<Temple | null>(null);
  const mapRef = useRef<TempleMapHandle>(null);
  // Community-added places (small local mandirs + bhandaras missing from OSM).
  const [communityPlaces, setCommunityPlaces] = useState<CommunityPlace[]>([]);
  const [addSheet, setAddSheet] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [addSaving, setAddSaving] = useState(false);

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
          // Fast path: last known position (instant). Falls back to a fresh fix
          // with a hard timeout so the screen can never hang on a slow GPS lock.
          const last = await Location.getLastKnownPositionAsync();
          if (last) {
            lat = last.coords.latitude;
            lon = last.coords.longitude;
          }
          const fresh = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
          ]);
          if (fresh) {
            lat = fresh.coords.latitude;
            lon = fresh.coords.longitude;
          } else if (!last) {
            setLocationError(true);
          }
        } else {
          setLocationError(true);
        }
      } catch (e) {
        setLocationError(true);
      }

      setUserLat(lat);
      setUserLon(lon);

      // Community places load in parallel and never block the OSM results.
      getNearbyCommunityPlaces(lat, lon, searchRadius)
        .then(setCommunityPlaces)
        .catch(() => {});

      const radiusMeters = searchRadius * 1000;
      // Broadened so smaller towns aren't empty: Hindu-tagged worship places AND
      // temple buildings AND (as a fallback) any place_of_worship nearby.
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["amenity"="place_of_worship"]["religion"="hindu"](around:${radiusMeters},${lat},${lon});
          way["amenity"="place_of_worship"]["religion"="hindu"](around:${radiusMeters},${lat},${lon});
          node["building"="hindu_temple"](around:${radiusMeters},${lat},${lon});
          way["building"="hindu_temple"](around:${radiusMeters},${lat},${lon});
          node["amenity"="place_of_worship"](around:${radiusMeters},${lat},${lon});
          way["amenity"="place_of_worship"](around:${radiusMeters},${lat},${lon});
        );
        out center body;
      `;

      // Try several Overpass mirrors — the main de instance often returns 406/429.
      const mirrors = [
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass-api.de/api/interpreter',
        'https://overpass.openstreetmap.ru/api/interpreter',
      ];
      let data: any = null;
      let lastErr: any = null;
      for (const url of mirrors) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            body: `data=${encodeURIComponent(overpassQuery)}`,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json',
            },
          });
          if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
          data = await res.json();
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!data) throw lastErr || new Error('All Overpass mirrors failed');

      const seen = new Set<string>();
      const uniqueElements = (data.elements || []).filter((el: any) => {
        const key = `${el.type}${el.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        // Hindu-only: keep Hindu-tagged places and untagged local temples,
        // but exclude places explicitly of another religion (mosque/church/etc).
        const rel = (el.tags?.religion || '').toLowerCase();
        if (rel && rel !== 'hindu') return false;
        const name = (el.tags?.name || '').toLowerCase();
        const nonHinduHint = /masjid|mosque|church|gurudwara|gurdwara|dargah|jain|buddh|monaster/.test(name);
        if (nonHinduHint) return false;
        return true;
      });
      const templeList: Temple[] = uniqueElements.slice(0, 80).map((el: any, idx: number) => {
        const tlat = el.lat || el.center?.lat;
        const tlon = el.lon || el.center?.lon;
        const dist = tlat && tlon ? getDistance(lat, lon, tlat, tlon) : null;
        return {
          id: String(el.id || idx),
          name: el.tags?.name || el.tags?.['name:en'] || el.tags?.['name:hi'] || 'Temple',
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

  // Community places rendered in the same shape as OSM temples.
  const communityAsTemples: Temple[] = communityPlaces
    .filter(p => p.type === (activeTab === 'bhandara' ? 'bhandara' : 'temple'))
    .map(p => ({
      id: `c_${p.id}`,
      name: p.name,
      address: p.description || `Added by ${p.addedByName}`,
      lat: p.lat,
      lon: p.lon,
      distance: p.distance,
      type: p.type,
    }));

  // Temples tab: OSM + community temples. Bhandara tab: community only (OSM has none).
  const displayed = (activeTab === 'temples' ? [...temples, ...communityAsTemples] : communityAsTemples)
    .filter(t => {
      const q = searchQuery.toLowerCase();
      return !q || t.name.toLowerCase().includes(q) || t.address.toLowerCase().includes(q);
    })
    .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

  const filtered = displayed;

  const mapPins: MapPin[] = filtered
    .filter(t => t.lat && t.lon)
    .map(t => ({ id: t.id, name: t.name, lat: t.lat, lon: t.lon, kind: t.type }));

  const onSelectPin = useCallback((id: string) => {
    setSelected(displayed.find(t => t.id === id) || null);
  }, [displayed]);

  const submitPlace = async () => {
    if (!addName.trim()) return;
    if (!userLat || !userLon) {
      dialog.alert('Location needed', 'Enable location so the place is pinned where you are.', undefined, { tone: 'warning' });
      return;
    }
    setAddSaving(true);
    try {
      await addCommunityPlace({
        name: addName,
        type: activeTab === 'bhandara' ? 'bhandara' : 'temple',
        description: addDesc,
        lat: userLat,
        lon: userLon,
        addedBy: profile?.uid || 'anonymous',
        addedByName: profile?.displayName || 'Sadhak',
      });
      setAddSheet(false);
      setAddName('');
      setAddDesc('');
      getNearbyCommunityPlaces(userLat, userLon, searchRadius).then(setCommunityPlaces).catch(() => {});
      dialog.alert('Added', `Your ${activeTab === 'bhandara' ? 'bhandara' : 'temple'} is now on the map for everyone nearby.`, undefined, { tone: 'success' });
    } catch (e: any) {
      dialog.alert('Could not add', String(e?.message || e).slice(0, 200));
    } finally {
      setAddSaving(false);
    }
  };

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
        style={[st.header, { paddingTop: headerPaddingTop }]}
      >
        <View style={st.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={st.headerTitle}>Nearby Temples</Text>
            <Text style={st.headerSub}>{filtered.length} found within {searchRadius}km</Text>
          </View>
          <TouchableOpacity onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')} style={st.refreshBtn}>
            <MaterialCommunityIcons name={viewMode === 'map' ? 'format-list-bulleted' : 'map-outline'} size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => fetchNearbyTemples()} style={[st.refreshBtn, { marginLeft: 8 }]}>
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

      {/* Temples / Bhandara tabs + Add */}
      <View style={st.tabRow}>
        <View style={[st.segment, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(['temples', 'bhandara'] as TabType[]).map(tab => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[st.segmentBtn, active && { backgroundColor: colors.primary }]}
                onPress={() => { setActiveTab(tab); setSelected(null); }}
              >
                <MaterialCommunityIcons
                  name={tab === 'temples' ? 'temple-hindu' : 'food-variant'}
                  size={14} color={active ? '#FFF' : colors.textSecondary}
                />
                <Text style={[st.segmentText, { color: active ? '#FFF' : colors.textSecondary }]}>
                  {tab === 'temples' ? 'Temples' : 'Bhandara'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={[st.addBtn, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '40' }]}
          onPress={() => setAddSheet(true)}
        >
          <MaterialCommunityIcons name="map-marker-plus" size={15} color={colors.primary} />
          <Text style={[st.addBtnText, { color: colors.primary }]}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Radius selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.radiusScroll} contentContainerStyle={st.radiusRow}>
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
      ) : viewMode === 'map' ? (
        <View style={{ flex: 1 }}>
          {userLat !== 0 ? (
            <TempleMap ref={mapRef} userLat={userLat} userLon={userLon} pins={mapPins} isDark={isDark} onSelect={onSelectPin} />
          ) : (
            <View style={st.loadingContainer}>
              <MaterialCommunityIcons name="map-marker-off-outline" size={40} color={colors.textTertiary} />
              <Text style={[st.loadingText, { color: colors.textSecondary }]}>Enable location to see the map</Text>
            </View>
          )}

          {/* Recenter */}
          <TouchableOpacity
            style={[st.recenterFab, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            onPress={() => mapRef.current?.recenter()}
          >
            <MaterialCommunityIcons name="crosshairs-gps" size={22} color={colors.primary} />
          </TouchableOpacity>

          {filtered.length === 0 && userLat !== 0 && (
            <View style={[st.mapBanner, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                No temples mapped nearby yet. Try a larger radius above.
              </Text>
            </View>
          )}

          {/* Selected temple detail */}
          {selected && (
            <View style={[st.selectedCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, paddingBottom: 14 + bottomInset }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={[st.templeIcon, { backgroundColor: colors.primary + '12' }]}>
                  <MaterialCommunityIcons name="temple-hindu" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.templeName, { color: colors.text }]} numberOfLines={2}>{selected.name}</Text>
                  {!!selected.address && <Text style={[st.templeAddr, { color: colors.textSecondary }]} numberOfLines={1}>{selected.address}</Text>}
                  {selected.distance != null && (
                    <Text style={{ color: colors.tulsiGreen, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                      {distanceFormatted(selected.distance)} away
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setSelected(null)} hitSlop={10}>
                  <Ionicons name="close" size={22} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[st.directionsBtn, { backgroundColor: colors.primary }]} onPress={() => openInMaps(selected)}>
                <MaterialCommunityIcons name="directions" size={18} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Directions</Text>
              </TouchableOpacity>
            </View>
          )}
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
                <MaterialCommunityIcons name={activeTab === 'bhandara' ? 'food-variant' : 'temple-hindu'} size={40} color={colors.textTertiary} />
              </View>
              <Text style={[st.emptyTitle, { color: colors.text }]}>
                {activeTab === 'bhandara' ? 'No bhandara mapped yet' : 'No temples found'}
              </Text>
              <Text style={[st.emptyText, { color: colors.textSecondary }]}>
                {activeTab === 'bhandara'
                  ? 'Bhandaras are added by the community. Know one nearby? Be the first to put it on the map.'
                  : 'Try increasing the search radius, or add a local mandir yourself.'}
              </Text>
              <TouchableOpacity style={[st.retryBtn, { backgroundColor: colors.primary + '12' }]} onPress={() => setAddSheet(true)}>
                <MaterialCommunityIcons name="map-marker-plus" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  Add {activeTab === 'bhandara' ? 'a Bhandara' : 'a Temple'}
                </Text>
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

      {/* ═══ Add temple / bhandara sheet ═══ */}
      <Modal visible={addSheet} transparent animationType="slide" onRequestClose={() => setAddSheet(false)}>
        <View style={st.sheetOverlay}>
          <View style={[st.sheet, { backgroundColor: colors.surface, paddingBottom: 24 + bottomInset }]}>
            <View style={[st.sheetHandle, { backgroundColor: colors.divider }]} />
            <View style={st.sheetHeader}>
              <Text style={[st.sheetTitle, { color: colors.text }]}>
                Add {activeTab === 'bhandara' ? 'a Bhandara' : 'a Temple'}
              </Text>
              <TouchableOpacity onPress={() => setAddSheet(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <Text style={[st.sheetSub, { color: colors.textSecondary }]}>
              {activeTab === 'bhandara'
                ? 'Know a bhandara (free food seva) happening nearby? Put it on the map for everyone.'
                : 'Local mandir missing from the map? Add it — it will appear for all Sadhaks nearby.'}
            </Text>
            <View style={[st.locationRow, { backgroundColor: colors.primary + '0D', borderColor: colors.primary + '30' }]}>
              <MaterialCommunityIcons name="crosshairs-gps" size={15} color={colors.primary} />
              <Text style={[st.locationRowText, { color: colors.textSecondary }]}>
                Pinned at your current location
              </Text>
            </View>
            <TextInput
              style={[st.sheetInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder={activeTab === 'bhandara' ? 'Bhandara name / occasion *' : 'Temple name *'}
              placeholderTextColor={colors.textTertiary}
              value={addName}
              onChangeText={setAddName}
              maxLength={80}
            />
            <TextInput
              style={[st.sheetInput, st.sheetInputMulti, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder={activeTab === 'bhandara' ? 'Details — timing, what is served, landmark…' : 'Details — deity, timings, landmark… (optional)'}
              placeholderTextColor={colors.textTertiary}
              value={addDesc}
              onChangeText={setAddDesc}
              multiline
              maxLength={300}
            />
            <TouchableOpacity onPress={submitPlace} disabled={addSaving || !addName.trim()} activeOpacity={0.85}>
              <LinearGradient colors={['#D94F00', '#F07830']} style={[st.sheetSubmit, (!addName.trim() || addSaving) && { opacity: 0.6 }]}>
                {addSaving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="map-marker-check" size={18} color="#FFF" />
                    <Text style={st.sheetSubmitText}>Put it on the map</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  tabRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 10 },
  segment: { flex: 1, flexDirection: 'row', borderRadius: 13, borderWidth: 1, padding: 3 },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10 },
  segmentText: { fontSize: 12.5, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, height: 40, borderRadius: 13, borderWidth: 1 },
  addBtnText: { fontSize: 13, fontWeight: '700' },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 19, fontWeight: '800' },
  sheetSub: { fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 14 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 11, borderWidth: 1, marginBottom: 12 },
  locationRowText: { fontSize: 12.5, fontWeight: '600' },
  sheetInput: { borderWidth: 1, borderRadius: 13, padding: 13, fontSize: 15, marginBottom: 10 },
  sheetInputMulti: { minHeight: 84, textAlignVertical: 'top' },
  sheetSubmit: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 14, height: 52, marginTop: 6 },
  sheetSubmitText: { color: '#FFF', fontSize: 15.5, fontWeight: '800' },
  radiusScroll: { flexGrow: 0, maxHeight: 52 },
  radiusRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: 'center' },
  radiusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, height: 34, borderRadius: 17, borderWidth: 1 },
  radiusText: { fontSize: 12, fontWeight: '600' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  recenterFab: { position: 'absolute', right: 16, top: 16, width: 46, height: 46, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  mapBanner: { position: 'absolute', top: 16, left: 16, right: 74, padding: 12, borderRadius: 12, borderWidth: 1 },
  selectedCard: { position: 'absolute', left: 12, right: 12, bottom: 12, padding: 14, borderRadius: 18, borderWidth: 1, gap: 12, elevation: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  directionsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
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
