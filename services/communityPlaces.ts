import {
  db, collection, getDocs, addDoc, query, orderBy, limit, serverTimestamp,
} from '../config/firebase';

// Community-added places (temples & bhandaras).
// OpenStreetMap has almost no data for small local mandirs and none for
// bhandaras (free food events), so users put their own on the map.

export interface CommunityPlace {
  id: string;
  name: string;
  type: 'temple' | 'bhandara';
  description: string;
  lat: number;
  lon: number;
  addedBy: string;
  addedByName: string;
  createdAt: any;
  distance?: number;
}

function distKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

/**
 * Recent community places within radiusKm of the user, nearest first.
 * Volume is low, so we fetch recent entries and filter by distance on the
 * client — no geohash index needed.
 */
export async function getNearbyCommunityPlaces(
  userLat: number,
  userLon: number,
  radiusKm: number,
): Promise<CommunityPlace[]> {
  const snap = await getDocs(query(collection(db, 'community_places'), orderBy('createdAt', 'desc'), limit(300)));
  return snap.docs
    .map((d) => {
      const v = d.data() as any;
      return {
        id: d.id,
        name: v.name || 'Unnamed',
        type: v.type === 'bhandara' ? 'bhandara' : 'temple',
        description: v.description || '',
        lat: v.lat || 0,
        lon: v.lon || 0,
        addedBy: v.addedBy || '',
        addedByName: v.addedByName || 'Sadhak',
        createdAt: v.createdAt || null,
        distance: v.lat && v.lon ? distKm(userLat, userLon, v.lat, v.lon) : undefined,
      } as CommunityPlace;
    })
    .filter((p) => p.lat && p.lon && (p.distance ?? Infinity) <= radiusKm)
    .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
}

export async function addCommunityPlace(input: {
  name: string;
  type: 'temple' | 'bhandara';
  description: string;
  lat: number;
  lon: number;
  addedBy: string;
  addedByName: string;
}): Promise<void> {
  await addDoc(collection(db, 'community_places'), {
    name: input.name.trim(),
    type: input.type,
    description: input.description.trim(),
    lat: input.lat,
    lon: input.lon,
    addedBy: input.addedBy,
    addedByName: input.addedByName,
    createdAt: serverTimestamp(),
  });
}
