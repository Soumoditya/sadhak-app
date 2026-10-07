// Share Sadhak with a branded image card (not just a bare link).
// react-native-share sends the image and the caption together (WhatsApp,
// Telegram, Instagram etc. show the text as the caption). On builds without
// that native module we fall back to expo-sharing + caption on the clipboard.
import { Share, NativeModules, TurboModuleRegistry } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { WEBSITE_URL } from '../constants/appInfo';

export const SHARE_MESSAGE =
  `🙏 Sadhak: your daily Hindu spiritual companion.\n\n` +
  `Panchang, Hindu calendar, nearby temples & bhandaras, aarti, japa, jyotish and more.\n\n` +
  `Get it free: ${WEBSITE_URL}`;

/**
 * Share a bundled image (with a readable file name) and copy the caption with
 * the link to the clipboard. Returns 'image' when the image was shared,
 * 'text' when it fell back to a plain text share.
 */
export async function shareImageAsset(
  module: number, fileName: string, message: string, title = 'Share',
): Promise<'captioned' | 'image' | 'text' | 'cancelled'> {
  // Preferred: one share with image + caption.
  const RNShare = nativeShare();
  if (RNShare) {
    try {
      const asset = Asset.fromModule(module);
      await asset.downloadAsync();
      const src = asset.localUri || asset.uri;
      const dest = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
      await FileSystem.copyAsync({ from: src, to: dest }).catch(async () => { await FileSystem.downloadAsync(src, dest); });
      const r = await RNShare.open({ url: dest, type: 'image/jpeg', message, title, filename: fileName, failOnCancel: false });
      return r?.dismissedAction ? 'cancelled' : 'captioned';
    } catch {
      // fall through
    }
  }
  try {
    if (await Sharing.isAvailableAsync()) {
      const asset = Asset.fromModule(module);
      await asset.downloadAsync();
      const src = asset.localUri || asset.uri;
      const dest = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
      await FileSystem.copyAsync({ from: src, to: dest }).catch(async () => {
        // Some asset URIs can't be copied directly; download instead.
        await FileSystem.downloadAsync(src, dest);
      });
      await Clipboard.setStringAsync(message).catch(() => {});
      await Sharing.shareAsync(dest, { mimeType: 'image/jpeg', dialogTitle: title });
      return 'image';
    }
  } catch {
    // fall through to a plain text share
  }
  try {
    const r = await Share.share({ message });
    return r.action === Share.dismissedAction ? 'cancelled' : 'text';
  } catch {
    return 'cancelled';
  }
}

/** react-native-share, only when the native side exists in this build. */
function nativeShare(): any {
  try {
    const has = !!(NativeModules as any).RNShare || !!(TurboModuleRegistry as any).get?.('RNShare');
    if (!has) return null;
    return require('react-native-share').default;
  } catch {
    return null;
  }
}

/** One line that goes under everything shared from the app. */
export const PROMO = `🙏 Shared from Sadhak, the Hindu spiritual companion app. Free: ${WEBSITE_URL}`;
export const withPromo = (text: string) => (text.includes(WEBSITE_URL) ? text : `${text.trim()}\n\n${PROMO}`);

/** Share text with the Sadhak line under it. */
export async function shareText(text: string, title = 'Share') {
  try { await Share.share({ message: withPromo(text), title }); } catch {}
}

/** Share a local file (image, PDF) with the Sadhak caption in the same share. */
export async function shareFile(uri: string, mime: string, caption = '', title = 'Share') {
  const message = withPromo(caption || '');
  const RNShare = nativeShare();
  if (RNShare) {
    try { await RNShare.open({ url: uri, type: mime, message, title, failOnCancel: false }); return; } catch {}
  }
  await Clipboard.setStringAsync(message).catch(() => {});
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: title });
}

export function shareSadhak() {
  return shareImageAsset(require('../assets/images/share-card.jpg'), 'Sadhak.jpg', SHARE_MESSAGE, 'Share Sadhak');
}

export function shlokaShareMessage(text: string, meaning: string, source: string) {
  return `🙏 ${text}\n"${meaning}"\n(${source})\n\nShloka of the day from Sadhak, your daily spiritual companion: ${WEBSITE_URL}`;
}
