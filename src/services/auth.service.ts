import { SupabaseClient } from '@supabase/supabase-js';
import { User, UserPreferences } from '../types';

export interface SessionData {
  profile: User;
  following_ids: string[];
  lists: any[];
}

export const AuthService = {
  async getSessionData(supabase: SupabaseClient, userId: string): Promise<SessionData | null> {
    const { data, error } = await supabase.rpc('get_user_session_data', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error fetching user session data:', error);
      return null;
    }

    return data;
  },

  async signOut(supabase: SupabaseClient): Promise<void> {
    await supabase.auth.signOut();
  },

  async signInWithPassword(supabase: SupabaseClient, email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },

  async signUp(supabase: SupabaseClient, email: string, password: string, metadata: Record<string, any>) {
    return supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
  },

  async resetPassword(supabase: SupabaseClient, email: string, redirectTo: string) {
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
  },

  async resendVerification(supabase: SupabaseClient, email: string) {
    return supabase.auth.resend({ type: 'signup', email });
  },

  async updatePreferences(supabase: SupabaseClient, userId: string, prefs: UserPreferences) {
    const updates = {
      cuisines_disliked: prefs.dislikes,
      occasions: prefs.occasions,
      frequency: prefs.radar.frequency,
      place_types: prefs.radar.placeTypes,
      behavior: prefs.radar.behavior,
      dietary_restrictions: prefs.restrictions,
      onboarding_completed: true
    };

    return supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
  },

  async getProfileByUsername(supabase: SupabaseClient, username: string) {
    return supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();
  },

  async getEmailByUsername(supabase: SupabaseClient, username: string) {
    return supabase
      .from('profiles')
      .select('email')
      .eq('username', username.toLowerCase())
      .maybeSingle();
  },

  async checkUsernameAvailable(supabase: SupabaseClient, username: string) {
    return supabase.rpc('check_username_available', {
      target_username: username
    });
  }
};