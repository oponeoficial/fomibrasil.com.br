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
    getRestaurantsByIds: listsHook.getRestaurantsByIds,
    getFollowingUsers,
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