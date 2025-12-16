import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { List, Review, RecommendationSection, UserPreferences, User, Restaurant } from './types';
import { CURRENT_USER, MOCK_LISTS, MOCK_REVIEWS } from './constants';

// Initialize Supabase Client
// Fallback to placeholder to prevent crash during development if env vars are missing
const supabaseUrl = (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || 'https://placeholder.supabase.co';
const supabaseKey = (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

interface AppContextType {
  supabase: SupabaseClient;
  currentUser: User | null;
  lists: List[];
  reviews: Review[];
  following: string[];
  recommendations: RecommendationSection[];
  loading: boolean;
  
  // Actions
  toggleSaveRestaurant: (restaurantId: string) => Promise<boolean>;
  addRestaurantToList: (listId: string, restaurantId: string) => Promise<void>;
  removeRestaurantFromList: (listId: string, restaurantId: string) => Promise<void>;
  createList: (name: string, isPrivate: boolean, cover?: string) => Promise<void>;
  addReview: (data: any) => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  setUserPreferences: (prefs: UserPreferences) => Promise<void>;
  refreshFeed: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize with MOCK data so the app works in "Demo Mode" if Supabase isn't connected
  const [currentUser, setCurrentUser] = useState<User | null>(CURRENT_USER);
  const [lists, setLists] = useState<List[]>(MOCK_LISTS);
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);
  const [following, setFollowing] = useState<string[]>(['u2', 'u3']);
  const [recommendations, setRecommendations] = useState<RecommendationSection[]>([]);
  const [loading, setLoading] = useState(true);

  // --- INITIAL LOAD ---
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    if (supabaseUrl === 'https://placeholder.supabase.co') {
        console.warn('Supabase URL is missing. Using placeholder. Auth will not work.');
        setLoading(false);
        return;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          // No session found - we stick with MOCK data for the Demo experience
          setLoading(false);
        }
    } catch (error) {
        console.error("Session check failed", error);
        setLoading(false);
    }
  };

  const fetchUserData = async (userId: string) => {
    setLoading(true);
    try {
        // 1. Fetch User Profile
        const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
        if (user) setCurrentUser(user);

        // 2. Fetch Lists
        const { data: listsData } = await supabase.from('lists').select('*').eq('user_id', userId);
        if (listsData) setLists(listsData);

        // 3. Fetch Following
        const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
        if (follows) setFollowing(follows.map(f => f.following_id));

        // 4. Fetch Feed
        await refreshFeed();

    } catch (e) {
        console.error("Error fetching user data", e);
    } finally {
        setLoading(false);
    }
  };

  const refreshFeed = async () => {
    // If using placeholder/demo, don't try to fetch
    if (supabaseUrl === 'https://placeholder.supabase.co') return;

    // Fetch latest reviews with relations
    const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
            *,
            user:users(*),
            restaurant:restaurants(*)
        `)
        .order('created_at', { ascending: false })
        .limit(20);
    
    if (reviewsData) {
        // Map any DB specific fields if necessary, though strict typing should match
        setReviews(reviewsData as Review[]);
    }
  };

  // --- ACTIONS ---

  const toggleSaveRestaurant = async (restaurantId: string): Promise<boolean> => {
    if (!currentUser) return false;
    
    // DEMO MODE CHECK
    if (supabaseUrl === 'https://placeholder.supabase.co') {
        const wantList = lists.find(l => l.name === 'Quero ir');
        if (wantList) {
            const exists = wantList.items?.includes(restaurantId);
            if (exists) {
                // Remove (Mock)
                setLists(prev => prev.map(l => l.id === wantList.id ? {...l, items: l.items?.filter(i => i !== restaurantId), count: (l.count || 1) - 1} : l));
                return false;
            } else {
                // Add (Mock)
                setLists(prev => prev.map(l => l.id === wantList.id ? {...l, items: [...(l.items || []), restaurantId], count: (l.count || 0) + 1} : l));
                return true;
            }
        }
        return false;
    }

    // Find "Quero ir" list (is_default = true)
    let wantToGoList = lists.find(l => l.name === 'Quero ir');
    
    // Create if missing (db trigger should handle, but fallback)
    if (!wantToGoList) {
       const { data: newList } = await supabase.from('lists').insert({
           user_id: currentUser.id,
           name: 'Quero ir',
           is_default: true
       }).select().single();
       if (newList) {
           setLists(prev => [...prev, newList]);
           wantToGoList = newList;
       }
    }

    if (!wantToGoList) return false;

    // Check if exists in list_restaurants
    const { data: existing } = await supabase
        .from('list_restaurants')
        .select('*')
        .eq('list_id', wantToGoList.id)
        .eq('restaurant_id', restaurantId)
        .single();

    if (existing) {
        await supabase.from('list_restaurants').delete().eq('id', existing.id);
        return false;
    } else {
        await supabase.from('list_restaurants').insert({
            list_id: wantToGoList.id,
            restaurant_id: restaurantId
        });
        return true;
    }
  };

  const addRestaurantToList = async (listId: string, restaurantId: string) => {
    if (supabaseUrl === 'https://placeholder.supabase.co') {
        setLists(prev => prev.map(l => l.id === listId ? {...l, items: [...(l.items || []), restaurantId], count: (l.count || 0) + 1} : l));
        return;
    }
    await supabase.from('list_restaurants').insert({ list_id: listId, restaurant_id: restaurantId });
  };

  const removeRestaurantFromList = async (listId: string, restaurantId: string) => {
    if (supabaseUrl === 'https://placeholder.supabase.co') {
        setLists(prev => prev.map(l => l.id === listId ? {...l, items: l.items?.filter(i => i !== restaurantId), count: (l.count || 1) - 1} : l));
        return;
    }
    await supabase.from('list_restaurants').delete().match({ list_id: listId, restaurant_id: restaurantId });
  };

  const createList = async (name: string, isPrivate: boolean, cover?: string) => {
    if (!currentUser) return;
    
    if (supabaseUrl === 'https://placeholder.supabase.co') {
        const newList: List = {
            id: `l-${Date.now()}`,
            user_id: currentUser.id,
            name,
            is_private: isPrivate,
            is_default: false,
            cover_photo_url: cover || 'https://picsum.photos/seed/new/400/300',
            count: 0,
            items: []
        };
        setLists(prev => [...prev, newList]);
        return;
    }

    const { data } = await supabase.from('lists').insert({
        user_id: currentUser.id,
        name,
        is_private: isPrivate,
        cover_photo_url: cover
    }).select().single();
    
    if (data) setLists(prev => [...prev, data]);
  };

  const addReview = async (data: any) => {
    if (!currentUser) return;
    
    if (supabaseUrl === 'https://placeholder.supabase.co') {
        const newReview: Review = {
            id: `rv-${Date.now()}`,
            user_id: currentUser.id,
            user: currentUser,
            restaurant_id: data.restaurantId,
            restaurant: { id: data.restaurantId, name: data.restaurantName, address: data.location, photo_url: 'https://picsum.photos/400/300' } as Restaurant,
            title: data.title,
            description: data.description,
            review_type: data.reviewType === 'presencial' ? 'in_person' : 'delivery',
            average_score: parseFloat(data.average),
            photos: data.photos.map((url: string, i: number) => ({ url, order: i+1 })),
            created_at: new Date().toISOString(),
            likes_count: 0,
            comments_count: 0
        };
        setReviews(prev => [newReview, ...prev]);
        return;
    }

    // Transform photos array to JSONB structure expected by DB
    const photosJson = data.photos.map((url: string, index: number) => ({
        url,
        order: index + 1,
        size_bytes: 0 // Mock size if using external URL
    }));

    const { error } = await supabase.from('reviews').insert({
        user_id: currentUser.id,
        restaurant_id: data.restaurantId,
        title: data.title,
        description: data.description,
        review_type: data.reviewType === 'presencial' ? 'in_person' : 'delivery',
        score_1: data.scores[0]?.score || 5, // Mapping loosely based on index for simplicity
        score_2: data.scores[1]?.score || 5,
        score_3: data.scores[2]?.score || 5,
        score_4: data.scores[3]?.score || 5,
        // average_score is generated column
        photos: photosJson
    });

    if (!error) {
        await refreshFeed();
    }
  };

  const followUser = async (targetId: string) => {
    if (!currentUser) return;
    if (supabaseUrl === 'https://placeholder.supabase.co') {
        setFollowing(prev => [...prev, targetId]);
        return;
    }
    const { error } = await supabase.from('follows').insert({
        follower_id: currentUser.id,
        following_id: targetId
    });
    if (!error) setFollowing(prev => [...prev, targetId]);
  };

  const unfollowUser = async (targetId: string) => {
    if (!currentUser) return;
    if (supabaseUrl === 'https://placeholder.supabase.co') {
        setFollowing(prev => prev.filter(id => id !== targetId));
        return;
    }
    const { error } = await supabase.from('follows').delete().match({
        follower_id: currentUser.id,
        following_id: targetId
    });
    if (!error) setFollowing(prev => prev.filter(id => id !== targetId));
  };

  const setUserPreferences = async (prefs: UserPreferences) => {
    if (!currentUser) return;
    
    if (supabaseUrl === 'https://placeholder.supabase.co') return;

    // Map App preferences to DB columns
    const updates = {
        cuisines_disliked: prefs.dislikes,
        occasions: prefs.occasions,
        frequency: prefs.radar.frequency,
        place_types: prefs.radar.placeTypes,
        behavior: prefs.radar.behavior,
        dietary_restrictions: prefs.restrictions,
        onboarding_completed: true
    };

    const { data: updatedUser } = await supabase
        .from('users')
        .update(updates)
        .eq('id', currentUser.id)
        .select()
        .single();
    
    if (updatedUser) setCurrentUser(updatedUser);
  };

  return (
    <AppContext.Provider value={{ 
      supabase,
      currentUser,
      lists, 
      reviews, 
      following,
      recommendations,
      loading,
      toggleSaveRestaurant, 
      addRestaurantToList, 
      removeRestaurantFromList, 
      createList,
      addReview,
      refreshFeed,
      followUser,
      unfollowUser,
      setUserPreferences
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