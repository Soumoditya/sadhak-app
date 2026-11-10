// Nearby Hindu temples from OpenStreetMap.
//
// Two free sources, raced so the screen fills fast:
//  1. Nominatim (fast, ~1s): place_of_worship inside the search box. Max 50 per
//     request, so a saturated box is re-queried as 4 quadrants.
//  2. Overpass (complete but often 15-30s): Hindu-tagged places of worship and
//     temple buildings. Mirrors are raced in parallel with a hard timeout.
// Results are merged, de-duplicated and cached per area for a day.
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Temple {
  id: string;          // 'osm:<type><id>' or 'c_<firestoreId>' for community places
  name: string;
  address: string;
  lat: number;
  lon: number;
  distance?: number;   // km
  type: 'temple' | 'bhandara';
  deity?: string;
  /** Seasonal puja pandal (OSM festival=*), not a permanent temple. */
  pandal?: boolean;
}

const UA = 'SadhakApp/1.0 (soumodityapramanik@gmail.com)';
const CACHE_PREFIX = 'sadhak_temples_v2:';
const CACHE_TTL = 24 * 60 * 60 * 1000;
const NON_HINDU = /masjid|mosque|church|cathedral|chapel|gurudwara|gurdwara|dargah|jain|derasar|buddh|bauddh|baudh|vihar|monaster|pagoda|synagogue|imambara|eidgah|idgah|parish|basilica|mazar|parsi|agiary|fire temple|zoroastr|chinese|kingdom hall/i;

export function distKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

export function formatDistance(d?: number): string {
  if (d == null) return '';
  if (d < 1) return `${Math.max(50, Math.round((d * 1000) / 50) * 50)} m`;
  return `${d < 10 ? d.toFixed(1) : Math.round(d)} km`;
}

