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

// APENAS GRANDE RECIFE
const CITIES = [
  { name: "Recife", state: "PE", lat: -8.0476, lng: -34.8770 },
  { name: "Olinda", state: "PE", lat: -7.9914, lng: -34.8416 },
  { name: "Jaboatão dos Guararapes", state: "PE", lat: -8.1128, lng: -35.0158 },
  { name: "Cabo de Santo Agostinho", state: "PE", lat: -8.2833, lng: -35.0333 },
];

const CUISINE_TYPES = [
  "restaurant",
  "brazilian_restaurant",
  "seafood_restaurant",
  "italian_restaurant",
  "japanese_restaurant",
  "steakhouse",
  "pizza_restaurant",
  "mexican_restaurant",
  "chinese_restaurant",
  "thai_restaurant",
  "indian_restaurant",
  "french_restaurant",
  "mediterranean_restaurant",
  "vegetarian_restaurant",
  "vegan_restaurant",
  "hamburger_restaurant",
  "sandwich_shop",
  "sushi_restaurant",
  "ramen_restaurant",
  "barbecue_restaurant",
  "brunch_restaurant",
  "breakfast_restaurant",
  "ice_cream_shop",
  "dessert_shop",
  "coffee_shop",
  "bar",
  "cafe",
  "bakery"
];

// Tipos do Google que devem ser BLOQUEADOS
const BLOCKED_GOOGLE_TYPES = [
  // Hospedagem
  "lodging", "hotel", "motel", "resort", "campground", "rv_park",
  // Supermercados e lojas
  "supermarket", "grocery_or_supermarket", "convenience_store",
  "shopping_mall", "department_store",
  "store", "furniture_store", "home_goods_store", "hardware_store", "electronics_store",
  "clothing_store", "shoe_store", "jewelry_store", "florist", "liquor_store",
  // Educação
  "university", "school", "secondary_school", "primary_school",
  // Saúde
  "hospital", "doctor", "pharmacy", "drugstore", "dentist", "health", "physiotherapist",
  // Beleza e fitness
  "gym", "spa", "beauty_salon", "hair_care",
  // Religião
  "church", "mosque", "synagogue", "hindu_temple", "place_of_worship", "cemetery", "funeral_home",
  // Veículos
  "gas_station", "car_dealer", "car_repair", "car_wash", "car_rental", "parking",
  // Serviços
  "real_estate_agency", "insurance_agency", "travel_agency", "bank", "atm",
  "laundry", "storage", "moving_company", "painter", "plumber", "electrician",
  "lawyer", "accounting", "locksmith", "roofing_contractor",
  // Animais
  "veterinary_care", "pet_store", "zoo", "aquarium",
  // Cultura e lazer (não restaurantes)
  "museum", "art_gallery", "library", "book_store",
  "movie_theater", "stadium", "bowling_alley", "amusement_park",
  "night_club", "casino",
  // Transporte
  "airport", "bus_station", "train_station", "subway_station", "transit_station",
  // Governo
  "city_hall", "courthouse", "embassy", "fire_station", "police", "post_office", "local_government_office"
];

// Padrões de nome que devem ser BLOQUEADOS (case insensitive)
const BLOCKED_NAME_PATTERNS = new RegExp([
  // Hospedagem
  "hotel", "pousada", "resort", "bangalô", "hostel", "motel", "flat\\b", "apart.?hotel",
  // Educação
  "faculdade", "universidade", "ufpe", "ufrpe", "unicap", "uninassau", "estácio", "unibra",
  "colégio", "escola", "centro.?de.?ensino", "instituto", "senac", "senai", "sesi", "sesc",
  // Comércio
  "shopping", "supermercado", "mercado", "mercadinho", "mercearia",
  "atacadão", "assaí", "carrefour", "extra", "bompreço", "pão.?de.?açúcar", "sam.?s.?club", "makro", "hiper",
  "embalagens", "artesanato", "distribuidora", "atacado", "depósito",
  "loja", "store", "outlet", "magazine",
  // Saúde
  "hospital", "clínica", "consultório", "laboratório", "diagnóstico", "pronto.?socorro", "upa\\b",
  "farmácia", "drogaria", "droga.?raia", "pague.?menos",
  // Fitness e beleza
  "academia", "fitness", "crossfit", "pilates",
  "salão", "barbearia", "estética", "spa\\b", "nail", "manicure",
  // Religião
  "igreja", "templo", "paróquia", "catedral", "capela", "centro.?espírita", "terreiro", "mesquita", "sinagoga",
  // Serviços
  "cartório", "banco", "lotérica", "caixa.?econômica", "bradesco", "itaú", "santander",
  "imobiliária", "construtora", "incorporadora", "concessionária",
  "posto", "gasolina", "combustível", "shell", "ipiranga", "br\\b",
  "oficina", "funilaria", "mecânica", "auto.?center", "auto.?peças",
  "lavanderia", "gráfica", "papelaria", "livraria", "copiadora",
  "escritório", "coworking",
  // Animais
  "pet.?shop", "veterinár", "clínica.?vet",
  // Eventos (NÃO restaurantes)
  "buffet", "casa.?de.?festas", "espaço.?de.?eventos", "salão.?de.?festas", "casa.?de.?recepções",
  "casa.?de.?shows", "eventos.?e.?buffet",
  // Entretenimento
  "museu", "teatro", "cinema", "boate", "night.?club", "balada", "club\\b",
  "parque", "praça", "praia",
  // Clubes e associações
  "clube.?de", "associação", "sindicato", "maçonaria", "rotary", "lions",
  // Governo
  "prefeitura", "secretaria", "fórum", "tribunal", "câmara", "assembl[eé]ia",
  // Transporte
  "aeroporto", "rodoviária", "estação", "terminal",
  // Específicos que aparecem errado
  "recife.?antigo", "marco.?zero", "olinda.?históric"
].join("|"), "i");

