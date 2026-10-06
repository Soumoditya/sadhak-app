import { useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toggleLike, type Post } from '../services/posts';

/** Shared like / delete / comment-count handling for any list of posts. */
export function usePostList(initial: Post[] = []) {
  const { user, isGuest } = useAuth();
  const [posts, setPosts] = useState<Post[]>(initial);
  const [commentsFor, setCommentsFor] = useState<Post | null>(null);
  const [version, setVersion] = useState(0);

  const like = useCallback(async (post: Post) => {
    if (!user || isGuest) return;
    const liked = post.likedBy.includes(user.uid);
    const patch = (p: Post) => p.id === post.id
      ? { ...p, likeCount: Math.max(0, p.likeCount + (liked ? -1 : 1)), likedBy: liked ? p.likedBy.filter((u) => u !== user.uid) : [...p.likedBy, user.uid] }
      : p;
    setPosts((prev) => prev.map(patch));
    try { await toggleLike(post.id, user.uid, !liked); } catch { setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p))); }
  }, [user, isGuest]);

  const onDeleted = useCallback((id: string) => setPosts((prev) => prev.filter((p) => p.id !== id)), []);

  const onCommentAdded = useCallback((id: string) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, commentCount: p.commentCount + 1 } : p)));
    setVersion((v) => v + 1);
  }, []);

  return { uid: user?.uid, posts, setPosts, like, onDeleted, commentsFor, setCommentsFor, onCommentAdded, version };
}
