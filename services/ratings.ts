import { db, doc, getDoc, setDoc, updateDoc } from '../config/firebase';
import { increment } from 'firebase/firestore';

// Book ratings: one doc per person at library/{bookId}/ratings/{uid}, plus
// running totals (ratingSum, ratingCount) on the book for cheap averages.

export async function myRating(bookId: string, uid: string): Promise<number> {
  try {
    const s = await getDoc(doc(db, 'library', bookId, 'ratings', uid));
    return s.exists() ? Number((s.data() as any).stars) || 0 : 0;
  } catch { return 0; }
}

export async function rateBook(bookId: string, uid: string, stars: number, prev: number): Promise<void> {
  await setDoc(doc(db, 'library', bookId, 'ratings', uid), { stars, at: Date.now() });
  await updateDoc(doc(db, 'library', bookId), {
    ratingSum: increment(stars - prev),
    ...(prev ? {} : { ratingCount: increment(1) }),
  });
}

export const average = (sum?: number, count?: number) => (count ? (sum || 0) / count : 0);

/** Ranking score that doesn't let one 5-star vote beat fifty 4.6s. */
export const ratingScore = (sum?: number, count?: number) => ((sum || 0) + 3 * 3.5) / ((count || 0) + 3);
