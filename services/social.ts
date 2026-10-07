import {
  db, rtdb, doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, limit, orderBy,
  ref, onValue, off,
} from '../config/firebase';
import { update, remove } from 'firebase/database';
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

export type DmEntry = {
  roomId: string; otherUid: string; otherName: string; otherPfp: string | null; lastMessage?: string; lastMessageTime?: number;
  /** Set on the receiver's entry when the sender is someone they don't follow. */
  request?: boolean;
  /** Set once the receiver accepts or replies; a later request flag is then ignored. */
  accepted?: boolean;
  blocked?: boolean;
};

/** A message request still waiting for an answer. */
export const isDmRequest = (d: DmEntry) => !!d.request && !d.accepted && !d.blocked;

// Whether `uid` follows `me` decides if my message lands in their chats or
// their requests (followed people message directly, like Instagram).
const followsCache = new Map<string, boolean>();
async function followsMe(uid: string, me: string): Promise<boolean> {
  const k = `${uid}>${me}`;
  if (followsCache.has(k)) return followsCache.get(k)!;
  const v = await isFollowing(uid, me);
  followsCache.set(k, v);
  return v;
}

/** Open (or reopen) my side of a DM. The other person sees it once I send something. */
export async function ensureDm(me: Me, other: UserResult): Promise<string> {
  const roomId = dmRoomId(me.uid, other.uid);
  await update(ref(rtdb, `userDms/${me.uid}/${roomId}`), {
    otherUid: other.uid, otherName: other.displayName || 'Sadhak', otherPfp: other.profilePicUrl || null, accepted: true,
  }).catch(() => {});
  return roomId;
}

/** After a message in a DM: refresh both index entries; a first message from
 *  someone the receiver doesn't follow arrives as a request. */
export async function touchDm(roomId: string, text: string, me?: { uid: string; displayName?: string; profilePicUrl?: string | null }) {
  if (!roomId.startsWith('dm_')) return;
  const [, a, b] = roomId.split('_');
  const now = Date.now();
  const last = text.slice(0, 80);
  if (!me) {
    await Promise.all([a, b].map((uid) => update(ref(rtdb, `userDms/${uid}/${roomId}`), { lastMessage: last, lastMessageTime: now }))).catch(() => {});
    return;
  }
  const other = a === me.uid ? b : a;
  const direct = await followsMe(other, me.uid);
  await Promise.all([
    update(ref(rtdb, `userDms/${me.uid}/${roomId}`), { lastMessage: last, lastMessageTime: now, accepted: true }),
    update(ref(rtdb, `userDms/${other}/${roomId}`), {
      otherUid: me.uid, otherName: me.displayName || 'Sadhak', otherPfp: me.profilePicUrl || null,
      lastMessage: last, lastMessageTime: now, ...(direct ? {} : { request: true }),
    }),
  ]).catch(() => {});
}

export const acceptDm = (uid: string, roomId: string) => update(ref(rtdb, `userDms/${uid}/${roomId}`), { accepted: true });
export const deleteDm = (uid: string, roomId: string) => remove(ref(rtdb, `userDms/${uid}/${roomId}`));

/** Hide the chat for good and remember the block (their later messages stay hidden). */
export async function blockUser(uid: string, other: string, roomId?: string) {
  await Promise.all([
    setDoc(doc(db, 'users', uid, 'blocked', other), { at: serverTimestamp() }),
    roomId ? update(ref(rtdb, `userDms/${uid}/${roomId}`), { blocked: true, accepted: false }) : null,
  ]);
}

export async function unblockUser(uid: string, other: string, roomId?: string) {
  await Promise.all([
    deleteDoc(doc(db, 'users', uid, 'blocked', other)),
    roomId ? update(ref(rtdb, `userDms/${uid}/${roomId}`), { blocked: false, accepted: true }) : null,
  ]);
}

/** My entry for one DM room (request / accepted / blocked state). */
export function subscribeDmEntry(uid: string, roomId: string, cb: (d: DmEntry | null) => void): () => void {
  const r = ref(rtdb, `userDms/${uid}/${roomId}`);
  onValue(r, (snap) => cb(snap.exists() ? { roomId, ...snap.val() } : null), () => cb(null));
  return () => off(r);
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
