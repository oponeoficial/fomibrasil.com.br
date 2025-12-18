import { useState, useCallback } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { User } from '../types';

interface UseFollowReturn {
  following: string[];
  setFollowing: React.Dispatch<React.SetStateAction<string[]>>;
  followUser: (targetId: string, currentUserId: string) => Promise<void>;
  unfollowUser: (targetId: string, currentUserId: string) => Promise<void>;
  getFollowingUsers: (currentUserId: string) => Promise<User[]>;
}

export const useFollow = (): UseFollowReturn => {
  const supabase = useSupabase();
  const [following, setFollowing] = useState<string[]>([]);

  const followUser = useCallback(async (targetId: string, currentUserId: string) => {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: currentUserId, following_id: targetId });
    
    if (!error) {
      setFollowing(prev => [...prev, targetId]);
    }
  }, [supabase]);

  const unfollowUser = useCallback(async (targetId: string, currentUserId: string) => {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', targetId);
    
    if (!error) {
      setFollowing(prev => prev.filter(id => id !== targetId));
    }
  }, [supabase]);

  const getFollowingUsers = useCallback(async (currentUserId: string): Promise<User[]> => {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        following:profiles!following_id(id, username, full_name, profile_photo_url)
      `)
      .eq('follower_id', currentUserId);
    
    if (error || !data) return [];
    
    return data.map((f: any) => f.following).filter(Boolean) as User[];
  }, [supabase]);

  return {
    following,
    setFollowing,
    followUser,
    unfollowUser,
    getFollowingUsers
  };
};