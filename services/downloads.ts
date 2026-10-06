// Save a generated file straight into the phone's Downloads folder (Android
// Storage Access Framework: the user picks Downloads once, then saves are
// silent), announce it with a notification that opens the file when tapped.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

const SAF = FileSystem.StorageAccessFramework;
const DIR_KEY = 'sadhak_downloads_dir';

async function downloadsDir(ask: boolean): Promise<string | null> {
  const saved = await AsyncStorage.getItem(DIR_KEY).catch(() => null);
  if (saved) return saved;
  if (!ask) return null;
  const perm = await SAF.requestDirectoryPermissionsAsync(SAF.getUriForDirectoryInRoot('Download'));
  if (!perm.granted) return null;
  await AsyncStorage.setItem(DIR_KEY, perm.directoryUri).catch(() => {});
  return perm.directoryUri;
}

/**
 * Copy a local file into Downloads. Returns the saved file's content URI, or
 * null when the user declined the folder (callers then offer Share instead).
 */
export async function saveToDownloads(localUri: string, fileName: string, mime: string): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  const data = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  const base = fileName.replace(/\.[^.]+$/, '');
  for (let attempt = 0; attempt < 2; attempt++) {
    const dir = await downloadsDir(true);
    if (!dir) return null;
    try {
      const uri = await SAF.createFileAsync(dir, base, mime);
      await FileSystem.writeAsStringAsync(uri, data, { encoding: FileSystem.EncodingType.Base64 });
      return uri;
    } catch {
      // Folder access was revoked or the folder moved: ask again once.
      await AsyncStorage.removeItem(DIR_KEY).catch(() => {});
    }
  }
  return null;
}

export async function notifySaved(title: string, body: string, uri: string, mime: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { openUri: uri, mime } },
      trigger: null,
    });
  } catch {}
}

/** Open a saved file in the phone's viewer (falls back to the share sheet). */
export async function openFile(uri: string, mime: string, localFallback?: string) {
  try {
    if (Platform.OS === 'android') {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: uri, flags: 1, type: mime });
      return;
    }
  } catch {}
  const target = localFallback || uri;
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(target, { mimeType: mime });
}
