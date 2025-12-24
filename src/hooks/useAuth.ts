// src/hooks/useAuth.ts
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

// Helper: executa promise com timeout, retorna null se timeout
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), ms);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (e) {
    clearTimeout(timeoutId!);
    throw e;
  }
}

export const useAuth = (): UseAuthReturn => {
  const supabase = useSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // Limpar sessão inválida
  const clearInvalidSession = useCallback(async () => {
    console.warn('🔐 Limpando sessão inválida...');
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      // Ignorar
    }
    setSession(null);
    setCurrentUser(null);
    setLoading(false);
  }, [supabase]);

  // Buscar dados do usuário com múltiplos fallbacks
  const fetchUserData = useCallback(async (userId: string) => {
    console.log('📡 fetchUserData iniciado para:', userId);
    
    // Tentar RPC com timeout de 4s
    try {
      const data = await withTimeout(
        AuthService.getSessionData(supabase, userId),
        4000
      );
      
      if (data?.profile) {
        console.log('✅ RPC retornou dados');
        setCurrentUser(data.profile);
        return data;
      }
    } catch (e) {
      console.warn('⚠️ RPC falhou:', e);
    }

    // Fallback: query direta com timeout de 3s
    console.warn('⚠️ Tentando fallback...');
    try {
      const queryPromise = Promise.resolve(
        supabase.from('profiles').select('*').eq('id', userId).single()
      );
      
      const result = await withTimeout(queryPromise, 3000);
      
      if (result?.data) {
        console.log('✅ Fallback retornou dados');
        const profile = result.data as User;
        setCurrentUser(profile);
        return { profile, following_ids: [], lists: [] };
      }
    } catch (e) {
      console.warn('⚠️ Fallback falhou:', e);
    }

    console.warn('⚠️ Nenhum dado encontrado');
    return null;
  }, [supabase]);

  // Inicialização
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // TIMEOUT ABSOLUTO: após 8s, para de carregar
    const absoluteTimeout = setTimeout(() => {
      console.warn('⏰ TIMEOUT ABSOLUTO - forçando fim do loading');
      setLoading(false);
    }, 8000);

    const initAuth = async () => {
      try {
        // getSession com timeout
        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          5000
        );
        
        if (!sessionResult) {
          console.warn('⚠️ getSession timeout');
          setLoading(false);
          clearTimeout(absoluteTimeout);
          return;
        }

        const { data: { session: currentSession }, error } = sessionResult;
        
        if (error) {
          console.error('getSession error:', error);
          const msg = error.message || '';
          if (msg.includes('Invalid Refresh Token') || msg.includes('refresh_token') || msg.includes('JWT')) {
            await clearInvalidSession();
            clearTimeout(absoluteTimeout);
            return;
          }
          setLoading(false);
          clearTimeout(absoluteTimeout);
          return;
        }

        if (currentSession) {
          // Tentar refresh com timeout
          const refreshResult = await withTimeout(
            supabase.auth.refreshSession(),
            4000
          );
          
          if (refreshResult?.error && !refreshResult.error.message?.includes('timeout')) {
            console.error('Refresh failed:', refreshResult.error.message);
            // Não limpar sessão por erro de refresh, tentar usar sessão atual
          }
          
          const validSession = refreshResult?.data?.session || currentSession;
          setSession(validSession);
          
          if (validSession?.user) {
            await fetchUserData(validSession.user.id);
          }
        }
      } catch (e) {
        console.error('initAuth error:', e);
      } finally {
        setLoading(false);
        clearTimeout(absoluteTimeout);
      }
    };

    initAuth();

    return () => clearTimeout(absoluteTimeout);
  }, [supabase, fetchUserData, clearInvalidSession]);

  // Listener de auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('🔐 Auth event:', event);
      
      // Timeout para este handler
      const handlerTimeout = setTimeout(() => {
        console.warn('⏰ Auth handler timeout - forçando fim');
        setLoading(false);
      }, 6000);

      try {
        if (event === 'TOKEN_REFRESHED' && !newSession) {
          await clearInvalidSession();
          return;
        }
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setCurrentUser(null);
          setLoading(false);
          return;
        }
        
        if (event === 'SIGNED_IN' && newSession?.user) {
          setSession(newSession);
          await fetchUserData(newSession.user.id);
          setLoading(false);
          return;
        }
        
        if (event === 'INITIAL_SESSION') {
          // Já tratado no initAuth
          return;
        }
        
        setSession(newSession);
        if (!newSession) {
          setCurrentUser(null);
        }
      } catch (e) {
        console.error('Auth handler error:', e);
      } finally {
        clearTimeout(handlerTimeout);
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchUserData, clearInvalidSession]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await withTimeout(AuthService.signOut(supabase), 3000);
    } catch (e) {
      console.error('SignOut error:', e);
    }
    setSession(null);
    setCurrentUser(null);
    setLoading(false);
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