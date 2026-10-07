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

const birthKey = (uid: string) => `sadhak_natal_birth_${uid}`;
export async function cacheBirth(uid: string, birth: any) {
  try { if (birth) await AsyncStorage.setItem(birthKey(uid), JSON.stringify(birth)); } catch {}
}
/** The chart as last seen on this phone, for an instant first paint. */
export async function readCachedNatal(uid: string): Promise<{ kundli: Kundli; birth: any } | null> {
  try {
    const [k, b] = await Promise.all([AsyncStorage.getItem(key(uid)), AsyncStorage.getItem(birthKey(uid))]);
    if (k && b) return { kundli: JSON.parse(k), birth: JSON.parse(b) };
  } catch {}
  return null;
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
