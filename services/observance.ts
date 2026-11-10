import * as SunCalc from 'suncalc';
import { tithiInfo } from './lunarMonth';
import { TITHI_NAMES } from './panchang';

// Which civil day keeps a tithi-based festival. Each festival has a kala, the
// part of the day its rite belongs to (Diwali at pradosh, Janmashtami at
// midnight, Dussehra in the afternoon). The festival falls on the first day
// whose kala sees the tithi; if the tithi starts and ends between two kalas
// (kshaya), it goes to the day it began. Adhik months are skipped.

export type Kala = 'sunrise' | 'madhyahna' | 'aparahna' | 'sunset' | 'pradosh' | 'nishita' | 'moonrise';

const H = 3600000;
const ok = (d?: Date | null): d is Date => !!d && !isNaN(d.getTime());

function kalaMoment(day: Date, kala: Kala, lat: number, lon: number): Date {
  const noon = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12);
  const s = SunCalc.getTimes(noon, lat, lon);
  const rise = ok(s.sunrise) ? s.sunrise.getTime() : noon.getTime() - 6 * H;
  const set = ok(s.sunset) ? s.sunset.getTime() : noon.getTime() + 6 * H;
  const len = set - rise;
  switch (kala) {
    case 'madhyahna': return new Date(rise + 0.5 * len);
    case 'aparahna': return new Date(rise + 0.7 * len);
    case 'sunset': return new Date(set);
    case 'pradosh': return new Date(set + 1.2 * H);
    case 'nishita': {
      const next = SunCalc.getTimes(new Date(noon.getTime() + 24 * H), lat, lon).sunrise;
      return new Date((set + (ok(next) ? next.getTime() : set + 12 * H)) / 2);
    }
    case 'moonrise': {
      const m = SunCalc.getMoonTimes(noon, lat, lon).rise;
      return ok(m) && m.getTime() > rise ? m : new Date(set + 2.5 * H);
    }
    default: return new Date(rise);
  }
}

const cache = new Map<string, ReturnType<typeof tithiInfo>>();
function tithiAtKala(day: Date, kala: Kala, lat: number, lon: number) {
  const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}|${kala}|${lat.toFixed(2)}|${lon.toFixed(2)}`;
  let v = cache.get(key);
  if (!v) {
    v = tithiInfo(kalaMoment(day, kala, lat, lon));
    if (cache.size > 2000) cache.clear();
    cache.set(key, v);
  }
  return v;
}

/** 0-29 index of a tithi name within a paksha. */
export function tithiIndex(name: string, paksha: 'shukla' | 'krishna'): number {
  if (name === 'Purnima') return 14;
  if (name === 'Amavasya') return 29;
  const i = TITHI_NAMES.slice(0, 14).findIndex((t) => t.en === name);
  return i < 0 ? -1 : paksha === 'krishna' ? 15 + i : i;
}

/** Sunrise tithi of a day (0-29), for cheap pre-filtering. */
export const sunriseTithi = (day: Date, lat: number, lon: number) => tithiAtKala(day, 'sunrise', lat, lon).n;

/** True when `day` keeps the tithi `target` (0-29) of Amanta month `amanta` (Chaitra = 0). */
export function keepsTithi(day: Date, amanta: number, target: number, kala: Kala, lat: number, lon: number): boolean {
  if (target < 0) return false;
  const at = (k: number) => tithiAtKala(new Date(day.getFullYear(), day.getMonth(), day.getDate() + k), kala, lat, lon);
  const b = at(0);
  const fits = (x: number, l: typeof b) => ((x % 30) + 30) % 30 === target && !l.adhik && l.amanta === amanta;
  // Normal: the tithi holds at this day's kala and did not at yesterday's.
  if (fits(b.abs, b)) return at(-1).abs < b.abs;
  // Kshaya: the tithi begins after today's kala and ends before tomorrow's.
  const c = at(1);
  for (let x = b.abs + 1; x < c.abs && x <= b.abs + 3; x++) {
    if (fits(x, Math.floor(x / 30) === Math.floor(c.abs / 30) ? c : b)) return true;
  }
  return false;
}

/** Circular distance between two tithi indices. */
export const tithiGap = (x: number, y: number) => Math.min((x - y + 30) % 30, (y - x + 30) % 30);
