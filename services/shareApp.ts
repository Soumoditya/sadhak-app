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

/** Returns 'image' when the card was shared (and the text copied), 'text' otherwise. */
export async function shareSadhak(): Promise<'image' | 'text' | 'cancelled'> {
  try {
    if (await Sharing.isAvailableAsync()) {
      const asset = Asset.fromModule(require('../assets/images/share-card.jpg'));
      await asset.downloadAsync();
      const src = asset.localUri || asset.uri;
      const dest = `${FileSystem.cacheDirectory}Sadhak.jpg`;
      await FileSystem.copyAsync({ from: src, to: dest }).catch(async () => {
        // Some asset URIs can't be copied directly; download instead.
        await FileSystem.downloadAsync(src, dest);
      });
      await Clipboard.setStringAsync(SHARE_MESSAGE).catch(() => {});
      await Sharing.shareAsync(dest, { mimeType: 'image/jpeg', dialogTitle: 'Share Sadhak' });
      return 'image';
    }
  } catch {
    // fall through to a plain text share
  }
  try {
    const r = await Share.share({ message: SHARE_MESSAGE });
    return r.action === Share.dismissedAction ? 'cancelled' : 'text';
  } catch {
    return 'cancelled';
  }
}
