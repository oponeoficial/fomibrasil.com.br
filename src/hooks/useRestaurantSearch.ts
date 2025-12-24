// src/hooks/useRestaurantSearch.ts
import { useState, useCallback } from 'react';
import { useAppContext } from '../AppContext';

interface SearchResult {
  id: string;
  google_place_id?: string;
  name: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  google_maps_url?: string;
  photo_url?: string;
  cuisine_types?: string[];
  price_level?: number;
  rating?: number;
  review_count?: number;
  opening_hours?: string[];
  is_open_now?: boolean;
  distance_km?: number;
  distance_formatted?: string;
}

interface SearchParams {
  searchTerm?: string;
  cuisine?: string;
  priceLevel?: number;
  minRating?: number;
  userLat?: number;
  userLng?: number;
  sortBy?: 'distance' | 'rating' | 'price_asc' | 'price_desc';
  reset?: boolean;
}

const PAGE_SIZE = 20;

export function useRestaurantSearch() {
  const { supabase } = useAppContext();
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [lastParams, setLastParams] = useState<SearchParams | null>(null);

  const formatDistance = (km: number): string => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const searchGoogleAndSave = async (
    searchTerm: string,
    userLat?: number,
    userLng?: number
  ): Promise<SearchResult | null> => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/google-places`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ action: 'search', query: searchTerm, location: 'Recife, PE' }),
      });

      const { success, data } = await response.json();
      if (!success || !data) return null;

      const { data: existing } = await supabase
        .from('restaurants')
        .select('*')
        .eq('google_place_id', data.place_id)
        .maybeSingle();

      if (existing) {
        let distance_km: number | undefined;
        let distance_formatted: string | undefined;
        if (userLat && userLng && existing.latitude && existing.longitude) {
          distance_km = calculateDistance(userLat, userLng, existing.latitude, existing.longitude);
          distance_formatted = formatDistance(distance_km);
        }
        return { ...existing, distance_km, distance_formatted } as SearchResult;
      }

      const detailsResponse = await fetch(`${supabaseUrl}/functions/v1/google-places`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ action: 'details', place_id: data.place_id }),
      });

      const detailsResult = await detailsResponse.json();
      if (!detailsResult.success || !detailsResult.data) return null;

      const details = detailsResult.data;

      // Inserir via RPC (bypassa RLS)
      const { data: newId, error: insertError } = await supabase.rpc('save_google_restaurant', {
        p_google_place_id: details.place_id,
        p_name: details.name,
        p_address: details.address,
        p_city: 'Recife',
        p_latitude: details.location?.lat,
        p_longitude: details.location?.lng,
        p_phone: details.phone || null,
        p_website: details.website || null,
        p_google_maps_url: details.google_maps_url || null,
        p_photo_url: details.photos?.[0]?.url || null,
        p_cuisine_types: ['Restaurante'],
        p_price_level: details.price_level || null,
        p_opening_hours: details.opening_hours || null,
        p_is_open_now: details.is_open_now ?? null,
      });

      if (insertError) {
        console.error('Erro ao salvar:', insertError);
        return {
          id: crypto.randomUUID(),
          google_place_id: details.place_id,
          name: details.name,
          address: details.address,
          city: 'Recife',
          latitude: details.location?.lat,
          longitude: details.location?.lng,
          photo_url: details.photos?.[0]?.url || null,
          cuisine_types: ['Restaurante'],
          price_level: details.price_level,
        } as SearchResult;
      }

      console.log('✅ Novo restaurante salvo:', details.name);

      // Buscar registro completo
      const { data: inserted } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', newId)
        .single();

      if (!inserted) {
        return {
          id: newId,
          google_place_id: details.place_id,
          name: details.name,
          address: details.address,
          city: 'Recife',
          latitude: details.location?.lat,
          longitude: details.location?.lng,
          photo_url: details.photos?.[0]?.url || null,
          cuisine_types: ['Restaurante'],
          price_level: details.price_level,
        } as SearchResult;
      }

      let distance_km: number | undefined;
      let distance_formatted: string | undefined;
      if (userLat && userLng && inserted.latitude && inserted.longitude) {
        distance_km = calculateDistance(userLat, userLng, inserted.latitude, inserted.longitude);
        distance_formatted = formatDistance(distance_km);
      }

      return { ...inserted, distance_km, distance_formatted } as SearchResult;
    } catch (err) {
      console.error('Erro na busca Google:', err);
      return null;
    }
  };

  const searchRestaurants = useCallback(async (params: SearchParams) => {
    const { searchTerm, cuisine, priceLevel, minRating, userLat, userLng, sortBy = 'distance', reset = true } = params;

    if (reset) {
      setCurrentOffset(0);
      setResults([]);
      setHasMore(true);
    }

    setLoading(true);
    setError(null);
    setLastParams(params);

    try {
      const offset = reset ? 0 : currentOffset;
      
      const { data, error: rpcError } = await supabase.rpc('search_restaurants', {
        search_term: searchTerm || null,
        cuisine_filter: cuisine || null,
        price_filter: priceLevel || null,
        min_rating: minRating || null,
        user_lat: userLat || -8.0476,
        user_lng: userLng || -34.8770,
        sort_by: sortBy,
        page_limit: PAGE_SIZE,
        page_offset: offset,
      });

      if (rpcError) throw rpcError;

      const localResults: SearchResult[] = (data || []).map((r: any) => ({
        ...r,
        distance_formatted: r.distance_km ? formatDistance(r.distance_km) : undefined,
      }));

      const isSpecificSearch = searchTerm && searchTerm.length >= 3;
      const fewResults = localResults.length < 3;
      
      if (isSpecificSearch && fewResults && reset) {
        console.log('🔍 Buscando no Google...');
        const googleResult = await searchGoogleAndSave(searchTerm, userLat, userLng);
        
        if (googleResult) {
          const isDuplicate = localResults.some(r => 
            r.id === googleResult.id || 
            r.google_place_id === googleResult.google_place_id ||
            r.name.toLowerCase() === googleResult.name.toLowerCase()
          );
          if (!isDuplicate) localResults.unshift(googleResult);
        }
      }

      if (reset) {
        setResults(localResults);
      } else {
        setResults(prev => [...prev, ...localResults]);
      }

      setTotalCount(localResults.length > 0 ? (data as any)?.[0]?.total_count || localResults.length : 0);
      setHasMore(localResults.length === PAGE_SIZE);
      setCurrentOffset(offset + PAGE_SIZE);
    } catch (err) {
      console.error('Erro na busca:', err);
      setError('Erro ao buscar restaurantes');
    } finally {
      setLoading(false);
    }
  }, [currentOffset, supabase]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !lastParams) return;
    await searchRestaurants({ ...lastParams, reset: false });
  }, [hasMore, loading, lastParams, searchRestaurants]);

  return { results, loading, error, searchRestaurants, loadMore, hasMore, totalCount };
}