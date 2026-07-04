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
export function subscribeFeed(cb: (posts: Post[]) => void, max = 60): () => void {
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
