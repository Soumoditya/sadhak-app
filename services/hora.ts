import { MhahPanchang } from 'mhah-panchang';
import * as SunCalc from 'suncalc';
import { TITHI_NAMES, NAKSHATRA_NAMES } from './panchang';

// Live "right now" panchang: the running hora (planetary hour), choghadiya,
// tithi and nakshatra with their end times, and what comes next.

const mhah = new MhahPanchang();

// Chaldean hora order; each hour passes to the next lord in this list.
const HORA_SEQ = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'] as const;
const WEEKDAY_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
export const HORA_HI: Record<string, string> = { Sun: 'सूर्य', Moon: 'चंद्र', Mars: 'मंगल', Mercury: 'बुध', Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु' };
export const TARA_HI: Record<string, string> = { Janma: 'जन्म', Sampat: 'संपत', Vipat: 'विपत', Kshema: 'क्षेम', Pratyak: 'प्रत्यक्', Sadhana: 'साधना', Naidhana: 'नैधन', Mitra: 'मित्र', 'Parama Mitra': 'परम मित्र' };
export const HORA_GLYPH: Record<string, string> = { Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃', Venus: '♀', Saturn: '♄' };
/** What each hora favours, in a few words. */
export const HORA_FOR: Record<string, string> = {
  Sun: 'Authority, government work', Moon: 'Travel, family, new starts', Mars: 'Courage, sport, property',
  Mercury: 'Study, trade, writing', Jupiter: 'Puja, learning, good deeds', Venus: 'Art, shopping, relationships', Saturn: 'Hard work, service, charity',
};

// Choghadiya: the day and night cycles, and where each weekday starts.
const CH_DAY = ['Udveg', 'Chal', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog'] as const;
const CH_DAY_START = [0, 3, 6, 2, 5, 1, 4];
const CH_NIGHT = ['Shubh', 'Amrit', 'Chal', 'Rog', 'Kaal', 'Labh', 'Udveg'] as const;
const CH_NIGHT_START = [0, 2, 4, 6, 1, 3, 5];
export const CH_HI: Record<string, string> = { Udveg: 'उद्वेग', Chal: 'चल', Labh: 'लाभ', Amrit: 'अमृत', Kaal: 'काल', Shubh: 'शुभ', Rog: 'रोग' };
export const CH_QUALITY: Record<string, 'good' | 'neutral' | 'bad'> = {
  Amrit: 'good', Shubh: 'good', Labh: 'good', Chal: 'neutral', Udveg: 'bad', Kaal: 'bad', Rog: 'bad',
};

export type Slot = { name: string; start: Date; end: Date };
export type LiveNow = {
  hora: Slot; nextHora: Slot;
  choghadiya: Slot & { quality: 'good' | 'neutral' | 'bad' }; nextGoodChoghadiya?: Slot;
  tithi: { name: string; nameHi: string; end: Date }; nextTithi: { name: string; nameHi: string };
  nakshatra: { name: string; nameHi: string; end: Date }; nextNakshatra: { name: string; nameHi: string };
  isDay: boolean; sunrise: Date; sunset: Date;
};

function sun(d: Date, lat: number, lon: number) {
  const t = SunCalc.getTimes(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12), lat, lon);
  const ok = (x: Date | null | undefined): x is Date => !!x && !isNaN(x.getTime());
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return {
    rise: ok(t.sunrise) ? t.sunrise : new Date(base.getTime() + 6 * 3600_000),
    set: ok(t.sunset) ? t.sunset : new Date(base.getTime() + 18 * 3600_000),
  };
}

export function liveNow(now: Date, lat: number, lon: number): LiveNow {
  const day = (offset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  const today = sun(now, lat, lon);
  // The Vedic day runs sunrise to sunrise: before today's sunrise we are
  // still in yesterday's night.
  const vedic = now < today.rise ? -1 : 0;
  const s0 = sun(day(vedic), lat, lon);
  const s1 = sun(day(vedic + 1), lat, lon);
  const weekday = day(vedic).getDay();
  const isDay = now >= s0.rise && now < s0.set;

  const dayLen = (s0.set.getTime() - s0.rise.getTime()) / 12;
  const nightLen = (s1.rise.getTime() - s0.set.getTime()) / 12;
  const slotStart = (i: number) => (i < 12 ? s0.rise.getTime() + i * dayLen : s0.set.getTime() + (i - 12) * nightLen);
  const slotEnd = (i: number) => (i < 12 ? slotStart(i) + dayLen : slotStart(i) + nightLen);
  const idx = isDay
    ? Math.min(11, Math.floor((now.getTime() - s0.rise.getTime()) / dayLen))
    : Math.min(23, 12 + Math.floor((now.getTime() - s0.set.getTime()) / nightLen));
  const h0 = HORA_SEQ.indexOf(WEEKDAY_LORD[weekday] as any);
  const horaAt = (i: number): Slot => ({ name: HORA_SEQ[(h0 + i) % 7], start: new Date(slotStart(i)), end: new Date(slotEnd(i)) });
  const hora = horaAt(idx);
  const nextHora = idx < 23 ? horaAt(idx + 1) : { name: HORA_SEQ[(HORA_SEQ.indexOf(WEEKDAY_LORD[(weekday + 1) % 7] as any))], start: hora.end, end: new Date(hora.end.getTime() + dayLen) };

  // Choghadiya: 8 parts of day, 8 of night.
  const cdLen = (s0.set.getTime() - s0.rise.getTime()) / 8;
  const cnLen = (s1.rise.getTime() - s0.set.getTime()) / 8;
  const chAt = (k: number): Slot => k < 8
    ? { name: CH_DAY[(CH_DAY_START[weekday] + k) % 7], start: new Date(s0.rise.getTime() + k * cdLen), end: new Date(s0.rise.getTime() + (k + 1) * cdLen) }
    : { name: CH_NIGHT[(CH_NIGHT_START[weekday] + k - 8) % 7], start: new Date(s0.set.getTime() + (k - 8) * cnLen), end: new Date(s0.set.getTime() + (k - 7) * cnLen) };
  const k = isDay
    ? Math.min(7, Math.floor((now.getTime() - s0.rise.getTime()) / cdLen))
    : Math.min(15, 8 + Math.floor((now.getTime() - s0.set.getTime()) / cnLen));
  const ch = chAt(k);
  let nextGood: Slot | undefined;
  for (let j = k + 1; j < 16; j++) { const c = chAt(j); if (CH_QUALITY[c.name] === 'good') { nextGood = c; break; } }

  // Tithi / nakshatra at this moment.
  const e: any = mhah.calculate(now);
  const ti = Math.max(0, Math.min(29, e?.Tithi?.ino ?? 0));
  const ni = Math.max(0, Math.min(26, e?.Nakshatra?.ino ?? 0));
  const tEnd = e?.Tithi?.end ? new Date(e.Tithi.end) : new Date(now.getTime() + 86400_000);
  const nEnd = e?.Nakshatra?.end ? new Date(e.Nakshatra.end) : new Date(now.getTime() + 86400_000);

  return {
    hora, nextHora,
    choghadiya: { ...ch, quality: CH_QUALITY[ch.name] }, nextGoodChoghadiya: nextGood,
    tithi: { name: TITHI_NAMES[ti].en, nameHi: TITHI_NAMES[ti].hi, end: tEnd },
    nextTithi: { name: TITHI_NAMES[(ti + 1) % 30].en, nameHi: TITHI_NAMES[(ti + 1) % 30].hi },
    nakshatra: { name: NAKSHATRA_NAMES[ni].en, nameHi: NAKSHATRA_NAMES[ni].hi, end: nEnd },
    nextNakshatra: { name: NAKSHATRA_NAMES[(ni + 1) % 27].en, nameHi: NAKSHATRA_NAMES[(ni + 1) % 27].hi },
    isDay, sunrise: s0.rise, sunset: s0.set,
  };
}
