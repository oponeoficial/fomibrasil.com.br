import React, { useState } from 'react';
import { Sidebar } from '../components/Navigation';
import { useAppContext } from '../AppContext';
import { MOCK_RESTAURANTS } from '../constants';
import { RestaurantDetailsModal } from '../components/RestaurantDetailsModal';
import { Restaurant } from '../types';

export const Recommendations: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { recommendations } = useAppContext();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper to find full restaurant object
  const getRestaurant = (id: string) => MOCK_RESTAURANTS.find(r => r.id === id);

  return (
    <div className="min-h-screen bg-cream pb-24 relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] animate-bounce-in">
          <div className="bg-dark/90 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-base filled text-primary">bookmark</span>
            {toastMessage}
          </div>
        </div>
      )}

      {/* Modal */}
      <RestaurantDetailsModal 
        restaurant={selectedRestaurant} 
        onClose={() => setSelectedRestaurant(null)} 
        onShowToast={setToastMessage}
      />

      {/* Header */}
      <div className="sticky top-0 z-50 bg-cream/95 backdrop-blur-sm p-4 flex justify-between items-center border-b border-black/5">
        <button onClick={() => setSidebarOpen(true)} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5">
          <span className="material-symbols-outlined text-[28px]">menu</span>
        </button>
        <h1 className="text-lg font-bold">Para Você</h1>
        <button className="size-10 flex items-center justify-center rounded-full hover:bg-black/5">
          <span className="material-symbols-outlined filled text-primary">notifications</span>
        </button>
      </div>

      <main className="space-y-8 mt-2">
        {recommendations.length > 0 ? (
           recommendations.map(section => (
            <section key={section.title} className="px-4">
               <div className="mb-4 px-2">
                 <h3 className="font-black text-lg text-dark">{section.title}</h3>
                 <p className="text-xs font-bold text-primary bg-primary/10 inline-block px-2 py-1 rounded-md mt-1">{section.subtitle}</p>
               </div>
               
               {/* Horizontal Scroll */}
               <div className="flex overflow-x-auto gap-4 pb-4 px-2 no-scrollbar snap-x">
                 {section.items.map(item => {
                   const restaurant = getRestaurant(item.restaurantId);
                   if (!restaurant) return null;
  
                   return (
                     <div 
                       key={item.restaurantId} 
                       onClick={() => setSelectedRestaurant(restaurant)}
                       className="min-w-[280px] snap-center relative rounded-2xl overflow-hidden shadow-md group cursor-pointer active:scale-[0.98] transition-transform"
                     >
                        <img src={restaurant.photo_url} className="w-full h-48 object-cover" alt={restaurant.name} />
                        
                        {/* Match Badge */}
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <span className="material-symbols-outlined text-primary text-[16px] filled">favorite</span>
                          <span className="text-primary text-xs font-extrabold">{item.score}% Match</span>
                        </div>
                        
                        {/* Content */}
                        <div className="p-4 bg-white">
                          <h4 className="font-bold text-lg leading-tight mb-1">{restaurant.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                             <span>{restaurant.type || (restaurant.cuisine_types ? restaurant.cuisine_types[0] : 'Restaurante')}</span>
                             <span>•</span>
                             <span>{restaurant.price_level ? '$'.repeat(restaurant.price_level) : '$$'}</span>
                          </div>
                          <button className="w-full py-2.5 rounded-xl bg-black/5 text-dark font-bold text-sm hover:bg-black/10 transition-colors">
                             Ver detalhes
                          </button>
                        </div>
                     </div>
                   );
                 })}
               </div>
            </section>
          ))
        ) : (
           <div className="flex flex-col items-center justify-center py-32 text-center text-gray-400 px-6">
              <span className="material-symbols-outlined text-5xl mb-4 animate-pulse text-primary/50">psychology</span>
              <p className="font-bold text-dark mb-2">Estamos preparando suas recomendações...</p>
              <p className="text-sm">Isso pode levar alguns instantes enquanto analisamos suas preferências.</p>
           </div>
        )}
      </main>
    </div>
  );
};