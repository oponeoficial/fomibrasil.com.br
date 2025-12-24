// src/components/RestaurantMap.tsx
import React, { useMemo, useCallback, memo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom marker icon
const restaurantIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 32px;
    height: 32px;
    background: #E63946;
    border: 3px solid white;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <span style="transform: rotate(45deg); font-size: 14px;">🍴</span>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const selectedIcon = L.divIcon({
  className: 'custom-marker-selected',
  html: `<div style="
    width: 40px;
    height: 40px;
    background: #1D3557;
    border: 3px solid #E63946;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pulse 1s infinite;
  ">
    <span style="transform: rotate(45deg); font-size: 18px;">📍</span>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const userIcon = L.divIcon({
  className: 'user-marker',
  html: `<div style="
    width: 20px;
    height: 20px;
    background: #3B82F6;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.2), 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Cluster icon customization
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  let size = 'small';
  if (count > 10) size = 'medium';
  if (count > 25) size = 'large';
  
  const sizes = { small: 36, medium: 44, large: 52 };
  const dim = sizes[size as keyof typeof sizes];
  
  return L.divIcon({
    html: `<div style="
      width: ${dim}px;
      height: ${dim}px;
      background: linear-gradient(135deg, #E63946 0%, #c1121f 100%);
      border: 3px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: ${size === 'large' ? '16px' : '14px'};
      box-shadow: 0 4px 12px rgba(230, 57, 70, 0.4);
    ">${count}</div>`,
    className: 'marker-cluster-custom',
    iconSize: L.point(dim, dim),
  });
};

// Map controller component
const MapController: React.FC<{ 
  center: [number, number]; 
  userLocation: { lat: number; lng: number } | null;
}> = memo(({ center, userLocation }) => {
  const map = useMap();
  
  React.useEffect(() => {
    if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 14, { animate: true });
    } else {
      map.setView(center, 13, { animate: true });
    }
  }, [userLocation?.lat, userLocation?.lng]);
  
  return null;
});

interface Restaurant {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  price_level?: number;
  cuisine_types?: string[];
  distance_formatted?: string;
}

interface RestaurantMapProps {
  restaurants: Restaurant[];
  userLocation: { lat: number; lng: number } | null;
  hoveredId: string | null;
  onRestaurantClick: (restaurant: Restaurant) => void;
  height?: string;
}

export const RestaurantMap: React.FC<RestaurantMapProps> = memo(({
  restaurants,
  userLocation,
  hoveredId,
  onRestaurantClick,
  height = '100%'
}) => {
  const mapCenter: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lng] 
    : [-8.0476, -34.8770];

  // Filter restaurants with valid coordinates
  const validRestaurants = useMemo(() => 
    restaurants.filter(r => r.latitude && r.longitude),
    [restaurants]
  );

  // Memoize markers to prevent re-renders
  const markers = useMemo(() => 
    validRestaurants.map(restaurant => (
      <Marker
        key={restaurant.id}
        position={[restaurant.latitude!, restaurant.longitude!]}
        icon={hoveredId === restaurant.id ? selectedIcon : restaurantIcon}
        eventHandlers={{
          click: () => onRestaurantClick(restaurant),
        }}
      >
        <Popup className="custom-popup">
          <div className="min-w-[160px] p-1">
            <h3 className="font-bold text-sm text-gray-900 mb-1">{restaurant.name}</h3>
            <div className="flex items-center gap-2 text-xs">
              {restaurant.rating && (
                <span className="flex items-center gap-0.5 text-yellow-600">
                  ⭐ {Number(restaurant.rating).toFixed(1)}
                </span>
              )}
              {restaurant.price_level && (
                <span className="text-green-600 font-medium">
                  {'$'.repeat(restaurant.price_level)}
                </span>
              )}
            </div>
            {restaurant.distance_formatted && (
              <p className="text-xs text-gray-500 mt-1">{restaurant.distance_formatted}</p>
            )}
            <button 
              onClick={() => onRestaurantClick(restaurant)}
              className="mt-2 w-full text-xs font-bold text-white bg-primary py-1.5 rounded-lg hover:bg-primary/90"
            >
              Ver detalhes
            </button>
          </div>
        </Popup>
      </Marker>
    )),
    [validRestaurants, hoveredId, onRestaurantClick]
  );

  return (
    <MapContainer 
      center={mapCenter} 
      zoom={14} 
      style={{ height, width: '100%' }} 
      zoomControl={false}
      attributionControl={false}
    >
      {/* CartoDB Voyager - Visual mais limpo e moderno */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      
      <MapController center={mapCenter} userLocation={userLocation} />
      
      {/* User location marker with accuracy circle */}
      {userLocation && (
        <>
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={100}
            pathOptions={{
              color: '#3B82F6',
              fillColor: '#3B82F6',
              fillOpacity: 0.1,
              weight: 1,
            }}
          />
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>
              <div className="text-center p-1">
                <span className="font-bold text-sm">📍 Você está aqui</span>
              </div>
            </Popup>
          </Marker>
        </>
      )}
      
      {/* Clustered restaurant markers */}
      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={createClusterCustomIcon}
        maxClusterRadius={60}
        spiderfyOnMaxZoom
        showCoverageOnHover={false}
        animate
      >
        {markers}
      </MarkerClusterGroup>
    </MapContainer>
  );
});

// CSS to inject (add to index.css or create separate file)
export const mapStyles = `
.custom-marker, .custom-marker-selected, .user-marker {
  background: transparent !important;
  border: none !important;
}

.marker-cluster-custom {
  background: transparent !important;
}

.custom-popup .leaflet-popup-content-wrapper {
  border-radius: 12px;
  padding: 0;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.custom-popup .leaflet-popup-content {
  margin: 8px;
}

.custom-popup .leaflet-popup-tip {
  background: white;
}

@keyframes pulse {
  0%, 100% { transform: rotate(-45deg) scale(1); }
  50% { transform: rotate(-45deg) scale(1.1); }
}

.leaflet-container {
  font-family: inherit;
}
`;