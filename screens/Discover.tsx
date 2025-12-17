import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppContext } from '../AppContext';
import { Restaurant, User } from '../types';
import { RestaurantDetailsModal } from '../components/RestaurantDetailsModal';
import { Sidebar } from '../components/Navigation';
import { DEFAULT_AVATAR, CUISINE_OPTIONS } from '../constants';

// Restaurant marker - simple PNG icon (GPU accelerated, much lighter than DivIcon)
const restaurantIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg/map-marker.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  className: 'restaurant-marker'
});

// User location marker
const userIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg/circle-slice-8.svg',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  className: 'user-marker'
});

// Calculate distance (Haversine)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// Map controller component
const MapController: React.FC<{
  userLocation: [number, number] | null;
  onMoveEnd?: (bounds: L.LatLngBounds) => void;
}> = ({ userLocation, onMoveEnd }) => {
  const map = useMap();

  useEffect(() => {
    if (userLocation) {
      map.setView(userLocation, 14);
    }
  }, []);

  useEffect(() => {
    const handleMoveEnd = () => {
      if (onMoveEnd) {
        onMoveEnd(map.getBounds());
      }
    };
    map.on('moveend', handleMoveEnd);
    return () => { map.off('moveend', handleMoveEnd); };
  }, [map, onMoveEnd]);

  return null;
};

export const Discover: React.FC = () => {
  const navigate = useNavigate();
  const { supabase } = useAppContext();
  const mapRef = React.useRef<L.Map | null>(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'profiles'>('restaurants');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Restaurant state
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Map state - Recife center
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const mapCenter: [number, number] = [-8.0476, -34.8770];
  
  // Filters
  const [filters, setFilters] = useState({
    cuisine: '',
    priceLevel: 0,
    minRating: 0
  });
  
  // Profile search state
  const [profiles, setProfiles] = useState<User[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Get user location and fetch restaurants
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => {}
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
        .eq('is_active', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;
      setAllRestaurants(data || []);
    } catch {
      // Silent fail
    } finally {
      setLoadingRestaurants(false);
    }
  };

  // Filter restaurants and limit to 50 closest
  const visibleRestaurants = useMemo(() => {
    let filtered = [...allRestaurants];
    
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

    // If user location available, sort by distance and limit to 50
    if (userLocation) {
      filtered = filtered
        .map(r => ({
          ...r,
          _dist: calculateDistance(userLocation[0], userLocation[1], r.latitude!, r.longitude!)
        }))
        .sort((a, b) => (a as any)._dist - (b as any)._dist)
        .slice(0, 50);
    } else {
      // Otherwise just limit to 50
      filtered = filtered.slice(0, 50);
    }
    
    return filtered;
  }, [allRestaurants, searchQuery, filters, userLocation]);

  // Handle map move
  const handleMapMoveEnd = useCallback((bounds: L.LatLngBounds) => {
    setMapBounds(bounds);
  }, []);

  // Fly to user location
  const flyToUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo(userLocation, 15, { duration: 0.5 });
    }
  };

  // Profile search
  useEffect(() => {
    if (activeTab !== 'profiles') return;
    
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchProfiles(searchQuery);
      } else {
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
          
          {/* Filter Button */}
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
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && activeTab === 'restaurants' && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
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

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="w-full py-2 text-sm font-bold text-primary hover:bg-primary/5 rounded-xl"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      {activeTab === 'restaurants' ? (
        <div className="flex-1 relative">
          {loadingRestaurants ? (
            <div className="flex-1 flex items-center justify-center h-[60vh]">
              <div className="text-center">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Carregando mapa...</p>
              </div>
            </div>
          ) : (
            <div className="h-[calc(100vh-200px)] relative">
              <MapContainer
                center={userLocation || mapCenter}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                ref={mapRef}
                zoomControl={false}
              >
                {/* CartoDB tiles - faster than OSM */}
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                
                <MapController 
                  userLocation={userLocation}
                  onMoveEnd={handleMapMoveEnd}
                />

                {/* User location */}
                {userLocation && (
                  <>
                    <Circle
                      center={userLocation}
                      radius={100}
                      pathOptions={{ 
                        color: '#4285F4', 
                        fillColor: '#4285F4', 
                        fillOpacity: 0.15,
                        weight: 2
                      }}
                    />
                    <Marker position={userLocation} icon={userIcon} />
                  </>
                )}

                {/* Restaurant markers - click opens modal directly, no popup */}
                {visibleRestaurants.map(restaurant => (
                  restaurant.latitude && restaurant.longitude && (
                    <Marker
                      key={restaurant.id}
                      position={[restaurant.latitude, restaurant.longitude]}
                      icon={restaurantIcon}
                      eventHandlers={{
                        click: () => setSelectedRestaurant(restaurant)
                      }}
                    />
                  )
                ))}
              </MapContainer>

              {/* My Location Button */}
              {userLocation && (
                <button
                  onClick={flyToUser}
                  className="absolute bottom-20 right-4 z-[1000] bg-white rounded-full p-3 shadow-lg border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-primary">my_location</span>
                </button>
              )}

              {/* Restaurant Count */}
              <div className="absolute bottom-4 left-4 z-[1000] bg-white px-4 py-2 rounded-full shadow-lg border border-gray-100">
                <span className="font-bold text-dark">{visibleRestaurants.length}</span>
                <span className="text-gray-500 ml-1">restaurantes</span>
              </div>

              {/* Zoom Controls */}
              <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1">
                <button
                  onClick={() => mapRef.current?.zoomIn()}
                  className="bg-white rounded-lg p-2 shadow-lg border border-gray-200 hover:bg-gray-50 active:scale-95"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
                <button
                  onClick={() => mapRef.current?.zoomOut()}
                  className="bg-white rounded-lg p-2 shadow-lg border border-gray-200 hover:bg-gray-50 active:scale-95"
                >
                  <span className="material-symbols-outlined">remove</span>
                </button>
              </div>
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

      {/* Custom marker styles */}
      <style>{`
        .restaurant-marker {
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)) 
                  hue-rotate(340deg) saturate(1.5) brightness(0.9);
        }
        .user-marker {
          filter: drop-shadow(0 2px 4px rgba(66,133,244,0.5))
                  hue-rotate(200deg) saturate(2);
        }
        .leaflet-container {
          font-family: inherit !important;
          background: #f5f5dc !important;
        }
      `}</style>
    </div>
  );
};