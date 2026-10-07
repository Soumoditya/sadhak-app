// Sadhak — on-device Jyotish layer on top of the Swiss-Ephemeris chart from
// our engine: graha flags (retrograde / combust / vargottama), a wider set of
// classical yogas and doshas, Sade Sati periods, antardasha timelines, and a
// transit-based guidance reading that works offline. Planet positions for
// "today" and future dates come from astronomy-engine (matches the engine to
// 0.01°), converted to sidereal with Lahiri ayanamsa.
import * as A from 'astronomy-engine';
import type { Kundli, GrahaPlacement, DashaPeriod, Prediction, PredictionPeriod } from './jyotish';

export const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
export const SIGNS_HI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'];
export const SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
const NAKSHATRAS = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];

// Localiser for generated text. Templates use {name} placeholders; the
// screen passes its own (tx + script-aware names), English is the default.
export type Loc = {
  t: (s: string, v?: Record<string, string | number>) => string;
  planet: (n: string) => string;
  sign: (i: number) => string;
  nak: (i: number) => string;
  ord: (n: number) => string;
  locale?: string;
};
const fill = (s: string, v?: Record<string, string | number>) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => (v[k] != null ? String(v[k]) : `{${k}}`)) : s);
const ordEn = (n: number) => { const v = n % 100; return n + (['th', 'st', 'nd', 'rd'][(v - 20) % 10] || ['th', 'st', 'nd', 'rd'][v] || 'th'); };
export const EN_LOC: Loc = { t: fill, planet: (n) => n, sign: (i) => SIGNS[i], nak: (i) => NAKSHATRAS[i], ord: ordEn };

const EXALT: Record<string, number> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const OWN: Record<string, number[]> = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
const BENEFICS = ['Mercury', 'Jupiter', 'Venus'];
const norm = (x: number) => ((x % 360) + 360) % 360;
const DAY = 86400000;

// ── Positions ───────────────────────────────────────────────────────────────

/** Lahiri ayanamsa for a date (anchored to the chart's own value when given). */
export function ayanamsaAt(date: Date, anchor?: { value: number; jd: number }): number {
  const jd = date.getTime() / DAY + 2440587.5;
  if (anchor) return anchor.value + ((jd - anchor.jd) / 365.25) * (50.2788 / 3600);
  return 23.85305 + ((jd - 2451545.0) / 365.25) * (50.2788 / 3600);
}

type Body = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn';

/** Sidereal (Lahiri) geocentric longitude of a planet at a moment. */
export function siderealLon(body: Body, date: Date, ay = ayanamsaAt(date)): number {
  const t = A.MakeTime(date);
  const v = A.GeoVector(A.Body[body], t, true);
  const ecl = A.SphereFromVector(A.RotateVector(A.Rotation_EQJ_ECT(t), v));
  return norm(ecl.lon - ay);
}

/** Mean lunar node (Rahu), sidereal. */
export function rahuLon(date: Date, ay = ayanamsaAt(date)): number {
  const T = (date.getTime() / DAY + 2440587.5 - 2451545.0) / 36525;
  return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T - ay);
}

export type TransitPlanet = { name: string; lon: number; signIndex: number; retro: boolean };

/** Where every graha is right now (sidereal), for transit readings. */
export function transitsAt(date: Date, anchor?: { value: number; jd: number }): TransitPlanet[] {
  const ay = ayanamsaAt(date, anchor);
  const later = new Date(date.getTime() + DAY);
  const out: TransitPlanet[] = (['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as Body[]).map((b) => {
    const lon = siderealLon(b, date, ay);
    const next = siderealLon(b, later, ay);
    const retro = b !== 'Sun' && b !== 'Moon' && ((next - lon + 540) % 360) - 180 < 0;
    return { name: b, lon, signIndex: Math.floor(lon / 30), retro };
  });
  const r = rahuLon(date, ay);
  out.push({ name: 'Rahu', lon: r, signIndex: Math.floor(r / 30), retro: true });
  out.push({ name: 'Ketu', lon: norm(r + 180), signIndex: Math.floor(norm(r + 180) / 30), retro: true });
  return out;
}

const anchorOf = (k: Kundli) => (k.meta?.ayanamsa && k.meta?.jd ? { value: Number(k.meta.ayanamsa), jd: Number(k.meta.jd) } : undefined);

// ── Graha flags ─────────────────────────────────────────────────────────────

export type GrahaFlags = { retro: boolean; combust: boolean; vargottama: boolean };

// Classical combustion orbs (degrees from the Sun); narrower when retrograde.
const COMBUST_ORB: Record<string, [number, number]> = {
  Moon: [12, 12], Mars: [17, 17], Mercury: [14, 12], Jupiter: [11, 11], Venus: [10, 8], Saturn: [15, 15],
};

