import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadNatal, type Kundli } from './jyotish';

// The chart lives in Firestore (owner-only); Home keeps a device copy so it
// can show today's reading without a network read on every open.
const key = (uid: string) => `sadhak_natal_${uid}`;

export async function cacheNatal(uid: string, kundli: Kundli | null) {
  try {
    if (kundli) await AsyncStorage.setItem(key(uid), JSON.stringify(kundli));
    else await AsyncStorage.removeItem(key(uid));
  } catch {}
}

export async function getNatalForHome(uid: string, hasChart: boolean): Promise<Kundli | null> {
  try {
    const raw = await AsyncStorage.getItem(key(uid));
    if (raw) return JSON.parse(raw);
  } catch {}
  if (!hasChart) return null;
  const n = await loadNatal(uid).catch(() => null);
  if (n?.kundli) cacheNatal(uid, n.kundli);
  return n?.kundli ?? null;
}
