import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Linking, Share, Platform,
  ActivityIndicator, FlatList, Modal, KeyboardAvoidingView, ScrollView, useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDialog } from '../contexts/DialogContext';
import { Header } from '../components/ui';
import { useDsInsets } from '../constants/ds';
import TempleMap, { type TempleMapHandle, type MapPin } from '../components/TempleMap';
import { findNearbyTemples, getCachedTemples, formatDistance, type Temple } from '../services/temples';
import {
  getNearbyCommunityPlaces, addCommunityPlace, deleteCommunityPlace, type CommunityPlace,
} from '../services/communityPlaces';

type Tab = 'temples' | 'bhandara';
type Status = 'locating' | 'loading' | 'done' | 'error';
const RADII = [5, 10, 20, 50];
const TEMPLE = '#C2410C';
const BHANDARA = '#1B7A42';

interface Place extends Temple {
  community?: boolean;
  ownerId?: string;
  startsAt?: number | null;
  addedByName?: string;
}

function whenLabel(ms?: number | null): string {
  if (!ms) return '';
  const d = new Date(ms);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const dayLabel = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday'
    : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${dayLabel} · ${time}`;
}

export default function TemplesScreen() {
  const { user, profile } = useAuth();
  const { colors, isDark } = useTheme();
  const { t: tr } = useLanguage();
  const dialog = useDialog();
  const { insets } = useDsInsets();
  const { width } = useWindowDimensions();

  const [tab, setTab] = useState<Tab>('temples');
  const [view, setView] = useState<'map' | 'list'>('map');
  const [radius, setRadius] = useState(10);
  const [query, setQuery] = useState('');
  const [showPandals, setShowPandals] = useState(false);
  const [loc, setLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [approx, setApprox] = useState(false);
  const [status, setStatus] = useState<Status>('locating');
  const [temples, setTemples] = useState<Temple[]>([]);
  const [community, setCommunity] = useState<CommunityPlace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<TempleMapHandle>(null);
  const listRef = useRef<FlatList<Place>>(null);
  const reqId = useRef(0);
  const mapCenter = useRef<{ lat: number; lon: number } | null>(null);

  // Add-place flow
  const [addOpen, setAddOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [addLoc, setAddLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [addWhen, setAddWhen] = useState<Date>(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; });
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Location: last-known instantly, then a fresh fix (8s cap) ──
  const locate = useCallback(async (): Promise<{ lat: number; lon: number }> => {
    const fallback = { lat: profile?.location?.lat || 28.6139, lon: profile?.location?.lng || 77.209 };
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') { setApprox(true); return fallback; }
      const last = await Location.getLastKnownPositionAsync().catch(() => null);
      if (last) setLoc({ lat: last.coords.latitude, lon: last.coords.longitude });
      const fresh = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
        new Promise<null>((r) => setTimeout(() => r(null), 8000)),
      ]);
      const c = fresh?.coords || last?.coords;
      if (!c) { setApprox(true); return fallback; }
      setApprox(false);
      return { lat: c.latitude, lon: c.longitude };
    } catch {
      setApprox(true);
      return fallback;
    }
  }, [profile?.location?.lat, profile?.location?.lng]);

  // ── Data ──
  const load = useCallback(async (at: { lat: number; lon: number }, km: number, fresh = false) => {
    const id = ++reqId.current;
    const current = () => id === reqId.current;
    setStatus('loading');
    getNearbyCommunityPlaces(at.lat, at.lon, km).then((c) => { if (current()) setCommunity(c); }).catch(() => {});
    const cached = fresh ? null : await getCachedTemples(at.lat, at.lon, km);
    if (cached && current()) { setTemples(cached); setStatus('done'); return; }
    if (current()) setTemples([]);
    try {
      await findNearbyTemples(at.lat, at.lon, km, (list) => { if (current()) setTemples(list); });
      if (current()) setStatus('done');
    } catch {
      if (current()) setStatus('error');
    }
  }, []);

  useEffect(() => {
    (async () => {
      const at = await locate();
      setLoc(at);
      load(at, radius);
    })();
  }, []);

  const changeRadius = (km: number) => {
    setRadius(km); setSelectedId(null);
    if (loc) load(loc, km);
  };

  const refresh = async () => {
    setStatus('locating');
    const at = await locate();
    setLoc(at);
    load(at, radius, true);
  };

  // ── Derived list ──
  const places: Place[] = useMemo(() => {
    const comm: Place[] = community
      .filter((p) => p.type === (tab === 'bhandara' ? 'bhandara' : 'temple'))
      .map((p) => ({
        id: `c_${p.id}`, name: p.name, address: p.description, lat: p.lat, lon: p.lon,
        distance: p.distance, type: p.type, community: true, ownerId: p.addedBy,
        startsAt: p.startsAt, addedByName: p.addedByName,
      }));
    const base: Place[] = tab === 'temples' ? [...temples.filter((t) => showPandals || !t.pandal), ...comm] : comm;
    const q = query.trim().toLowerCase();
    return base
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))
      .sort((a, b) => tab === 'bhandara'
        ? (a.startsAt ?? 0) - (b.startsAt ?? 0) || (a.distance ?? 999) - (b.distance ?? 999)
        : (a.distance ?? 999) - (b.distance ?? 999));
  }, [temples, community, tab, query, showPandals]);
  const pandalCount = useMemo(() => temples.filter((t) => t.pandal).length, [temples]);

  const pins: MapPin[] = useMemo(
    () => places.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon, kind: p.type })),
    [places],
  );

  const select = (id: string, from: 'map' | 'card') => {
    setSelectedId(id);
    if (from === 'card') mapRef.current?.focus(id);
    const idx = places.findIndex((p) => p.id === id);
    if (from === 'map' && idx >= 0) listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
  };

  // ── Actions ──
  const directions = (p: Place) => {
    const web = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`;
    Linking.openURL(web).catch(() => Linking.openURL(`geo:${p.lat},${p.lon}?q=${p.lat},${p.lon}(${encodeURIComponent(p.name)})`).catch(() => {}));
  };
  const share = (p: Place) => {
    const link = `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`;
    const when = p.type === 'bhandara' && p.startsAt ? `\n${whenLabel(p.startsAt)}` : '';
    Share.share({ message: `${p.type === 'bhandara' ? '🍲' : '🛕'} ${p.name}${when}\n${link}\n\nShared from Sadhak` }).catch(() => {});
  };
  const remove = (p: Place) => {
    dialog.alert('Remove this place?', `"${p.name}" will be removed from the map for everyone.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await deleteCommunityPlace(p.id.replace(/^c_/, ''));
            setCommunity((c) => c.filter((x) => `c_${x.id}` !== p.id));
            setSelectedId(null);
          } catch (e: any) { dialog.alert('Could not remove', String(e?.message || e).slice(0, 160)); }
        },
      },
    ]);
  };

  const openAdd = () => {
    setAddLoc(loc);
    setAddOpen(true);
  };
  const startPicking = () => { setAddOpen(false); setView('map'); setPicking(true); };
  const confirmPick = () => {
    setAddLoc(mapCenter.current || loc);
    setPicking(false);
    setAddOpen(true);
  };

  const submit = async () => {
    if (!addName.trim()) { dialog.alert('Name needed', tab === 'bhandara' ? 'Who is organising it, or where? e.g. "Hanuman Mandir Bhandara".' : 'Enter the temple name.'); return; }
    if (!addLoc) { dialog.alert('Location needed', 'Choose the spot on the map.'); return; }
    if (!user?.uid) { dialog.alert('Sign in needed', 'Please sign in to add places.'); return; }
    setSaving(true);
    try {
      await addCommunityPlace({
        name: addName, description: addDesc, type: tab === 'bhandara' ? 'bhandara' : 'temple',
        lat: addLoc.lat, lon: addLoc.lon, addedBy: user.uid, addedByName: profile?.displayName || 'Sadhak',
        startsAt: tab === 'bhandara' ? addWhen.getTime() : null,
      });
      setAddOpen(false); setAddName(''); setAddDesc('');
      if (loc) getNearbyCommunityPlaces(loc.lat, loc.lon, radius).then(setCommunity).catch(() => {});
      dialog.alert('Added', `Thank you! It's now on the map for devotees nearby.`, undefined, { tone: 'success' });
    } catch (e: any) {
      dialog.alert('Could not add', String(e?.message || e).slice(0, 200));
    } finally { setSaving(false); }
  };

  // ── UI pieces ──
  const accent = tab === 'bhandara' ? BHANDARA : TEMPLE;
  const searching = status === 'locating' || status === 'loading';
  const subtitle = status === 'locating' ? 'Finding your location…'
    : tab === 'bhandara' ? `${places.length} upcoming within ${radius} km`
    : searching && !places.length ? `Searching within ${radius} km…`
    : `${places.length} temple${places.length === 1 ? '' : 's'} within ${radius} km`;
  const CARD_W = Math.min(width - 64, 340);

  // Called as a function (not <PlaceCard/>) so cards aren't remounted every render.
  const renderCard = (p: Place, compact?: boolean) => {
    const sel = p.id === selectedId;
    const c = p.type === 'bhandara' ? BHANDARA : TEMPLE;
    return (
      <TouchableOpacity
        key={p.id}
        activeOpacity={0.9}
        onPress={() => select(p.id, 'card')}
        style={[st.card, compact && { width: CARD_W, marginRight: 12 }, { backgroundColor: colors.surface, borderColor: sel ? c : colors.cardBorder }]}
      >
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={[st.cardIcon, { backgroundColor: c + '16' }]}>
            <MaterialCommunityIcons name={p.type === 'bhandara' ? 'food-variant' : 'temple-hindu'} size={22} color={c} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.cardTitle, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
            {p.type === 'bhandara' && !!p.startsAt && (
              <Text style={[st.cardWhen, { color: c }]}>{whenLabel(p.startsAt)}</Text>
            )}
            {p.pandal && <Text style={[st.cardWhen, { color: '#C49A2C' }]}>Seasonal puja pandal</Text>}
            {!!p.address && !p.pandal && <Text style={[st.cardSub, { color: colors.textSecondary }]} numberOfLines={compact ? 1 : 2}>{p.address}</Text>}
            <View style={st.metaRow}>
              {p.distance != null && <Text style={[st.meta, { color: colors.textTertiary }]}>{formatDistance(p.distance)} away</Text>}
              {p.community && <Text style={[st.meta, { color: colors.textTertiary }]}>· added by {p.ownerId === user?.uid ? 'you' : p.addedByName}</Text>}
            </View>
          </View>
        </View>
        <View style={st.actions}>
          <TouchableOpacity onPress={() => directions(p)} style={[st.primaryBtn, { backgroundColor: c }]}>
            <MaterialCommunityIcons name="directions" size={16} color="#FFF" />
            <Text style={st.primaryBtnText}>Directions</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => share(p)} style={[st.iconBtn, { borderColor: colors.cardBorder }]} hitSlop={6}>
            <Ionicons name="share-social-outline" size={17} color={colors.textSecondary} />
          </TouchableOpacity>
          {p.community && p.ownerId === user?.uid && (
            <TouchableOpacity onPress={() => remove(p)} style={[st.iconBtn, { borderColor: colors.cardBorder }]} hitSlop={6}>
              <MaterialCommunityIcons name="trash-can-outline" size={17} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const Empty = () => (
    <View style={st.empty}>
      <MaterialCommunityIcons name={tab === 'bhandara' ? 'food-variant' : 'temple-hindu'} size={34} color={accent} />
      <Text style={[st.emptyTitle, { color: colors.text }]}>
        {status === 'error' && tab === 'temples' ? "Couldn't reach the map service" : tab === 'bhandara' ? 'No bhandaras listed nearby' : `No temples found within ${radius} km`}
      </Text>
      <Text style={[st.emptySub, { color: colors.textSecondary }]}>
        {status === 'error' && tab === 'temples' ? 'Check your internet connection and try again.'
          : tab === 'bhandara' ? 'Bhandaras are shared by devotees. Know of one? Add it so others can join.'
          : 'Small local mandirs are often missing from the map. Try a larger area or add one you know.'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        {status === 'error' && tab === 'temples' ? (
          <TouchableOpacity onPress={refresh} style={[st.emptyBtn, { backgroundColor: accent }]}><Text style={st.primaryBtnText}>Try again</Text></TouchableOpacity>
        ) : tab === 'temples' && radius < 50 ? (
          <TouchableOpacity onPress={() => changeRadius(RADII[RADII.indexOf(radius) + 1])} style={[st.emptyBtn, { backgroundColor: accent }]}>
            <Text style={st.primaryBtnText}>Search {RADII[RADII.indexOf(radius) + 1]} km</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={openAdd} style={[st.emptyBtn, { borderWidth: 1, borderColor: accent }]}>
          <Text style={{ color: accent, fontWeight: '800' }}>{tab === 'bhandara' ? 'Add a bhandara' : 'Add a temple'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title={tr('t.temples')}
        subtitle={subtitle}
        right={
          <TouchableOpacity onPress={() => setView((v) => (v === 'map' ? 'list' : 'map'))} style={[st.headerBtn, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]} hitSlop={6}>
            <MaterialCommunityIcons name={view === 'map' ? 'format-list-bulleted' : 'map-outline'} size={19} color={colors.text} />
          </TouchableOpacity>
        }
      />

      {/* Controls */}
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        <View style={[st.segment, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {(['temples', 'bhandara'] as Tab[]).map((k) => {
            const active = tab === k;
            const c = k === 'bhandara' ? BHANDARA : TEMPLE;
            return (
              <TouchableOpacity key={k} onPress={() => { setTab(k); setSelectedId(null); }} style={[st.segBtn, active && { backgroundColor: c }]}>
                <MaterialCommunityIcons name={k === 'temples' ? 'temple-hindu' : 'food-variant'} size={16} color={active ? '#FFF' : colors.textSecondary} />
                <Text style={{ color: active ? '#FFF' : colors.textSecondary, fontWeight: '800', fontSize: 13.5 }}>{k === 'temples' ? 'Temples' : 'Bhandara'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={[st.search, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Ionicons name="search" size={16} color={colors.textTertiary} />
            <TextInput style={[st.searchIn, { color: colors.text }]} placeholder={tab === 'bhandara' ? 'Search bhandaras' : 'Search temples'} placeholderTextColor={colors.textTertiary} value={query} onChangeText={setQuery} />
            {!!query && <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}><Ionicons name="close-circle" size={16} color={colors.textTertiary} /></TouchableOpacity>}
          </View>
          <TouchableOpacity onPress={openAdd} style={[st.addBtn, { backgroundColor: accent }]}>
            <MaterialCommunityIcons name="map-marker-plus" size={17} color="#FFF" />
            <Text style={st.primaryBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {RADII.map((r) => {
            const active = radius === r;
            return (
              <TouchableOpacity key={r} onPress={() => changeRadius(r)} style={[st.radius, { borderColor: active ? accent : colors.cardBorder, backgroundColor: active ? accent + '15' : colors.surface }]}>
                <Text style={{ color: active ? accent : colors.textSecondary, fontWeight: '800', fontSize: 12.5 }}>{r} km</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {tab === 'temples' && pandalCount > 0 && (
          <TouchableOpacity onPress={() => { setShowPandals((v) => !v); setSelectedId(null); }} style={st.toggleRow} hitSlop={6}>
            <MaterialCommunityIcons name={showPandals ? 'checkbox-marked' : 'checkbox-blank-outline'} size={18} color={accent} />
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Include puja pandals ({pandalCount})</Text>
          </TouchableOpacity>
        )}
        {approx && (
          <View style={[st.warn, { backgroundColor: '#F59E0B14', borderColor: '#F59E0B55' }]}>
            <MaterialCommunityIcons name="map-marker-alert-outline" size={15} color="#B45309" />
            <Text style={{ flex: 1, fontSize: 12, color: isDark ? '#FBBF24' : '#B45309' }}>Using your saved city. Turn on location for accurate results.</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={{ flex: 1, marginTop: 12 }}>
        {!loc ? (
          <View style={st.center}><ActivityIndicator color={accent} /><Text style={[st.emptySub, { color: colors.textSecondary }]}>Finding your location…</Text></View>
        ) : view === 'map' ? (
          <View style={{ flex: 1 }}>
            <TempleMap
              ref={mapRef} userLat={loc.lat} userLon={loc.lon} pins={pins} selectedId={selectedId} isDark={isDark}
              onSelect={(id) => select(id, 'map')} onCenterChange={(lat, lon) => { mapCenter.current = { lat, lon }; }}
              onFail={() => setView('list')}
            />
            {searching && (
              <View style={[st.pill, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <ActivityIndicator size="small" color={accent} />
                <Text style={{ color: colors.textSecondary, fontSize: 12.5, fontWeight: '700' }}>{places.length ? 'Finding more…' : 'Searching nearby…'}</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => mapRef.current?.recenter()} style={[st.fab, { backgroundColor: colors.surface, borderColor: colors.cardBorder, bottom: picking ? 120 + insets.bottom : (places.length ? 210 : 24) + insets.bottom }]}>
              <MaterialCommunityIcons name="crosshairs-gps" size={21} color={accent} />
            </TouchableOpacity>

            {picking ? (
              <>
                <View pointerEvents="none" style={st.crosshair}>
                  <MaterialCommunityIcons name="map-marker" size={44} color={accent} />
                </View>
                <View style={[st.pickBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder, paddingBottom: 14 + insets.bottom }]}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14.5 }}>Move the map to the exact spot</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <TouchableOpacity onPress={() => { setPicking(false); setAddOpen(true); }} style={[st.emptyBtn, { flex: 1, borderWidth: 1, borderColor: colors.cardBorder }]}>
                      <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={confirmPick} style={[st.emptyBtn, { flex: 1, backgroundColor: accent }]}>
                      <Text style={st.primaryBtnText}>Use this spot</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : places.length ? (
              <FlatList
                ref={listRef}
                data={places}
                keyExtractor={(p) => p.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_W + 12}
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: 20 }}
                style={[st.carousel, { bottom: 12 + insets.bottom }]}
                onScrollToIndexFailed={() => {}}
                getItemLayout={(_, i) => ({ length: CARD_W + 12, offset: 20 + i * (CARD_W + 12), index: i })}
                renderItem={({ item }) => renderCard(item, true)}
              />
            ) : !searching ? (
              <View style={[st.mapEmpty, { backgroundColor: colors.surface, borderColor: colors.cardBorder, bottom: 12 + insets.bottom }]}><Empty /></View>
            ) : null}
          </View>
        ) : (
          <FlatList
            data={places}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 30 + insets.bottom, gap: 12 }}
            ListEmptyComponent={searching ? <View style={st.center}><ActivityIndicator color={accent} /></View> : <Empty />}
            renderItem={({ item }) => renderCard(item)}
          />
        )}
      </View>

      {/* Add place sheet */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.sheetWrap}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setAddOpen(false)} />
          <View style={[st.sheet, { backgroundColor: colors.surface, paddingBottom: 20 + insets.bottom }]}>
            <View style={[st.handle, { backgroundColor: colors.cardBorder }]} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[st.sheetTitle, { color: colors.text }]}>{tab === 'bhandara' ? 'Add a bhandara' : 'Add a temple'}</Text>
              <Text style={[st.sheetSub, { color: colors.textSecondary }]}>
                {tab === 'bhandara' ? 'Share a free food seva so devotees nearby can join.' : 'Add a mandir that is missing from the map.'}
              </Text>

              <Text style={[st.label, { color: colors.textTertiary }]}>NAME</Text>
              <TextInput value={addName} onChangeText={setAddName} placeholder={tab === 'bhandara' ? 'e.g. Hanuman Jayanti Bhandara' : 'e.g. Shri Ram Mandir'} placeholderTextColor={colors.textTertiary}
                style={[st.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background }]} />

              {tab === 'bhandara' && (
                <>
                  <Text style={[st.label, { color: colors.textTertiary }]}>WHEN</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => setShowDate(true)} style={[st.input, st.inputRow, { flex: 1.3, borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
                      <MaterialCommunityIcons name="calendar" size={16} color={accent} />
                      <Text style={{ color: colors.text, fontSize: 14 }}>{addWhen.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowTime(true)} style={[st.input, st.inputRow, { flex: 1, borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
                      <MaterialCommunityIcons name="clock-outline" size={16} color={accent} />
                      <Text style={{ color: colors.text, fontSize: 14 }}>{addWhen.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</Text>
                    </TouchableOpacity>
                  </View>
                  {showDate && (
                    <DateTimePicker value={addWhen} mode="date" minimumDate={new Date()} onChange={(_, d) => {
                      setShowDate(Platform.OS === 'ios');
                      if (d) { const n = new Date(addWhen); n.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); setAddWhen(n); }
                    }} />
                  )}
                  {showTime && (
                    <DateTimePicker value={addWhen} mode="time" onChange={(_, d) => {
                      setShowTime(Platform.OS === 'ios');
                      if (d) { const n = new Date(addWhen); n.setHours(d.getHours(), d.getMinutes(), 0, 0); setAddWhen(n); }
                    }} />
                  )}
                </>
              )}

              <Text style={[st.label, { color: colors.textTertiary }]}>DETAILS (OPTIONAL)</Text>
              <TextInput value={addDesc} onChangeText={setAddDesc} multiline placeholder={tab === 'bhandara' ? 'What is served, who is organising, landmark…' : 'Deity, landmark, timings…'} placeholderTextColor={colors.textTertiary}
                style={[st.input, { minHeight: 70, textAlignVertical: 'top', paddingTop: 12, color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background }]} />

              <Text style={[st.label, { color: colors.textTertiary }]}>LOCATION</Text>
              <TouchableOpacity onPress={startPicking} style={[st.input, st.inputRow, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
                <MaterialCommunityIcons name="map-marker" size={17} color={accent} />
                <Text style={{ color: colors.text, fontSize: 14, flex: 1 }} numberOfLines={1}>
                  {addLoc && loc && Math.abs(addLoc.lat - loc.lat) < 1e-5 && Math.abs(addLoc.lon - loc.lon) < 1e-5 ? 'Where I am now' : addLoc ? `${addLoc.lat.toFixed(4)}, ${addLoc.lon.toFixed(4)}` : 'Choose on map'}
                </Text>
                <Text style={{ color: accent, fontWeight: '800', fontSize: 13 }}>Change</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={submit} disabled={saving} style={[st.submit, { backgroundColor: accent, opacity: saving ? 0.7 : 1 }]}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={[st.primaryBtnText, { fontSize: 15.5 }]}>{tab === 'bhandara' ? 'Share bhandara' : 'Add temple'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  headerBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  segment: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4 },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 10 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchIn: { flex: 1, fontSize: 14.5 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, borderRadius: 12, height: 44 },
  radius: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 40 },
  pill: { position: 'absolute', top: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1, elevation: 3 },
  fab: { position: 'absolute', right: 16, width: 46, height: 46, borderRadius: 23, borderWidth: 1, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  carousel: { position: 'absolute', left: 0, right: 0, flexGrow: 0 },
  card: { borderRadius: 18, borderWidth: 1.5, padding: 14, elevation: 3 },
  cardIcon: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15.5, fontWeight: '800' },
  cardWhen: { fontSize: 12.5, fontWeight: '800', marginTop: 2 },
  cardSub: { fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  meta: { fontSize: 11.5, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 11 },
  primaryBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13.5 },
  iconBtn: { width: 40, height: 40, borderRadius: 11, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  emptySub: { fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
  emptyBtn: { height: 42, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mapEmpty: { position: 'absolute', left: 16, right: 16, borderRadius: 18, borderWidth: 1, elevation: 3 },
  crosshair: { position: 'absolute', top: '50%', left: '50%', marginLeft: -22, marginTop: -44 },
  pickBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1 },
  sheetWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, maxHeight: '88%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  sheetSub: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 16, marginBottom: 7 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: 48, fontSize: 14.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submit: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
});