export function grahaFlags(k: Kundli): Record<string, GrahaFlags> {
  const sun = k.planets.find((p) => p.name === 'Sun');
  const d9 = k.charts?.d9?.planets || [];
  const out: Record<string, GrahaFlags> = {};
  for (const p of k.planets) {
    const orb = COMBUST_ORB[p.name];
    const dist = sun ? Math.abs(((p.lon - sun.lon + 540) % 360) - 180) : 999;
    const nav = d9.find((x) => x.name === p.name);
    out[p.name] = {
      retro: !!p.retro && p.name !== 'Rahu' && p.name !== 'Ketu',
      combust: !!orb && dist <= (p.retro ? orb[1] : orb[0]),
      vargottama: !!nav && nav.signIndex === p.signIndex,
    };
  }
  out.Lagna = { retro: false, combust: false, vargottama: !!k.charts?.d9 && k.charts.d9.lagnaSignIndex === k.lagna.signIndex };
  return out;
}

export function dignityOf(name: string, signIndex: number): 'Exalted' | 'Debilitated' | 'Own sign' | null {
  if (EXALT[name] === signIndex) return 'Exalted';
  if (EXALT[name] != null && (EXALT[name] + 6) % 12 === signIndex) return 'Debilitated';
  if (OWN[name]?.includes(signIndex)) return 'Own sign';
  return null;
}

// ── Birth details ───────────────────────────────────────────────────────────

const VARNA = ['Kshatriya', 'Vaishya', 'Shudra', 'Brahmin'];
const TATTVA = ['Fire', 'Earth', 'Air', 'Water'];
function vashya(sign: number, deg: number): string {
  if (sign === 8) return deg < 15 ? 'Manav (human)' : 'Chatushpad (quadruped)';
  if (sign === 9) return deg < 15 ? 'Chatushpad (quadruped)' : 'Jalachar (water)';
  return ['Chatushpad (quadruped)', 'Chatushpad (quadruped)', 'Manav (human)', 'Jalachar (water)', 'Vanachar (wild)', 'Manav (human)',
    'Manav (human)', 'Keeta (insect)', '', '', 'Manav (human)', 'Jalachar (water)'][sign];
}

export function extraBirthDetails(k: Kundli): [string, string][] {
  const moon = k.planets.find((p) => p.name === 'Moon')!;
  const sun = k.planets.find((p) => p.name === 'Sun')!;
  const ms = moon.signIndex;
  return [
    ['Lagna lord', SIGN_LORD[k.lagna.signIndex]],
    ['Lagna degree', `${SIGNS[k.lagna.signIndex]} ${fmtDeg(k.lagna.degree)}`],
    ['Lagna nakshatra', `${k.lagna.nakshatra} · pada ${k.lagna.pada}`],
    ['Sun sign (sidereal)', SIGNS[sun.signIndex]],
    ['Varna', VARNA[ms % 4]],
    ['Vashya', vashya(ms, moon.degree)],
    ['Tattva (element)', TATTVA[ms % 4]],
  ];
}

export const fmtDeg = (d: number) => {
  const deg = Math.floor(d);
  const min = Math.round((d - deg) * 60);
  return min === 60 ? `${deg + 1}°00′` : `${deg}°${String(min).padStart(2, '0')}′`;
};

// ── Yogas & doshas ──────────────────────────────────────────────────────────

export type Finding = { name: string; nameHi: string; present: boolean; detail: string; note?: string };

