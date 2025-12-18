import { useState, useCallback } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { ListsService } from '../services';
import { List, Restaurant } from '../types';

interface UseListsReturn {
  lists: List[];
  setLists: React.Dispatch<React.SetStateAction<List[]>>;
  toggleSaveRestaurant: (restaurantId: string, userId: string) => Promise<boolean>;
  addRestaurantToList: (listId: string, restaurantId: string) => Promise<void>;
  removeRestaurantFromList: (listId: string, restaurantId: string) => Promise<void>;
  createList: (name: string, isPrivate: boolean, userId: string, cover?: string) => Promise<void>;
  updateList: (listId: string, updates: { name?: string; is_private?: boolean; cover_photo_url?: string }) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  searchRestaurants: (query: string) => Promise<Restaurant[]>;
  getRestaurantsByIds: (ids: string[]) => Promise<Restaurant[]>;
}

export const useLists = (): UseListsReturn => {
  const supabase = useSupabase();
  const [lists, setLists] = useState<List[]>([]);

  const toggleSaveRestaurant = useCallback(async (restaurantId: string, userId: string): Promise<boolean> => {
    let defaultList = lists.find(l => l.is_default);
    
    if (!defaultList) {
      const { data: newList } = await ListsService.createList(supabase, {
        userId,
        name: 'Quero ir',
        isPrivate: false,
        isDefault: true
      });
      
      if (newList) {
        defaultList = { ...newList, count: 0, items: [] };
        setLists(prev => [...prev, defaultList!]);
      }
    }

    if (!defaultList) return false;
    const isSaved = defaultList.items?.includes(restaurantId);

    if (isSaved) {
      await ListsService.removeRestaurantFromList(supabase, defaultList.id, restaurantId);
      setLists(prev => prev.map(l => 
        l.id === defaultList!.id 
          ? { ...l, items: l.items?.filter(i => i !== restaurantId), count: (l.count || 1) - 1 } 
          : l
      ));
      return false;
    } else {
      await ListsService.addRestaurantToList(supabase, defaultList.id, restaurantId);
      setLists(prev => prev.map(l => 
        l.id === defaultList!.id 
          ? { ...l, items: [...(l.items || []), restaurantId], count: (l.count || 0) + 1 } 
          : l
      ));
      return true;
    }
  }, [supabase, lists]);

  const addRestaurantToList = useCallback(async (listId: string, restaurantId: string) => {
    const { error } = await ListsService.addRestaurantToList(supabase, listId, restaurantId);
    if (!error) {
      setLists(prev => prev.map(l => 
        l.id === listId ? { ...l, items: [...(l.items || []), restaurantId], count: (l.count || 0) + 1 } : l
      ));
    }
  }, [supabase]);

  const removeRestaurantFromList = useCallback(async (listId: string, restaurantId: string) => {
    const { error } = await ListsService.removeRestaurantFromList(supabase, listId, restaurantId);
    if (!error) {
      setLists(prev => prev.map(l => 
        l.id === listId ? { ...l, items: l.items?.filter(i => i !== restaurantId), count: (l.count || 1) - 1 } : l
      ));
    }
  }, [supabase]);

  const createList = useCallback(async (name: string, isPrivate: boolean, userId: string, cover?: string) => {
    const { data, error } = await ListsService.createList(supabase, {
      userId,
      name,
      isPrivate,
      cover
    });
    
    if (!error && data) {
      setLists(prev => [...prev, { ...data, count: 0, items: [] }]);
    }
  }, [supabase]);

  const updateList = useCallback(async (listId: string, updates: { name?: string; is_private?: boolean; cover_photo_url?: string }) => {
    const { data, error } = await ListsService.updateList(supabase, listId, updates);
    
    if (!error && data) {
      setLists(prev => prev.map(l => l.id === listId ? { ...l, ...data } : l));
    }
  }, [supabase]);

  const deleteList = useCallback(async (listId: string) => {
    const list = lists.find(l => l.id === listId);
    if (!list || list.is_default) return;
    
    const { error } = await ListsService.deleteList(supabase, listId);
    if (!error) {
      setLists(prev => prev.filter(l => l.id !== listId));
    }
  }, [supabase, lists]);

  const searchRestaurants = useCallback(async (query: string): Promise<Restaurant[]> => {
    return ListsService.searchRestaurants(supabase, query);
  }, [supabase]);

  const getRestaurantsByIds = useCallback(async (ids: string[]): Promise<Restaurant[]> => {
    return ListsService.getRestaurantsByIds(supabase, ids);
  }, [supabase]);

  return {
    lists,
    setLists,
    toggleSaveRestaurant,
    addRestaurantToList,
    removeRestaurantFromList,
    createList,
    updateList,
    deleteList,
    searchRestaurants,
    getRestaurantsByIds
  };
};