// OSM religion tags are sometimes wrong (a Parsi fire temple tagged as a Hindu
// temple building), so the name check applies even when the tag says Hindu.
function isHindu(name: string, religion?: string): boolean {
  if (religion && religion.toLowerCase() !== 'hindu') return false;
  return !NON_HINDU.test(name);
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function bbox(lat: number, lon: number, km: number) {
  const dLat = km / 111;
  const dLon = km / (111 * Math.cos((lat * Math.PI) / 180));
  return { s: lat - dLat, n: lat + dLat, w: lon - dLon, e: lon + dLon };
}

// ── Nominatim ──
async function nominatimBox(b: { s: number; n: number; w: number; e: number }): Promise<any[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent('[amenity=place_of_worship]')}`
    + `&viewbox=${b.w},${b.n},${b.e},${b.s}&bounded=1&limit=50&extratags=1&addressdetails=1`;
  const res = await fetchWithTimeout(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } }, 10000);
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  return res.json();
}

function fromNominatim(x: any, lat: number, lon: number): Temple | null {
  const name = x.name || x.extratags?.['name:en'] || '';
  if (!name || !isHindu(name, x.extratags?.religion)) return null;
  const tlat = parseFloat(x.lat), tlon = parseFloat(x.lon);
  const a = x.address || {};
  return {
    id: `osm:${(x.osm_type || 'n')[0]}${x.osm_id}`,
    name,
    address: x.extratags?.festival
      ? `${x.extratags.festival} pandal`
      : [a.road, a.suburb || a.neighbourhood, a.city || a.town || a.village].filter(Boolean).join(', '),
    lat: tlat, lon: tlon, distance: distKm(lat, lon, tlat, tlon), type: 'temple',
    deity: x.extratags?.deity,
    pandal: !!x.extratags?.festival,
  };
}

async function fromNominatimArea(lat: number, lon: number, km: number): Promise<Temple[]> {
  const b = bbox(lat, lon, km);
  const first = await nominatimBox(b);
  let raw = first;
  // A full page means the box has more; split into quadrants (policy: ≤1 req/s).
  if (first.length >= 50) {
    const midLat = (b.s + b.n) / 2, midLon = (b.w + b.e) / 2;
    const quads = [
      { s: midLat, n: b.n, w: b.w, e: midLon }, { s: midLat, n: b.n, w: midLon, e: b.e },
      { s: b.s, n: midLat, w: b.w, e: midLon }, { s: b.s, n: midLat, w: midLon, e: b.e },
    ];
    for (const q of quads) {
      await sleep(1100);
      try { raw = raw.concat(await nominatimBox(q)); } catch {}
    }
  }
  return raw.map((x) => fromNominatim(x, lat, lon)).filter(Boolean) as Temple[];
}

// ── Overpass ──
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function fromOverpass(lat: number, lon: number, km: number, timeoutMs: number): Promise<Temple[]> {
  const r = Math.round(km * 1000);
  const q = `[out:json][timeout:25];(`
    + `nwr["amenity"="place_of_worship"]["religion"="hindu"](around:${r},${lat},${lon});`
    + `nwr["building"="hindu_temple"](around:${r},${lat},${lon});`
    + `);out center tags qt 300;`;
  const attempt = async (url: string) => {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'User-Agent': UA },
      body: `data=${encodeURIComponent(q)}`,
    }, timeoutMs);
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    return res.json();
  };
  // First mirror to answer wins (hand-rolled Promise.any for older runtimes).
  const data: any = await new Promise((resolve, reject) => {
    let failed = 0;
    OVERPASS_MIRRORS.forEach((u) => attempt(u).then(resolve, () => { if (++failed === OVERPASS_MIRRORS.length) reject(new Error('Overpass unavailable')); }));
  });
  return (data.elements || []).map((el: any): Temple | null => {
    const tags = el.tags || {};
    const name = tags.name || tags['name:en'] || tags['name:hi'] || '';
    const tlat = el.lat ?? el.center?.lat, tlon = el.lon ?? el.center?.lon;
    if (!name || tlat == null || !isHindu(name, tags.religion)) return null;
    return {
      id: `osm:${el.type[0]}${el.id}`,
      name,
      address: tags.festival ? `${tags.festival} pandal` : tags['addr:full'] || [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', '),
      lat: tlat, lon: tlon, distance: distKm(lat, lon, tlat, tlon), type: 'temple', deity: tags.deity,
      pandal: !!tags.festival,
    };
  }).filter(Boolean) as Temple[];
}

// ── Merge / cache ──
export function mergeTemples(a: Temple[], b: Temple[]): Temple[] {
  const byId = new Map<string, Temple>();
  for (const t of [...a, ...b]) {
    if (byId.has(t.id)) continue;
    // Same name within ~60 m is the same temple mapped twice (node + building).
    const dup = [...byId.values()].some((x) => x.name.toLowerCase() === t.name.toLowerCase() && distKm(x.lat, x.lon, t.lat, t.lon) < 0.06);
    if (!dup) byId.set(t.id, t);
  }
  return [...byId.values()].sort((x, y) => (x.distance ?? 999) - (y.distance ?? 999));
}

const cacheKey = (lat: number, lon: number, km: number) => `${CACHE_PREFIX}${lat.toFixed(2)},${lon.toFixed(2)},${km}`;

export async function getCachedTemples(lat: number, lon: number, km: number): Promise<Temple[] | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(lat, lon, km));
    if (!raw) return null;
    const { at, items } = JSON.parse(raw);
    if (Date.now() - at > CACHE_TTL) return null;
    // Re-measure from where the user is now (cache cell is ~1 km).
    return (items as Temple[]).map((t) => ({ ...t, distance: distKm(lat, lon, t.lat, t.lon) }))
      .filter((t) => (t.distance ?? 0) <= km)
      .sort((x, y) => (x.distance ?? 999) - (y.distance ?? 999));
  } catch { return null; }
}

/**
 * Find temples within `km`. Calls `onUpdate` as each source lands so the UI can
 * show the fast results immediately. Resolves when both sources are done.
 * Throws only if BOTH sources fail and nothing was found.
 */
export async function findNearbyTemples(
  lat: number, lon: number, km: number, onUpdate: (list: Temple[]) => void,
): Promise<Temple[]> {
  let found: Temple[] = [];
  const within = (list: Temple[]) => list.filter((t) => (t.distance ?? 0) <= km);
  const push = (list: Temple[]) => { found = mergeTemples(found, within(list)); onUpdate(found); };

  const results = await Promise.allSettled([
    fromNominatimArea(lat, lon, km).then(push),
    fromOverpass(lat, lon, km, 25000).then(push),
  ]);
  if (!found.length && results.every((r) => r.status === 'rejected')) {
    throw new Error('Could not reach the map service. Check your internet connection and try again.');
  }
  try { await AsyncStorage.setItem(cacheKey(lat, lon, km), JSON.stringify({ at: Date.now(), items: found })); } catch {}
  return found;
}
