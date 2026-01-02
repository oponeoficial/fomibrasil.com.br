// src/components/RestaurantMap.tsx
import React, { useMemo, memo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_RESTAURANT } from '../constants';

// Custom marker icon - mais moderno
const createRestaurantIcon = (isHovered: boolean = false) => L.divIcon({
  className: 'custom-marker',
  html: `<div class="marker-container ${isHovered ? 'marker-hovered' : ''}">
    <div class="marker-pin">
      <span class="marker-icon">🍴</span>
    </div>
    <div class="marker-shadow"></div>
  </div>`,
  iconSize: [40, 50],
  iconAnchor: [20, 50],
  popupAnchor: [0, -45],
});

const restaurantIcon = createRestaurantIcon(false);
const selectedIcon = createRestaurantIcon(true);

const userIcon = L.divIcon({
  className: 'user-marker',
  html: `<div class="user-location-marker">
    <div class="user-dot"></div>
    <div class="user-pulse"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Cluster icon customization - mais limpo
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  let size = 40;
  let fontSize = 14;

  if (count > 10) { size = 48; fontSize = 15; }
  if (count > 25) { size = 56; fontSize = 16; }
  if (count > 50) { size = 64; fontSize = 18; }

  return L.divIcon({
    html: `<div class="cluster-marker" style="width:${size}px;height:${size}px;font-size:${fontSize}px;">
      ${count}
    </div>`,
    className: 'marker-cluster-custom',
    iconSize: L.point(size, size),
  });
};

// Map controller component
const MapController: React.FC<{
  center: [number, number];
  userLocation: { lat: number; lng: number } | null;
  selectedId?: string | null;
  restaurants: Restaurant[];
}> = memo(({ center, userLocation, selectedId, restaurants }) => {
  const map = useMap();

  React.useEffect(() => {
    if (selectedId) {
      const restaurant = restaurants.find(r => r.id === selectedId);
      if (restaurant?.latitude && restaurant?.longitude) {
        map.setView([restaurant.latitude, restaurant.longitude], 16, { animate: true });
        return;
      }
    }

    if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 14, { animate: true });
    } else {
      map.setView(center, 13, { animate: true });
    }
  }, [userLocation?.lat, userLocation?.lng, selectedId]);

  return null;
});

interface Restaurant {
  id: string;
  name: string;
  photo_url?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  price_level?: number;
  cuisine_types?: string[];
  distance_formatted?: string;
  neighborhood?: string;
}

interface RestaurantMapProps {
  restaurants: Restaurant[];
  userLocation: { lat: number; lng: number } | null;
  hoveredId: string | null;
  onRestaurantClick: (restaurant: Restaurant) => void;
  height?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const RestaurantMap: React.FC<RestaurantMapProps> = memo(({
  restaurants,
  userLocation,
  hoveredId,
  onRestaurantClick,
  height = '100%',
  isFullscreen = false,
  onToggleFullscreen
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
        <Popup className="custom-popup" closeButton={false}>
          <div className="restaurant-popup" onClick={() => onRestaurantClick(restaurant)}>
            <div className="popup-image">
              <img
                src={restaurant.photo_url || DEFAULT_RESTAURANT}
                alt={restaurant.name}
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_RESTAURANT; }}
              />
              {restaurant.rating && (
                <div className="popup-rating">
                  <span>⭐</span> {Number(restaurant.rating).toFixed(1)}
                </div>
              )}
            </div>
            <div className="popup-content">
              <h3>{restaurant.name}</h3>
              <div className="popup-meta">
                {restaurant.price_level && (
                  <span className="popup-price">{'$'.repeat(restaurant.price_level)}</span>
                )}
                {restaurant.cuisine_types?.[0] && (
                  <span className="popup-cuisine">{restaurant.cuisine_types[0]}</span>
                )}
              </div>
              {(restaurant.distance_formatted || restaurant.neighborhood) && (
                <p className="popup-location">
                  📍 {restaurant.distance_formatted || restaurant.neighborhood}
                </p>
              )}
            </div>
          </div>
        </Popup>
      </Marker>
    )),
    [validRestaurants, hoveredId, onRestaurantClick]
  );

  return (
    <div className={`restaurant-map-wrapper ${isFullscreen ? 'fullscreen' : ''}`} style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        {/* Estilo de mapa mais clean - CartoDB Positron */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        <ZoomControl position="bottomright" />

        <MapController
          center={mapCenter}
          userLocation={userLocation}
          selectedId={hoveredId}
          restaurants={validRestaurants}
        />

        {/* User location marker with accuracy circle */}
        {userLocation && (
          <>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={150}
              pathOptions={{
                color: '#3B82F6',
                fillColor: '#3B82F6',
                fillOpacity: 0.08,
                weight: 2,
                dashArray: '5, 5',
              }}
            />
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup className="user-popup">
                <div className="user-popup-content">
                  <span>📍 Você está aqui</span>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Clustered restaurant markers */}
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={50}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          animate
          disableClusteringAtZoom={16}
        >
          {markers}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Map controls overlay */}
      <div className="map-controls">
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="map-control-btn"
            title={isFullscreen ? 'Minimizar' : 'Expandir mapa'}
          >
            <span className="material-symbols-outlined">
              {isFullscreen ? 'close_fullscreen' : 'open_in_full'}
            </span>
          </button>
        )}
      </div>

      {/* Restaurant count badge */}
      <div className="map-badge">
        <span className="map-badge-count">{validRestaurants.length}</span>
        <span className="map-badge-label">restaurantes</span>
      </div>
    </div>
  );
});

// CSS styles for the map
export const mapStyles = `
/* Map wrapper */
.restaurant-map-wrapper {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.restaurant-map-wrapper.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1500;
  border-radius: 0;
  height: 100vh !important;
}

/* Custom markers */
.custom-marker, .user-marker {
  background: transparent !important;
  border: none !important;
}

.marker-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.marker-pin {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #E63946 0%, #c1121f 100%);
  border: 3px solid white;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  box-shadow: 0 3px 10px rgba(230, 57, 70, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.marker-icon {
  transform: rotate(45deg);
  font-size: 16px;
}

.marker-shadow {
  width: 20px;
  height: 6px;
  background: rgba(0,0,0,0.15);
  border-radius: 50%;
  margin-top: 2px;
  filter: blur(2px);
}

.marker-hovered .marker-pin {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #1D3557 0%, #14213D 100%);
  border-color: #E63946;
  box-shadow: 0 4px 15px rgba(29, 53, 87, 0.5);
  animation: markerBounce 0.3s ease;
}

.marker-hovered .marker-icon {
  font-size: 20px;
}

@keyframes markerBounce {
  0%, 100% { transform: rotate(-45deg) translateY(0); }
  50% { transform: rotate(-45deg) translateY(-8px); }
}

/* User location marker */
.user-location-marker {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-dot {
  width: 16px;
  height: 16px;
  background: #3B82F6;
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
  z-index: 2;
}

.user-pulse {
  position: absolute;
  width: 40px;
  height: 40px;
  background: rgba(59, 130, 246, 0.2);
  border-radius: 50%;
  animation: userPulse 2s infinite;
}

@keyframes userPulse {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

/* Cluster markers */
.marker-cluster-custom {
  background: transparent !important;
}

.cluster-marker {
  background: linear-gradient(135deg, #E63946 0%, #c1121f 100%);
  border: 3px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  box-shadow: 0 4px 15px rgba(230, 57, 70, 0.4);
  transition: transform 0.2s ease;
}

.cluster-marker:hover {
  transform: scale(1.1);
}

/* Popup styles */
.custom-popup .leaflet-popup-content-wrapper {
  border-radius: 16px;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  border: none;
}

.custom-popup .leaflet-popup-content {
  margin: 0;
  width: 220px !important;
}

.custom-popup .leaflet-popup-tip {
  background: white;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.restaurant-popup {
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.restaurant-popup:hover {
  opacity: 0.95;
}

.popup-image {
  position: relative;
  height: 100px;
  overflow: hidden;
}

.popup-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.popup-rating {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  color: white;
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.popup-content {
  padding: 12px;
}

.popup-content h3 {
  font-size: 14px;
  font-weight: 700;
  color: #1D3557;
  margin: 0 0 6px 0;
  line-height: 1.3;
}

.popup-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.popup-price {
  color: #16a34a;
  font-weight: 700;
  font-size: 12px;
}

.popup-cuisine {
  background: #f1f5f9;
  color: #64748b;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.popup-location {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

/* User popup */
.user-popup .leaflet-popup-content-wrapper {
  border-radius: 12px;
  padding: 8px 12px;
}

.user-popup-content {
  font-weight: 600;
  font-size: 13px;
  color: #1D3557;
}

/* Map controls */
.map-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-control-btn {
  width: 40px;
  height: 40px;
  background: white;
  border: none;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.map-control-btn:hover {
  background: #f8fafc;
  transform: scale(1.05);
}

.map-control-btn .material-symbols-outlined {
  font-size: 20px;
  color: #1D3557;
}

/* Map badge */
.map-badge {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 1000;
  background: white;
  padding: 8px 14px;
  border-radius: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 6px;
}

.map-badge-count {
  font-weight: 700;
  font-size: 14px;
  color: #E63946;
}

.map-badge-label {
  font-size: 13px;
  color: #64748b;
}

/* Leaflet overrides */
.leaflet-container {
  font-family: inherit;
  background: #f8fafc;
}

.leaflet-control-zoom {
  border: none !important;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
  border-radius: 12px !important;
  overflow: hidden;
}

.leaflet-control-zoom a {
  width: 36px !important;
  height: 36px !important;
  line-height: 36px !important;
  font-size: 18px !important;
  color: #1D3557 !important;
  border: none !important;
}

.leaflet-control-zoom a:hover {
  background: #f1f5f9 !important;
}

.leaflet-control-zoom-in {
  border-radius: 12px 12px 0 0 !important;
}

.leaflet-control-zoom-out {
  border-radius: 0 0 12px 12px !important;
}
`;
