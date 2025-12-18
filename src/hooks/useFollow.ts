import { useState, useCallback } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { FollowService } from '../services';
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
    const { error } = await FollowService.follow(supabase, currentUserId, targetId);
    
    if (!error) {
      setFollowing(prev => [...prev, targetId]);
    }
  }, [supabase]);

  const unfollowUser = useCallback(async (targetId: string, currentUserId: string) => {
    const { error } = await FollowService.unfollow(supabase, currentUserId, targetId);
    
    if (!error) {
      setFollowing(prev => prev.filter(id => id !== targetId));
    }
  }, [supabase]);

  const getFollowingUsers = useCallback(async (currentUserId: string): Promise<User[]> => {
    return FollowService.getFollowing(supabase, currentUserId);
  }, [supabase]);

  return {
    following,
    setFollowing,
    followUser,
    unfollowUser,
    getFollowingUsers
  };
};