export function analyse(k: Kundli, L$: Loc = EN_LOC): { yogas: Finding[]; doshas: Finding[] } {
  const T = L$.t, pl = L$.planet, list = (a: string[]) => a.map(pl).join(', ');
  const P: Record<string, GrahaPlacement> = Object.fromEntries(k.planets.map((p) => [p.name, p]));
  const L = k.lagna.signIndex;
  const M = P.Moon.signIndex;
  const from = (ref: number, s: number) => ((s - ref + 12) % 12) + 1;
  const hL = (n: string) => from(L, P[n].signIndex);
  const hM = (n: string) => from(M, P[n].signIndex);
  const lordOf = (house: number) => SIGN_LORD[(L + house - 1) % 12];
  const same = (a: string, b: string) => P[a].signIndex === P[b].signIndex;
  const kendra = (h: number) => [1, 4, 7, 10].includes(h);
  const trikona = (h: number) => [1, 5, 9].includes(h);
  const seven = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const dig = (n: string) => dignityOf(n, P[n].signIndex);
  const yogas: Finding[] = [];
  const doshas: Finding[] = [];
  const add = (to: Finding[], name: string, nameHi: string, present: boolean, detail: string, note?: string) =>
    to.push({ name, nameHi, present, detail, note: note ? T(note) : note });

  // Gajakesari
  add(yogas, 'Gajakesari Yoga', 'गजकेसरी योग', kendra(hM('Jupiter')), T('Jupiter in house {h} from the Moon', { h: hM('Jupiter') }),
    'Wisdom, respect and steady support in life.');
  // Budhaditya
  add(yogas, 'Budhaditya Yoga', 'बुधादित्य योग', same('Sun', 'Mercury'), T('Sun and Mercury together in {sign}', { sign: L$.sign(P.Sun.signIndex) }),
    'Sharp intellect, good communication and learning.');
  // Chandra-Mangal
  add(yogas, 'Chandra-Mangal Yoga', 'चंद्र-मंगल योग', same('Moon', 'Mars'), T('Moon and Mars together in {sign}', { sign: L$.sign(P.Moon.signIndex) }),
    'Drive and enterprise, especially with money.');
  // Pancha Mahapurusha
  const mp: [string, string, string, string][] = [
    ['Mars', 'Ruchaka Yoga', 'रुचक योग', 'Courage, leadership and physical strength.'],
    ['Mercury', 'Bhadra Yoga', 'भद्र योग', 'Intelligence, eloquence and business sense.'],
    ['Jupiter', 'Hamsa Yoga', 'हंस योग', 'Righteousness, wisdom and a respected name.'],
    ['Venus', 'Malavya Yoga', 'मालव्य योग', 'Comfort, art, beauty and a happy family life.'],
    ['Saturn', 'Sasa Yoga', 'शश योग', 'Discipline, authority and lasting achievements.'],
  ];
  for (const [pl, name, hi, note] of mp) {
    const d = dig(pl);
    add(yogas, name, hi, kendra(hL(pl)) && (d === 'Exalted' || d === 'Own sign'), d ? T(`{planet} ${d.toLowerCase()} in house {h}`, { planet: L$.planet(pl), h: hL(pl) }) : T('{planet} in {sign} in house {h}', { planet: L$.planet(pl), sign: L$.sign(P[pl].signIndex), h: hL(pl) }), note);
  }
  // Sunapha / Anapha / Durdhara / Kemadruma
  const others = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const in2 = others.filter((n) => hM(n) === 2);
  const in12 = others.filter((n) => hM(n) === 12);
  add(yogas, 'Sunapha Yoga', 'सुनफा योग', in2.length > 0 && in12.length === 0, in2.length ? T('{list} in the 2nd from the Moon', { list: list(in2) }) : T('No planet in the 2nd from the Moon'), 'Self-earned wealth and a good reputation.');
  add(yogas, 'Anapha Yoga', 'अनफा योग', in12.length > 0 && in2.length === 0, in12.length ? T('{list} in the 12th from the Moon', { list: list(in12) }) : T('No planet in the 12th from the Moon'), 'Good health, character and contentment.');
  add(yogas, 'Durdhara Yoga', 'दुरधरा योग', in2.length > 0 && in12.length > 0, T('Planets on both sides of the Moon'), 'Generosity, comforts and wide support.');
  const kendraFromMoon = others.some((n) => kendra(hM(n))) || others.some((n) => kendra(hL(n)));
  add(doshas, 'Kemadruma Dosha', 'केमद्रुम दोष', in2.length === 0 && in12.length === 0 && !kendraFromMoon,
    T(in2.length === 0 && in12.length === 0 ? (kendraFromMoon ? 'Moon has no neighbours, but it is cancelled by planets in kendra' : 'No planets on either side of the Moon') : 'Moon is supported by neighbouring planets'),
    'Remedy: Monday fasts, Shiva puja and wearing silver.');
  // Adhi yoga
  const adhi = BENEFICS.filter((n) => [6, 7, 8].includes(hM(n)));
  add(yogas, 'Adhi Yoga', 'अधि योग', adhi.length >= 2, adhi.length ? T('{list} in the 6th–8th from the Moon', { list: list(adhi) }) : T('Benefics not in the 6th–8th from the Moon'), 'Leadership, comfort and victory over rivals.');
  // Amala
  const amala = BENEFICS.filter((n) => hL(n) === 10 || hM(n) === 10);
  add(yogas, 'Amala Yoga', 'अमला योग', amala.length > 0, amala.length ? T('{list} in the 10th house', { list: list(amala) }) : T('No benefic in the 10th house'), 'A clean reputation and virtuous work.');
  // Raja yoga: kendra lord with trikona lord, or a yogakaraka
  const kendraLords = [4, 7, 10].map(lordOf);
  const trikonaLords = [5, 9].map(lordOf);
  const yk = seven.find((n) => kendraLords.includes(n) && trikonaLords.includes(n));
  const rajaPairs = kendraLords.flatMap((a) => trikonaLords.filter((b) => a !== b && same(a, b)).map((b) => `${pl(a)} + ${pl(b)}`));
  add(yogas, 'Raja Yoga', 'राज योग', !!yk || rajaPairs.length > 0,
    yk ? T('{planet} rules both a kendra and a trikona (yogakaraka)', { planet: pl(yk) }) : rajaPairs.length ? T('Kendra and trikona lords together: {list}', { list: [...new Set(rajaPairs)].join(', ') }) : T('Kendra and trikona lords are not joined'),
    'Rise in status and authority, strongest in their dashas.');
  // Dhana yoga
  const dhanaPairs = [2, 11].map(lordOf).flatMap((a) => [5, 9].map(lordOf).filter((b) => a !== b && same(a, b)).map((b) => `${pl(a)} + ${pl(b)}`));
  add(yogas, 'Dhana Yoga', 'धन योग', dhanaPairs.length > 0, dhanaPairs.length ? T('Wealth lords together: {list}', { list: [...new Set(dhanaPairs)].join(', ') }) : T('Wealth and fortune lords are not joined'), 'Prosperity and accumulation of wealth.');
  // Vipreet Raja yoga
  const vip = [6, 8, 12].filter((h) => [6, 8, 12].includes(hL(lordOf(h))) && hL(lordOf(h)) !== h).map((h) => T('lord of {n} ({planet}) in house {h}', { n: h, planet: pl(lordOf(h)), h: hL(lordOf(h)) }));
  add(yogas, 'Vipreet Raja Yoga', 'विपरीत राज योग', vip.length > 0, vip.length ? vip.join('; ') : T('Dusthana lords are not in dusthanas'), 'Success that rises out of difficulty.');
  // Neecha Bhanga
  const nb = seven.filter((n) => dig(n) === 'Debilitated').filter((n) => {
    const dispositor = SIGN_LORD[P[n].signIndex];
    return kendra(hL(dispositor)) || kendra(hM(dispositor));
  });
  add(yogas, 'Neecha Bhanga Raja Yoga', 'नीचभंग राज योग', nb.length > 0, nb.length ? T('Debilitation of {list} is cancelled', { list: list(nb) }) : T('No cancelled debilitation'), 'A weak point that turns into strength over time.');
  // Lakshmi
  const l9 = lordOf(9);
  const d9l = dig(l9);
  add(yogas, 'Lakshmi Yoga', 'लक्ष्मी योग', (d9l === 'Own sign' || d9l === 'Exalted') && (kendra(hL(l9)) || trikona(hL(l9))), T('9th lord {planet} in house {h}', { planet: pl(l9), h: hL(l9) }) + (d9l ? `, ${T(d9l.toLowerCase())}` : ''), 'Fortune, grace and abundance.');
  // Saraswati
  const sar = ['Jupiter', 'Venus', 'Mercury'].every((n) => [1, 2, 4, 5, 7, 9, 10].includes(hL(n)));
  add(yogas, 'Saraswati Yoga', 'सरस्वती योग', sar, T(sar ? 'Jupiter, Venus and Mercury all well placed' : 'Not all three benefics are in kendra, trikona or 2nd'), 'Learning, arts, speech and scholarship.');
  // Parivartana
  const par: string[] = [];
  seven.forEach((a, i) => seven.slice(i + 1).forEach((b) => {
    if (SIGN_LORD[P[a].signIndex] === b && SIGN_LORD[P[b].signIndex] === a && a !== b) par.push(`${pl(a)} ↔ ${pl(b)}`);
  }));
  add(yogas, 'Parivartana Yoga', 'परिवर्तन योग', par.length > 0, par.length ? T('Sign exchange: {list}', { list: par.join(', ') }) : T('No sign exchange'), 'The two planets support each other strongly.');

  // Doshas
  const marsH = hL('Mars');
  const marsMoonH = hM('Mars');
  const mangalHouses = [1, 2, 4, 7, 8, 12];
  const mangal = mangalHouses.includes(marsH) || mangalHouses.includes(marsMoonH);
  const mangalMild = dig('Mars') === 'Own sign' || dig('Mars') === 'Exalted';
  add(doshas, 'Mangal (Kuja) Dosha', 'मंगल दोष', mangal,
    mangal ? T('Mars in house {h} from Lagna, {m} from the Moon', { h: marsH, m: marsMoonH }) + (mangalMild ? ` ${T('(mild: Mars is strong in its sign)')}` : '') : T('Mars in house {h} from Lagna', { h: marsH }),
    'Remedy: Hanuman Chalisa on Tuesdays; matched with a similar chart in marriage.');
  add(doshas, 'Kaal Sarp Dosha', 'काल सर्प दोष', !!k.doshas?.kaalSarp.present, T(k.doshas?.kaalSarp.present ? 'All planets lie between Rahu and Ketu' : 'Planets fall on both sides of the Rahu–Ketu axis'),
    'Remedy: Shiva abhishek, Nag Panchami puja, Maha Mrityunjaya japa.');
  const pitra = same('Sun', 'Rahu') || same('Sun', 'Ketu') || hL('Rahu') === 9;
  add(doshas, 'Pitra Dosha', 'पितृ दोष', pitra, T(pitra ? (hL('Rahu') === 9 ? 'Rahu in the 9th house' : 'Sun joined by Rahu or Ketu') : 'Sun and the 9th house are free of the nodes'),
    'Remedy: tarpan and shraddha for ancestors, feed cows and crows, especially on Amavasya.');
  add(doshas, 'Guru Chandal Dosha', 'गुरु चांडाल दोष', same('Jupiter', 'Rahu') || same('Jupiter', 'Ketu'), same('Jupiter', 'Rahu') || same('Jupiter', 'Ketu') ? T('Jupiter with {planet}', { planet: pl(same('Jupiter', 'Rahu') ? 'Rahu' : 'Ketu') }) : T('Jupiter is free of the nodes'),
    'Remedy: respect teachers, Guru mantra on Thursdays, donate yellow items.');
  const grahan = ['Sun', 'Moon'].filter((n) => same(n, 'Rahu') || same(n, 'Ketu'));
  add(doshas, 'Grahan Dosha', 'ग्रहण दोष', grahan.length > 0, grahan.length ? T('{list} with a node', { list: list(grahan) }) : T('Sun and Moon are free of the nodes'),
    'Remedy: Surya arghya at sunrise or Chandra puja on Mondays; chant during eclipses.');
  add(doshas, 'Shrapit Dosha', 'श्रापित दोष', same('Saturn', 'Rahu'), same('Saturn', 'Rahu') ? T('Saturn with Rahu in {sign}', { sign: L$.sign(P.Saturn.signIndex) }) : T('Saturn and Rahu are apart'),
    'Remedy: Shani and Rahu shanti, service to the elderly and needy.');
  add(doshas, 'Angarak Dosha', 'अंगारक दोष', same('Mars', 'Rahu'), same('Mars', 'Rahu') ? T('Mars with Rahu in {sign}', { sign: L$.sign(P.Mars.signIndex) }) : T('Mars and Rahu are apart'),
    'Remedy: patience in anger, Hanuman worship, donate red lentils on Tuesdays.');

  // Merge any yogas the engine found that we don't already list.
  for (const y of k.yogas || []) {
    if (!yogas.some((x) => x.name.split(' ')[0] === y.name.split(' ')[0])) yogas.push({ name: y.name, nameHi: y.name, present: true, detail: y.desc });
  }
  return { yogas, doshas };
}