// Função para verificar se deve bloquear o lugar
function shouldBlockPlace(name: string, types: string[]): boolean {
  if (BLOCKED_NAME_PATTERNS.test(name)) {
    return true;
  }
  
  const hasFoodType = types.some(t => 
    t.includes('restaurant') || 
    t === 'cafe' || 
    t === 'bakery' || 
    t === 'bar' ||
    t === 'food' ||
    t === 'meal_delivery' ||
    t === 'meal_takeaway'
  );
  
  const hasBlockedType = types.some(t => BLOCKED_GOOGLE_TYPES.includes(t));
  
  if (types.includes('lodging')) {
    return true;
  }
  
  if (hasBlockedType && !hasFoodType) {
    return true;
  }
  
  if (!hasFoodType && types.length > 0) {
    return true;
  }
  
  return false;
}

// Nearby Search
async function searchNearby(lat: number, lng: number, type: string): Promise<any> {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=15000&type=${type}&language=pt-BR&key=${GOOGLE_API_KEY}`;
  const response = await fetch(url);
  return response.json();
}

// Buscar detalhes completos - ATUALIZADO com horários
async function getPlaceDetails(placeId: string): Promise<any> {
  const fields = [
    "place_id", "name", "formatted_address", "formatted_phone_number",
    "website", "url", "rating", "user_ratings_total", "price_level",
    "photos", "geometry", "types", "address_components",
    "opening_hours", "current_opening_hours" // NOVO: horários
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

// BULK SEED OTIMIZADO
async function bulkSeed(supabase: any): Promise<{ inserted: number; skipped: number; blocked: number; errors: string[] }> {
  const results = { inserted: 0, skipped: 0, blocked: 0, errors: [] as string[] };

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
          // Filtros de qualidade: nota >= 4.0 E pelo menos 9 avaliações
          if ((place.rating || 0) < 4.0) continue;
          if ((place.user_ratings_total || 0) < 9) continue;
          
          if (processedIds.has(place.place_id)) continue;
          processedIds.add(place.place_id);

          if (existingIds.has(place.place_id)) {
            results.skipped++;
            continue;
          }

          const details = await getPlaceDetails(place.place_id);
          if (!details) continue;

          if (shouldBlockPlace(details.name, details.types || [])) {
            console.log(`🚫 BLOQUEADO: ${details.name} (types: ${details.types?.slice(0, 5).join(', ')})`);
            results.blocked++;
            continue;
          }

          const { city: extractedCity, neighborhood } = extractLocation(details.address_components);
          const cuisineTypes = mapCuisineTypes(details.types || []);

          // Extrair horários
          const openingHours = details.opening_hours?.weekday_text || null;
          const isOpenNow = details.current_opening_hours?.open_now ?? details.opening_hours?.open_now ?? null;

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
            opening_hours: openingHours,
            is_open_now: isOpenNow,
            is_active: true
          });

          if (error) {
            results.errors.push(`${details.name}: ${error.message}`);
          } else {
            results.inserted++;
            existingIds.add(details.place_id);
            console.log(`✅ NOVO: ${details.name} (${extractedCity})`);
          }

          await new Promise(r => setTimeout(r, 100));
        }

        await new Promise(r => setTimeout(r, 300));
        
      } catch (err) {
        results.errors.push(`${city.name}/${type}: ${(err as Error).message}`);
      }
    }
  }

  console.log(`📊 Resultado: ${results.inserted} inseridos, ${results.skipped} já existiam, ${results.blocked} bloqueados`);
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
    const { action, query, location, place_id, restaurant_id, photo_url, google_place_id: newPlaceId, city_index } = await req.json();

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

      // Seed uma cidade específica (para evitar timeout)
      case "seed_city": {
        const cityIdx = city_index ?? 0;

        if (cityIdx < 0 || cityIdx >= CITIES.length) {
          throw new Error(`city_index deve ser entre 0 e ${CITIES.length - 1}`);
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const city = CITIES[cityIdx];

        const results = { inserted: 0, skipped: 0, blocked: 0, errors: [] as string[], city: city.name };

        const { data: existingPlaces } = await supabase
          .from("restaurants")
          .select("google_place_id");

        const existingIds = new Set(
          (existingPlaces || []).map((p: any) => p.google_place_id).filter(Boolean)
        );

        const processedIds = new Set<string>();

        console.log(`🔍 Buscando restaurantes em ${city.name}...`);

        for (const type of CUISINE_TYPES) {
          try {
            const nearbyData = await searchNearby(city.lat, city.lng, type);
            if (nearbyData.status !== "OK") continue;

            for (const place of nearbyData.results || []) {
              if ((place.rating || 0) < 4.0) continue;
              if ((place.user_ratings_total || 0) < 9) continue;

              if (processedIds.has(place.place_id)) continue;
              processedIds.add(place.place_id);

              if (existingIds.has(place.place_id)) {
                results.skipped++;
                continue;
              }

              const details = await getPlaceDetails(place.place_id);
              if (!details) continue;

              if (shouldBlockPlace(details.name, details.types || [])) {
                console.log(`🚫 BLOQUEADO: ${details.name}`);
                results.blocked++;
                continue;
              }

              const { city: extractedCity, neighborhood } = extractLocation(details.address_components);
              const cuisineTypes = mapCuisineTypes(details.types || []);
              const openingHours = details.opening_hours?.weekday_text || null;
              const isOpenNow = details.current_opening_hours?.open_now ?? details.opening_hours?.open_now ?? null;

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
                photo_url: details.photos?.[0] ? getPhotoUrl(details.photos[0].photo_reference) : null,
                cuisine_types: cuisineTypes.length > 0 ? cuisineTypes : ["Restaurante"],
                price_level: details.price_level || null,
                opening_hours: openingHours,
                is_open_now: isOpenNow,
                is_active: true
              });

              if (error) {
                results.errors.push(`${details.name}: ${error.message}`);
              } else {
                results.inserted++;
                existingIds.add(details.place_id);
                console.log(`✅ NOVO: ${details.name}`);
              }

              await new Promise(r => setTimeout(r, 50));
            }
            await new Promise(r => setTimeout(r, 100));
          } catch (err) {
            results.errors.push(`${type}: ${(err as Error).message}`);
          }
        }

        console.log(`📊 ${city.name}: ${results.inserted} inseridos, ${results.skipped} já existiam, ${results.blocked} bloqueados`);
        result = results;
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
          // Extrair horários formatados
          const openingHours = details.opening_hours?.weekday_text || null;
          const isOpenNow = details.current_opening_hours?.open_now ?? details.opening_hours?.open_now ?? null;

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
            opening_hours: openingHours,
            is_open_now: isOpenNow,
            photos: details.photos?.slice(0, 5).map((p: any) => ({
              url: getPhotoUrl(p.photo_reference),
            })),
          };
        }
        break;
      }

      // Atualizar foto de um restaurante (usa service role para bypass RLS)
      case "update_photo": {
        if (!restaurant_id) throw new Error("restaurant_id is required");
        if (!photo_url) throw new Error("photo_url is required");

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        const updateData: Record<string, any> = {
          photo_url,
          updated_at: new Date().toISOString()
        };
        if (newPlaceId) {
          updateData.google_place_id = newPlaceId;
        }

        const { error } = await supabase
          .from("restaurants")
          .update(updateData)
          .eq("id", restaurant_id);

        if (error) throw error;

        result = { updated: true, restaurant_id };
        break;
      }

      default:
        throw new Error("Invalid action. Use: bulk_seed, search, details, or update_photo");
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