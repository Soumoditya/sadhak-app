import * as A from 'astronomy-engine';

// Grahan: solar and lunar eclipses with local times, whether they can be seen
// from the user's place, and the sutak period (12 h before a solar eclipse,
// 9 h before a lunar one; only for eclipses that are visible, and not for a
// penumbral lunar eclipse, which tradition does not observe).

export type Grahan = {
  kind: 'solar' | 'lunar';
  type: 'total' | 'partial' | 'annular' | 'penumbral';
  start: Date;
  peak: Date;
  end: Date;
  visible: boolean;
  sutak?: Date;
};

const H = 3600_000;
const cache = new Map<string, Grahan[]>();

function lunar(from: Date, to: Date, obs: A.Observer): Grahan[] {
  const out: Grahan[] = [];
  let e = A.SearchLunarEclipse(from);
  for (let i = 0; i < 6 && e.peak.date < to; i++) {
    const peak = e.peak.date;
    const sd = e.sd_partial > 0 ? e.sd_partial : e.sd_penum;
    const start = new Date(peak.getTime() - sd * 60_000);
    const end = new Date(peak.getTime() + sd * 60_000);
    // Visible if the Moon is above the horizon at any point of the eclipse.
    const up = [start, peak, end].some((t) => {
      const eq = A.Equator(A.Body.Moon, t, obs, true, true);
      return A.Horizon(t, obs, eq.ra, eq.dec, 'normal').altitude > 0;
    });
    const type = e.kind === A.EclipseKind.Total ? 'total' : e.kind === A.EclipseKind.Partial ? 'partial' : 'penumbral';
    out.push({ kind: 'lunar', type, start, peak, end, visible: up, sutak: up && type !== 'penumbral' ? new Date(start.getTime() - 9 * H) : undefined });
    e = A.NextLunarEclipse(e.peak);
  }
  return out;
}

function solar(from: Date, to: Date, obs: A.Observer): Grahan[] {
  const out: Grahan[] = [];
  let e = A.SearchLocalSolarEclipse(from, obs);
  for (let i = 0; i < 6 && e.peak.time.date < to; i++) {
    const start = e.partial_begin.time.date;
    const end = e.partial_end.time.date;
    const visible = e.partial_begin.altitude > 0 || e.peak.altitude > 0 || e.partial_end.altitude > 0;
    const type = e.kind === A.EclipseKind.Total ? 'total' : e.kind === A.EclipseKind.Annular ? 'annular' : 'partial';
    out.push({ kind: 'solar', type, start, peak: e.peak.time.date, end, visible, sutak: visible ? new Date(start.getTime() - 12 * H) : undefined });
    e = A.NextLocalSolarEclipse(e.peak.time, obs);
  }
  return out;
}

/** Eclipses whose peak falls in this month, as seen from lat/lon. */
export function eclipsesInMonth(year: number, month: number, lat: number, lon: number): Grahan[] {
  const key = `${year}-${month}-${lat.toFixed(1)}-${lon.toFixed(1)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 1);
  const obs = new A.Observer(lat, lon, 0);
  let list: Grahan[] = [];
  try {
    // Search from a little earlier so an eclipse right at the start isn't missed.
    const early = new Date(from.getTime() - 2 * 86400_000);
    list = [...lunar(early, to, obs), ...solar(early, to, obs)].filter((g) => g.peak >= from && g.peak < to);
  } catch {}
  list.sort((a, b) => +a.peak - +b.peak);
  cache.set(key, list);
  return list;
}

/** Eclipses touching a given day (start, peak or end that day). */
export function eclipsesOn(day: Date, lat: number, lon: number): Grahan[] {
  const d0 = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const d1 = d0 + 24 * H;
  const near = [...eclipsesInMonth(day.getFullYear(), day.getMonth(), lat, lon),
    ...eclipsesInMonth(new Date(d0 - 24 * H).getFullYear(), new Date(d0 - 24 * H).getMonth(), lat, lon)];
  const seen = new Set<number>();
  return near.filter((g) => {
    if (seen.has(+g.peak)) return false;
    seen.add(+g.peak);
    return (+g.end >= d0 && +g.start < d1);
  });
}