// ── Sade Sati & Dhaiya ──────────────────────────────────────────────────────

export type SaturnPeriod = { kind: 'sadeSati' | 'dhaiya4' | 'dhaiya8'; start: Date; end: Date; phases?: { name: string; start: Date; end: Date }[] };

/** Sade Sati (and Shani Dhaiya) periods across a span of years. */
export function saturnPeriods(k: Kundli, fromYear: number, toYear: number): SaturnPeriod[] {
  const moonSign = k.planets.find((p) => p.name === 'Moon')!.signIndex;
  const anchor = anchorOf(k);
  const signAt = (d: Date) => Math.floor(siderealLon('Saturn', d, ayanamsaAt(d, anchor)) / 30);
  const rel = (s: number) => ((s - moonSign + 12) % 12) + 1; // house of Saturn from Moon
  // Sample every 15 days, then refine each sign change to the day.
  const changes: { at: Date; sign: number }[] = [];
  let t = new Date(fromYear, 0, 1);
  const end = new Date(toYear, 11, 31);
  let prev = signAt(t);
  changes.push({ at: t, sign: prev });
  while (t < end) {
    const next = new Date(t.getTime() + 15 * DAY);
    const s = signAt(next);
    if (s !== prev) {
      let lo = t.getTime(), hi = next.getTime();
      while (hi - lo > DAY) { const mid = (lo + hi) / 2; if (signAt(new Date(mid)) === prev) lo = mid; else hi = mid; }
      changes.push({ at: new Date(hi), sign: s });
      prev = s;
    }
    t = next;
  }
  changes.push({ at: end, sign: -1 });
  // Spans in each relative house
  const spans = changes.slice(0, -1).map((c, i) => ({ house: rel(c.sign), start: c.at, end: changes[i + 1].at }));
  const out: SaturnPeriod[] = [];
  const collect = (houses: number[], kind: SaturnPeriod['kind']) => {
    let cur: SaturnPeriod | null = null;
    for (const s of spans) {
      if (houses.includes(s.house)) {
        if (!cur) cur = { kind, start: s.start, end: s.end, phases: [] };
        else cur.end = s.end;
        if (kind === 'sadeSati') {
          // Retrograde loops re-enter earlier phases; keep one entry per phase
          // (first entry → last exit) in Rising → Peak → Setting order.
          const name = s.house === 12 ? 'Rising' : s.house === 1 ? 'Peak' : 'Setting';
          const ph = cur.phases!.find((x) => x.name === name);
          if (ph) ph.end = s.end; else cur.phases!.push({ name, start: s.start, end: s.end });
          cur.phases!.sort((a, b) => ['Rising', 'Peak', 'Setting'].indexOf(a.name) - ['Rising', 'Peak', 'Setting'].indexOf(b.name));
        }
      } else if (cur) {
        // A short retrograde dip out of the zone doesn't end the period.
        if (s.end.getTime() - s.start.getTime() < 300 * DAY && spans.indexOf(s) < spans.length - 1) continue;
        out.push(cur); cur = null;
      }
    }
    if (cur) out.push(cur);
  };
  collect([12, 1, 2], 'sadeSati');
  collect([4], 'dhaiya4');
  collect([8], 'dhaiya8');
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

// ── Vimshottari antardashas ─────────────────────────────────────────────────

const DASHA_YEARS: Record<string, number> = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
const DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Antardashas inside a mahadasha (the birth one is clipped to the birth date). */
export function antardashas(maha: DashaPeriod): DashaPeriod[] {
  const years = DASHA_YEARS[maha.lord];
  if (!years) return [];
  const end = new Date(maha.end + 'T00:00:00').getTime();
  const fullStart = end - years * 365.25 * DAY;
  const clip = new Date(maha.start + 'T00:00:00').getTime();
  const i0 = DASHA_ORDER.indexOf(maha.lord);
  const out: DashaPeriod[] = [];
  let t = fullStart;
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_ORDER[(i0 + i) % 9];
    const len = ((years * DASHA_YEARS[lord]) / 120) * 365.25 * DAY;
    const s = t, e = t + len;
    if (e > clip) out.push({ lord, start: ymd(new Date(Math.max(s, clip))), end: ymd(new Date(e)) });
    t = e;
  }
  return out;
}

