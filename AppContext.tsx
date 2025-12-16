import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { List, Review, RecommendationSection, UserPreferences, User, Comment, Restaurant } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL ou Key não configuradas.');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

interface AppContextType {
  supabase: SupabaseClient;
  session: Session | null;
  currentUser: User | null;
  lists: List[];
  reviews: Review[];
  following: string[];
  recommendations: RecommendationSection[];
  loading: boolean;
  
  signOut: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  toggleLike: (reviewId: string) => Promise<void>;
  toggleSaveRestaurant: (restaurantId: string) => Promise<boolean>;
  addRestaurantToList: (listId: string, restaurantId: string) => Promise<void>;
  removeRestaurantFromList: (listId: string, restaurantId: string) => Promise<void>;
  createList: (name: string, isPrivate: boolean, cover?: string) => Promise<void>;
  updateList: (listId: string, updates: { name?: string; is_private?: boolean; cover_photo_url?: string }) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  searchRestaurants: (query: string) => Promise<Restaurant[]>;
  getRestaurantsByIds: (ids: string[]) => Promise<Restaurant[]>;
  getFollowingUsers: () => Promise<User[]>;
  uploadReviewPhotos: (files: File[], reviewId: string) => Promise<string[]>;
  addReview: (data: any) => Promise<string | null>;
  fetchComments: (reviewId: string) => Promise<Comment[]>;
  addComment: (reviewId: string, content: string) => Promise<Comment | null>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  setUserPreferences: (prefs: UserPreferences) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchUserData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setLists([]);
        setReviews([]);
        setFollowing([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    setLoading(true);
    try {
      const { data: user } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (user) {
        const { count: reviewsCount } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_active', true);

        const { count: followersCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId);

        const { count: followingCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId);

        setCurrentUser({
          ...user,
          reviews_count: reviewsCount || 0,
          followers_count: followersCount || 0,
          following_count: followingCount || 0
        });
      }

      const { data: listsData } = await supabase
        .from('lists')
        .select(`*, list_restaurants(restaurant_id)`)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      
      if (listsData) {
        const listsWithCount = listsData.map(list => ({
          ...list,
          count: list.list_restaurants?.length || 0,
          items: list.list_restaurants?.map((lr: any) => lr.restaurant_id) || []
        }));
        setLists(listsWithCount);
      }

      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);
      
      if (follows) {
        setFollowing(follows.map(f => f.following_id));
      }

      await refreshFeedInternal(userId);
    } catch (e) {
      console.error("Error fetching user data", e);
    } finally {
      setLoading(false);
    }
  };

  const refreshFeedInternal = async (userId: string) => {
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
  };

  const refreshFeed = useCallback(async () => {
    if (currentUser?.id) {
      await refreshFeedInternal(currentUser.id);
    }
  }, [currentUser?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const toggleLike = async (reviewId: string) => {
    if (!currentUser) return;
    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;
    const isLiked = review.is_liked;

    setReviews(prev => prev.map(r => 
      r.id === reviewId 
        ? { ...r, is_liked: !isLiked, likes_count: (r.likes_count || 0) + (isLiked ? -1 : 1) } 
        : r
    ));

    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('user_id', currentUser.id).eq('review_id', reviewId);
      } else {
        await supabase.from('likes').insert({ user_id: currentUser.id, review_id: reviewId });
      }
    } catch (error) {
      setReviews(prev => prev.map(r => 
        r.id === reviewId 
          ? { ...r, is_liked: isLiked, likes_count: (r.likes_count || 0) + (isLiked ? 1 : -1) } 
          : r
      ));
    }
  };

