import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../AppContext';
import { Restaurant, User } from '../types';
import { RestaurantDetailsModal } from '../components/RestaurantDetailsModal';
import { Sidebar } from '../components/Navigation';
import { DEFAULT_AVATAR, DEFAULT_RESTAURANT, CUISINE_OPTIONS } from '../constants';

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Format distance for display
const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
};

type SortOption = 'distance' | 'rating' | 'price_low' | 'price_high';

export const Discover: React.FC = () => {
  const navigate = useNavigate();
  const { supabase } = useAppContext();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'profiles'>('restaurants');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Restaurant state
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Sort & Filter state
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [filters, setFilters] = useState({
    cuisine: '',
    priceLevel: 0,
    minRating: 0
  });
  
  // Profile search state
  const [profiles, setProfiles] = useState<User[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // Silent fail - distance won't show
      );
    }
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    setLoadingRestaurants(true);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setRestaurants(data || []);
    } catch {
      // Silent fail
    } finally {
      setLoadingRestaurants(false);
    }
  };

  // Filter and sort restaurants
  const filteredRestaurants = useMemo(() => {
    let filtered = [...restaurants];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.neighborhood?.toLowerCase().includes(query) ||
        r.cuisine_types?.some(c => c.toLowerCase().includes(query))
      );
    }
    
    // Cuisine filter
    if (filters.cuisine) {
      filtered = filtered.filter(r => 
        r.cuisine_types?.some(c => c.toLowerCase() === filters.cuisine.toLowerCase())
      );
    }
    
    // Price filter
    if (filters.priceLevel > 0) {
      filtered = filtered.filter(r => r.price_level === filters.priceLevel);
    }
    
    // Rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter(r => (r.rating || 0) >= filters.minRating);
    }

    // Calculate and add distance to each restaurant
    if (userLocation) {
      filtered = filtered.map(r => {
        if (r.latitude && r.longitude) {
          const distKm = calculateDistance(userLocation.lat, userLocation.lng, r.latitude, r.longitude);
          return { ...r, distance: formatDistance(distKm), _distanceKm: distKm };
        }
        return { ...r, _distanceKm: Infinity };
      });
    } else {
      filtered = filtered.map(r => ({ ...r, _distanceKm: Infinity }));
    }
    
    // Sort
    switch (sortBy) {
      case 'distance':
        filtered.sort((a, b) => (a as any)._distanceKm - (b as any)._distanceKm);
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'price_low':
        filtered.sort((a, b) => (a.price_level || 5) - (b.price_level || 5));
        break;
      case 'price_high':
        filtered.sort((a, b) => (b.price_level || 0) - (a.price_level || 0));
        break;
    }
    
    return filtered;
  }, [restaurants, searchQuery, filters, sortBy, userLocation]);

  // Profile search with debounce
  useEffect(() => {
    if (activeTab !== 'profiles') return;
    
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchProfiles(searchQuery);
      } else if (searchQuery.length === 0) {
        setProfiles([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const searchProfiles = async (query: string) => {
    setLoadingProfiles(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      setProfiles(data || []);
    } catch {
      // Silent fail
    } finally {
      setLoadingProfiles(false);
    }
  };

  const clearFilters = () => {
    setFilters({ cuisine: '', priceLevel: 0, minRating: 0 });
    setSearchQuery('');
  };

  const hasActiveFilters = filters.cuisine || filters.priceLevel > 0 || filters.minRating > 0;

  // Toast auto-hide
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  return (
    <div className="min-h-screen bg-cream flex flex-col pb-20">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[2000] animate-bounce-in">
          <div className="bg-dark/90 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-base filled text-primary">bookmark</span>
            {toastMessage}
          </div>
        </div>
      )}

      {/* Restaurant Details Modal */}
      <RestaurantDetailsModal 
        restaurant={selectedRestaurant} 
        onClose={() => setSelectedRestaurant(null)}
        onShowToast={setToastMessage}
      />

      {/* Header */}
      <header className="sticky top-0 z-[1001] bg-cream/95 backdrop-blur-sm border-b border-black/5">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="size-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          
          {/* Tab Toggle */}
          <div className="flex bg-gray-100 rounded-full p-1">
            <button
              onClick={() => { setActiveTab('restaurants'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                activeTab === 'restaurants' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-gray-600'
              }`}
            >
              Restaurantes
            </button>
            <button
              onClick={() => { setActiveTab('profiles'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                activeTab === 'profiles' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-gray-600'
              }`}
            >
              Perfis
            </button>
          </div>
          
          {/* Filter Button (only for restaurants) */}
          {activeTab === 'restaurants' ? (
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`size-10 flex items-center justify-center rounded-full shadow-sm border transition-all ${
                hasActiveFilters || showFilters
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-white border-gray-100'
              }`}
            >
              <span className="material-symbols-outlined">tune</span>
            </button>
          ) : (
            <div className="size-10" />
          )}
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'restaurants' ? 'Buscar restaurantes...' : 'Buscar perfis...'}
              className="w-full h-12 pl-12 pr-10 rounded-2xl bg-white border border-gray-100 shadow-sm focus:outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Sort & Filters (restaurants only) */}
        {activeTab === 'restaurants' && (
          <>
            {/* Sort Options */}
            <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
              {[
                { value: 'distance', label: 'Mais perto', icon: 'near_me' },
                { value: 'rating', label: 'Melhor avaliado', icon: 'star' },
                { value: 'price_low', label: 'Menor preço', icon: 'arrow_downward' },
                { value: 'price_high', label: 'Maior preço', icon: 'arrow_upward' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value as SortOption)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    sortBy === option.value
                      ? 'bg-dark text-white'
                      : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                {/* Cuisine Filter */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Culinária</label>
                  <select
                    value={filters.cuisine}
                    onChange={(e) => setFilters({ ...filters, cuisine: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Todas</option>
                    {CUISINE_OPTIONS.map(c => (
                      <option key={c.label} value={c.label}>{c.label}</option>
                    ))}
                  </select>
                </div>
                
                {/* Price & Rating Row */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Preço</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(level => (
                        <button
                          key={level}
                          onClick={() => setFilters({ ...filters, priceLevel: filters.priceLevel === level ? 0 : level })}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                            filters.priceLevel === level
                              ? 'bg-primary text-white'
                              : 'bg-white border border-gray-200 text-gray-600'
                          }`}
                        >
                          {'$'.repeat(level)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nota mínima</label>
                    <div className="flex gap-1">
                      {[3, 4, 4.5].map(rating => (
                        <button
                          key={rating}
                          onClick={() => setFilters({ ...filters, minRating: filters.minRating === rating ? 0 : rating })}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-0.5 ${
                            filters.minRating === rating
                              ? 'bg-primary text-white'
                              : 'bg-white border border-gray-200 text-gray-600'
                          }`}
                        >
                          {rating}+
                          <span className="material-symbols-outlined text-xs filled">star</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="w-full py-2 text-sm font-bold text-primary hover:bg-primary/5 rounded-xl transition-colors"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </header>

      {/* Main Content */}
      {activeTab === 'restaurants' ? (
        <div className="flex-1 px-4 py-4">
          {/* Results count */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">
              <span className="font-bold text-dark">{filteredRestaurants.length}</span> restaurantes encontrados
            </p>
            {!userLocation && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">location_off</span>
                GPS desativado
              </p>
            )}
          </div>

          {loadingRestaurants ? (
            <div className="flex justify-center py-16">
              <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <span className="material-symbols-outlined text-5xl mb-3 opacity-30">restaurant</span>
              <p className="font-medium">Nenhum restaurante encontrado</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-2 text-primary font-bold text-sm">
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRestaurants.map(restaurant => (
                <button
                  key={restaurant.id}
                  onClick={() => setSelectedRestaurant(restaurant)}
                  className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:border-primary/30 transition-all active:scale-[0.98] flex"
                >
                  {/* Photo */}
                  <div className="w-28 h-28 flex-shrink-0">
                    <img
                      src={restaurant.photo_url || DEFAULT_RESTAURANT}
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_RESTAURANT; }}
                    />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 p-3 text-left flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="font-bold text-dark truncate pr-2">{restaurant.name}</h3>
                      
                      {/* Tags row */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {restaurant.rating && (
                          <span className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded-full">
                            <span className="material-symbols-outlined text-yellow-500 text-xs filled">star</span>
                            <span className="text-xs font-bold text-yellow-700">{restaurant.rating.toFixed(1)}</span>
                          </span>
                        )}
                        {restaurant.price_level && (
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                            {'$'.repeat(restaurant.price_level)}
                          </span>
                        )}
                        {restaurant.cuisine_types?.[0] && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">
                            {restaurant.cuisine_types[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Location row */}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">location_on</span>
                        {restaurant.neighborhood || 'Recife'}
                      </p>
                      {restaurant.distance && (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {restaurant.distance}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex items-center pr-3">
                    <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Profiles Tab */
        <div className="flex-1 px-4 py-4">
          {loadingProfiles ? (
            <div className="flex justify-center py-10">
              <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <span className="material-symbols-outlined text-5xl mb-3 opacity-30">person_search</span>
              <p className="font-medium">
                {searchQuery.length < 2 
                  ? 'Digite pelo menos 2 caracteres para buscar' 
                  : 'Nenhum perfil encontrado'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {profiles.map(user => (
                <button
                  key={user.id}
                  onClick={() => navigate(`/profile/${user.username}`)}
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-primary/30 transition-all active:scale-[0.98]"
                >
                  <img
                    src={user.profile_photo_url || DEFAULT_AVATAR}
                    alt={user.full_name}
                    className="size-12 rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                  />
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1">
                      <h3 className="font-bold text-dark truncate">{user.full_name}</h3>
                      {user.is_verified && (
                        <img src="/selo-verificado.png" alt="Verificado" className="size-4" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">@{user.username}</p>
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