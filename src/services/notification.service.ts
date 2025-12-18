import { SupabaseClient } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'new_follower' | 'tag' | 'new_review';
  actor_id: string;
  actor?: {
    id: string;
    username: string;
    full_name: string;
    profile_photo_url: string;
  };
  review_id?: string;
  review?: {
    id: string;
    title: string;
    photos: { url: string }[];
    restaurant?: { name: string };
  };
  is_read: boolean;
  created_at: string;
}

export const NotificationService = {
  async getNotifications(supabase: SupabaseClient, userId: string, limit = 50): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!actor_id(id, username, full_name, profile_photo_url),
        review:reviews!review_id(
          id, 
          title, 
          photos,
          restaurant:restaurants!restaurant_id(name)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data as Notification[];
  },

  async markAllAsRead(supabase: SupabaseClient, userId: string) {
    return supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  },

  async markAsRead(supabase: SupabaseClient, notificationId: string) {
    return supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  },

  async getUnreadCount(supabase: SupabaseClient, userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) return 0;
    return count || 0;
  },

  async deleteNotification(supabase: SupabaseClient, notificationId: string) {
    return supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
  }
};