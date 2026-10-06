import {
  db, collection, doc, getDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, getDocs, onSnapshot, addDoc, serverTimestamp,
} from '../config/firebase';
import { increment, arrayUnion, arrayRemove } from 'firebase/firestore';

// ─── Instagram-style community feed ─────────────────────────────────────────
// Posts live in the top-level `posts` collection; comments in a subcollection.
// Queries are intentionally single-field (no composite indexes needed) — any
// extra filtering/sorting is done client-side so this works with zero Firebase
// console setup.

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorPfp: string | null;
  text: string;
  imageUrl: string | null;
  hashtags: string[];
  likeCount: number;
  commentCount: number;
  likedBy: string[];
  createdAt: any;
}

export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  authorPfp: string | null;
  text: string;
  createdAt: any;
}

export interface UserResult {
  uid: string;
  displayName: string;
  username: string;
  profilePicUrl: string | null;
  bio?: string;
}

/** Pull #hashtags out of post text (unicode-aware, deduped, lowercased). */
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  return Array.from(new Set(matches.map((h) => h.slice(1).toLowerCase()))).slice(0, 12);
}

function toPost(d: any): Post {
  const v = d.data() || {};
  return {
    id: d.id,
    authorId: v.authorId ?? '',
    authorName: v.authorName ?? 'Sadhak',
    authorUsername: v.authorUsername ?? '',
    authorPfp: v.authorPfp ?? null,
    text: v.text ?? '',
    imageUrl: v.imageUrl ?? null,
    hashtags: Array.isArray(v.hashtags) ? v.hashtags : [],
    likeCount: v.likeCount ?? 0,
    commentCount: v.commentCount ?? 0,
    likedBy: Array.isArray(v.likedBy) ? v.likedBy : [],
    createdAt: v.createdAt ?? null,
  };
}

const sortByNewest = (a: Post, b: Post) =>
  (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0);

export async function createPost(input: {
  author: { uid: string; displayName: string; username: string; profilePicUrl: string | null };
  text: string;
  imageUrl?: string | null;
}): Promise<void> {
  const text = input.text.trim();
  await addDoc(collection(db, 'posts'), {
    authorId: input.author.uid,
    authorName: input.author.displayName || 'Sadhak',
    authorUsername: input.author.username || '',
    authorPfp: input.author.profilePicUrl || null,
    text,
    imageUrl: input.imageUrl || null,
    hashtags: extractHashtags(text),
    likeCount: 0,
    commentCount: 0,
    likedBy: [],
    createdAt: serverTimestamp(),
  });
}

/** Live explore feed (newest first). */
export function subscribeFeed(cb: (posts: Post[]) => void, max = 150): () => void {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map(toPost)),
    () => cb([]),
  );
}

/** Posts for a single author (client-sorted; no composite index). */
export async function getUserPosts(authorId: string): Promise<Post[]> {
  const q = query(collection(db, 'posts'), where('authorId', '==', authorId), limit(60));
  const snap = await getDocs(q);
  return snap.docs.map(toPost).sort(sortByNewest);
}

/** Posts carrying a hashtag (client-sorted; no composite index). */
export async function getPostsByHashtag(tag: string): Promise<Post[]> {
  const q = query(collection(db, 'posts'), where('hashtags', 'array-contains', tag.toLowerCase()), limit(60));
  const snap = await getDocs(q);
  return snap.docs.map(toPost).sort(sortByNewest);
}

export async function toggleLike(postId: string, uid: string, nowLiked: boolean): Promise<void> {
  await updateDoc(doc(db, 'posts', postId), {
    likeCount: increment(nowLiked ? 1 : -1),
    likedBy: nowLiked ? arrayUnion(uid) : arrayRemove(uid),
  });
}

export async function deletePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId));
}

// ─── Comments ────────────────────────────────────────────────────────────────
export function subscribeComments(postId: string, cb: (c: PostComment[]) => void): () => void {
  const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'), limit(200));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    () => cb([]),
  );
}

