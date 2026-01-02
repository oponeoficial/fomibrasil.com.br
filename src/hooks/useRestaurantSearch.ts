// src/hooks/useRestaurantSearch.ts
import { useState, useCallback, useRef } from 'react';
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
  instagram?: string;
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

// Cache global para restaurantes buscados do Google (evita re-buscar na mesma sessão)
const googleSearchCache = new Map<string, SearchResult>();
const recentGoogleSearches = new Set<string>();

// Normaliza string para comparação
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ')
    .trim();
};

export function useRestaurantSearch() {
  const { supabase } = useAppContext();

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [lastParams, setLastParams] = useState<SearchParams | null>(null);

  // Ref para evitar buscas duplicadas
  const searchingRef = useRef(false);

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

  // Verifica se o restaurante já existe no banco por nome similar
  const findExistingByName = async (name: string): Promise<SearchResult | null> => {
    const normalizedName = normalizeString(name);

    // Busca por nome similar no banco
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .or(`name.ilike.%${name}%,name.ilike.%${name.split(' ')[0]}%`)
      .limit(10);

    if (!data || data.length === 0) return null;

    // Verifica se algum resultado tem nome muito similar
    for (const restaurant of data) {
      const dbNormalized = normalizeString(restaurant.name);
      // Match se os nomes normalizados são muito similares
      if (dbNormalized === normalizedName ||
          dbNormalized.includes(normalizedName) ||
          normalizedName.includes(dbNormalized)) {
        return restaurant as SearchResult;
      }
    }

    return null;
  };

  const searchGoogleAndSave = async (
    searchTerm: string,
    userLat?: number,
    userLng?: number
  ): Promise<SearchResult | null> => {
    const cacheKey = normalizeString(searchTerm);

    // 1. Verifica cache local primeiro
    if (googleSearchCache.has(cacheKey)) {
      console.log('📦 Usando cache para:', searchTerm);
      const cached = googleSearchCache.get(cacheKey)!;
      if (userLat && userLng && cached.latitude && cached.longitude) {
        const distance_km = calculateDistance(userLat, userLng, cached.latitude, cached.longitude);
        return { ...cached, distance_km, distance_formatted: formatDistance(distance_km) };
      }
      return cached;
    }

    // 2. Se já buscamos recentemente no Google para esse termo, não busca de novo
    if (recentGoogleSearches.has(cacheKey)) {
      console.log('⏭️ Pulando busca Google (já buscado):', searchTerm);
      return null;
    }

    // 3. Verifica se existe no banco por nome similar
    const existingByName = await findExistingByName(searchTerm);
    if (existingByName) {
      console.log('✅ Encontrado no banco por nome:', existingByName.name);
      googleSearchCache.set(cacheKey, existingByName);
      if (userLat && userLng && existingByName.latitude && existingByName.longitude) {
        const distance_km = calculateDistance(userLat, userLng, existingByName.latitude, existingByName.longitude);
        return { ...existingByName, distance_km, distance_formatted: formatDistance(distance_km) };
      }
      return existingByName;
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Marca como buscado para evitar buscas repetidas
      recentGoogleSearches.add(cacheKey);

      console.log('🔍 Buscando no Google Places:', searchTerm);

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

      // 4. Verifica se já existe no banco por google_place_id
      const { data: existing } = await supabase
        .from('restaurants')
        .select('*')
        .eq('google_place_id', data.place_id)
        .maybeSingle();

      if (existing) {
        console.log('✅ Já existe no banco (place_id):', existing.name);
        googleSearchCache.set(cacheKey, existing as SearchResult);
        googleSearchCache.set(normalizeString(existing.name), existing as SearchResult);

        if (userLat && userLng && existing.latitude && existing.longitude) {
          const distance_km = calculateDistance(userLat, userLng, existing.latitude, existing.longitude);
          return { ...existing, distance_km, distance_formatted: formatDistance(distance_km) } as SearchResult;
        }
        return existing as SearchResult;
      }

      // 5. Busca detalhes e salva no banco
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

      // Extrai Instagram do website se disponível
      let instagram: string | null = null;
      if (details.website?.includes('instagram.com')) {
        const match = details.website.match(/instagram\.com\/([^/?]+)/);
        if (match) instagram = match[1];
      }

      // Inserir via RPC
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
        const fallback: SearchResult = {
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
          instagram,
        };
        googleSearchCache.set(cacheKey, fallback);
        return fallback;
      }

      console.log('✅ Novo restaurante salvo:', details.name);

      // Buscar registro completo
      const { data: inserted } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', newId)
        .single();

      const result: SearchResult = inserted || {
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
        instagram,
      };

      // Adiciona ao cache
      googleSearchCache.set(cacheKey, result);
      googleSearchCache.set(normalizeString(result.name), result);

      if (userLat && userLng && result.latitude && result.longitude) {
        const distance_km = calculateDistance(userLat, userLng, result.latitude, result.longitude);
        return { ...result, distance_km, distance_formatted: formatDistance(distance_km) };
      }

      return result;
    } catch (err) {
      console.error('Erro na busca Google:', err);
      return null;
    }
  };

  const searchRestaurants = useCallback(async (params: SearchParams) => {
    const { searchTerm, cuisine, priceLevel, minRating, userLat, userLng, sortBy = 'distance', reset = true } = params;

    // Evita buscas duplicadas simultâneas
    if (searchingRef.current && !reset) return;
    searchingRef.current = true;

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

      // 1. Sempre busca primeiro no banco local
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

      let localResults: SearchResult[] = (data || []).map((r: any) => ({
        ...r,
        distance_formatted: r.distance_km ? formatDistance(r.distance_km) : undefined,
      }));

      // 2. Só busca no Google se:
      // - É uma busca específica (>= 3 caracteres)
      // - Teve poucos resultados locais (< 3)
      // - É a primeira página (reset)
      // - Não é uma busca por filtro (culinária, preço, etc)
      const isSpecificSearch = searchTerm && searchTerm.length >= 3;
      const fewResults = localResults.length < 3;
      const isFilterSearch = cuisine || priceLevel || minRating;

      if (isSpecificSearch && fewResults && reset && !isFilterSearch) {
        const googleResult = await searchGoogleAndSave(searchTerm, userLat, userLng);

        if (googleResult) {
          // Verifica duplicatas de forma mais rigorosa
          const normalizedGoogleName = normalizeString(googleResult.name);
          const isDuplicate = localResults.some(r => {
            if (r.id === googleResult.id) return true;
            if (r.google_place_id && r.google_place_id === googleResult.google_place_id) return true;

            const normalizedLocalName = normalizeString(r.name);
            return normalizedLocalName === normalizedGoogleName ||
                   normalizedLocalName.includes(normalizedGoogleName) ||
                   normalizedGoogleName.includes(normalizedLocalName);
          });

          if (!isDuplicate) {
            localResults.unshift(googleResult);
            console.log('➕ Adicionado resultado do Google:', googleResult.name);
          } else {
            console.log('⏭️ Resultado duplicado, ignorando:', googleResult.name);
          }
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
      searchingRef.current = false;
    }
  }, [currentOffset, supabase]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !lastParams) return;
    await searchRestaurants({ ...lastParams, reset: false });
  }, [hasMore, loading, lastParams, searchRestaurants]);

  // Função para limpar cache (útil em desenvolvimento)
  const clearCache = useCallback(() => {
    googleSearchCache.clear();
    recentGoogleSearches.clear();
  }, []);

  return { results, loading, error, searchRestaurants, loadMore, hasMore, totalCount, clearCache };
}
