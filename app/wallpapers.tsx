import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
  Dimensions, ActivityIndicator, Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as IntentLauncher from 'expo-intent-launcher';
import { useTheme } from '../contexts/ThemeContext';
import { useDialog } from '../contexts/DialogContext';
import { Header } from '../components/ui';
import { useDsInsets } from '../constants/ds';
import { WALLPAPERS, WALLPAPER_CATEGORIES, type Wallpaper } from '../constants/wallpapers';
import { setWallpaper as nativeSetWallpaper, isWallpaperModuleAvailable, type WallpaperTarget } from '../modules/sadhak-wallpaper';

const { width } = Dimensions.get('window');
const GAP = 12;
const COL_W = (width - 20 * 2 - GAP) / 2;

export default function WallpapersScreen() {
  const { colors } = useTheme();
  const dialog = useDialog();
  const { screenBottom } = useDsInsets();
  const [cat, setCat] = useState<'all' | Wallpaper['category']>('all');
  const [preview, setPreview] = useState<Wallpaper | null>(null);
  const [busy, setBusy] = useState<null | 'save' | 'set'>(null);

  const list = useMemo(
    () => (cat === 'all' ? WALLPAPERS : WALLPAPERS.filter(w => w.category === cat)),
    [cat],
  );

  // Download the full-size image into the app cache; returns a local file:// URI.
  // Wikimedia rejects requests without a descriptive User-Agent (HTTP 403), so
  // we send one per their policy: https://meta.wikimedia.org/wiki/User-Agent_policy
  const downloadToCache = async (w: Wallpaper): Promise<string> => {
    const target = `${FileSystem.cacheDirectory}wallpaper-${w.id}.jpg`;
    const res = await FileSystem.downloadAsync(w.url, target, {
      headers: { 'User-Agent': 'SadhakApp/1.6 (Hindu companion app; soumodityapramanik@gmail.com)' },
    });
    if (res.status !== 200) throw new Error(`Download failed (HTTP ${res.status}).`);
    return res.uri;
  };

  const saveToGallery = async (w: Wallpaper) => {
    try {
      setBusy('save');
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        dialog.alert('Permission needed', 'Allow photo access to save wallpapers to your gallery.');
        return;
      }
      const uri = await downloadToCache(w);
      await MediaLibrary.saveToLibraryAsync(uri);
      dialog.alert('Saved', `"${w.title}" is in your gallery. Open it there to set as wallpaper, or use "Set as wallpaper" here.`);
    } catch (e: any) {
      dialog.alert('Could not save', String(e?.message || e).slice(0, 160));
    } finally {
      setBusy(null);
    }
  };

  // Apply the wallpaper. Primary path = our WallpaperManager native module
  // (reliable on OEM skins). Fallback = ACTION_ATTACH_DATA system chooser for
  // builds where the native module isn't linked yet.
  const applyWallpaper = async (w: Wallpaper, target: WallpaperTarget) => {
    if (Platform.OS !== 'android') {
      dialog.alert('Android only', 'One-tap wallpaper setting is available on Android. On iOS, save to gallery and set it from Photos.');
      return;
    }
    try {
      setBusy('set');
      const uri = await downloadToCache(w);
      if (isWallpaperModuleAvailable()) {
        await nativeSetWallpaper(uri, target);
        dialog.alert('Wallpaper set', `"${w.title}" is now your ${target === 'both' ? 'home & lock' : target} screen.`, undefined, { tone: 'success' });
      } else {
        // Fallback: let the system's own cropper/chooser handle it.
        const contentUri = await FileSystem.getContentUriAsync(uri);
        await IntentLauncher.startActivityAsync('android.intent.action.ATTACH_DATA', {
          data: contentUri,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          type: 'image/jpeg',
          extra: { mimeType: 'image/jpeg' },
        });
      }
    } catch (e: any) {
      dialog.alert('Could not set wallpaper', String(e?.message || e).slice(0, 160));
    } finally {
      setBusy(null);
    }
  };

  // Ask which screen(s) to apply to, then set.
  const setAsWallpaper = (w: Wallpaper) => {
    if (Platform.OS !== 'android') { applyWallpaper(w, 'both'); return; }
    dialog.alert('Set wallpaper', `Apply "${w.title}" to:`, [
      { text: 'Home screen', onPress: () => applyWallpaper(w, 'home') },
      { text: 'Lock screen', onPress: () => applyWallpaper(w, 'lock') },
      { text: 'Both', onPress: () => applyWallpaper(w, 'both') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <Header title="Wallpapers" subtitle="Gods, temples & sacred nature" />

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.catScroll} contentContainerStyle={st.catRow}>
        {WALLPAPER_CATEGORIES.map(c => {
          const active = cat === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => setCat(c.key)}
              style={[st.catChip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.cardBorder }]}
            >
              <MaterialCommunityIcons name={c.icon as any} size={14} color={active ? '#FFF' : colors.textSecondary} />
              <Text style={[st.catText, { color: active ? '#FFF' : colors.textSecondary }]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Grid */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[st.grid, { paddingBottom: screenBottom }]}>
        {list.map(w => (
          <TouchableOpacity key={w.id} activeOpacity={0.85} onPress={() => setPreview(w)} style={st.tile}>
            <ExpoImage
              source={{ uri: w.thumb }}
              placeholder={{ blurhash: w.blurhash }}
              style={st.tileImg}
              contentFit="cover"
              contentPosition="top"
              transition={220}
              cachePolicy="disk"
            />
            <View style={st.tileLabel}>
              <Text style={st.tileTitle} numberOfLines={1}>{w.title}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Full-screen preview + actions */}
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={st.previewWrap}>
          {preview && (
            <ExpoImage
              source={{ uri: preview.url }}
              placeholder={{ blurhash: preview.blurhash }}
              style={StyleSheet.absoluteFill}
              // 'contain' so the whole painting is visible in preview (deity not
              // cropped). The wallpaper is still applied full-bleed by the system.
              contentFit="contain"
              transition={220}
              cachePolicy="disk"
            />
          )}
          <View style={st.previewScrim} />

          <TouchableOpacity style={st.previewClose} onPress={() => setPreview(null)} hitSlop={12}>
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>

          {preview && (
            <View style={st.previewFooter}>
              <Text style={st.previewTitle}>{preview.title}</Text>
              <Text style={st.previewCredit}>{preview.credit}</Text>
              <View style={st.previewActions}>
                <TouchableOpacity
                  style={[st.pBtn, { backgroundColor: 'rgba(255,255,255,0.16)' }]}
                  onPress={() => saveToGallery(preview)}
                  disabled={busy !== null}
                >
                  {busy === 'save' ? <ActivityIndicator size="small" color="#FFF" /> : <MaterialCommunityIcons name="download" size={18} color="#FFF" />}
                  <Text style={st.pBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[st.pBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setAsWallpaper(preview)}
                  disabled={busy !== null}
                >
                  {busy === 'set' ? <ActivityIndicator size="small" color="#FFF" /> : <MaterialCommunityIcons name="wallpaper" size={18} color="#FFF" />}
                  <Text style={st.pBtnText}>Set as wallpaper</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  catScroll: { maxHeight: 44, marginTop: 4 },
  catRow: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 100, borderWidth: 1 },
  catText: { fontSize: 12.5, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, paddingTop: 14, gap: GAP },
  tile: { width: COL_W, height: COL_W * 1.5, borderRadius: 18, overflow: 'hidden', backgroundColor: '#0002' },
  tileImg: { width: '100%', height: '100%' },
  tileLabel: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.32)' },
  tileTitle: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  previewWrap: { flex: 1, backgroundColor: '#000' },
  previewScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.28)' },
  previewClose: { position: 'absolute', top: 48, right: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  previewFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 24, paddingBottom: 40 },
  previewTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  previewCredit: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 },
  previewActions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  pBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 100 },
  pBtnText: { color: '#FFF', fontSize: 14.5, fontWeight: '800' },
});
