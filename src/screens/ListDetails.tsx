import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Restaurant, List, User } from '../types';
import { useAppContext } from '../AppContext';
import { RestaurantDetailsModal } from '../components/RestaurantDetailsModal';
import { DEFAULT_RESTAURANT, DEFAULT_AVATAR } from '../constants';

export const ListDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { lists, addRestaurantToList, removeRestaurantFromList, searchRestaurants, getRestaurantsByIds, supabase, currentUser } = useAppContext();

  // State for list (can be own list or from another user)
  const [list, setList] = useState<List | null>(null);
  const [listOwner, setListOwner] = useState<User | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [isOwnList, setIsOwnList] = useState(false);

  // State
  const [items, setItems] = useState<Restaurant[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch list - first check own lists, then fetch from DB
  useEffect(() => {
    const fetchList = async () => {
      if (!id) {
        setLoadingList(false);
        return;
      }

      // First, check if it's in user's own lists
      const ownList = lists.find(l => l.id === id);
      if (ownList) {
        setList(ownList);
        setIsOwnList(true);
        setListOwner(currentUser);
        setLoadingList(false);
        return;
      }

      // If not found, fetch from database (another user's list)
      try {
        const { data: listData, error } = await supabase
          .from('lists')
          .select(`
            *,
            owner:profiles!user_id(id, username, full_name, profile_photo_url)
          `)
          .eq('id', id)
          .single();

        if (error || !listData) {
          setList(null);
          setLoadingList(false);
          return;
        }

        // Check if list is private and user is not the owner
        if (listData.is_private && listData.user_id !== currentUser?.id) {
          setList(null);
          setLoadingList(false);
          return;
        }

        // Get restaurant IDs from list_restaurants
        const { data: listRestaurants } = await supabase
          .from('list_restaurants')
          .select('restaurant_id')
          .eq('list_id', id);

        const restaurantIds = listRestaurants?.map(lr => lr.restaurant_id) || [];

        setList({
          ...listData,
          items: restaurantIds,
          count: restaurantIds.length
        });
        setListOwner(listData.owner);
        setIsOwnList(listData.user_id === currentUser?.id);
      } catch (err) {
        console.error('Error fetching list:', err);
        setList(null);
      } finally {
        setLoadingList(false);
      }
    };

    fetchList();
  }, [id, lists, currentUser?.id, supabase]);

  // Fetch restaurants when list changes
  useEffect(() => {
    const fetchItems = async () => {
      if (!list?.items?.length) {
        setItems([]);
        setLoadingItems(false);
        return;
      }

      setLoadingItems(true);
      const restaurants = await getRestaurantsByIds(list.items);
      setItems(restaurants);
      setLoadingItems(false);
    };

    if (!loadingList) {
      fetchItems();
    }
  }, [list?.items, getRestaurantsByIds, loadingList]);

  // Search restaurants with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const results = await searchRestaurants(searchQuery);
      setSearchResults(results);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchRestaurants]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/lists/${id}`;
    const shareText = `Confira a lista "${list?.name}" no Fomí!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: list?.name, text: shareText, url: shareUrl });
      } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Link copiado!");
    }
  };

  // Loading state
  if (loadingList) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-10 text-center">
        <span className="material-symbols-outlined text-4xl text-gray-400 mb-4">error</span>
        <p className="font-bold text-dark mb-2">Lista não encontrada</p>
        <p className="text-sm text-gray-500 mb-4">Esta lista pode ser privada ou não existir.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-6 py-2 bg-primary text-white rounded-full font-bold"
        >
          Voltar
        </button>
      </div>
    );
  }

  const handleRemoveItem = async (restaurantId: string) => {
    if (!id) return;
    
    await removeRestaurantFromList(id, restaurantId);
    setItems(prev => prev.filter(item => item.id !== restaurantId));
    showToast('Restaurante removido');
  };

  const handleAddItem = async (restaurant: Restaurant) => {
    if (!id) return;

    if (list.items?.includes(restaurant.id)) {
      showToast('Restaurante já está na lista!');
      return;
    }
    
    await addRestaurantToList(id, restaurant.id);
    setItems(prev => [...prev, restaurant]);
    setShowAddModal(false);
    setSearchQuery('');
    setSearchResults([]);
    showToast('Restaurante adicionado!');
  };

  return (
    <div className="min-h-screen bg-cream text-dark pb-24 relative">
      
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[80] animate-bounce-in">
          <div className="bg-dark/90 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-base filled text-primary">check_circle</span>
            {toastMessage}
          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      <RestaurantDetailsModal 
        restaurant={selectedRestaurant} 
        onClose={() => setSelectedRestaurant(null)} 
      />

      {/* --- HEADER --- */}
      <div className="sticky top-0 z-40 bg-cream/95 backdrop-blur-sm p-4 border-b border-black/5 flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <div className="text-center flex-1 mx-2">
          <h1 className="text-lg font-bold tracking-wide truncate">{list.name}</h1>
          {list.is_private && (
            <span className="text-[10px] text-gray-500 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[12px]">lock</span>
              Privada
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleShare} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
            <span className="material-symbols-outlined text-[22px]">share</span>
          </button>
          {isOwnList && (
            <button onClick={() => setShowAddModal(true)} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
              <span className="material-symbols-outlined text-[28px]">add</span>
            </button>
          )}
        </div>
      </div>

      {/* Owner info (if not own list) */}
      {!isOwnList && listOwner && (
        <div
          onClick={() => navigate(`/profile/${listOwner.username}`)}
          className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <img
            src={listOwner.profile_photo_url || DEFAULT_AVATAR}
            alt={listOwner.full_name}
            className="size-10 rounded-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
          />
          <div className="flex-1">
            <p className="text-sm font-bold text-dark">{listOwner.full_name}</p>
            <p className="text-xs text-gray-500">@{listOwner.username}</p>
          </div>
          <span className="material-symbols-outlined text-gray-400">chevron_right</span>
        </div>
      )}

      {/* --- CONTENT --- */}
      <div className="p-4 space-y-2">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">
          {items.length} lugares salvos
        </div>

        {loadingItems ? (
          // Skeleton
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-xl animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">bookmark_border</span>
            <p className="font-bold text-dark">Lista vazia.</p>
            <p className="text-sm mt-1">
              {isOwnList ? 'Adicione restaurantes a esta lista' : 'Nenhum restaurante nesta lista ainda'}
            </p>
            {isOwnList && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-6 bg-primary text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-primary/90 transition-colors"
              >
                Adicionar restaurante
              </button>
            )}
          </div>
        ) : (
          // Restaurant List
          items.map(item => (
            <div
              key={item.id}
              className={`relative w-full h-24 rounded-xl ${isOwnList ? 'overflow-x-auto snap-x snap-mandatory no-scrollbar' : ''}`}
            >
              <div className={`h-full flex ${isOwnList ? 'w-[calc(100%+80px)]' : 'w-full'}`}>
                {/* CARD CONTENT */}
                <div className={`snap-center shrink-0 ${isOwnList ? 'w-[100vw] sm:w-full pr-8 sm:pr-0' : 'w-full'}`}>
                  <div
                    onClick={() => setSelectedRestaurant(item)}
                    className={`h-full bg-white border border-gray-100 rounded-xl flex overflow-hidden active:bg-gray-50 transition-colors cursor-pointer shadow-sm ${isOwnList ? 'w-[calc(100vw-32px)] sm:w-full' : 'w-full'}`}
                  >
                    <img
                      src={item.photo_url || DEFAULT_RESTAURANT}
                      className="w-24 h-full object-cover"
                      alt={item.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_RESTAURANT;
                      }}
                    />
                    <div className="flex-1 p-3 flex flex-col justify-center">
                      <h3 className="font-bold text-base leading-tight text-dark">{item.name}</h3>
                      <div className="flex items-center gap-1 mt-1 text-gray-400 text-xs">
                        <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                        {item.neighborhood || item.address || 'Localização não informada'}
                      </div>
                      {item.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined filled text-[14px] text-yellow-400">star</span>
                          <span className="font-bold text-yellow-500 text-xs">{item.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center pr-3">
                      <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                    </div>
                  </div>
                </div>

                {/* DELETE BUTTON (only for own list) */}
                {isOwnList && (
                  <div className="w-[80px] snap-center shrink-0 h-full flex items-center justify-center">
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="size-14 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center border border-red-500/50 active:scale-90 transition-transform"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {items.length > 0 && isOwnList && (
          <div className="h-20 flex items-center justify-center text-xs text-gray-400 font-medium">
            <span className="material-symbols-outlined text-lg mr-2 opacity-50">swipe_left</span>
            Arraste para remover
          </div>
        )}
      </div>

      {/* --- ADD RESTAURANT MODAL (only for own list) --- */}
      {showAddModal && isOwnList && (
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
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                    className="absolute right-4 top-3.5 text-gray-400"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {searchQuery.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search</span>
                  <p className="text-sm">Digite para buscar restaurantes</p>
                </div>
              ) : searching ? (
                <div className="flex justify-center py-10">
                  <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
                  <p className="text-sm">Nenhum resultado para "{searchQuery}"</p>
                </div>
              ) : (
                searchResults.map(r => {
                  const isInList = list.items?.includes(r.id);
                  
                  return (
                    <button 
                      key={r.id}
                      onClick={() => handleAddItem(r)}
                      disabled={isInList}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left border ${
                        isInList 
                          ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed' 
                          : 'hover:bg-gray-50 border-transparent hover:border-gray-100'
                      }`}
                    >
                      <img 
                        src={r.photo_url || DEFAULT_RESTAURANT} 
                        className="size-12 rounded-lg object-cover bg-gray-200" 
                        alt={r.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_RESTAURANT;
                        }}
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-dark">{r.name}</h4>
                        <p className="text-xs text-gray-500">{r.neighborhood || r.address}</p>
                      </div>
                      <div className="ml-auto">
                        {isInList ? (
                          <span className="material-symbols-outlined text-green-500 filled">check_circle</span>
                        ) : (
                          <span className="material-symbols-outlined text-primary">add_circle</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};