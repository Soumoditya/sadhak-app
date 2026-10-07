// Save a generated or downloaded file and announce it with a notification
// that opens the file when tapped.
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

// Files are kept in Sadhak's own folder: no folder picker (Android 11+ won't
// let apps write into the shared Downloads folder without one). They open in
// the phone's viewer from the notification, the Library shelf or Share.
export const DOWNLOADS_DIR = `${FileSystem.documentDirectory}Downloads/`;

/** Copy a local file into Sadhak's downloads. Returns its file:// URI. */
export async function saveToDownloads(localUri: string, fileName: string, _mime?: string): Promise<string | null> {
  try {
    await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true }).catch(() => {});
    const dest = DOWNLOADS_DIR + fileName.replace(/[\\/:*?"<>|]/g, '_');
    await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
    await FileSystem.copyAsync({ from: localUri, to: dest });
    return dest;
  } catch {
    return null;
  }
}

/** Saved files, newest first. */
export async function listDownloads(): Promise<{ name: string; uri: string; size: number; at: number }[]> {
  try {
    const names = await FileSystem.readDirectoryAsync(DOWNLOADS_DIR);
    const out = await Promise.all(names.map(async (name) => {
      const info: any = await FileSystem.getInfoAsync(DOWNLOADS_DIR + name);
      return { name, uri: DOWNLOADS_DIR + name, size: info.size || 0, at: (info.modificationTime || 0) * 1000 };
    }));
    return out.sort((x, y) => y.at - x.at);
  } catch { return []; }
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
      // Other apps can't read file:// paths; hand them a content:// URI.
      const data = uri.startsWith('file://') ? await FileSystem.getContentUriAsync(uri) : uri;
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data, flags: 1, type: mime });
      return;
    }
  } catch {}
  const target = localFallback || uri;
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(target, { mimeType: mime });
}
