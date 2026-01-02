// src/components/RestaurantDetailsModal.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Restaurant, Review } from '../types';
import { useAppContext } from '../AppContext';
import { DEFAULT_RESTAURANT, DEFAULT_AVATAR } from '../constants';

export const RestaurantDetailsModal: React.FC<{
  restaurant: Restaurant | null;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}> = ({ restaurant, onClose, onShowToast }) => {
  const navigate = useNavigate();
  const { lists, supabase, currentUser, addRestaurantToList, removeRestaurantFromList } = useAppContext();
  const [showHours, setShowHours] = useState(false);
  const [showListPicker, setShowListPicker] = useState(false);
  const [frequentOccasions, setFrequentOccasions] = useState<string[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Check which lists contain this restaurant
  const savedInLists = restaurant ? lists.filter(l => l.items?.includes(restaurant.id)).map(l => l.id) : [];
  const isSaved = savedInLists.length > 0;

  // Fetch restaurant reviews to get frequent occasions and user's review
  useEffect(() => {
    if (!restaurant?.id) {
      setFrequentOccasions([]);
      setUserReview(null);
      setAllReviews([]);
      return;
    }

    const fetchReviews = async () => {
      setLoadingReviews(true);
      try {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('*, user:profiles!user_id(id, username, full_name, profile_photo_url, is_verified)')
          .eq('restaurant_id', restaurant.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (reviews && reviews.length > 0) {
          // Store all reviews
          setAllReviews(reviews);

          // Get user's review if exists
          if (currentUser) {
            const myReview = reviews.find((r: any) => r.user_id === currentUser.id);
            if (myReview) setUserReview(myReview as Review);
          }

          // Count occasions across all reviews
          const occasionCounts: Record<string, number> = {};
          reviews.forEach((review: any) => {
            if (review.occasions && Array.isArray(review.occasions)) {
              review.occasions.forEach((occ: string) => {
                occasionCounts[occ] = (occasionCounts[occ] || 0) + 1;
              });
            }
          });

          // Get top 5 occasions
          const sorted = Object.entries(occasionCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([occ]) => occ);
          setFrequentOccasions(sorted);
        } else {
          setAllReviews([]);
        }
      } catch (err) {
        console.error('Error fetching reviews:', err);
      }
      setLoadingReviews(false);
    };

    fetchReviews();
  }, [restaurant?.id, supabase, currentUser]);

  if (!restaurant) return null;

  const handleSave = () => {
    setShowListPicker(true);
  };

  const handleToggleList = async (listId: string, listName: string) => {
    const isInList = savedInLists.includes(listId);
    if (isInList) {
      await removeRestaurantFromList(listId, restaurant.id);
      onShowToast?.(`Removido de ${listName}`);
    } else {
      await addRestaurantToList(listId, restaurant.id);
      onShowToast?.(`Salvo em ${listName}!`);
    }
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
          
          {/* Save button - estilo Feed com + */}
          <button
            onClick={handleSave}
            className="absolute top-4 left-4 size-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
          >
            <div className="relative">
              <span className={`material-symbols-outlined text-xl ${isSaved ? 'text-primary filled' : 'text-dark'}`}>
                bookmark
              </span>
              {!isSaved && (
                <span className="absolute -top-1 -right-1 size-4 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">+</span>
                </span>
              )}
            </div>
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
            {restaurant.website && !restaurant.website.includes('instagram.com') && (
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

            {/* Instagram */}
            {(restaurant.instagram || restaurant.website?.includes('instagram.com')) && (
              <div
                onClick={() => {
                  const instagramUrl = restaurant.instagram
                    ? `https://instagram.com/${restaurant.instagram.replace('@', '')}`
                    : restaurant.website;
                  window.open(instagramUrl, '_blank');
                }}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-pink-200 transition-colors"
              >
                <div className="size-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-400 uppercase">Instagram</p>
                  <p className="text-sm font-medium text-dark mt-0.5 truncate">
                    @{restaurant.instagram?.replace('@', '') || restaurant.website?.match(/instagram\.com\/([^/?]+)/)?.[1] || 'perfil'}
                  </p>
                </div>
                <span className="material-symbols-outlined text-gray-300">chevron_right</span>
              </div>
            )}

            {/* Cuisine & Occasions */}
            {((restaurant.cuisine_types?.length || 0) > 1 || frequentOccasions.length > 0) && (
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

                {frequentOccasions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase mb-2">
                      Bom para <span className="text-gray-300">(segundo reviews)</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {frequentOccasions.map(occasion => (
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
              <h3 className="font-bold text-dark">Reviews ({allReviews.length})</h3>
              {!userReview && (
                <button onClick={handleNewReview} className="text-sm font-bold text-primary">
                  + Avaliar
                </button>
              )}
            </div>

            {loadingReviews ? (
              <div className="flex justify-center py-8">
                <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : allReviews.length === 0 ? (
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
              <div className="space-y-3">
                {allReviews.map((review) => {
                  const isMyReview = currentUser && review.user_id === currentUser.id;
                  const score = (((review.score_1 || 0) * 50 + (review.score_2 || 0) * 10 + (review.score_3 || 0) * 25 + (review.score_4 || 0) * 15) / 100);

                  return (
                    <div
                      key={review.id}
                      onClick={() => {
                        onClose();
                        navigate(`/profile/${review.user?.username}`);
                      }}
                      className={`rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                        isMyReview
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-white border-gray-100 hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={review.user?.profile_photo_url || DEFAULT_AVATAR}
                          alt={review.user?.full_name}
                          className="size-10 rounded-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-dark text-sm truncate">
                              {isMyReview ? 'Você' : review.user?.full_name}
                            </p>
                            {review.user?.is_verified && (
                              <img src="/selo-verificado.png" alt="Verificado" className="size-4" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            @{review.user?.username} · {new Date(review.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 bg-yellow-50 px-2.5 py-1 rounded-full">
                          <span className="material-symbols-outlined text-yellow-500 text-sm filled">star</span>
                          <span className="text-sm font-bold text-yellow-700">{score.toFixed(1)}</span>
                        </div>
                      </div>

                      {(review.title || review.description) && (
                        <div className="mt-3 pl-13">
                          {review.title && (
                            <p className="font-medium text-dark text-sm">{review.title}</p>
                          )}
                          {review.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{review.description}</p>
                          )}
                        </div>
                      )}

                      {/* Photos preview */}
                      {review.photos && review.photos.length > 0 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
                          {review.photos.slice(0, 3).map((photo: any, idx: number) => (
                            <img
                              key={idx}
                              src={photo.url}
                              alt=""
                              className="size-16 rounded-xl object-cover shrink-0"
                            />
                          ))}
                          {review.photos.length > 3 && (
                            <div className="size-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-gray-500">+{review.photos.length - 3}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-end">
                        <span className="text-xs text-primary font-medium flex items-center gap-1">
                          Ver review completa
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Add review button if user hasn't reviewed */}
                {!userReview && (
                  <button
                    onClick={handleNewReview}
                    className="w-full py-4 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-sm font-bold text-gray-500 flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">add</span>
                    Adicionar sua avaliação
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Bottom safe area for mobile */}
        <div className="h-safe-area-bottom bg-cream" />

        {/* List Picker Modal */}
        {showListPicker && (
          <div className="absolute inset-0 z-10 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowListPicker(false)} />
            <div className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl max-h-[60vh] shadow-2xl animate-slide-up overflow-hidden">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
                <h3 className="font-bold text-dark text-lg">Salvar em lista</h3>
                <button
                  onClick={() => setShowListPicker(false)}
                  className="size-8 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <div className="p-4 overflow-y-auto max-h-[calc(60vh-80px)]">
                {lists.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">Você ainda não tem listas</p>
                ) : (
                  <div className="space-y-2">
                    {lists.map(list => {
                      const isInList = savedInLists.includes(list.id);
                      return (
                        <button
                          key={list.id}
                          onClick={() => handleToggleList(list.id, list.name)}
                          className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                            isInList
                              ? 'bg-primary/10 border-primary/30'
                              : 'bg-gray-50 border-gray-100 hover:border-primary/30'
                          }`}
                        >
                          <div className={`size-10 rounded-xl flex items-center justify-center ${
                            isInList ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                          }`}>
                            <span className="material-symbols-outlined">
                              {list.is_default ? 'bookmark' : 'folder'}
                            </span>
                          </div>
                          <div className="flex-1 text-left">
                            <p className={`font-bold ${isInList ? 'text-primary' : 'text-dark'}`}>
                              {list.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {list.items?.length || 0} restaurantes
                            </p>
                          </div>
                          <span className={`material-symbols-outlined text-xl ${
                            isInList ? 'text-primary filled' : 'text-gray-300'
                          }`}>
                            {isInList ? 'check_circle' : 'add_circle'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};