import { Platform } from 'react-native';
import * as Updates from 'expo-updates';

// Over-the-air updates (EAS Update, channel "production"). expo-updates
// already checks on launch, but on its own a downloaded update only applies
// on the *second* cold start. This finishes the job: check, download, and
// let the caller offer an immediate restart.

const enabled = () => Platform.OS !== 'web' && !__DEV__ && Updates.isEnabled;

/** True when a new update has been downloaded and is ready to apply. */
export async function downloadPendingUpdate(): Promise<boolean> {
  if (!enabled()) return false;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return false;
    const fetched = await Updates.fetchUpdateAsync();
    return fetched.isNew;
  } catch {
    return false; // offline or server hiccup: try again next launch
  }
}

export function applyUpdateNow() {
  Updates.reloadAsync().catch(() => {});
}

/**
 * Short label for the running JS, e.g. "update 4 Oct, 3f9a2c1d", so people
 * can see an OTA update arrived even though the app version is unchanged.
 * Empty for the JS that shipped inside the APK.
 */
export function updateLabel(): string {
  if (!enabled() || Updates.isEmbeddedLaunch || !Updates.updateId) return '';
  const when = Updates.createdAt
    ? Updates.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';
  return `update ${when}${when ? ', ' : ''}${Updates.updateId.slice(0, 8)}`;
}
