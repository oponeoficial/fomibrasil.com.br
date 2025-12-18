import { SupabaseClient } from '@supabase/supabase-js';
import { List, Restaurant } from '../types';

export const ListsService = {
  async getUserLists(supabase: SupabaseClient, userId: string) {
    return supabase
      .from('lists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  },

  async createList(supabase: SupabaseClient, data: {
    userId: string;
    name: string;
    isPrivate: boolean;
    isDefault?: boolean;
    cover?: string;
  }) {
    return supabase
      .from('lists')
      .insert({
        user_id: data.userId,
        name: data.name,
        is_private: data.isPrivate,
        is_default: data.isDefault || false,
        cover_photo_url: data.cover
      })
      .select()
      .single();
  },

  async updateList(supabase: SupabaseClient, listId: string, updates: {
    name?: string;
    is_private?: boolean;
    cover_photo_url?: string;
  }) {
    return supabase
      .from('lists')
      .update(updates)
      .eq('id', listId)
      .select()
      .single();
  },

  async deleteList(supabase: SupabaseClient, listId: string) {
    return supabase
      .from('lists')
      .delete()
      .eq('id', listId);
  },

  async addRestaurantToList(supabase: SupabaseClient, listId: string, restaurantId: string) {
    return supabase
      .from('list_restaurants')
      .insert({ list_id: listId, restaurant_id: restaurantId });
  },

  async removeRestaurantFromList(supabase: SupabaseClient, listId: string, restaurantId: string) {
    return supabase
      .from('list_restaurants')
      .delete()
      .eq('list_id', listId)
      .eq('restaurant_id', restaurantId);
  },

  async getListRestaurants(supabase: SupabaseClient, listId: string) {
    return supabase
      .from('list_restaurants')
      .select('restaurant_id, restaurants(*)')
      .eq('list_id', listId);
  },

  // Restaurant queries
  async searchRestaurants(supabase: SupabaseClient, query: string, limit = 20): Promise<Restaurant[]> {
    if (!query.trim()) return [];

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(limit);

    if (error) return [];
    return data as Restaurant[];
  },

  async getRestaurantsByIds(supabase: SupabaseClient, ids: string[]): Promise<Restaurant[]> {
    if (!ids.length) return [];

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .in('id', ids);

    if (error) return [];
    return data as Restaurant[];
  },

  async getRestaurantById(supabase: SupabaseClient, id: string) {
    return supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();
  },

  async getTopRatedRestaurants(supabase: SupabaseClient, limit = 10) {
    return supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(limit);
  },

  async getNewestRestaurants(supabase: SupabaseClient, limit = 10) {
    return supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);
  }
};