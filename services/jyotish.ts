// Sadhak — Jyotish client service.
// Talks to our own Swiss-Ephemeris engine (sadhak-web/api/jyotish.js on Vercel),
// and caches the computed kundli per-user in Firestore so it's synced (not local)
// and doesn't recompute every open.
import { db, doc, getDoc, setDoc, serverTimestamp } from '../config/firebase';

const ENGINE_URL = 'https://sadhak-app.vercel.app/api/jyotish';

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
