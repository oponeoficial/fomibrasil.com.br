import { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { useSupabase } from '../contexts/SupabaseContext';
import { User, UserPreferences } from '../types';

interface UseAuthReturn {
  session: Session | null;
  currentUser: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setUserPreferences: (prefs: UserPreferences) => Promise<void>;
  updateCurrentUser: (updates: Partial<User>) => void;
  fetchUserData: (userId: string) => Promise<{ profile: User; following_ids: string[]; lists: any[] } | null>;
}

export const useAuth = (): UseAuthReturn => {
  const supabase = useSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_session_data', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching user session data:', error);
        return null;
      }

      if (data) {
        setCurrentUser(data.profile);
        return data;
      }
      return null;
    } catch (e) {
      console.error('Error fetching user data', e);
      return null;
    }
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchUserData(session.user.id);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchUserData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const updateCurrentUser = useCallback((updates: Partial<User>) => {
    setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const setUserPreferences = useCallback(async (prefs: UserPreferences) => {
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
  }, [supabase, currentUser]);

  return {
    session,
    currentUser,
    loading,
    signOut,
    setUserPreferences,
    updateCurrentUser,
    fetchUserData
  };
};