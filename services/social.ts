import {
  db, doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, limit, orderBy,
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

// ─── Blocking ────────────────────────────────────────────────────────────────
// A blocked user's posts never reach the blocker's feed (feed.tsx filters
// them out), and the block is recorded at users/{uid}/blocked/{other}.

/** True when `uid` has blocked `other`. */
export async function isBlocked(uid: string, other: string): Promise<boolean> {
  try { return (await getDoc(doc(db, 'users', uid, 'blocked', other))).exists(); } catch { return false; }
}

/** Uids `uid` has blocked (for feed filtering). */
export async function listBlocked(uid: string): Promise<string[]> {
  try {
    const snap = await getDocs(query(collection(db, 'users', uid, 'blocked'), limit(500)));
    return snap.docs.map((d) => d.id);
  } catch { return []; }
}

/** Block `other`: their posts disappear from my feed. */
export async function blockUser(uid: string, other: string) {
  await setDoc(doc(db, 'users', uid, 'blocked', other), { at: serverTimestamp() });
}

export async function unblockUser(uid: string, other: string) {
  await deleteDoc(doc(db, 'users', uid, 'blocked', other));
}
