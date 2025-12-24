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
  getMutualFollowers: (currentUserId: string) => Promise<User[]>;
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

  // Amigos mútuos: pessoas que você segue E que te seguem de volta
  const getMutualFollowers = useCallback(async (currentUserId: string): Promise<User[]> => {
    try {
      // Buscar IDs de quem eu sigo
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);

      if (!followingData || followingData.length === 0) return [];

      const followingIds = followingData.map(f => f.following_id);

      // Buscar IDs de quem me segue (que estão na lista de quem eu sigo)
      const { data: mutualData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', currentUserId)
        .in('follower_id', followingIds);

      if (!mutualData || mutualData.length === 0) return [];

      const mutualIds = mutualData.map(f => f.follower_id);

      // Buscar perfis dos amigos mútuos
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, profile_photo_url, is_verified')
        .in('id', mutualIds)
        .order('full_name');

      return (profiles || []) as User[];
    } catch (err) {
      console.error('Erro ao buscar amigos mútuos:', err);
      return [];
    }
  }, [supabase]);

  return {
    following,
    setFollowing,
    followUser,
    unfollowUser,
    getFollowingUsers,
    getMutualFollowers
  };
};