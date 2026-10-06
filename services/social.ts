import {
  db, rtdb, doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, limit, orderBy,
  ref, set, onValue, off,
} from '../config/firebase';
import { getCountFromServer, serverTimestamp } from 'firebase/firestore';
import type { UserResult } from './posts';

// ─── Follow graph ────────────────────────────────────────────────────────────
// users/{target}/followers/{me} and users/{me}/following/{target}, written
// together so either side can be counted and listed.

export type Me = { uid: string; displayName: string; username: string; profilePicUrl: string | null };

export async function isFollowing(me: string, target: string): Promise<boolean> {
  try { return (await getDoc(doc(db, 'users', me, 'following', target))).exists(); } catch { return false; }
}

export async function follow(me: Me, target: UserResult): Promise<void> {
  await Promise.all([
    setDoc(doc(db, 'users', target.uid, 'followers', me.uid), {
      uid: me.uid, displayName: me.displayName || 'Sadhak', username: me.username || '', profilePicUrl: me.profilePicUrl || null, at: serverTimestamp(),
    }),
    setDoc(doc(db, 'users', me.uid, 'following', target.uid), {
      uid: target.uid, displayName: target.displayName || 'Sadhak', username: target.username || '', profilePicUrl: target.profilePicUrl || null, at: serverTimestamp(),
    }),
  ]);
}

export async function unfollow(me: string, target: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(db, 'users', target, 'followers', me)),
    deleteDoc(doc(db, 'users', me, 'following', target)),
  ]);
}

export async function followCounts(uid: string): Promise<{ followers: number; following: number }> {
  const count = async (sub: 'followers' | 'following') => {
    try { return (await getCountFromServer(collection(db, 'users', uid, sub))).data().count; } catch { return 0; }
  };
  const [followers, following] = await Promise.all([count('followers'), count('following')]);
  return { followers, following };
}

export async function listFollows(uid: string, sub: 'followers' | 'following'): Promise<UserResult[]> {
  const snap = await getDocs(query(collection(db, 'users', uid, sub), orderBy('at', 'desc'), limit(200)));
  return snap.docs.map((d) => {
    const v: any = d.data();
    return { uid: d.id, displayName: v.displayName || 'Sadhak', username: v.username || '', profilePicUrl: v.profilePicUrl || null };
  });
}

export async function getPublicProfile(uid: string): Promise<(UserResult & { createdAt?: any; city?: string }) | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const v: any = snap.data();
  return {
    uid, displayName: v.displayName || 'Sadhak', username: v.username || '', profilePicUrl: v.profilePicUrl || null,
    bio: v.bio || '', createdAt: v.createdAt, city: v.location?.city || '',
  };
}

// ─── Direct messages ─────────────────────────────────────────────────────────
// A DM is an ordinary chat room with a stable id built from both uids. Each
// side keeps an index entry at userDms/{uid}/{roomId} for the DM list.

export function dmRoomId(a: string, b: string) {
  return 'dm_' + [a, b].sort().join('_');
}

export type DmEntry = { roomId: string; otherUid: string; otherName: string; otherPfp: string | null; lastMessage?: string; lastMessageTime?: number };

export async function ensureDm(me: Me, other: UserResult): Promise<string> {
  const roomId = dmRoomId(me.uid, other.uid);
  const now = Date.now();
  await Promise.all([
    set(ref(rtdb, `userDms/${me.uid}/${roomId}`), { otherUid: other.uid, otherName: other.displayName || 'Sadhak', otherPfp: other.profilePicUrl || null, lastMessageTime: now }),
    set(ref(rtdb, `userDms/${other.uid}/${roomId}`), { otherUid: me.uid, otherName: me.displayName || 'Sadhak', otherPfp: me.profilePicUrl || null, lastMessageTime: now }),
  ]).catch(() => {});
  return roomId;
}

/** Update both DM index entries after a message is sent in a DM room. */
export async function touchDm(roomId: string, text: string) {
  if (!roomId.startsWith('dm_')) return;
  const [, a, b] = roomId.split('_');
  const now = Date.now();
  await Promise.all([a, b].map((uid) =>
    set(ref(rtdb, `userDms/${uid}/${roomId}/lastMessage`), text.slice(0, 80))
      .then(() => set(ref(rtdb, `userDms/${uid}/${roomId}/lastMessageTime`), now)),
  )).catch(() => {});
}

export function subscribeDms(uid: string, cb: (list: DmEntry[]) => void): () => void {
  const r = ref(rtdb, `userDms/${uid}`);
  onValue(r, (snap) => {
    const v = snap.val() || {};
    cb(Object.keys(v).map((roomId) => ({ roomId, ...v[roomId] }))
      .sort((x, y) => (y.lastMessageTime || 0) - (x.lastMessageTime || 0)));
  }, () => cb([]));
  return () => off(r);
}
