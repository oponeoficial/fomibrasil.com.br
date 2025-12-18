import { useState, useCallback } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
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
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select(`
          *,
          user:profiles!user_id(id, username, full_name, profile_photo_url, is_verified),
          restaurant:restaurants!restaurant_id(id, name, neighborhood, photo_url)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) return;

      if (reviewsData) {
        const { data: userLikes } = await supabase
          .from('likes')
          .select('review_id')
          .eq('user_id', userId);
        
        const likedReviewIds = new Set(userLikes?.map(l => l.review_id) || []);

        const { data: savedData } = await supabase
          .from('list_restaurants')
          .select('restaurant_id, list_id, lists!inner(user_id)')
          .eq('lists.user_id', userId);
        
        const savedRestaurantIds = new Set(savedData?.map(s => s.restaurant_id) || []);

        const mappedReviews = reviewsData.map(review => ({
          ...review,
          is_liked: likedReviewIds.has(review.id),
          is_saved: savedRestaurantIds.has(review.restaurant_id)
        }));

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
        await supabase.from('likes').delete().eq('user_id', userId).eq('review_id', reviewId);
      } else {
        await supabase.from('likes').insert({ user_id: userId, review_id: reviewId });
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
    const { data, error } = await supabase
      .from('comments')
      .select(`*, user:profiles!user_id(id, username, full_name, profile_photo_url)`)
      .eq('review_id', reviewId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    
    if (error) return [];
    return data as Comment[];
  }, [supabase]);

  const addComment = useCallback(async (reviewId: string, content: string, userId: string): Promise<Comment | null> => {
    const { data, error } = await supabase
      .from('comments')
      .insert({ user_id: userId, review_id: reviewId, content })
      .select(`*, user:profiles!user_id(id, username, full_name, profile_photo_url)`)
      .single();
    
    if (error) return null;

    setReviews(prev => prev.map(r => 
      r.id === reviewId ? { ...r, comments_count: (r.comments_count || 0) + 1 } : r
    ));

    return data as Comment;
  }, [supabase]);

  const uploadReviewPhotos = useCallback(async (files: File[], reviewId: string, userId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `${userId}/${reviewId}_${i + 1}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('review-photos')
        .upload(filePath, file, { upsert: true });
      
      if (!error) {
        const { data: urlData } = supabase.storage
          .from('review-photos')
          .getPublicUrl(filePath);
        
        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      }
    }
    
    return uploadedUrls;
  }, [supabase]);

  const addReview = useCallback(async (data: any, userId: string): Promise<string | null> => {
    const { data: newReview, error } = await supabase
      .from('reviews')
      .insert({
        user_id: userId,
        restaurant_id: data.restaurantId,
        title: data.title,
        description: data.description,
        review_type: data.reviewType === 'presencial' ? 'in_person' : 'delivery',
        score_1: data.scores.score_1,
        score_2: data.scores.score_2,
        score_3: data.scores.score_3,
        score_4: data.scores.score_4,
        photos: []
      })
      .select()
      .single();

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
        
        await supabase
          .from('reviews')
          .update({ photos: photosJson })
          .eq('id', newReview.id);
      }
    }

    // Insert tags
    if (data.taggedUserIds?.length > 0) {
      const tags = data.taggedUserIds.map((tagUserId: string) => ({
        review_id: newReview.id,
        tagged_user_id: tagUserId
      }));
      await supabase.from('review_tags').insert(tags);
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