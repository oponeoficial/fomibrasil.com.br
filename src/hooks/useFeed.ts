import { useState, useCallback } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { FeedService, StorageService } from '../services';
import { Review, Comment } from '../types';

interface UseFeedReturn {
  reviews: Review[];
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
  refreshFeed: (userId: string) => Promise<void>;
  toggleLike: (reviewId: string, userId: string) => Promise<void>;
  fetchComments: (reviewId: string) => Promise<Comment[]>;
  addComment: (reviewId: string, content: string, userId: string) => Promise<Comment | null>;
  addReview: (data: any, userId: string) => Promise<string | null>;
  uploadReviewPhotos: (files: File[], reviewId: string, userId: string) => Promise<string[]>;
}

export const useFeed = (): UseFeedReturn => {
  const supabase = useSupabase();
  const [reviews, setReviews] = useState<Review[]>([]);

  const refreshFeed = useCallback(async (userId: string) => {
    try {
      // Use optimized feed loading - single parallel request
      const { data: mappedReviews, error } = await FeedService.getOptimizedFeed(supabase, userId);

      if (error) {
        console.error('Erro no refreshFeed:', error);
        return;
      }

      if (mappedReviews) {
        setReviews(mappedReviews as Review[]);
      }
    } catch (e) {
      console.error('Erro no refreshFeed:', e);
    }
  }, [supabase]);

  const toggleLike = useCallback(async (reviewId: string, userId: string) => {
    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;
    const isLiked = review.is_liked;

    // Optimistic update
    setReviews(prev => prev.map(r => 
      r.id === reviewId 
        ? { ...r, is_liked: !isLiked, likes_count: (r.likes_count || 0) + (isLiked ? -1 : 1) } 
        : r
    ));

    try {
      if (isLiked) {
        await FeedService.removeLike(supabase, userId, reviewId);
      } else {
        await FeedService.addLike(supabase, userId, reviewId);
      }
    } catch {
      // Rollback on error
      setReviews(prev => prev.map(r => 
        r.id === reviewId 
          ? { ...r, is_liked: isLiked, likes_count: (r.likes_count || 0) + (isLiked ? 1 : -1) } 
          : r
      ));
    }
  }, [supabase, reviews]);

  const fetchComments = useCallback(async (reviewId: string): Promise<Comment[]> => {
    return FeedService.getComments(supabase, reviewId);
  }, [supabase]);

  const addComment = useCallback(async (reviewId: string, content: string, userId: string): Promise<Comment | null> => {
    const { data, error } = await FeedService.addComment(supabase, userId, reviewId, content);
    if (error) return null;

    setReviews(prev => prev.map(r => 
      r.id === reviewId ? { ...r, comments_count: (r.comments_count || 0) + 1 } : r
    ));

    return data as Comment;
  }, [supabase]);

  const uploadReviewPhotos = useCallback(async (files: File[], reviewId: string, userId: string): Promise<string[]> => {
    return StorageService.uploadReviewPhotos(supabase, userId, reviewId, files);
  }, [supabase]);

  const addReview = useCallback(async (data: any, userId: string): Promise<string | null> => {
    const { data: newReview, error } = await FeedService.createReview(supabase, {
      userId,
      restaurantId: data.restaurantId,
      title: data.title,
      description: data.description,
      reviewType: data.reviewType,
      scores: data.scores,
      voltaria: data.voltaria,
      occasions: data.occasions,
      averageScore: data.averageScore
    });

    if (error || !newReview) {
      console.error('Erro ao criar review:', error);
      return null;
    }

    // Upload photos
    if (data.photoFiles?.length > 0) {
      const uploadedUrls = await uploadReviewPhotos(data.photoFiles, newReview.id, userId);
      
      if (uploadedUrls.length > 0) {
        const photosJson = uploadedUrls.map((url, index) => ({
          url,
          order: index + 1,
          size_bytes: data.photoFiles[index]?.size || 0
        }));
        
        await FeedService.updateReviewPhotos(supabase, newReview.id, photosJson);
      }
    }

    // Insert tags
    if (data.taggedUserIds?.length > 0) {
      await FeedService.addReviewTags(supabase, newReview.id, data.taggedUserIds);
    }

    await refreshFeed(userId);
    return newReview.id;
  }, [supabase, uploadReviewPhotos, refreshFeed]);

  return {
    reviews,
    setReviews,
    refreshFeed,
    toggleLike,
    fetchComments,
    addComment,
    addReview,
    uploadReviewPhotos
  };
};