import { calculatePanchang } from './panchang';
import { getFestivalsForDate, getFixedFestivals } from './festivals';

export type Observance = {
  date: Date;
  daysAway: number;
  kind: 'festival' | 'ekadashi' | 'purnima' | 'amavasya';
  name: string;
  nameHi: string;
};

/**
 * Next few observances (festivals, Ekadashi, Purnima, Amavasya) starting today,
 * using the same day-precise rules as the Calendar grid so the two agree.
 */
export function getUpcomingObservances(from: Date, lat: number, lon: number, limit = 4, horizonDays = 45): Observance[] {
  const out: Observance[] = [];
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < horizonDays && out.length < limit; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    let p;
    try { p = calculatePanchang(date, lat, lon); } catch { continue; }
    const tn = (p.tithi.name || '').toLowerCase();
    const fests = [
      ...getFestivalsForDate(p.hinduMonth.name, p.tithi.name, p.tithi.paksha).filter((f) => !!f.tithi),
      ...getFixedFestivals(date.getMonth() + 1, date.getDate()),
    ].filter((f) => f.type === 'major' || f.type === 'minor' || f.type === 'sankranti');
    for (const f of fests) {
      if (out.length >= limit) break;
      if (out.some((o) => o.name === f.name)) continue;
      out.push({ date, daysAway: i, kind: 'festival', name: f.name, nameHi: f.nameHi });
    }
    if (out.length >= limit) break;
    // A named festival on the day already covers it (e.g. Sharad Purnima).
    if (fests.length) continue;
    if (tn.includes('ekadashi')) {
      out.push({ date, daysAway: i, kind: 'ekadashi', name: `${p.tithi.paksha === 'shukla' ? 'Shukla' : 'Krishna'} Ekadashi`, nameHi: `${p.tithi.pakshaHi} एकादशी` });
    } else if (tn.includes('purnima')) {
      out.push({ date, daysAway: i, kind: 'purnima', name: 'Purnima', nameHi: 'पूर्णिमा' });
    } else if (tn.includes('amavasya')) {
      out.push({ date, daysAway: i, kind: 'amavasya', name: 'Amavasya', nameHi: 'अमावस्या' });
    }
  }
  return out;
}
