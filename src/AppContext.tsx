import React, { createContext, useContext, ReactNode, useEffect, useCallback } from 'react';
import { SupabaseClient, Session } from '@supabase/supabase-js';
import { SupabaseProvider, useSupabase } from './contexts/SupabaseContext';
import { useAuth } from './hooks/useAuth';
import { useFeed } from './hooks/useFeed';
import { useLists } from './hooks/useLists';
import { useFollow } from './hooks/useFollow';
import { List, Review, RecommendationSection, UserPreferences, User, Comment, Restaurant } from './types';

// Interface mantida para backward compatibility
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
  searchRestaurantsWithGoogle: (query: string) => Promise<Restaurant[]>;
  getRestaurantsByIds: (ids: string[]) => Promise<Restaurant[]>;
  getFollowingUsers: () => Promise<User[]>;
  getMutualFollowers: () => Promise<User[]>;
  uploadReviewPhotos: (files: File[], reviewId: string) => Promise<string[]>;
  addReview: (data: any) => Promise<string | null>;
  fetchComments: (reviewId: string) => Promise<Comment[]>;
  addComment: (reviewId: string, content: string) => Promise<Comment | null>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  setUserPreferences: (prefs: UserPreferences) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Componente interno que usa os hooks
const AppContextInner: React.FC<{ children: ReactNode }> = ({ children }) => {
  const supabase = useSupabase();
  
  // Custom hooks
  const auth = useAuth();
  const feed = useFeed();
  const listsHook = useLists();
  const followHook = useFollow();

  // Sync data quando usuário loga
  useEffect(() => {
    const initUserData = async () => {
      if (auth.currentUser?.id) {
        const data = await auth.fetchUserData(auth.currentUser.id);
        if (data) {
          followHook.setFollowing(data.following_ids || []);
          listsHook.setLists(data.lists || []);
          await feed.refreshFeed(auth.currentUser.id);
        }
      }
    };
    
    if (auth.currentUser && !auth.loading) {
      initUserData();
    }
  }, [auth.currentUser?.id, auth.loading]);

  // Wrappers para manter API original (sem precisar passar userId)
  const refreshFeed = useCallback(async () => {
    if (auth.currentUser?.id) {
      await feed.refreshFeed(auth.currentUser.id);
    }
  }, [auth.currentUser?.id, feed]);

  const toggleLike = useCallback(async (reviewId: string) => {
    if (auth.currentUser?.id) {
      await feed.toggleLike(reviewId, auth.currentUser.id);
    }
  }, [auth.currentUser?.id, feed]);

  const toggleSaveRestaurant = useCallback(async (restaurantId: string): Promise<boolean> => {
    if (!auth.currentUser?.id) return false;
    const result = await listsHook.toggleSaveRestaurant(restaurantId, auth.currentUser.id);
    // Update reviews is_saved state
    feed.setReviews(prev => prev.map(r => 
      r.restaurant_id === restaurantId ? { ...r, is_saved: result } : r
    ));
    return result;
  }, [auth.currentUser?.id, listsHook, feed]);

  const createList = useCallback(async (name: string, isPrivate: boolean, cover?: string) => {
    if (auth.currentUser?.id) {
      await listsHook.createList(name, isPrivate, auth.currentUser.id, cover);
    }
  }, [auth.currentUser?.id, listsHook]);

  const addReview = useCallback(async (data: any): Promise<string | null> => {
    if (!auth.currentUser?.id) return null;
    return feed.addReview(data, auth.currentUser.id);
  }, [auth.currentUser?.id, feed]);

  const uploadReviewPhotos = useCallback(async (files: File[], reviewId: string): Promise<string[]> => {
    if (!auth.currentUser?.id) return [];
    return feed.uploadReviewPhotos(files, reviewId, auth.currentUser.id);
  }, [auth.currentUser?.id, feed]);

  const addComment = useCallback(async (reviewId: string, content: string): Promise<Comment | null> => {
    if (!auth.currentUser?.id) return null;
    return feed.addComment(reviewId, content, auth.currentUser.id);
  }, [auth.currentUser?.id, feed]);

  const followUser = useCallback(async (targetId: string) => {
    if (!auth.currentUser?.id) return;
    await followHook.followUser(targetId, auth.currentUser.id);
    auth.updateCurrentUser({ 
      following_count: (auth.currentUser.following_count || 0) + 1 
    });
  }, [auth.currentUser?.id, followHook, auth]);

  const unfollowUser = useCallback(async (targetId: string) => {
    if (!auth.currentUser?.id) return;
    await followHook.unfollowUser(targetId, auth.currentUser.id);
    auth.updateCurrentUser({ 
      following_count: Math.max(0, (auth.currentUser.following_count || 0) - 1) 
    });
  }, [auth.currentUser?.id, followHook, auth]);

  const getFollowingUsers = useCallback(async (): Promise<User[]> => {
    if (!auth.currentUser?.id) return [];
    return followHook.getFollowingUsers(auth.currentUser.id);
  }, [auth.currentUser?.id, followHook]);

  const getMutualFollowers = useCallback(async (): Promise<User[]> => {
    if (!auth.currentUser?.id) return [];
    return followHook.getMutualFollowers(auth.currentUser.id);
  }, [auth.currentUser?.id, followHook]);

  // Busca de restaurantes com fallback para Google Places
  const searchRestaurantsWithGoogle = useCallback(async (query: string): Promise<Restaurant[]> => {
    if (!query || query.length < 3) return [];

    try {
      // Buscar na base local via RPC (otimizado)
      const { data: localResults, error } = await supabase.rpc('search_restaurants', {
        search_term: query,
        cuisine_filter: null,
        price_filter: null,
        min_rating: null,
        user_lat: -8.0476,
        user_lng: -34.8770,
        sort_by: 'distance',
        page_limit: 10,
        page_offset: 0,
      });

      if (error) console.error('Erro na busca local:', error);

      const results: Restaurant[] = (localResults || []) as Restaurant[];

      // Se poucos resultados, buscar no Google
      if (results.length < 3) {
        console.log('🔍 Buscando no Google Places...');
        
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/google-places`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ action: 'search', query, location: 'Recife, PE' }),
          });

          const { success, data } = await response.json();
          
          if (success && data) {
            // Verificar se já existe
            const { data: existing } = await supabase
              .from('restaurants')
              .select('*')
              .eq('google_place_id', data.place_id)
              .maybeSingle();

            if (existing) {
              const isDuplicate = results.some(r => r.id === existing.id);
              if (!isDuplicate) results.unshift(existing as Restaurant);
            } else {
              // Buscar detalhes e salvar
              const detailsResponse = await fetch(`${supabaseUrl}/functions/v1/google-places`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({ action: 'details', place_id: data.place_id }),
              });

              const detailsResult = await detailsResponse.json();
              
              if (detailsResult.success && detailsResult.data) {
                const details = detailsResult.data;

                const { data: newId, error: insertError } = await supabase.rpc('save_google_restaurant', {
                  p_google_place_id: details.place_id,
                  p_name: details.name,
                  p_address: details.address,
                  p_city: 'Recife',
                  p_latitude: details.location?.lat,
                  p_longitude: details.location?.lng,
                  p_phone: details.phone || null,
                  p_website: details.website || null,
                  p_google_maps_url: details.google_maps_url || null,
                  p_photo_url: details.photos?.[0]?.url || null,
                  p_cuisine_types: ['Restaurante'],
                  p_price_level: details.price_level || null,
                  p_opening_hours: details.opening_hours || null,
                  p_is_open_now: details.is_open_now ?? null,
                });

                if (!insertError && newId) {
                  console.log('✅ Novo restaurante salvo:', details.name);
                  
                  const { data: inserted } = await supabase
                    .from('restaurants')
                    .select('*')
                    .eq('id', newId)
                    .single();

                  if (inserted) results.unshift(inserted as Restaurant);
                } else {
                  results.unshift({
                    id: crypto.randomUUID(),
                    google_place_id: details.place_id,
                    name: details.name,
                    address: details.address,
                    city: 'Recife',
                    latitude: details.location?.lat,
                    longitude: details.location?.lng,
                    photo_url: details.photos?.[0]?.url || '',
                    cuisine_types: ['Restaurante'],
                    price_level: details.price_level,
                  } as Restaurant);
                }
              }
            }
          }
        } catch (googleError) {
          console.error('Erro na busca Google:', googleError);
        }
      }

      return results;
    } catch (err) {
      console.error('Erro geral na busca:', err);
      return [];
    }
  }, [supabase]);

  const value: AppContextType = {
    supabase,
    session: auth.session,
    currentUser: auth.currentUser,
    lists: listsHook.lists,
    reviews: feed.reviews,
    following: followHook.following,
    recommendations: [],
    loading: auth.loading,
    
    signOut: auth.signOut,
    refreshFeed,
    toggleLike,
    toggleSaveRestaurant,
    addRestaurantToList: listsHook.addRestaurantToList,
    removeRestaurantFromList: listsHook.removeRestaurantFromList,
    createList,
    updateList: listsHook.updateList,
    deleteList: listsHook.deleteList,
    searchRestaurants: listsHook.searchRestaurants,
    searchRestaurantsWithGoogle,
    getRestaurantsByIds: listsHook.getRestaurantsByIds,
    getFollowingUsers,
    getMutualFollowers,
    uploadReviewPhotos,
    addReview,
    fetchComments: feed.fetchComments,
    addComment,
    followUser,
    unfollowUser,
    setUserPreferences: auth.setUserPreferences
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Provider que wrapa com Supabase
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <SupabaseProvider>
    <AppContextInner>
      {children}
    </AppContextInner>
  </SupabaseProvider>
);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};