// supabase/functions/google-places/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CITIES = [
  { name: "Recife", state: "PE", lat: -8.0476, lng: -34.8770 },
  { name: "Olinda", state: "PE", lat: -7.9914, lng: -34.8416 },
  { name: "Jaboatão dos Guararapes", state: "PE", lat: -8.1128, lng: -35.0158 },
  { name: "Cabo de Santo Agostinho", state: "PE", lat: -8.2833, lng: -35.0333 },
  { name: "Gravatá", state: "PE", lat: -8.2005, lng: -35.5644 },
  { name: "Caruaru", state: "PE", lat: -8.2760, lng: -35.9819 },
  { name: "Tamandaré", state: "PE", lat: -8.7594, lng: -35.1036 },
  { name: "Ipojuca", state: "PE", lat: -8.3967, lng: -35.0636 },
];

const CUISINE_TYPES = [
  "restaurant",
  "brazilian_restaurant", 
  "seafood_restaurant",
  "italian_restaurant",
  "japanese_restaurant",
  "steakhouse",
  "pizza_restaurant",
  "bar",
  "cafe",
  "bakery"
];

// Nearby Search
async function searchNearby(lat: number, lng: number, type: string): Promise<any> {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=15000&type=${type}&language=pt-BR&key=${GOOGLE_API_KEY}`;
  const response = await fetch(url);
  return response.json();
}

// Buscar detalhes completos
async function getPlaceDetails(placeId: string): Promise<any> {
  const fields = [
    "place_id", "name", "formatted_address", "formatted_phone_number",
    "website", "url", "rating", "user_ratings_total", "price_level",
    "photos", "geometry", "types", "address_components"
  ].join(",");

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=pt-BR&key=${GOOGLE_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  
  return data.status === "OK" ? data.result : null;
}

// Gerar URL da foto
function getPhotoUrl(photoReference: string, maxWidth = 800): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
}

// Extrair cidade e bairro
function extractLocation(components: any[]): { city: string; neighborhood: string } {
  let city = "";
  let neighborhood = "";
  
  for (const comp of components || []) {
    if (comp.types.includes("administrative_area_level_2")) {
      city = comp.long_name;
    }
    if (comp.types.includes("sublocality_level_1") || comp.types.includes("sublocality") || comp.types.includes("neighborhood")) {
      neighborhood = comp.long_name;
    }
  }
  
  return { city, neighborhood };
}

// Mapear cuisine types
function mapCuisineTypes(types: string[]): string[] {
  const cuisineMap: Record<string, string> = {
    "brazilian_restaurant": "Brasileira",
    "seafood_restaurant": "Frutos do Mar",
    "italian_restaurant": "Italiana",
    "japanese_restaurant": "Japonesa",
    "steakhouse": "Churrascaria",
    "pizza_restaurant": "Pizzaria",
    "mexican_restaurant": "Mexicana",
    "chinese_restaurant": "Chinesa",
    "bar": "Bar",
    "cafe": "Café",
    "bakery": "Padaria",
    "restaurant": "Restaurante",
  };
  
  return types
    .filter(t => cuisineMap[t])
    .map(t => cuisineMap[t])
    .slice(0, 3);
}

// BULK SEED OTIMIZADO - Só insere restaurantes NOVOS
async function bulkSeed(supabase: any): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const results = { inserted: 0, skipped: 0, errors: [] as string[] };

  // 1. BUSCAR TODOS OS google_place_id JÁ EXISTENTES (1 query só)
  const { data: existingPlaces } = await supabase
    .from("restaurants")
    .select("google_place_id");
  
  const existingIds = new Set(
    (existingPlaces || []).map((p: any) => p.google_place_id).filter(Boolean)
  );
  
  console.log(`📊 ${existingIds.size} restaurantes já cadastrados no banco`);

  const processedIds = new Set<string>();

  for (const city of CITIES) {
    console.log(`🔍 Buscando novos restaurantes em ${city.name}...`);
    
    for (const type of CUISINE_TYPES) {
      try {
        const nearbyData = await searchNearby(city.lat, city.lng, type);
        
        if (nearbyData.status !== "OK") continue;

        for (const place of nearbyData.results || []) {
          // Filtros: rating >= 4.0 e reviews >= 10
          if ((place.rating || 0) < 4.0) continue;
          if ((place.user_ratings_total || 0) < 10) continue;
          
          // Já processado nesta execução?
          if (processedIds.has(place.place_id)) continue;
          processedIds.add(place.place_id);

          // JÁ EXISTE NO BANCO? (verificação local, SEM query extra)
          if (existingIds.has(place.place_id)) {
            results.skipped++;
            continue;
          }

          // Buscar detalhes (só para restaurantes NOVOS)
          const details = await getPlaceDetails(place.place_id);
          if (!details) continue;

          const { city: extractedCity, neighborhood } = extractLocation(details.address_components);
          const cuisineTypes = mapCuisineTypes(details.types || []);

          // Inserir no banco
          const { error } = await supabase.from("restaurants").insert({
            google_place_id: details.place_id,
            name: details.name,
            address: details.formatted_address,
            city: extractedCity || city.name,
            neighborhood: neighborhood || null,
            latitude: details.geometry?.location?.lat,
            longitude: details.geometry?.location?.lng,
            phone: details.formatted_phone_number || null,
            website: details.website || null,
            google_maps_url: details.url,
            photo_url: details.photos?.[0] 
              ? getPhotoUrl(details.photos[0].photo_reference) 
              : null,
            cuisine_types: cuisineTypes.length > 0 ? cuisineTypes : ["Restaurante"],
            price_level: details.price_level || null,
            is_active: true
          });

          if (error) {
            results.errors.push(`${details.name}: ${error.message}`);
          } else {
            results.inserted++;
            existingIds.add(details.place_id); // Marca como existente
            console.log(`✅ NOVO: ${details.name} (${extractedCity})`);
          }

          // Rate limiting - evitar bloqueio da API
          await new Promise(r => setTimeout(r, 100));
        }

        await new Promise(r => setTimeout(r, 300));
        
      } catch (err) {
        results.errors.push(`${city.name}/${type}: ${(err as Error).message}`);
      }
    }
  }

  console.log(`📊 Resultado final: ${results.inserted} novos inseridos, ${results.skipped} já existiam`);
  return results;
}

// Busca única (para autocomplete no app)
async function searchPlace(query: string, location?: string) {
  const searchQuery = location ? `${query} ${location}` : query;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&type=restaurant&language=pt-BR&key=${GOOGLE_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.status === "OK" && data.results.length > 0 ? data.results[0] : null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, query, location, place_id } = await req.json();

    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_PLACES_API_KEY not configured");
    }

    let result: any = null;

    switch (action) {
      case "bulk_seed": {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        result = await bulkSeed(supabase);
        break;
      }

      case "search": {
        if (!query) throw new Error("Query is required");
        const place = await searchPlace(query, location);
        if (place) {
          result = {
            place_id: place.place_id,
            name: place.name,
            address: place.formatted_address,
            rating: place.rating,
            total_ratings: place.user_ratings_total,
            price_level: place.price_level,
            location: place.geometry?.location,
            photo_url: place.photos?.[0] ? getPhotoUrl(place.photos[0].photo_reference) : null,
          };
        }
        break;
      }

      case "details": {
        if (!place_id) throw new Error("place_id is required");
        const details = await getPlaceDetails(place_id);
        if (details) {
          result = {
            place_id: details.place_id,
            name: details.name,
            address: details.formatted_address,
            phone: details.formatted_phone_number,
            website: details.website,
            google_maps_url: details.url,
            rating: details.rating,
            total_ratings: details.user_ratings_total,
            price_level: details.price_level,
            location: details.geometry?.location,
            types: details.types,
            photos: details.photos?.slice(0, 5).map((p: any) => ({
              url: getPhotoUrl(p.photo_reference),
            })),
          };
        }
        break;
      }

      default:
        throw new Error("Invalid action. Use: bulk_seed, search, or details");
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});