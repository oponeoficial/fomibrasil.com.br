// src/components/RestaurantDetailsModal.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Restaurant } from '../types';
import { useAppContext } from '../AppContext';
import { DEFAULT_RESTAURANT } from '../constants';

export const RestaurantDetailsModal: React.FC<{
  restaurant: Restaurant | null;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}> = ({ restaurant, onClose, onShowToast }) => {
  const navigate = useNavigate();
  const { lists, toggleSaveRestaurant } = useAppContext();
  const [showHours, setShowHours] = useState(false);
  
  const isSaved = restaurant && lists.find(l => l.is_default)?.items?.includes(restaurant.id);

  if (!restaurant) return null;

  const handleSave = () => {
    toggleSaveRestaurant(restaurant.id).then(newState => {
      onShowToast?.(newState ? 'Salvo em Quero ir!' : 'Removido de Quero ir');
    });
  };

  const handleCall = () => window.location.href = `tel:${restaurant.phone}`;
  
  const handleWebsite = () => restaurant.website && window.open(restaurant.website, '_blank');
  
  const handleMaps = () => {
    if (restaurant.google_maps_url) {
      window.open(restaurant.google_maps_url, '_blank');
    } else if (restaurant.latitude && restaurant.longitude) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`, '_blank');
    } else {
      const query = encodeURIComponent(`${restaurant.name} ${restaurant.address}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  const handleNewReview = () => {
    onClose();
    navigate('/new-review', { state: { restaurant } });
  };

  const priceString = restaurant.price_level ? '$'.repeat(restaurant.price_level) : null;
  const rating = restaurant.rating ? Number(restaurant.rating).toFixed(1) : null;
  
  // Parse opening_hours (pode ser array ou objeto com weekday_text)
  const openingHours: string[] = restaurant.opening_hours 
    ? (Array.isArray(restaurant.opening_hours) 
        ? restaurant.opening_hours 
        : (restaurant.opening_hours as any)?.weekday_text || [])
    : [];

  // Determinar dia atual para destacar
  const today = new Date().getDay(); // 0 = domingo
  const daysMap = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const todayName = daysMap[today].toLowerCase();

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div className="relative bg-cream w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[90vh] shadow-2xl animate-slide-up flex flex-col overflow-hidden">
        
        {/* Header Image */}
        <div className="relative h-52 shrink-0">
          <img 
            src={restaurant.photo_url || DEFAULT_RESTAURANT} 
            alt={restaurant.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_RESTAURANT; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
          
          {/* Close button */}
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 size-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
          >
            <span className="material-symbols-outlined text-dark">close</span>
          </button>
          
          {/* Save button - MAIS VISÍVEL */}
          <button 
            onClick={handleSave}
            className={`absolute top-4 left-4 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all ${
              isSaved 
                ? 'bg-primary text-white' 
                : 'bg-white/90 backdrop-blur text-dark hover:bg-white'
            }`}
          >
            <span className={`material-symbols-outlined text-xl ${isSaved ? 'filled' : ''}`}>bookmark</span>
            <span className="font-bold text-sm">{isSaved ? 'Salvo' : 'Quero ir'}</span>
          </button>
          
          {/* Bottom info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h2 className="text-2xl font-bold text-white drop-shadow-lg leading-tight">
              {restaurant.name}
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Status Aberto/Fechado */}
              {restaurant.is_open_now !== undefined && restaurant.is_open_now !== null && (
                <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-bold ${
                  restaurant.is_open_now 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}>
                  <span className="material-symbols-outlined text-sm">
                    {restaurant.is_open_now ? 'check_circle' : 'cancel'}
                  </span>
                  {restaurant.is_open_now ? 'Aberto' : 'Fechado'}
                </span>
              )}
              
              {rating && (
                <span className="flex items-center gap-1 bg-white/90 backdrop-blur px-2 py-1 rounded-full">
                  <span className="material-symbols-outlined text-yellow-500 text-sm filled">star</span>
                  <span className="text-sm font-bold text-dark">{rating}</span>
                </span>
              )}
              {priceString && (
                <span className="bg-white/90 backdrop-blur px-2 py-1 rounded-full text-sm font-bold text-green-600">
                  {priceString}
                </span>
              )}
              {restaurant.cuisine_types?.[0] && (
                <span className="bg-white/90 backdrop-blur px-2 py-1 rounded-full text-sm font-medium text-dark">
                  {restaurant.cuisine_types[0]}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          
          {/* Quick Actions */}
          <div className="p-4 flex gap-2">
            <button 
              onClick={handleNewReview}
              className="flex-1 py-3 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">rate_review</span>
              Avaliar
            </button>
            <button 
              onClick={handleMaps}
              className="flex-1 py-3 bg-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-dark/90 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">directions</span>
              Como chegar
            </button>
          </div>

          {/* Info Cards */}
          <div className="px-4 pb-4 space-y-3">
            
            {/* Horários de Funcionamento */}
            {openingHours.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button 
                  onClick={() => setShowHours(!showHours)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="size-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-purple-600">schedule</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-xs font-medium text-gray-400 uppercase">Horário de funcionamento</p>
                    <p className="text-sm font-medium text-dark mt-0.5">
                      {restaurant.is_open_now !== undefined 
                        ? (restaurant.is_open_now ? 'Aberto agora' : 'Fechado agora')
                        : 'Ver horários'
                      }
                    </p>
                  </div>
                  <span className={`material-symbols-outlined text-gray-400 transition-transform ${showHours ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
                
                {showHours && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                    <div className="space-y-2 mt-3">
                      {openingHours.map((hour: string, idx: number) => {
                        const isToday = hour.toLowerCase().includes(todayName);
                        return (
                          <div 
                            key={idx} 
                            className={`flex justify-between text-sm py-1.5 px-2 rounded-lg ${
                              isToday ? 'bg-primary/10 font-bold' : ''
                            }`}
                          >
                            <span className={isToday ? 'text-primary' : 'text-gray-600'}>
                              {hour.split(':')[0]}
                            </span>
                            <span className={isToday ? 'text-primary' : 'text-dark'}>
                              {hour.includes(':') ? hour.split(':').slice(1).join(':').trim() : hour}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Address */}
            {restaurant.address && (
              <div 
                onClick={handleMaps}
                className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-primary/30 transition-colors"
              >
                <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary">location_on</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-400 uppercase">Endereço</p>
                  <p className="text-sm font-medium text-dark mt-0.5">{restaurant.address}</p>
                  {restaurant.neighborhood && (
                    <p className="text-xs text-gray-500 mt-0.5">{restaurant.neighborhood}, {restaurant.city || 'Recife'}</p>
                  )}
                </div>
                <span className="material-symbols-outlined text-gray-300">chevron_right</span>
              </div>
            )}

            {/* Phone */}
            {restaurant.phone && (
              <div 
                onClick={handleCall}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-primary/30 transition-colors"
              >
                <div className="size-10 bg-green-50 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600">call</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-400 uppercase">Telefone</p>
                  <p className="text-sm font-medium text-dark mt-0.5">{restaurant.phone}</p>
                </div>
                <span className="material-symbols-outlined text-gray-300">chevron_right</span>
              </div>
            )}

            {/* Website */}
            {restaurant.website && (
              <div 
                onClick={handleWebsite}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-primary/30 transition-colors"
              >
                <div className="size-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600">language</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-400 uppercase">Website</p>
                  <p className="text-sm font-medium text-dark mt-0.5 truncate">
                    {restaurant.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </p>
                </div>
                <span className="material-symbols-outlined text-gray-300">chevron_right</span>
              </div>
            )}

            {/* Cuisine & Occasions */}
            {((restaurant.cuisine_types?.length || 0) > 1 || (restaurant.occasions?.length || 0) > 0) && (
              <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                {(restaurant.cuisine_types?.length || 0) > 1 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-400 uppercase mb-2">Culinárias</p>
                    <div className="flex flex-wrap gap-2">
                      {restaurant.cuisine_types?.map(type => (
                        <span 
                          key={type}
                          className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-dark"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {(restaurant.occasions?.length || 0) > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase mb-2">Bom para</p>
                    <div className="flex flex-wrap gap-2">
                      {restaurant.occasions?.map(occasion => (
                        <span 
                          key={occasion}
                          className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                        >
                          {occasion}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Reviews Section */}
          <div className="px-4 pb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-dark">Reviews</h3>
              {(restaurant.reviews_count || 0) > 0 && (
                <button className="text-sm font-bold text-primary">
                  Ver todas ({restaurant.reviews_count})
                </button>
              )}
            </div>
            
            {(restaurant.reviews_count || 0) === 0 ? (
              <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">rate_review</span>
                <p className="text-gray-400 text-sm">Nenhuma review ainda</p>
                <button 
                  onClick={handleNewReview}
                  className="mt-3 text-sm font-bold text-primary"
                >
                  Seja o primeiro a avaliar!
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-sm text-gray-500 text-center">
                  {restaurant.reviews_count} avaliações
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Bottom safe area for mobile */}
        <div className="h-safe-area-bottom bg-cream" />
      </div>
    </div>
  );
};