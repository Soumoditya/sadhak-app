// Share Sadhak with a branded image card (not just a bare link).
// Android's share sheet can't attach both an image and a caption through
// expo-sharing, so the invite text (with the link) is copied to the clipboard
// first and the caller can tell the user to paste it.
import { Share } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { WEBSITE_URL } from '../constants/appInfo';

export const SHARE_MESSAGE =
  `🙏 Sadhak — your daily Hindu spiritual companion.\n\n` +
  `Panchang, Hindu calendar, nearby temples & bhandaras, aarti, japa, jyotish and more.\n\n` +
  `Get it free: ${WEBSITE_URL}`;

/**
 * Share a bundled image (with a readable file name) and copy the caption with
 * the link to the clipboard. Returns 'image' when the image was shared,
 * 'text' when it fell back to a plain text share.
 */
export async function shareImageAsset(
  module: number, fileName: string, message: string, title = 'Share',
): Promise<'image' | 'text' | 'cancelled'> {
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

export function shareSadhak() {
  return shareImageAsset(require('../assets/images/share-card.jpg'), 'Sadhak.jpg', SHARE_MESSAGE, 'Share Sadhak');
}

export function shlokaShareMessage(text: string, meaning: string, source: string) {
  return `🙏 ${text}\n"${meaning}"\n— ${source}\n\nShloka of the day from Sadhak, your daily spiritual companion: ${WEBSITE_URL}`;
}