  const toggleSaveRestaurant = async (restaurantId: string): Promise<boolean> => {
    if (!currentUser) return false;
    let defaultList = lists.find(l => l.is_default);
    
    if (!defaultList) {
      const { data: newList } = await supabase
        .from('lists')
        .insert({ user_id: currentUser.id, name: 'Quero ir', is_default: true })
        .select()
        .single();
      
      if (newList) {
        defaultList = { ...newList, count: 0, items: [] };
        setLists(prev => [...prev, defaultList!]);
      }
    }

    if (!defaultList) return false;
    const isSaved = defaultList.items?.includes(restaurantId);

    if (isSaved) {
      await supabase.from('list_restaurants').delete().eq('list_id', defaultList.id).eq('restaurant_id', restaurantId);
      setLists(prev => prev.map(l => 
        l.id === defaultList!.id 
          ? { ...l, items: l.items?.filter(i => i !== restaurantId), count: (l.count || 1) - 1 } 
          : l
      ));
      setReviews(prev => prev.map(r => r.restaurant_id === restaurantId ? { ...r, is_saved: false } : r));
      return false;
    } else {
      await supabase.from('list_restaurants').insert({ list_id: defaultList.id, restaurant_id: restaurantId });
      setLists(prev => prev.map(l => 
        l.id === defaultList!.id 
          ? { ...l, items: [...(l.items || []), restaurantId], count: (l.count || 0) + 1 } 
          : l
      ));
      setReviews(prev => prev.map(r => r.restaurant_id === restaurantId ? { ...r, is_saved: true } : r));
      return true;
    }
  };

  const addRestaurantToList = async (listId: string, restaurantId: string) => {
    const { error } = await supabase.from('list_restaurants').insert({ list_id: listId, restaurant_id: restaurantId });
    if (!error) {
      setLists(prev => prev.map(l => 
        l.id === listId ? { ...l, items: [...(l.items || []), restaurantId], count: (l.count || 0) + 1 } : l
      ));
    }
  };

  const removeRestaurantFromList = async (listId: string, restaurantId: string) => {
    const { error } = await supabase.from('list_restaurants').delete().eq('list_id', listId).eq('restaurant_id', restaurantId);
    if (!error) {
      setLists(prev => prev.map(l => 
        l.id === listId ? { ...l, items: l.items?.filter(i => i !== restaurantId), count: (l.count || 1) - 1 } : l
      ));
    }
  };

  const createList = async (name: string, isPrivate: boolean, cover?: string) => {
    if (!currentUser) return;
    const { data, error } = await supabase
      .from('lists')
      .insert({ user_id: currentUser.id, name, is_private: isPrivate, cover_photo_url: cover })
      .select()
      .single();
    
    if (!error && data) {
      setLists(prev => [...prev, { ...data, count: 0, items: [] }]);
    }
  };

  const updateList = async (listId: string, updates: { name?: string; is_private?: boolean; cover_photo_url?: string }) => {
    const { data, error } = await supabase
      .from('lists')
      .update(updates)
      .eq('id', listId)
      .select()
      .single();
    
    if (!error && data) {
      setLists(prev => prev.map(l => l.id === listId ? { ...l, ...data } : l));
    }
  };

  const deleteList = async (listId: string) => {
    const list = lists.find(l => l.id === listId);
    if (!list || list.is_default) return;
    const { error } = await supabase.from('lists').delete().eq('id', listId);
    if (!error) {
      setLists(prev => prev.filter(l => l.id !== listId));
    }
  };

  const searchRestaurants = async (query: string): Promise<Restaurant[]> => {
    if (!query.trim()) return [];
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(20);
    
    if (error) return [];
    return data as Restaurant[];
  };

  const getRestaurantsByIds = async (ids: string[]): Promise<Restaurant[]> => {
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .in('id', ids);
    
    if (error) return [];
    return data as Restaurant[];
  };

  // --- GET FOLLOWING USERS (for tagging) ---
  const getFollowingUsers = async (): Promise<User[]> => {
    if (!currentUser) return [];
    
    const { data, error } = await supabase
      .from('follows')
      .select(`
        following:profiles!following_id(id, username, full_name, profile_photo_url)
      `)
      .eq('follower_id', currentUser.id);
    
    if (error || !data) return [];
    
    return data.map((f: any) => f.following).filter(Boolean) as User[];
  };

  // --- UPLOAD REVIEW PHOTOS ---
  const uploadReviewPhotos = async (files: File[], reviewId: string): Promise<string[]> => {
    if (!currentUser) return [];
    
    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `${currentUser.id}/${reviewId}_${i + 1}.${fileExt}`;
      
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
  };

