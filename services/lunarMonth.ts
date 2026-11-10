import * as A from 'astronomy-engine';
import { siderealLon } from './jyotishExtras';

// Lunar month by the classical rule, not the solar month: an Amanta month
// (new moon to new moon) is named after the sankranti that falls inside it
// (Mesha sankranti → Chaitra). A month with no sankranti is Adhik and takes
// the next month's name. Purnimanta shifts Krishna paksha to the next month.

const DAY = 86400000;
type Lunation = { start: number; end: number; index: number; adhik: boolean };
const cache: Lunation[] = [];

const sunSign = (t: number) => Math.floor(siderealLon('Sun', new Date(t)) / 30) % 12;

function newMoonAfter(t: number): number {
  const r = A.SearchMoonPhase(0, new Date(t), 40);
  return r ? r.date.getTime() : t + 29.53 * DAY;
}

function lunationAt(t: number): Lunation {
  const hit = cache.find((l) => t >= l.start && t < l.end);
  if (hit) return hit;
  const start = newMoonAfter(t - 31 * DAY);
  let s = start;
  // Step forward until the lunation contains t.
  for (let i = 0; i < 3; i++) {
    const e = newMoonAfter(s + DAY);
    if (t >= s && t < e) {
      const a = sunSign(s), b = sunSign(e);
      const adhik = a === b;
      const index = adhik ? (b + 1) % 12 : b; // Chaitra = 0 holds Mesha (0) sankranti
      const l = { start: s, end: e, index, adhik };
      cache.push(l);
      if (cache.length > 40) cache.shift();
      return l;
    }
    s = e;
  }
  return { start: t, end: t + DAY, index: 0, adhik: false };
}

/** Month index (Chaitra = 0) in Amanta and Purnimanta naming for a moment. */
export function lunarMonthIndex(t: Date, paksha: 'shukla' | 'krishna'): { amanta: number; purnimanta: number; adhik: boolean } {
  const l = lunationAt(t.getTime());
  // An Adhik lunation keeps one name for both halves (Purushottam maas sits
  // whole inside the Purnimanta month too).
  return { amanta: l.index, purnimanta: paksha === 'krishna' && !l.adhik ? (l.index + 1) % 12 : l.index, adhik: l.adhik };
}

const LUNATION = 29.530588853 * DAY;

/** Tithi (0-29) at a moment, with an absolute count that increases across months. */
export function tithiInfo(t: Date): { n: number; abs: number; amanta: number; adhik: boolean } {
  const n = Math.min(29, Math.floor(A.MoonPhase(t) / 12));
  const l = lunationAt(t.getTime());
  return { n, abs: Math.round(l.start / LUNATION) * 30 + n, amanta: l.index, adhik: l.adhik };
}
