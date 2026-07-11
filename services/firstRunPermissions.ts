// First-run permission primer.
//
// On the very first app launch we proactively request the permissions Sadhak
// needs so the user grants them up front instead of hitting a wall later
// (reminders, saving wallpapers, local Panchang). Runs ONCE — guarded by an
// AsyncStorage flag — and never blocks the UI (all requests are best-effort).
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';

const FLAG = 'sadhak_first_run_perms_v1';

export async function requestFirstRunPermissions(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(FLAG);
    if (done) return;

    // Notifications — for daily aarti / reminder / festival alerts.
    try { await Notifications.requestPermissionsAsync(); } catch {}

    // Location — for accurate local Panchang / sunrise / temple search.
    try { await Location.requestForegroundPermissionsAsync(); } catch {}

    // Media library — for saving wallpapers and picking a profile picture.
    try { await MediaLibrary.requestPermissionsAsync(); } catch {}

    await AsyncStorage.setItem(FLAG, '1');
  } catch {
    // Never let a permission hiccup crash startup.
  }
}
