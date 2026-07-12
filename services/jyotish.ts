// Sadhak — Jyotish client service.
// Talks to our own Swiss-Ephemeris engine (sadhak-web/api/jyotish.js on Vercel),
// and caches the computed kundli per-user in Firestore so it's synced (not local)
// and doesn't recompute every open.
import { db, doc, getDoc, setDoc, serverTimestamp } from '../config/firebase';

const ENGINE_URL = 'https://sadhak-app.vercel.app/api/jyotish';
const PREDICT_URL = 'https://sadhak-app.vercel.app/api/jyotish-predict';

export interface BirthInput {
  date: string;      // 'YYYY-MM-DD'
  time: string;      // 'HH:MM' (24h); ignored precision if hasTime false
  hasTime: boolean;
  place: string;
  lat: number;
  lng: number;
  tzOffset: number;  // hours east of UTC
  gender: 'male' | 'female';
}

export interface GrahaPlacement {
  name: string; nameHi: string;
  lon: number; sign: string; signHi: string; signIndex: number; signLord: string;
  degree: number; nakshatra: string; nakshatraHi: string; nakshatraIndex: number;
  pada: number; nakLord: string; retro: boolean; house: number; dignity?: string;
}

// A lighter placement used by divisional charts (only what the chart renders).
export interface ChartPlacement { name: string; nameHi: string; sign: string; signIndex: number; retro: boolean; house: number; }
export interface DivChart { lagnaSignIndex: number; planets: ChartPlacement[]; }

export interface DashaPeriod { lord: string; start: string; end: string; years?: number; }
export interface Kundli {
  meta: { ayanamsa: number; ayanamsaName: string; houseSystem: string; jd: number };
  lagna: GrahaPlacement;
  planets: GrahaPlacement[];
  charts?: { d9: DivChart; d10: DivChart; moon: DivChart };
  dasha?: { maha: DashaPeriod[]; current: { maha: string; antar: string; antarList: DashaPeriod[] } };
  yogas?: Array<{ name: string; desc: string }>;
  doshas?: {
    mangal: { present: boolean; house: number };
    kaalSarp: { present: boolean };
    sadeSati: { present: boolean; phase: string | null; saturnSign: string };
  };
  basics: {
    rashi: string; rashiHi: string; rashiLord: string;
    nakshatra: string; nakshatraHi: string; pada: number;
    gana: string; nadi: string; yoni: string; deity: string;
    nakLord: string; lagna: string; lagnaHi: string;
  };
}

/** Compute the kundli from birth details via our engine. */
export async function computeKundli(b: BirthInput): Promise<Kundli> {
  const [y, m, d] = b.date.split('-').map(Number);
  // Time unknown → noon (lagna approximate; planets still accurate to the day).
  const [hh, mm] = (b.hasTime ? b.time : '12:00').split(':').map(Number);
  const res = await fetch(ENGINE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      year: y, month: m, day: d, hour: hh, minute: mm,
      tzOffset: b.tzOffset, lat: b.lat, lon: b.lng,
    }),
  });
  if (!res.ok) {
    let msg = `Engine error (${res.status})`;
    try { msg = (await res.json())?.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

/** Compute + cache the kundli in Firestore under users/{uid}/jyotish/natal. */
export async function computeAndSaveKundli(uid: string, b: BirthInput): Promise<Kundli> {
  const kundli = await computeKundli(b);
  await setDoc(
    doc(db, 'users', uid, 'jyotish', 'natal'),
    { birth: b, kundli, computedAt: serverTimestamp() },
    { merge: true },
  );
  return kundli;
}

/** Load the saved natal record (birth details + cached kundli), owner-only. */
export async function loadNatal(uid: string): Promise<{ birth: BirthInput; kundli: Kundli } | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'jyotish', 'natal'));
    if (!snap.exists()) return null;
    const d = snap.data() as any;
    return d.kundli ? { birth: d.birth as BirthInput, kundli: d.kundli as Kundli } : null;
  } catch {
    return null;
  }
}

export type PredictionPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
export interface Prediction {
  period: PredictionPeriod; date: string; transitSummary?: string;
  overview?: string; goodFor?: string[]; avoid?: string[]; doToday?: string[];
  remedies?: string[]; transit?: string; lucky?: { color?: string; number?: string; direction?: string };
}

/** Fetch a fresh prediction (transits + AI interpretation) for a period. */
export async function getPrediction(kundli: Kundli, period: PredictionPeriod, name?: string): Promise<Prediction> {
  const res = await fetch(PREDICT_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kundli, period, name }),
  });
  const text = await res.text();
  if (!res.ok) { let m = text; try { m = JSON.parse(text).error || text; } catch {} throw new Error(String(m).slice(0, 160)); }
  return JSON.parse(text) as Prediction;
}

/** Today's daily guidance, cached per-day in Firestore so it's computed once/day. */
export async function getCachedDaily(uid: string, kundli: Kundli, name?: string): Promise<Prediction> {
  const today = new Date().toISOString().slice(0, 10);
  const ref = doc(db, 'users', uid, 'jyotish', `daily-${today}`);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data() as Prediction;
  } catch {}
  const p = await getPrediction(kundli, 'daily', name);
  try { await setDoc(ref, p as any); } catch {}
  return p;
}

/** Compact one-line-per-fact summary of the chart, fed to the AI as context. */
export function chartSummary(k: Kundli): string {
  const planets = k.planets.map((p) => `${p.name} in ${p.sign} h${p.house}${p.retro ? '(R)' : ''}${p.dignity && p.dignity !== '—' && p.dignity !== 'Neutral' ? ` [${p.dignity}]` : ''}`).join(', ');
  const dasha = k.dasha ? `Current dasha: ${k.dasha.current.maha} maha / ${k.dasha.current.antar} antar.` : '';
  const yogas = k.yogas && k.yogas.length ? `Yogas: ${k.yogas.map((y) => y.name).join(', ')}.` : '';
  const dosha = k.doshas ? `Doshas: Mangal ${k.doshas.mangal.present ? 'yes' : 'no'}, Kaal Sarp ${k.doshas.kaalSarp.present ? 'yes' : 'no'}, Sade Sati ${k.doshas.sadeSati.present ? k.doshas.sadeSati.phase : 'no'}.` : '';
  return `Lagna ${k.basics.lagna}. Moon rashi ${k.basics.rashi}, Nakshatra ${k.basics.nakshatra} pada ${k.basics.pada} (gana ${k.basics.gana}, nadi ${k.basics.nadi}, yoni ${k.basics.yoni}). Planets: ${planets}. ${dasha} ${yogas} ${dosha}`.trim();
}
