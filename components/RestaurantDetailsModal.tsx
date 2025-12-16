import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Restaurant } from '../types';
import { useAppContext } from '../AppContext';

export const RestaurantDetailsModal: React.FC<{
  restaurant: Restaurant | null;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}> = ({ restaurant, onClose, onShowToast }) => {
  const navigate = useNavigate();
  const { lists, toggleSaveRestaurant } = useAppContext();
  
  // Check if restaurant is in "Quero ir" (is_default list)
  const isSaved = restaurant && lists.find(l => l.is_default)?.items?.includes(restaurant.id);

  if (!restaurant) return null;

  const handleSave = () => {
    toggleSaveRestaurant(restaurant.id).then(newState => {
        if (newState && onShowToast) {
            onShowToast('Salvo em Quero ir!');
        } else if (onShowToast) {
            onShowToast('Removido de Quero ir');
        }
    });
  };

  const handleCall = () => {
    window.location.href = `tel:${restaurant.phone}`;
  };

  const handleWebsite = () => {
    if (restaurant.website) window.open(restaurant.website, '_blank');
  };

  const handleMaps = () => {
    if (restaurant.google_maps_url) {
      window.open(restaurant.google_maps_url, '_blank');
    } else {
      const query = encodeURIComponent(`${restaurant.name} ${restaurant.address}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  // Convert price_level number to string $
  const priceString = restaurant.price_level ? '$'.repeat(restaurant.price_level) : '$$';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark rounded-3xl w-full max-w-md h-[90vh] shadow-2xl animate-bounce-in flex flex-col overflow-hidden text-cream border border-gray-800">
        
        {/* Header Image */}
        <div className="h-48 relative shrink-0">
          <img src={restaurant.photo_url} className="w-full h-full object-cover" alt={restaurant.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-dark to-transparent"></div>
          <button onClick={onClose} className="absolute top-4 right-4 size-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60">
             <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6 no-scrollbar">
          
          {/* Title & Actions */}
          <div>
            <div className="flex justify-between items-start mb-1">
               <h2 className="text-2xl font-bold leading-tight">{restaurant.name}</h2>
               <div className="flex items-center gap-1 bg-yellow-400/10 px-2 py-1 rounded-lg border border-yellow-400/20">
                 <span className="material-symbols-outlined filled text-yellow-400 text-[18px]">star</span>
                 <span className="font-bold text-yellow-400">{restaurant.rating || 4.5}</span>
                 <span className="text-xs text-gray-400">({restaurant.reviews_count || 0})</span>
               </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">{restaurant.address}</p>
            
            <div className="flex gap-3">
               <button 
                 onClick={handleSave} 
                 className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                   isSaved 
                   ? 'bg-primary text-white shadow-lg shadow-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-dark' 
                   : 'bg-white/10 text-white hover:bg-white/20'
                 }`}
               >
                 <span className={`material-symbols-outlined ${isSaved ? 'filled animate-pulse' : ''}`}>bookmark</span> 
                 {isSaved ? 'Salvo' : 'Salvar'}
               </button>
               <button 
                 onClick={() => {
                     onClose();
                     navigate('/new-review', { state: { restaurant } });
                 }}
                 className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
               >
                 <span className="material-symbols-outlined">add</span> Nova Review
               </button>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* About */}
          <div className="space-y-3">
             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">SOBRE</h3>
             <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                   <span className="text-gray-400 block mb-1">Tipo</span>
                   {restaurant.cuisine_types?.map(t => (
                        <span key={t} className="font-medium text-cream block">{t}</span>
                   ))}
                </div>
                <div>
                   <span className="text-gray-400 block mb-1">Preço</span>
                   <span className="font-medium text-green-400">{priceString}</span>
                </div>
                <div className="col-span-2">
                   <span className="text-gray-400 block mb-1">Ocasião</span>
                   <span className="font-medium text-cream">{restaurant.occasions?.join(', ')}</span>
                </div>
             </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
             {restaurant.phone && (
                <div onClick={handleCall} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                    <span className="material-symbols-outlined text-gray-400">call</span>
                    <span className="flex-1 text-sm">{restaurant.phone}</span>
                </div>
             )}
             {restaurant.website && (
                <div onClick={handleWebsite} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                    <span className="material-symbols-outlined text-gray-400">language</span>
                    <span className="flex-1 text-sm truncate">{restaurant.website}</span>
                </div>
             )}
          </div>

          {/* Mini Map */}
          <div className="relative h-32 bg-gray-700 rounded-xl overflow-hidden border border-white/10">
             {/* Mock Map Background */}
             <svg className="absolute w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,50 Q100,0 200,50 T400,50" fill="none" stroke="#FFF" strokeWidth="5" />
                <path d="M100,0 L100,150" fill="none" stroke="#FFF" strokeWidth="5" />
             </svg>
             {/* Pin */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary">
                <span className="material-symbols-outlined text-4xl filled">location_on</span>
             </div>
             <button onClick={handleMaps} className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group">
                <span className="bg-white text-dark px-4 py-2 rounded-full text-xs font-bold shadow-lg group-hover:scale-105 transition-transform">Abrir no Google Maps</span>
             </button>
          </div>

          <div className="h-px bg-white/10" />

          {/* Reviews Preview (Static Placeholder until detailed fetch) */}
          <div className="space-y-4 pb-4">
             <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">REVIEWS ({restaurant.reviews_count || 0})</h3>
                <button className="text-xs font-bold text-primary">Ver todas</button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};