// ── Transit guidance (offline) ──────────────────────────────────────────────

const TARA = [
  { name: 'Janma', good: null, note: 'a sensitive day: keep things simple and calm' },
  { name: 'Sampat', good: true, note: 'good for money, purchases and new efforts' },
  { name: 'Vipat', good: false, note: 'obstacles are likely: avoid risks and arguments' },
  { name: 'Kshema', good: true, note: 'well-being and comfort: steady progress' },
  { name: 'Pratyak', good: false, note: 'resistance from others: postpone important starts' },
  { name: 'Sadhana', good: true, note: 'efforts succeed: good for work and sadhana' },
  { name: 'Naidhana', good: false, note: 'a draining day: rest, pray and avoid new ventures' },
  { name: 'Mitra', good: true, note: 'friendly support: good for meetings and requests' },
  { name: 'Parama Mitra', good: true, note: 'very favourable: excellent for important work' },
];
const MOON_HOUSE: Record<number, { good: boolean | null; area: string }> = {
  1: { good: true, area: 'health and confidence' }, 2: { good: null, area: 'family and finances' }, 3: { good: true, area: 'courage, short travel and siblings' },
  4: { good: false, area: 'home and peace of mind' }, 5: { good: null, area: 'children, creativity and study' }, 6: { good: true, area: 'clearing debts, work and health routines' },
  7: { good: true, area: 'partnerships and meetings' }, 8: { good: false, area: 'sudden events and health' }, 9: { good: null, area: 'dharma, teachers and fortune' },
  10: { good: true, area: 'career and recognition' }, 11: { good: true, area: 'gains, friends and wishes' }, 12: { good: false, area: 'expenses, sleep and retreat' },
};
const WEEKDAY = [
  { lord: 'Sun', color: 'Orange or red', direction: 'East', number: '1', mantra: 'Om Suryaya Namah (12×) with arghya at sunrise' },
  { lord: 'Moon', color: 'White', direction: 'North-West', number: '2', mantra: 'Om Somaya Namah, and offer water to Shiva' },
  { lord: 'Mars', color: 'Red', direction: 'South', number: '9', mantra: 'Hanuman Chalisa once' },
  { lord: 'Mercury', color: 'Green', direction: 'North', number: '5', mantra: 'Om Budhaya Namah, and feed green fodder to a cow' },
  { lord: 'Jupiter', color: 'Yellow', direction: 'North-East', number: '3', mantra: 'Om Brihaspataye Namah, and honour a teacher' },
  { lord: 'Venus', color: 'White or pink', direction: 'South-East', number: '6', mantra: 'Om Shukraya Namah, and offer white flowers to Lakshmi' },
  { lord: 'Saturn', color: 'Blue or black', direction: 'West', number: '8', mantra: 'Om Shanaye Namah, and light a mustard-oil diya' },
];
const DASHA_REMEDY: Record<string, string> = {
  Sun: 'Offer water to the Sun at sunrise (dasha lord Sun).', Moon: 'Keep Monday simple; Shiva abhishek with milk (dasha lord Moon).',
  Mars: 'Hanuman worship on Tuesdays (dasha lord Mars).', Mercury: 'Read or teach something; Vishnu Sahasranama (dasha lord Mercury).',
  Jupiter: 'Respect elders and teachers; donate yellow items on Thursday (dasha lord Jupiter).', Venus: 'Keep surroundings clean and beautiful; Lakshmi puja on Friday (dasha lord Venus).',
  Saturn: 'Serve the elderly or needy; mustard-oil diya on Saturday (dasha lord Saturn).', Rahu: 'Durga or Bhairav worship; avoid shortcuts (dasha lord Rahu).',
  Ketu: 'Ganesha worship and meditation; donate a blanket (dasha lord Ketu).',
};

