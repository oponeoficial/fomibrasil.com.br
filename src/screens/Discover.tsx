// src/screens/Discover.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../AppContext';
import { User } from '../types';
import { RestaurantDetailsModal } from '../components/RestaurantDetailsModal';
import { RestaurantMap } from '../components/RestaurantMap';
import { Sidebar } from '../components/Navigation';
import { DEFAULT_AVATAR, DEFAULT_RESTAURANT, CUISINE_OPTIONS } from '../constants';
import { useRestaurantSearch } from '../hooks/useRestaurantSearch';

type SortOption = 'distance' | 'rating' | 'price_asc' | 'price_desc';

export const Discover: React.FC = () => {
  const navigate = useNavigate();
  const { supabase } = useAppContext();
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'profiles'>('restaurants');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Filters
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [filters, setFilters] = useState({ cuisine: '', priceLevel: 0, minRating: 0 });
  
  // Profile search
  const [profiles, setProfiles] = useState<User[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  
  // Restaurant search hook
  const { results: restaurants, loading: loadingRestaurants, searchRestaurants, loadMore, hasMore } = useRestaurantSearch();
  
  const listRef = useRef<HTMLDivElement>(null);

  // Get user location on mount
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  // Search restaurants when filters change
  useEffect(() => {
    if (activeTab !== 'restaurants') return;
    
    const timer = setTimeout(() => {
      searchRestaurants({
        searchTerm: searchQuery || undefined,
        cuisine: filters.cuisine || undefined,
        priceLevel: filters.priceLevel || undefined,
        minRating: filters.minRating || undefined,
        userLat: userLocation?.lat,
        userLng: userLocation?.lng,
        sortBy,
        reset: true,
      });
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, filters, sortBy, userLocation, activeTab]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    if (!listRef.current || loadingRestaurants || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 200) {
      loadMore();
    }
  }, [loadMore, loadingRestaurants, hasMore]);

  // Profile search
  useEffect(() => {
    if (activeTab !== 'profiles' || searchQuery.length < 2) {
      setProfiles([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      setLoadingProfiles(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, profile_photo_url, is_verified, email')
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .limit(20);
      setProfiles(data || []);
      setLoadingProfiles(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, supabase]);

  // Helpers
  const clearFilters = () => {
    setFilters({ cuisine: '', priceLevel: 0, minRating: 0 });
    setSearchQuery('');
  };

  const hasActiveFilters = filters.cuisine || filters.priceLevel > 0 || filters.minRating > 0;

  const openDirections = (restaurant: any) => {
    if (!restaurant.latitude || !restaurant.longitude) return;
    const dest = `${restaurant.latitude},${restaurant.longitude}`;
    const url = userLocation 
      ? `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${dest}`
      : `https://www.google.com/maps/search/?api=1&query=${dest}`;
    window.open(url, '_blank');
  };

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
          <button onClick={() => setSidebarOpen(true)} className="size-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100">
            <span className="material-symbols-outlined">menu</span>
          </button>
          
          {/* Tab Toggle */}
          <div className="flex bg-gray-100 rounded-full p-1">
            <button
              onClick={() => { setActiveTab('restaurants'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'restaurants' ? 'bg-primary text-white shadow-sm' : 'text-gray-600'}`}
            >
              Restaurantes
            </button>
            <button
              onClick={() => { setActiveTab('profiles'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'profiles' ? 'bg-primary text-white shadow-sm' : 'text-gray-600'}`}
            >
              Perfis
            </button>
          </div>
          
          {activeTab === 'restaurants' ? (
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`size-10 flex items-center justify-center rounded-full shadow-sm border transition-all ${hasActiveFilters || showFilters ? 'bg-primary text-white border-primary' : 'bg-white border-gray-100'}`}
            >
              <span className="material-symbols-outlined">tune</span>
            </button>
          ) : <div className="size-10" />}
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'restaurants' ? 'Buscar restaurantes, bairros, culinárias...' : 'Buscar perfis...'}
              className="w-full h-12 pl-12 pr-10 rounded-2xl bg-white border border-gray-100 shadow-sm focus:outline-none focus:border-primary"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Sort & Filters (restaurants only) */}
        {activeTab === 'restaurants' && (
          <>
            <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
              {[
                { value: 'distance', label: 'Mais perto', icon: 'near_me' },
                { value: 'rating', label: 'Melhor avaliado', icon: 'star' },
                { value: 'price_asc', label: 'Menor preço', icon: 'arrow_downward' },
                { value: 'price_desc', label: 'Maior preço', icon: 'arrow_upward' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value as SortOption)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${sortBy === option.value ? 'bg-dark text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
                >
                  <span className="material-symbols-outlined text-base">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>

            {showFilters && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Culinária</label>
                  <select
                    value={filters.cuisine}
                    onChange={(e) => setFilters({ ...filters, cuisine: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Todas</option>
                    {CUISINE_OPTIONS.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                  </select>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Preço</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(level => (
                        <button
                          key={level}
                          onClick={() => setFilters({ ...filters, priceLevel: filters.priceLevel === level ? 0 : level })}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${filters.priceLevel === level ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
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
                          className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-0.5 ${filters.minRating === rating ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
                        >
                          {rating}+<span className="material-symbols-outlined text-xs filled">star</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {hasActiveFilters && (
                  <button onClick={clearFilters} className="w-full py-2 text-sm font-bold text-primary hover:bg-primary/5 rounded-xl">
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
        <div className="flex-1 flex flex-col">
          {/* Map */}
          <div className="relative">
            <div className={`overflow-hidden transition-all duration-300 ${showMap ? 'h-56' : 'h-0'}`}>
              <RestaurantMap
                restaurants={restaurants}
                userLocation={userLocation}
                hoveredId={hoveredId}
                onRestaurantClick={setSelectedRestaurant}
                height="100%"
              />
              
              <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full shadow-lg text-sm z-[400]">
                <span className="font-bold text-dark">{restaurants.length}</span>
                <span className="text-gray-500 ml-1">restaurantes</span>
              </div>
            </div>
            
            <button
              onClick={() => setShowMap(!showMap)}
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full px-4 py-1.5 shadow-lg border border-gray-200 text-sm font-medium flex items-center gap-1 z-[500]"
            >
              <span className="material-symbols-outlined text-base">{showMap ? 'expand_less' : 'map'}</span>
              {showMap ? 'Ocultar mapa' : 'Ver mapa'}
            </button>
          </div>

          {/* Restaurant List */}
          <div 
            ref={listRef}
            onScroll={handleScroll}
            className={`flex-1 px-4 ${showMap ? 'pt-8' : 'pt-4'} pb-4 overflow-y-auto`}
            style={{ maxHeight: showMap ? 'calc(100vh - 400px)' : 'calc(100vh - 200px)' }}
          >
            {!userLocation && (
              <div className="mb-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">
                <span className="material-symbols-outlined text-sm">location_off</span>
                Ative o GPS para ver distâncias
              </div>
            )}

            {loadingRestaurants && restaurants.length === 0 ? (
              <div className="flex justify-center py-16">
                <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : restaurants.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <span className="material-symbols-outlined text-5xl mb-3 opacity-30">restaurant</span>
                <p className="font-medium">Nenhum restaurante encontrado</p>
                {searchQuery && <p className="text-sm mt-2">Buscando no Google Places...</p>}
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="mt-2 text-primary font-bold text-sm">Limpar filtros</button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {restaurants.map(restaurant => (
                  <div
                    key={restaurant.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                    onMouseEnter={() => setHoveredId(restaurant.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <button onClick={() => setSelectedRestaurant(restaurant)} className="w-full flex text-left active:bg-gray-50">
                      <div className="w-28 h-28 flex-shrink-0 bg-gray-100">
                        {restaurant.photo_url ? (
                          <img src={restaurant.photo_url} alt={restaurant.name} className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_RESTAURANT; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-gray-300">restaurant</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                        <div>
                          <h3 className="font-bold text-dark truncate pr-2">{restaurant.name}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {restaurant.rating && (
                              <span className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded-full">
                                <span className="material-symbols-outlined text-yellow-500 text-xs filled">star</span>
                                <span className="text-xs font-bold text-yellow-700">{Number(restaurant.rating).toFixed(1)}</span>
                              </span>
                            )}
                            {restaurant.price_level && (
                              <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                                {'$'.repeat(restaurant.price_level)}
                              </span>
                            )}
                            {restaurant.cuisine_types?.[0] && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full truncate max-w-[80px]">
                                {restaurant.cuisine_types[0]}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">location_on</span>
                            {restaurant.neighborhood || restaurant.city || 'Recife'}
                          </p>
                          {restaurant.distance_formatted && (
                            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              {restaurant.distance_formatted}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    
                    <div className="flex border-t border-gray-100">
                      <button onClick={() => setSelectedRestaurant(restaurant)} className="flex-1 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5 border-r border-gray-100">
                        <span className="material-symbols-outlined text-base">info</span>
                        Detalhes
                      </button>
                      <button onClick={() => openDirections(restaurant)} className="flex-1 py-2.5 text-sm font-bold text-primary hover:bg-primary/5 flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-base">directions</span>
                        Como chegar
                      </button>
                    </div>
                  </div>
                ))}
                
                {loadingRestaurants && restaurants.length > 0 && (
                  <div className="flex justify-center py-4">
                    <div className="size-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                
                {!hasMore && restaurants.length > 0 && (
                  <p className="text-center text-sm text-gray-400 py-4">Fim da lista</p>
                )}
              </div>
            )}
          </div>
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
              <p className="font-medium">{searchQuery.length < 2 ? 'Digite pelo menos 2 caracteres' : 'Nenhum perfil encontrado'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {profiles.map(user => (
                <button
                  key={user.id}
                  onClick={() => navigate(`/profile/${user.username}`)}
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-primary/30 active:scale-[0.98]"
                >
                  <img src={user.profile_photo_url || DEFAULT_AVATAR} alt={user.full_name} className="size-12 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }} />
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1">
                      <h3 className="font-bold text-dark truncate">{user.full_name}</h3>
                      {user.is_verified && <img src="/selo-verificado.png" alt="Verificado" className="size-4" />}
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