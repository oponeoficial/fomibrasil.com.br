import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppContext } from '../AppContext';
import { Restaurant, User } from '../types';
import { RestaurantDetailsModal } from '../components/RestaurantDetailsModal';
import { Sidebar } from '../components/Navigation';
import { DEFAULT_AVATAR, DEFAULT_RESTAURANT, CUISINE_OPTIONS } from '../constants';

// Fix for default markers not showing
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom restaurant marker icon
const createRestaurantIcon = () => new L.DivIcon({
  className: 'custom-restaurant-marker',
  html: `
    <div style="
      background: #D64541;
      width: 40px;
      height: 40px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      border: 3px solid white;
    ">
      <span style="
        transform: rotate(45deg);
        font-size: 18px;
      ">🍽️</span>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// User location marker
const createUserLocationIcon = () => new L.DivIcon({
  className: 'custom-user-marker',
  html: `
    <div style="position: relative;">
      <div style="
        background: #4285F4;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 10px rgba(66,133,244,0.5);
      "></div>
      <div style="
        position: absolute;
        top: -6px;
        left: -6px;
        width: 30px;
        height: 30px;
        background: rgba(66,133,244,0.25);
        border-radius: 50%;
        animation: userPulse 2s infinite;
      "></div>
    </div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Component to handle map events
const MapController: React.FC<{
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
}> = ({ onBoundsChange }) => {
  const map = useMap();

  useMapEvents({
    moveend() {
      if (onBoundsChange) {
        onBoundsChange(map.getBounds());
      }
    },
  });

  return null;
};

export const Discover: React.FC = () => {
  const navigate = useNavigate();
  const { supabase, currentUser } = useAppContext();
  const mapRef = useRef<L.Map | null>(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'profiles'>('restaurants');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Restaurant state
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Map state - Recife center
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
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

  // Fetch restaurants on mount
  useEffect(() => {
    fetchRestaurants();
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {} // Silently fail
      );
    }
  };

  // Filter restaurants when search or filters change
  useEffect(() => {
    let filtered = [...restaurants];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.neighborhood?.toLowerCase().includes(query) ||
        r.cuisine_types?.some(c => c.toLowerCase().includes(query))
      );
    }
    
    if (filters.cuisine) {
      filtered = filtered.filter(r => 
        r.cuisine_types?.some(c => c.toLowerCase() === filters.cuisine.toLowerCase())
      );
    }
    
    if (filters.priceLevel > 0) {
      filtered = filtered.filter(r => r.price_level === filters.priceLevel);
    }
    
    if (filters.minRating > 0) {
      filtered = filtered.filter(r => (r.rating || 0) >= filters.minRating);
    }
    
    setFilteredRestaurants(filtered);
  }, [restaurants, searchQuery, filters]);

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
      setRestaurants(data || []);
      setFilteredRestaurants(data || []);
    } catch (err) {
      // Silent fail
    } finally {
      setLoadingRestaurants(false);
    }
  };

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
    } catch (err) {
      // Silent fail
    } finally {
      setLoadingProfiles(false);
    }
  };

  const flyToUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo(userLocation, 15, { duration: 1 });
    } else {
      getUserLocation();
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

        {/* Filters Panel */}
        {showFilters && activeTab === 'restaurants' && (
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
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                ref={mapRef}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <MapController />

                {/* User Location Marker */}
                {userLocation && (
                  <Marker position={userLocation} icon={createUserLocationIcon()}>
                    <Popup>
                      <div className="text-center py-1 px-2">
                        <span className="font-bold text-sm">Você está aqui</span>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Restaurant Markers */}
                {filteredRestaurants.map(restaurant => (
                  restaurant.latitude && restaurant.longitude && (
                    <Marker
                      key={restaurant.id}
                      position={[restaurant.latitude, restaurant.longitude]}
                      icon={createRestaurantIcon()}
                      eventHandlers={{
                        click: () => setSelectedRestaurant(restaurant)
                      }}
                    >
                      <Popup>
                        <div 
                          className="w-52 cursor-pointer -m-1"
                          onClick={() => setSelectedRestaurant(restaurant)}
                        >
                          <img 
                            src={restaurant.photo_url || DEFAULT_RESTAURANT}
                            alt={restaurant.name}
                            className="w-full h-28 object-cover rounded-xl mb-2"
                            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_RESTAURANT; }}
                          />
                          <h3 className="font-bold text-dark mb-1 truncate">{restaurant.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            {restaurant.rating && (
                              <span className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded-full">
                                <span className="material-symbols-outlined text-yellow-500 text-xs filled">star</span>
                                <span className="font-bold text-yellow-700">{restaurant.rating.toFixed(1)}</span>
                              </span>
                            )}
                            {restaurant.price_level && (
                              <span className="text-green-600 font-bold">{'$'.repeat(restaurant.price_level)}</span>
                            )}
                            {restaurant.cuisine_types?.[0] && (
                              <span className="truncate bg-gray-100 px-1.5 py-0.5 rounded-full">{restaurant.cuisine_types[0]}</span>
                            )}
                          </div>
                          {restaurant.neighborhood && (
                            <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">location_on</span>
                              {restaurant.neighborhood}
                            </p>
                          )}
                          <button className="w-full mt-2 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors">
                            Ver detalhes
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  )
                ))}
              </MapContainer>

              {/* My Location Button */}
              <button
                onClick={flyToUserLocation}
                className="absolute bottom-20 right-4 z-[1000] bg-white rounded-full p-3 shadow-lg border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
                title="Minha localização"
              >
                <span className="material-symbols-outlined text-primary">my_location</span>
              </button>

              {/* Restaurant Count Badge */}
              <div className="absolute bottom-4 left-4 z-[1000] bg-white px-4 py-2 rounded-full shadow-lg border border-gray-100">
                <span className="font-bold text-dark">{filteredRestaurants.length} restaurantes</span>
              </div>

              {/* Zoom Controls */}
              <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1">
                <button
                  onClick={() => mapRef.current?.zoomIn()}
                  className="bg-white rounded-lg p-2 shadow-lg border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
                <button
                  onClick={() => mapRef.current?.zoomOut()}
                  className="bg-white rounded-lg p-2 shadow-lg border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
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

      {/* CSS for animations and Leaflet customization */}
      <style>{`
        @keyframes userPulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 16px !important;
          padding: 0 !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
        }
        .leaflet-popup-content {
          margin: 12px !important;
        }
        .leaflet-popup-tip {
          background: white !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
        }
        .leaflet-container {
          font-family: inherit !important;
        }
        .custom-restaurant-marker {
          background: transparent !important;
          border: none !important;
        }
        .custom-user-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};