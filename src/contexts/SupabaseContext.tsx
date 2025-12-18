import React, { createContext, useContext, ReactNode } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL ou Key não configuradas.');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const SupabaseContext = createContext<SupabaseClient | null>(null);

export const SupabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <SupabaseContext.Provider value={supabase}>
    {children}
  </SupabaseContext.Provider>
);

export const useSupabase = (): SupabaseClient => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within SupabaseProvider');
  }
  return context;
};

export { supabase };