function runningDasha(k: Kundli, today = ymd(new Date())) {
  const maha = k.dasha?.maha.find((m) => m.start <= today && today < m.end);
  const antar = maha ? antardashas(maha).find((a) => a.start <= today && today < a.end) : undefined;
  return { maha: maha?.lord, antar: antar?.lord };
}

function dayReading(k: Kundli, date: Date) {
  const anchor = anchorOf(k);
  const moonNow = siderealLon('Moon', date, ayanamsaAt(date, anchor));
  const natalMoon = k.planets.find((p) => p.name === 'Moon')!;
  const nak = Math.floor(moonNow / (360 / 27));
  const tara = TARA[(((nak - natalMoon.nakshatraIndex) % 27) + 27) % 27 % 9];
  const house = ((Math.floor(moonNow / 30) - natalMoon.signIndex + 12) % 12) + 1;
  const mh = MOON_HOUSE[house];
  const score = (tara.good === true ? 1 : tara.good === false ? -1 : 0) + (mh.good === true ? 1 : mh.good === false ? -1 : 0);
  return { tara, house, mh, nak, score, moonSign: Math.floor(moonNow / 30) };
}

export function localPrediction(k: Kundli, period: PredictionPeriod, now = new Date(), L$: Loc = EN_LOC): Prediction {
  const T = L$.t, pl = L$.planet;
  const date = ymd(now);
  const wd = WEEKDAY[now.getDay()];
  const dasha = runningDasha(k, date);
  const dashaLine = dasha.maha
    ? (dasha.antar ? T('{maha} mahadasha with {antar} antardasha', { maha: pl(dasha.maha), antar: pl(dasha.antar) }) : T('{maha} mahadasha', { maha: pl(dasha.maha) }))
    : '';
  const remedyLord = dasha.antar || dasha.maha;
  const base: Prediction = { period, date, lucky: { color: T(wd.color), number: wd.number, direction: T(wd.direction) } };

  if (period === 'daily') {
    const r = dayReading(k, now);
    const tone = T(r.score >= 1 ? 'A favourable day.' : r.score <= -1 ? 'A day to go gently.' : 'A mixed, steady day.');
    return {
      ...base,
      overview: [
        tone,
        T('The Moon moves through {sign} ({nak}), your {house} house from the natal Moon, highlighting {area}.', { sign: L$.sign(r.moonSign), nak: L$.nak(r.nak), house: L$.ord(r.house), area: T(r.mh.area) }),
        T('It is your {tara} tara: {note}.', { tara: T(r.tara.name), note: T(r.tara.note) }),
        dashaLine ? T('You are running {dasha}.', { dasha: dashaLine }) : '',
      ].filter(Boolean).join(' '),
      goodFor: r.mh.good !== false ? [cap(T(r.mh.area)), ...(r.tara.good ? [T('Starting planned work'), T('Meetings and requests')] : [T('Routine tasks')])] : [T('Prayer, rest and planning'), T('Finishing pending work')],
      avoid: r.score <= 0 ? [T('Big decisions or new ventures'), T('Arguments and hasty spending')] : [T('Overcommitting your time')],
      doToday: [T(wd.mantra)],
      remedies: remedyLord ? [T(DASHA_REMEDY[remedyLord])] : [],
      transit: T('Moon in {sign} · {tara} tara', { sign: L$.sign(r.moonSign), tara: T(r.tara.name) }),
    };
  }

  const days = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 0;
  if (days) {
    const list = Array.from({ length: days }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 9);
      return { d, r: dayReading(k, d) };
    });
    const fmt = (d: Date) => d.toLocaleDateString(L$.locale || 'en-IN', { weekday: period === 'weekly' ? 'short' : undefined, day: 'numeric', month: 'short' });
    const best = list.filter((x) => x.r.score >= 1).slice(0, period === 'weekly' ? 3 : 6).map((x) => fmt(x.d));
    const careful = list.filter((x) => x.r.score <= -1).slice(0, period === 'weekly' ? 3 : 6).map((x) => fmt(x.d));
    const tr = transitsAt(now, anchorOf(k));
    const natalMoon = k.planets.find((p) => p.name === 'Moon')!.signIndex;
    const houseOf = (n: string) => ((tr.find((p) => p.name === n)!.signIndex - natalMoon + 12) % 12) + 1;
    const sunH = houseOf('Sun'), marsH = houseOf('Mars'), venH = houseOf('Venus'), merH = houseOf('Mercury');
    const sunGood = [3, 6, 10, 11].includes(sunH);
    return {
      ...base,
      overview: [
        T(period === 'weekly'
          ? 'This week the Sun transits your {sun} house from the Moon ({tone}), Mars your {mars}, Mercury your {mer} and Venus your {ven}.'
          : 'This month the Sun transits your {sun} house from the Moon ({tone}), Mars your {mars}, Mercury your {mer} and Venus your {ven}.', {
          sun: L$.ord(sunH), mars: L$.ord(marsH), mer: L$.ord(merH), ven: L$.ord(venH),
          tone: T(sunGood ? 'supportive for work and status' : 'ask for patience with authority and health'),
        }),
        dashaLine ? T('Dasha: {dasha}.', { dasha: dashaLine }) : '',
      ].filter(Boolean).join(' '),
      goodFor: best.length ? [T('Best days: {list}', { list: best.join(', ') })] : [],
      avoid: careful.length ? [T('Go slow on: {list}', { list: careful.join(', ') })] : [],
      doToday: [T(sunGood ? 'Push important work and applications' : 'Plan carefully; finish before starting new things')],
      remedies: remedyLord ? [T(DASHA_REMEDY[remedyLord])] : [],
      transit: tr.filter((p) => ['Sun', 'Mars', 'Mercury', 'Venus'].includes(p.name)).map((p) => `${pl(p.name)} ${L$.sign(p.signIndex)}${p.retro && p.name !== 'Sun' ? ' (R)' : ''}`).join(' · '),
    };
  }

  // Yearly: the slow planets and the dasha set the tone.
  const tr = transitsAt(now, anchorOf(k));
  const natalMoon = k.planets.find((p) => p.name === 'Moon')!.signIndex;
  const houseOf = (n: string) => ((tr.find((p) => p.name === n)!.signIndex - natalMoon + 12) % 12) + 1;
  const ju = houseOf('Jupiter'), sa = houseOf('Saturn'), ra = houseOf('Rahu');
  const juGood = [2, 5, 7, 9, 11].includes(ju);
  const saGood = [3, 6, 11].includes(sa);
  const sade = [12, 1, 2].includes(sa);
  const signOf = (n: string) => L$.sign(tr.find((p) => p.name === n)!.signIndex);
  return {
    ...base,
    overview: [
      T('Jupiter transits your {ju} house from the Moon ({juTone}), Saturn your {sa} ({saTone}), and Rahu your {ra}.', {
        ju: L$.ord(ju), sa: L$.ord(sa), ra: L$.ord(ra),
        juTone: T(juGood ? 'growth and blessings' : 'learning through effort'),
        saTone: T(sade ? 'Sade Sati: discipline and patience bring lasting results' : saGood ? 'steady gains through hard work' : 'responsibilities and slow progress'),
      }),
      dashaLine ? T('The year runs under {dasha}.', { dasha: dashaLine }) : '',
    ].filter(Boolean).join(' '),
    goodFor: [T(juGood ? 'Expansion, study, family events and investments' : 'Skill-building and long-term planning'), T(saGood ? 'Career consolidation' : 'Health routines and savings')],
    avoid: [T(sade || !saGood ? 'Shortcuts, debt and impulsive moves' : 'Complacency')],
    doToday: [T('Pick one daily practice (japa, reading or seva) and keep it all year')],
    remedies: [sade || !saGood ? DASHA_REMEDY.Saturn : DASHA_REMEDY.Jupiter, ...(remedyLord ? [DASHA_REMEDY[remedyLord]] : [])].filter((v, i, a) => a.indexOf(v) === i).map((x) => T(x)),
    transit: `${pl('Jupiter')} ${signOf('Jupiter')} · ${pl('Saturn')} ${signOf('Saturn')} · ${pl('Rahu')} ${signOf('Rahu')}`,
  };
}

const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Today's one-glance reading for the Home card (no network). */
export function dayGlance(k: Kundli, now = new Date()): { score: number; tara: string; taraGood: boolean | null; house: number; area: string; moonSign: number; maha?: string; antar?: string } {
  const r = dayReading(k, now);
  const d = runningDasha(k, ymd(now));
  return { score: r.score, tara: r.tara.name, taraGood: r.tara.good, house: r.house, area: r.mh.area, moonSign: r.moonSign, maha: d.maha, antar: d.antar };
}
