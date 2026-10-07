/** Days on which a puja was completed, kept on the phone, and the run of days ending today. */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'jyotish.puja.days.v1';

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function days(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Consecutive days ending today (or yesterday, so a streak is not lost before today's puja). */
export function streakOf(list: readonly string[], today = new Date()): number {
  const set = new Set(list);
  const d = new Date(today);
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(d))) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export async function readStreak(): Promise<number> {
  return streakOf(await days());
}

/** Marks today done and returns the streak. */
export async function recordPuja(): Promise<number> {
  const list = await days();
  const today = dayKey(new Date());
  const next = list.includes(today) ? list : [...list, today].slice(-400);
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  return streakOf(next);
}
