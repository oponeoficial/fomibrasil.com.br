import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Navigation';
import { CUISINE_OPTIONS, DEFAULT_AVATAR, DEFAULT_RESTAURANT } from '../constants';
import { Restaurant, User } from '../types';
import { RestaurantDetailsModal } from '../components/RestaurantDetailsModal';
import { useAppContext } from '../AppContext';

// --- BOUNDING BOX GRANDE RECIFE + INTERIOR PE ---
const MAP_BOUNDS = {
  minLat: -8.9,
  maxLat: -7.9,
  minLng: -36.1,
  maxLng: -34.8
};

function latLngToCoords(lat: number, lng: number): { x: number; y: number } {
  const x = 5 + ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 90;
  const y = 5 + ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 90;
  return { 
    x: Math.max(5, Math.min(95, x)), 
    y: Math.max(5, Math.min(95, y)) 
  };
}

// --- TOAST COMPONENT ---
const Toast: React.FC<{ message: string | null; onClose: () => void }> = ({ message, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] animate-slide-up">
      <div className="bg-dark/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border border-white/10">
        <span className="material-symbols-outlined text-green-400 filled">check_circle</span>
        <span className="font-bold text-sm">{message}</span>
      </div>
    </div>
  );
};

// --- FILTER INTERFACE & MODAL ---
interface FilterState {
  cuisines: string[];
  occasions: string[];
  minRating: number;
  prices: string[];
  maxDistance: number;
  dietary: string[];
  city: string;
}

const CITIES = [
  { value: '', label: 'Todas as cidades' },
  { value: 'Recife', label: 'Recife' },
  { value: 'Olinda', label: 'Olinda' },
  { value: 'Jaboatão dos Guararapes', label: 'Jaboatão' },
  { value: 'Cabo de Santo Agostinho', label: 'Cabo (Paiva/Candeias)' },
  { value: 'Gravatá', label: 'Gravatá' },
  { value: 'Caruaru', label: 'Caruaru' },
  { value: 'Tamandaré', label: 'Tamandaré (Carneiros)' },
  { value: 'Ipojuca', label: 'Ipojuca (Muro Alto)' },
];

const FilterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  currentFilters: FilterState;
}> = ({ isOpen, onClose, onApply, currentFilters }) => {
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(currentFilters.cuisines);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(currentFilters.occasions);
  const [minRating, setMinRating] = useState(currentFilters.minRating);
  const [selectedPrices, setSelectedPrices] = useState<string[]>(currentFilters.prices);
  const [maxDistance, setMaxDistance] = useState(currentFilters.maxDistance);
  const [selectedDietary, setSelectedDietary] = useState<string[]>(currentFilters.dietary);
  const [selectedCity, setSelectedCity] = useState(currentFilters.city);

  useEffect(() => {
    if (isOpen) {
      setSelectedCuisines(currentFilters.cuisines);
      setSelectedOccasions(currentFilters.occasions);
      setMinRating(currentFilters.minRating);
      setSelectedPrices(currentFilters.prices);
      setMaxDistance(currentFilters.maxDistance);
      setSelectedDietary(currentFilters.dietary);
      setSelectedCity(currentFilters.city);
    }
  }, [isOpen, currentFilters]);

  if (!isOpen) return null;

  const toggleCuisine = (c: string) => {
    setSelectedCuisines(prev => prev.includes(c) ? prev.filter(i => i !== c) : [...prev, c]);
  };

  const togglePrice = (p: string) => {
    setSelectedPrices(prev => prev.includes(p) ? prev.filter(i => i !== p) : [...prev, p]);
  };

  const handleApply = () => {
    onApply({ 
      cuisines: selectedCuisines, 
      occasions: selectedOccasions, 
      minRating,
      prices: selectedPrices,
      maxDistance,
      dietary: selectedDietary,
      city: selectedCity
    });
    onClose();
  };

  const handleClear = () => {
    const cleared: FilterState = { 
      cuisines: [], 
      occasions: [], 
      minRating: 0,
      prices: [],
      maxDistance: 50,
      dietary: [],
      city: ''
    };
    setSelectedCuisines([]);
    setSelectedOccasions([]);
    setMinRating(0);
    setSelectedPrices([]);
    setMaxDistance(50);
    setSelectedDietary([]);
    setSelectedCity('');
    onApply(cleared);
    onClose();
  };

  const ratingOptions = [
    { value: 0, label: 'Todos' },
    { value: 4.0, label: '4.0+' },
    { value: 4.5, label: '4.5+' },
    { value: 4.8, label: '4.8+' }
  ];

  // Get cuisine labels from CUISINE_OPTIONS (array of {label, icon})
  const cuisineLabels = CUISINE_OPTIONS.map(c => c.label);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark rounded-3xl w-full max-w-sm max-h-[85vh] shadow-2xl flex flex-col overflow-hidden text-cream border border-gray-800">
        
        <div className="flex justify-between items-center p-5 border-b border-white/10">
          <h3 className="text-xl font-bold">Filtros</h3>
          <button onClick={onClose} className="size-8 flex items-center justify-center rounded-full hover:bg-white/10">
             <span className="material-symbols-outlined text-white">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          
          {/* City Filter */}
          <div>
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Cidade</h4>
            <select 
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white"
            >
              {CITIES.map(c => (
                <option key={c.value} value={c.value} className="bg-dark">{c.label}</option>
              ))}
            </select>
          </div>

          {/* Cuisine */}
          <div>
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Tipo de cozinha</h4>
            <div className="flex flex-wrap gap-2">
              {cuisineLabels.slice(0, 12).map(c => (
                <button 
                  key={c}
                  onClick={() => toggleCuisine(c)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    selectedCuisines.includes(c) 
                      ? 'bg-primary text-white border-primary' 
                      : 'bg-transparent text-gray-300 border-gray-600 hover:border-gray-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Avaliação mínima</h4>
            <div className="flex gap-2">
              {ratingOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setMinRating(opt.value)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    minRating === opt.value 
                      ? 'bg-primary text-white border-primary' 
                      : 'bg-transparent text-gray-300 border-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price */}
          <div>
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Faixa de preço</h4>
            <div className="flex gap-2">
              {['$', '$$', '$$$', '$$$$'].map((p, i) => (
                <button
                  key={p}
                  onClick={() => togglePrice(String(i + 1))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    selectedPrices.includes(String(i + 1))
                      ? 'bg-primary text-white border-primary' 
                      : 'bg-transparent text-gray-300 border-gray-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

        </div>

        <div className="p-5 border-t border-white/10 flex gap-4 bg-dark">
          <button onClick={handleClear} className="flex-1 py-3 rounded-xl border border-white/20 text-white font-bold hover:bg-white/5">
            Limpar
          </button>
          <button onClick={handleApply} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20">
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};


// --- MAIN DISCOVER SCREEN ---
export const Discover: React.FC = () => {
  const navigate = useNavigate();
  const { supabase } = useAppContext();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'restaurants' | 'profiles'>('restaurants');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Restaurants from Supabase
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  
  // Profiles from Supabase
  const [profiles, setProfiles] = useState<User[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  
  // Modals & Feedback
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    cuisines: [],
    occasions: [],
    minRating: 0,
    prices: [],
    maxDistance: 50,
    dietary: [],
    city: ''
  });

  // Fetch restaurants from Supabase
  const fetchRestaurants = async () => {
    setLoadingRestaurants(true);
    try {
      let query = supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (filters.city) {
        query = query.eq('city', filters.city);
      }

      if (filters.prices.length > 0) {
        query = query.in('price_level', filters.prices.map(p => parseInt(p)));
      }

      const { data, error } = await query.limit(100);

      if (error) {
        console.error('Error fetching restaurants:', error);
        setToastMessage('Erro ao carregar restaurantes');
        return;
      }

      const transformed = (data || []).map(r => ({
        ...r,
        coords: r.latitude && r.longitude 
          ? latLngToCoords(r.latitude, r.longitude)
          : { x: 10 + Math.random() * 80, y: 10 + Math.random() * 80 }
      }));

      setRestaurants(transformed);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoadingRestaurants(false);
    }
  };

  // Fetch profiles from Supabase
  const fetchProfiles = async (query?: string) => {
    setLoadingProfiles(true);
    try {
      let dbQuery = supabase
        .from('profiles')
        .select('*')
        .eq('is_banned', false)
        .order('full_name');

      if (query && query.length >= 2) {
        dbQuery = dbQuery.or(`full_name.ilike.%${query}%,username.ilike.%${query}%`);
      }

      const { data, error } = await dbQuery.limit(50);

      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }

      // Fetch counts for each profile
      const profilesWithCounts = await Promise.all((data || []).map(async (profile) => {
        const [reviewsRes, followersRes] = await Promise.all([
          supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('is_active', true),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id)
        ]);

        return {
          ...profile,
          reviews_count: reviewsRes.count || 0,
          followers_count: followersRes.count || 0
        };
      }));

      setProfiles(profilesWithCounts);
    } catch (err) {
      console.error('Fetch profiles error:', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchRestaurants();
    fetchProfiles();
  }, []);

  // Refetch restaurants when filters change
  useEffect(() => {
    fetchRestaurants();
  }, [filters.city, filters.prices]);

  // Search profiles with debounce
  useEffect(() => {
    if (viewMode !== 'profiles') return;
    
    const timer = setTimeout(() => {
      fetchProfiles(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, viewMode]);

  // Client-side filtering for restaurants
  const displayRestaurants = useMemo(() => {
    let result = restaurants;

    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.name.toLowerCase().includes(lower) || 
        r.neighborhood?.toLowerCase().includes(lower) ||
        r.cuisine_types?.some(c => c.toLowerCase().includes(lower))
      );
    }

    if (filters.cuisines.length > 0) {
      result = result.filter(r => 
        r.cuisine_types?.some(c => filters.cuisines.includes(c))
      );
    }

    if (filters.minRating > 0) {
      result = result.filter(r => (r.rating || 0) >= filters.minRating);
    }

    return result;
  }, [restaurants, searchQuery, filters.cuisines, filters.minRating]);

  const activeFiltersCount = 
    filters.cuisines.length + 
    (filters.minRating > 0 ? 1 : 0) + 
    filters.prices.length + 
    (filters.city ? 1 : 0);

  return (
    <div className="h-screen bg-cream flex flex-col overflow-hidden relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      
      <FilterModal 
        isOpen={showFilters} 
        onClose={() => setShowFilters(false)} 
        onApply={setFilters}
        currentFilters={filters}
      />
      <RestaurantDetailsModal 
        restaurant={selectedRestaurant} 
        onClose={() => setSelectedRestaurant(null)} 
        onShowToast={setToastMessage}
      />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4 pt-4 pb-2">
        <div className="flex items-center justify-between gap-4">
          <button onClick={() => setSidebarOpen(true)} className="flex items-center justify-center size-10 rounded-full bg-white shadow-md hover:bg-gray-50 active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-[28px]">menu</span>
          </button>
          
          <div className="flex items-center p-1 bg-white rounded-full shadow-md border border-black/5 flex-1 max-w-[240px]">
             <button 
               onClick={() => setViewMode('restaurants')}
               className={`flex-1 py-2 px-4 rounded-full text-sm font-bold transition-all ${viewMode === 'restaurants' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
             >
               Restaurantes
             </button>
             <button 
               onClick={() => setViewMode('profiles')}
               className={`flex-1 py-2 px-4 rounded-full text-sm font-bold transition-all ${viewMode === 'profiles' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
             >
               Perfis
             </button>
          </div>

          {viewMode === 'restaurants' && (
            <button 
              onClick={() => setShowFilters(true)}
              className={`flex items-center justify-center size-10 rounded-full shadow-md active:scale-95 transition-all relative ${
                activeFiltersCount > 0 ? 'bg-primary text-white' : 'bg-white text-primary hover:bg-gray-50'
              }`}
            >
              <span className={`material-symbols-outlined text-[24px] ${activeFiltersCount > 0 ? 'filled' : ''}`}>tune</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 size-4 bg-white text-primary text-[10px] font-bold rounded-full flex items-center justify-center border border-gray-100">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          )}
          {viewMode === 'profiles' && <div className="size-10" />}
        </div>
        
        {/* Search Bar */}
        <div className="mt-4 bg-white rounded-full shadow-lg flex items-center p-3 gap-3">
          <span className="material-symbols-outlined text-gray-400 ml-1">search</span>
          <input 
            className="flex-1 bg-transparent border-none outline-none text-sm text-dark placeholder-gray-400 focus:ring-0 p-0" 
            placeholder={viewMode === 'restaurants' ? "Buscar restaurantes..." : "Buscar pessoas..."} 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-dark">
               <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </header>

      {/* Map Content (Restaurants Mode) */}
      {viewMode === 'restaurants' && (
        <div className="absolute inset-0 z-0 bg-[#E5E5D0] overflow-hidden">
          <div className="absolute inset-0 pointer-events-auto cursor-move">
             {/* Grid Background */}
             <svg className="absolute w-full h-full opacity-30 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                   <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#C8C8B0" strokeWidth="1"/>
                   </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                <path d="M-100,100 Q200,50 400,200 T900,100" fill="none" stroke="#FFF" strokeWidth="12" />
                <path d="M50,400 Q150,200 300,300 T600,600" fill="none" stroke="#FFF" strokeWidth="12" />
             </svg>
             
             {/* Loading State */}
             {loadingRestaurants && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-50">
                  <div className="bg-white px-6 py-4 rounded-2xl shadow-xl flex flex-col items-center">
                    <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="font-bold text-dark text-sm">Carregando...</p>
                  </div>
               </div>
             )}

             {/* Empty State */}
             {!loadingRestaurants && displayRestaurants.length === 0 && (
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-6">
                    <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">restaurant</span>
                    <p className="text-gray-500 font-medium">Nenhum restaurante encontrado</p>
                    <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros</p>
                  </div>
               </div>
             )}

             {/* Restaurant Pins */}
             {displayRestaurants.map(r => (
               <div 
                  key={r.id}
                  className="absolute transform -translate-x-1/2 -translate-y-full flex flex-col items-center cursor-pointer group z-10 hover:z-20 transition-all duration-300 pointer-events-auto"
                  style={{ top: `${r.coords?.y || 50}%`, left: `${r.coords?.x || 50}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRestaurant(r);
                  }}
               >
                 <div className="relative transition-transform duration-300 hover:scale-110 active:scale-95">
                   <div className="bg-dark text-white flex flex-col items-center shadow-xl z-10 relative">
                     <div className="bg-dark text-white size-12 flex items-center justify-center border-2 border-white shadow-lg hover:bg-primary transition-colors">
                        <span className="material-symbols-outlined text-sm">restaurant</span>
                     </div>
                     <div className="w-0.5 h-4 bg-dark"></div>
                   </div>
                 </div>
                 {/* Label on Hover */}
                 <div className="mt-1 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md border border-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center">
                    <span className="text-xs font-bold text-dark whitespace-nowrap max-w-[120px] truncate">{r.name}</span>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <span>{r.price_level ? '$'.repeat(r.price_level) : '$$'}</span>
                        {r.neighborhood && (
                          <>
                            <span>•</span>
                            <span>{r.neighborhood}</span>
                          </>
                        )}
                    </div>
                 </div>
               </div>
             ))}

          </div>
          
          {/* Stats Badge */}
          <div className="absolute bottom-24 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow-md">
             <span className="text-xs font-bold text-dark">
                {displayRestaurants.length} restaurantes
             </span>
          </div>
        </div>
      )}

      {/* Profiles View Mode */}
      {viewMode === 'profiles' && (
        <div className="absolute inset-0 z-0 bg-cream pt-36 px-4 overflow-y-auto pb-24">
           {loadingProfiles ? (
              <div className="flex flex-col items-center justify-center h-64">
                 <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                 <p className="text-gray-400 text-sm">Carregando perfis...</p>
              </div>
           ) : profiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                 <span className="material-symbols-outlined text-6xl text-gray-300 mb-2">person_search</span>
                 <p className="text-gray-400">Nenhum perfil encontrado</p>
              </div>
           ) : (
              <div className="space-y-3">
                 {profiles.map(user => (
                    <button 
                       key={user.id}
                       onClick={() => navigate(`/profile/${user.username}`)}
                       className="w-full bg-white rounded-2xl p-4 shadow-sm border border-black/5 flex items-center gap-4 hover:shadow-md transition-shadow text-left"
                    >
                       <img 
                         src={user.profile_photo_url || DEFAULT_AVATAR} 
                         className="size-14 rounded-full object-cover" 
                         alt={user.full_name}
                         onError={(e) => {
                           (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                         }}
                       />
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                             <span className="font-bold text-dark truncate">{user.full_name}</span>
                             {user.is_verified && (
  <img src="/selo-verificado.png" alt="Verificado" className="size-4" />
)}
                          </div>
                          <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {user.reviews_count || 0} reviews • {user.followers_count || 0} seguidores
                          </p>
                       </div>
                       <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                    </button>
                 ))}
              </div>
           )}
        </div>
      )}
    </div>
  );
};