import { SupabaseClient } from '@supabase/supabase-js';
import { User } from '../types';

export const FollowService = {
  async follow(supabase: SupabaseClient, followerId: string, followingId: string) {
    return supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId });
  },

  async unfollow(supabase: SupabaseClient, followerId: string, followingId: string) {
    return supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
  },

  async getFollowing(supabase: SupabaseClient, userId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        following:profiles!following_id(id, username, full_name, profile_photo_url)
      `)
      .eq('follower_id', userId);

    if (error || !data) return [];
    return data.map((f: any) => f.following).filter(Boolean) as User[];
  },

  async getFollowers(supabase: SupabaseClient, userId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        follower:profiles!follower_id(id, username, full_name, profile_photo_url)
      `)
      .eq('following_id', userId);

    if (error || !data) return [];
    return data.map((f: any) => f.follower).filter(Boolean) as User[];
  },

  async getFollowingIds(supabase: SupabaseClient, userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (error || !data) return [];
    return data.map(f => f.following_id);
  },

  async isFollowing(supabase: SupabaseClient, followerId: string, followingId: string): Promise<boolean> {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    return !!data;
  }
};