  // --- ADD REVIEW ---
  const addReview = async (data: any): Promise<string | null> => {
    if (!currentUser) return null;

    // 1. Create review first to get ID
    const { data: newReview, error } = await supabase
      .from('reviews')
      .insert({
        user_id: currentUser.id,
        restaurant_id: data.restaurantId,
        title: data.title,
        description: data.description,
        review_type: data.reviewType === 'presencial' ? 'in_person' : 'delivery',
        score_1: data.scores.score_1,
        score_2: data.scores.score_2,
        score_3: data.scores.score_3,
        score_4: data.scores.score_4,
        photos: [] // Will update after upload
      })
      .select()
      .single();

    if (error || !newReview) {
      console.error('Erro ao criar review:', error);
      return null;
    }

    // 2. Upload photos if any
    if (data.photoFiles && data.photoFiles.length > 0) {
      const uploadedUrls = await uploadReviewPhotos(data.photoFiles, newReview.id);
      
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

    // 3. Insert review_tags if any
    if (data.taggedUserIds && data.taggedUserIds.length > 0) {
      const tags = data.taggedUserIds.map((userId: string) => ({
        review_id: newReview.id,
        tagged_user_id: userId
      }));
      
      await supabase.from('review_tags').insert(tags);
    }

    // 4. Refresh feed
    await refreshFeed();

    return newReview.id;
  };

  const fetchComments = async (reviewId: string): Promise<Comment[]> => {
    const { data, error } = await supabase
      .from('comments')
      .select(`*, user:profiles!user_id(id, username, full_name, profile_photo_url)`)
      .eq('review_id', reviewId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    
    if (error) return [];
    return data as Comment[];
  };

  const addComment = async (reviewId: string, content: string): Promise<Comment | null> => {
    if (!currentUser) return null;

    const { data, error } = await supabase
      .from('comments')
      .insert({ user_id: currentUser.id, review_id: reviewId, content })
      .select(`*, user:profiles!user_id(id, username, full_name, profile_photo_url)`)
      .single();
    
    if (error) return null;

    setReviews(prev => prev.map(r => 
      r.id === reviewId ? { ...r, comments_count: (r.comments_count || 0) + 1 } : r
    ));

    return data as Comment;
  };

  const followUser = async (targetId: string) => {
    if (!currentUser) return;
    const { error } = await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: targetId });
    if (!error) {
      setFollowing(prev => [...prev, targetId]);
      setCurrentUser(prev => prev ? { ...prev, following_count: (prev.following_count || 0) + 1 } : null);
    }
  };

  const unfollowUser = async (targetId: string) => {
    if (!currentUser) return;
    const { error } = await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetId);
    if (!error) {
      setFollowing(prev => prev.filter(id => id !== targetId));
      setCurrentUser(prev => prev ? { ...prev, following_count: Math.max(0, (prev.following_count || 0) - 1) } : null);
    }
  };

  const setUserPreferences = async (prefs: UserPreferences) => {
    if (!currentUser) return;

    const updates = {
      cuisines_disliked: prefs.dislikes,
      occasions: prefs.occasions,
      frequency: prefs.radar.frequency,
      place_types: prefs.radar.placeTypes,
      behavior: prefs.radar.behavior,
      dietary_restrictions: prefs.restrictions,
      onboarding_completed: true
    };

    const { data: updatedUser, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', currentUser.id)
      .select()
      .single();
    
    if (error) throw error;
    if (updatedUser) {
      setCurrentUser(prev => ({ ...prev, ...updatedUser }));
    }
  };

  return (
    <AppContext.Provider value={{ 
      supabase, session, currentUser, lists, reviews, following, recommendations, loading,
      signOut, toggleSaveRestaurant, addRestaurantToList, removeRestaurantFromList, 
      createList, updateList, deleteList, searchRestaurants, getRestaurantsByIds,
      getFollowingUsers, uploadReviewPhotos, addReview, refreshFeed, toggleLike,
      fetchComments, addComment, followUser, unfollowUser, setUserPreferences
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};