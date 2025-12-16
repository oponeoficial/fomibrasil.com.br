import React, { useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MOCK_RESTAURANTS } from '../constants';
import { Restaurant } from '../types';
import { useAppContext } from '../AppContext';
import { RestaurantDetailsModal } from '../components/RestaurantDetailsModal';

export const ListDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { lists, addRestaurantToList, removeRestaurantFromList } = useAppContext();
  
  // Find current list from context
  const list = lists.find(l => l.id === id);
  
  // Derived state: items in the list based on IDs
  const items = useMemo(() => {
    if (!list || !list.items) return [];
    return list.items.map(itemId => MOCK_RESTAURANTS.find(r => r.id === itemId)).filter(Boolean) as Restaurant[];
  }, [list]);

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  if (!list) return <div className="p-10 text-center text-dark">Lista não encontrada</div>;

  const handleRemoveItem = (rId: string) => {
    if (id) removeRestaurantFromList(id, rId);
  };

  const handleAddItem = (restaurant: Restaurant) => {
    if (list.items?.includes(restaurant.id)) {
        alert('Restaurante já está na lista!');
        return;
    }
    if (id) addRestaurantToList(id, restaurant.id);
    setShowAddModal(false);
    setSearchQuery('');
  };

  const filteredRestaurants = useMemo(() => {
     if (!searchQuery) return [];
     return MOCK_RESTAURANTS.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-cream text-dark pb-24 relative">
      
      {/* --- MODALS --- */}
      <RestaurantDetailsModal 
        restaurant={selectedRestaurant} 
        onClose={() => setSelectedRestaurant(null)} 
      />

      {/* --- HEADER --- */}
      <div className="sticky top-0 z-40 bg-cream/95 backdrop-blur-sm p-4 border-b border-black/5 flex justify-between items-center">
        <button onClick={() => navigate('/lists')} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold tracking-wide">{list.name}</h1>
        <button onClick={() => setShowAddModal(true)} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
          <span className="material-symbols-outlined text-[28px]">add</span>
        </button>
      </div>

      {/* --- CONTENT --- */}
      <div className="p-4 space-y-2">
         <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">
            {items.length} lugares salvos
         </div>

         {items.map(item => (
            <div 
               key={item.id} 
               className="relative w-full h-24 overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-xl"
            >
               <div className="w-[calc(100%+80px)] h-full flex">
                  {/* CARD CONTENT (Snap Center) */}
                  <div className="w-[100vw] sm:w-full snap-center shrink-0 pr-8 sm:pr-0">
                     <div 
                       onClick={() => setSelectedRestaurant(item)}
                       className="w-[calc(100vw-32px)] sm:w-full h-full bg-white border border-gray-100 rounded-xl flex overflow-hidden active:bg-gray-50 transition-colors cursor-pointer shadow-sm"
                     >
                        <img src={item.photo_url} className="w-24 h-full object-cover" alt={item.name} />
                        <div className="flex-1 p-3 flex flex-col justify-center">
                           <div className="flex justify-between items-start">
                              <h3 className="font-bold text-base leading-tight text-dark">{item.name}</h3>
                              <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-400">
                                 [foto]
                              </span>
                           </div>
                           <div className="flex items-center gap-1 mt-1 text-gray-400 text-xs">
                              <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                              {item.address}
                           </div>
                           <div className="flex items-center gap-1 mt-1">
                              <span className="material-symbols-outlined filled text-[14px] text-yellow-400">star</span>
                              <span className="font-bold text-yellow-400 text-xs">{item.rating}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* DELETE BUTTON (Snap Center) */}
                  <div className="w-[80px] snap-center shrink-0 h-full flex items-center justify-center">
                     <button 
                       onClick={() => handleRemoveItem(item.id)}
                       className="size-14 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center border border-red-500/50 active:scale-90 transition-transform"
                     >
                        <span className="material-symbols-outlined">delete</span>
                     </button>
                  </div>
               </div>
            </div>
         ))}
         
         {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
               <span className="material-symbols-outlined text-4xl mb-2 opacity-50">bookmark_border</span>
               <p className="font-bold text-dark">Lista vazia.</p>
               <p className="text-sm mt-1">Adicione restaurantes a esta lista</p>
               <button onClick={() => setShowAddModal(true)} className="mt-6 bg-black/5 text-dark px-6 py-2 rounded-full font-bold text-sm hover:bg-black/10">Adicionar restaurante</button>
            </div>
         )}
         
         {items.length > 0 && (
            <div className="h-20 flex items-center justify-center text-xs text-gray-400 font-medium">
                ... scroll
            </div>
         )}
      </div>

      {/* --- ADD RESTAURANT MODAL --- */}
      {showAddModal && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
            <div className="relative bg-white border border-gray-100 rounded-3xl w-full max-w-md h-[80vh] shadow-2xl flex flex-col overflow-hidden animate-bounce-in">
               
               {/* Modal Header */}
               <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white">
                  <h3 className="text-lg font-bold text-dark">Adicionar restaurante</h3>
                  <button onClick={() => setShowAddModal(false)}>
                     <span className="material-symbols-outlined text-gray-400">close</span>
                  </button>
               </div>

               {/* Search Input */}
               <div className="p-4 bg-white border-b border-gray-100">
                  <div className="relative">
                     <span className="absolute left-4 top-3.5 text-gray-400 material-symbols-outlined">search</span>
                     <input 
                        type="text" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar restaurante..."
                        className="w-full h-12 rounded-xl bg-gray-50 border border-gray-200 pl-12 pr-4 text-dark focus:border-primary outline-none transition-colors placeholder:text-gray-400"
                        autoFocus
                     />
                  </div>
               </div>

               {/* Results List */}
               <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {searchQuery.length === 0 ? (
                     <div className="text-center py-10 text-gray-600 text-sm">
                        Digite para buscar...
                     </div>
                  ) : filteredRestaurants.length === 0 ? (
                     <div className="text-center py-10 text-gray-500 text-sm">
                        Nenhum resultado encontrado para '{searchQuery}'.
                     </div>
                  ) : (
                     filteredRestaurants.map(r => (
                        <button 
                           key={r.id}
                           onClick={() => handleAddItem(r)}
                           className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left border border-transparent hover:border-gray-100"
                        >
                           <img src={r.photo_url} className="size-12 rounded-lg object-cover bg-gray-200" alt={r.name} />
                           <div>
                              <div className="flex items-center gap-2">
                                 <span className="text-[10px] text-gray-400">[foto]</span>
                                 <h4 className="font-bold text-dark">{r.name}</h4>
                              </div>
                              <p className="text-xs text-gray-500">{r.address}</p>
                           </div>
                           <div className="ml-auto text-primary">
                              <span className="material-symbols-outlined">add_circle</span>
                           </div>
                        </button>
                     ))
                  )}
                  
                  {/* Mock "More Results" filler */}
                  {filteredRestaurants.length > 0 && (
                     <div className="text-center py-4 text-xs text-gray-600">
                        ... resultados
                     </div>
                  )}
               </div>

            </div>
         </div>
      )}

    </div>
  );
};