export async function addComment(postId: string, author: { uid: string; displayName: string; profilePicUrl: string | null }, text: string): Promise<void> {
  await addDoc(collection(db, 'posts', postId, 'comments'), {
    authorId: author.uid,
    authorName: author.displayName || 'Sadhak',
    authorPfp: author.profilePicUrl || null,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'posts', postId), { commentCount: increment(1) });
}

// ─── Search ──────────────────────────────────────────────────────────────────
/** Search users by username or display name (client-side contains match). */
export async function searchUsers(term: string): Promise<UserResult[]> {
  const t = term.trim().toLowerCase().replace(/^@/, '');
  if (!t) return [];
  const snap = await getDocs(query(collection(db, 'users'), limit(200)));
  return snap.docs
    .map((d) => ({ uid: d.id, ...(d.data() as any) }))
    .filter((u) => u.showProfileInCommunity !== false)
    .filter(
      (u) =>
        (u.username || '').toLowerCase().includes(t) ||
        (u.displayName || '').toLowerCase().includes(t),
    )
    .slice(0, 25)
    .map((u) => ({
      uid: u.uid,
      displayName: u.displayName || 'Sadhak',
      username: u.username || '',
      profilePicUrl: u.profilePicUrl || null,
      bio: u.bio || '',
    }));
}

/** Search posts by keyword in text or hashtags (client-side over recent posts). */
export async function searchPosts(term: string): Promise<Post[]> {
  const t = term.trim().toLowerCase().replace(/^#/, '');
  if (!t) return [];
  const snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(120)));
  return snap.docs
    .map(toPost)
    .filter((p) => p.text.toLowerCase().includes(t) || p.hashtags.some((h) => h.includes(t)));
}

/** Latest few comments for the inline preview under a post. */
export async function getLatestComments(postId: string, n = 2): Promise<PostComment[]> {
  const snap = await getDocs(query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'desc'), limit(n)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).reverse();
}

// ─── Ranking (Reddit-style) ──────────────────────────────────────────────────
export type FeedSort = 'hot' | 'new' | 'top';
export type TopPeriod = 'day' | 'week' | 'all';

export const postMillis = (p: Post) => p.createdAt?.toMillis?.() ?? (typeof p.createdAt === 'number' ? p.createdAt : Date.now());

/** Engagement decayed by age: newer posts with activity float up. */
export function hotScore(p: Post, now = Date.now()): number {
  const hours = Math.max(0, (now - postMillis(p)) / 3600_000);
  const points = 1 + (p.likeCount || 0) + 2 * (p.commentCount || 0);
  return points / Math.pow(hours + 2, 1.5);
}

export function rankPosts(posts: Post[], sort: FeedSort, period: TopPeriod = 'week'): Post[] {
  const now = Date.now();
  const arr = [...posts];
  if (sort === 'new') return arr.sort((a, b) => postMillis(b) - postMillis(a));
  if (sort === 'hot') return arr.sort((a, b) => hotScore(b, now) - hotScore(a, now));
  const span = period === 'day' ? 86400_000 : period === 'week' ? 7 * 86400_000 : Infinity;
  return arr
    .filter((p) => now - postMillis(p) <= span)
    .sort((a, b) => (b.likeCount + b.commentCount) - (a.likeCount + a.commentCount) || postMillis(b) - postMillis(a));
}

export function timeAgo(createdAt: any): string {
  const ms = createdAt?.toMillis?.() ?? (typeof createdAt === 'number' ? createdAt : 0);
  if (!ms) return 'now';
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

/** Keep the name and photo on a person's own posts in step with their profile. */
export async function syncAuthorOnPosts(uid: string, a: { displayName: string; username: string; profilePicUrl: string | null }) {
  const snap = await getDocs(query(collection(db, 'posts'), where('authorId', '==', uid), limit(200)));
  await Promise.all(snap.docs.map((d) => {
    const v: any = d.data();
    if (v.authorName === a.displayName && v.authorUsername === a.username && v.authorPfp === a.profilePicUrl) return null;
    return updateDoc(d.ref, { authorName: a.displayName || 'Sadhak', authorUsername: a.username || '', authorPfp: a.profilePicUrl || null }).catch(() => {});
  }));
}
