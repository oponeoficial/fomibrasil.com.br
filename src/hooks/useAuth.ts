import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { useSupabase } from '../contexts/SupabaseContext';
import { AuthService } from '../services';
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
  const initialized = useRef(false);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const data = await AuthService.getSessionData(supabase, userId);
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

  // Inicialização - roda apenas 1x
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('getSession error:', error);
          setLoading(false);
          return;
        }

        setSession(session);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        }
      } catch (e) {
        console.error('initAuth error:', e);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [supabase, fetchUserData]);

  // Listener de auth changes
  useEffect(() => {
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
    await AuthService.signOut(supabase);
  }, [supabase]);

  const updateCurrentUser = useCallback((updates: Partial<User>) => {
    setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const setUserPreferences = useCallback(async (prefs: UserPreferences) => {
    if (!currentUser) return;

    const { data: updatedUser, error } = await AuthService.updatePreferences(supabase, currentUser.id, prefs);
    
    if (error) throw error;
    if (updatedUser) {
      setCurrentUser(prev => prev ? { ...prev, ...updatedUser } : null);
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