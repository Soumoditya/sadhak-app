import type { PanchangData } from './panchang';

export type MuhurtaWindow = { key: 'brahma' | 'abhijit' | 'rahu' | 'yama' | 'gulika'; good: boolean; start: string; end: string };

const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** The window active right now, or the next one later today. */
export function muhurtaNow(p: PanchangData, now = new Date()): { active?: MuhurtaWindow; next?: MuhurtaWindow } {
  const raw: MuhurtaWindow[] = [
    { key: 'brahma', good: true, ...p.brahmaMuhurta },
    { key: 'abhijit', good: true, ...p.abhijitMuhurta },
    { key: 'rahu', good: false, ...p.rahuKaal },
    { key: 'yama', good: false, ...p.yamaghanta },
    { key: 'gulika', good: false, ...p.gulikaKaal },
  ];
  const list: MuhurtaWindow[] = raw.filter((w) => w.start && w.end).map((w) => ({ ...w, start: w.start.slice(0, 5), end: w.end.slice(0, 5) }))
    .sort((a, b) => toMin(a.start) - toMin(b.start));
  const n = now.getHours() * 60 + now.getMinutes();
  const active = list.find((w) => n >= toMin(w.start) && n < toMin(w.end));
  const next = active ? undefined : list.find((w) => toMin(w.start) > n);
  return { active, next };
}
