import { SupabaseClient } from '@supabase/supabase-js';
import { Review, Comment } from '../types';

export const FeedService = {
  async getReviews(supabase: SupabaseClient, limit = 50) {
    return supabase
      .from('reviews')
      .select(`
        *,
        user:profiles!user_id(id, username, full_name, profile_photo_url, is_verified),
        restaurant:restaurants!restaurant_id(id, name, neighborhood, photo_url, address, rating, cuisine_types),
        tagged_users:review_tags(
          user:profiles!tagged_user_id(id, username, full_name, profile_photo_url)
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);
  },

  // Optimized feed loading - get everything in parallel
  async getOptimizedFeed(supabase: SupabaseClient, userId: string, limit = 20) {
    const [reviewsRes, likesRes, savedRes] = await Promise.all([
      supabase
        .from('reviews')
        .select(`
          *,
          user:profiles!user_id(id, username, full_name, profile_photo_url, is_verified),
          restaurant:restaurants!restaurant_id(id, name, neighborhood, photo_url, address, rating, cuisine_types),
          tagged_users:review_tags(
            user:profiles!tagged_user_id(id, username, full_name, profile_photo_url)
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('likes')
        .select('review_id')
        .eq('user_id', userId),
      supabase
        .from('list_restaurants')
        .select('restaurant_id, list_id, lists!inner(user_id)')
        .eq('lists.user_id', userId)
    ]);

    if (reviewsRes.error) return { data: null, error: reviewsRes.error };

    const likedReviewIds = new Set(likesRes.data?.map(l => l.review_id) || []);
    const savedRestaurantIds = new Set(savedRes.data?.map(s => s.restaurant_id) || []);

    const mappedReviews = reviewsRes.data?.map(review => {
      // Flatten tagged_users from nested structure
      const taggedUsers = review.tagged_users?.map((t: any) => t.user).filter(Boolean) || [];

      return {
        ...review,
        tagged_users: taggedUsers,
        is_liked: likedReviewIds.has(review.id),
        is_saved: savedRestaurantIds.has(review.restaurant_id)
      };
    });

    return { data: mappedReviews, error: null };
  },

  async getUserLikes(supabase: SupabaseClient, userId: string) {
    return supabase
      .from('likes')
      .select('review_id')
      .eq('user_id', userId);
  },

  async getUserSavedRestaurants(supabase: SupabaseClient, userId: string) {
    return supabase
      .from('list_restaurants')
      .select('restaurant_id, list_id, lists!inner(user_id)')
      .eq('lists.user_id', userId);
  },

  async addLike(supabase: SupabaseClient, userId: string, reviewId: string) {
    return supabase
      .from('likes')
      .insert({ user_id: userId, review_id: reviewId });
  },

  async removeLike(supabase: SupabaseClient, userId: string, reviewId: string) {
    return supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('review_id', reviewId);
  },

  async getComments(supabase: SupabaseClient, reviewId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`*, user:profiles!user_id(id, username, full_name, profile_photo_url)`)
      .eq('review_id', reviewId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) return [];
    return data as Comment[];
  },

  async addComment(supabase: SupabaseClient, userId: string, reviewId: string, content: string) {
    return supabase
      .from('comments')
      .insert({ user_id: userId, review_id: reviewId, content })
      .select(`*, user:profiles!user_id(id, username, full_name, profile_photo_url)`)
      .single();
  },

  async createReview(supabase: SupabaseClient, data: {
    userId: string;
    restaurantId: string;
    title: string;
    description: string;
    reviewType: string;
    scores: { score_1: number; score_2: number; score_3: number; score_4: number; score_5: number };
    voltaria?: boolean | null;
    occasions?: string[];
    averageScore?: number;
  }) {
    return supabase
      .from('reviews')
      .insert({
        user_id: data.userId,
        restaurant_id: data.restaurantId,
        title: data.title,
        description: data.description,
        review_type: data.reviewType === 'presencial' ? 'in_person' : 'delivery',
        score_1: data.scores.score_1,
        score_2: data.scores.score_2,
        score_3: data.scores.score_3,
        score_4: data.scores.score_4,
        score_5: data.scores.score_5,
        voltaria: data.voltaria,
        occasions: data.occasions || [],
        average_score: data.averageScore,
        photos: []
      })
      .select()
      .single();
  },

  async updateReviewPhotos(supabase: SupabaseClient, reviewId: string, photos: any[]) {
    return supabase
      .from('reviews')
      .update({ photos })
      .eq('id', reviewId);
  },

  async addReviewTags(supabase: SupabaseClient, reviewId: string, taggedUserIds: string[]) {
    const tags = taggedUserIds.map(userId => ({
      review_id: reviewId,
      tagged_user_id: userId
    }));
    return supabase.from('review_tags').insert(tags);
  },

  async getUserReviews(supabase: SupabaseClient, userId: string) {
    return supabase
      .from('reviews')
      .select(`
        *,
        restaurant:restaurants!restaurant_id(id, name, neighborhood, photo_url)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
  }
};