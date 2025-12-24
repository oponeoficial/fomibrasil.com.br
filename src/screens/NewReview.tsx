import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Restaurant, User, Review } from '../types';
import { useAppContext } from '../AppContext';
import { DEFAULT_AVATAR, DEFAULT_RESTAURANT } from '../constants';

type ReviewType = 'presencial' | 'delivery';

interface PhotoItem {
  id: string;
  file?: File;
  preview: string;
  isExisting?: boolean; // Para fotos que já existem na review
}

export const NewReview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addReview, searchRestaurantsWithGoogle, getMutualFollowers, supabase, refreshFeed } = useAppContext();
  
  // --- EDIT MODE ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [editReviewId, setEditReviewId] = useState<string | null>(null);
  
  // --- STATE ---
  const [step, setStep] = useState<1 | 2>(1);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // STEP 1: Info
  const [restaurantQuery, setRestaurantQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showRestaurantDropdown, setShowRestaurantDropdown] = useState(false);
  const [searchingRestaurants, setSearchingRestaurants] = useState(false);
  const [restaurantResults, setRestaurantResults] = useState<Restaurant[]>([]);
  const [noResultsFound, setNoResultsFound] = useState(false);
  
  const [description, setDescription] = useState('');
  
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [taggedUsers, setTaggedUsers] = useState<User[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // STEP 2: Evaluation
  const [reviewType, setReviewType] = useState<ReviewType>('presencial');
  const [scores, setScores] = useState({
    proposta: 5.0,
    comida: 5.0,
    apresentacao: 5.0,
    atendimento: 5.0,
    embalagem: 5.0,
    tempoEntrega: 5.0,
    qualidadeComida: 5.0
  });

  // Check for edit mode or passed restaurant state
  useEffect(() => {
    if (location.state?.editReview) {
      const review = location.state.editReview as Review;
      setIsEditMode(true);
      setEditReviewId(review.id);
      
      // Preencher restaurante
      if (review.restaurant) {
        setSelectedRestaurant(review.restaurant);
        setRestaurantQuery(review.restaurant.name);
      }
      
      // Preencher descrição
      setDescription(review.description || '');
      
      // Preencher tipo
      setReviewType(review.review_type === 'delivery' ? 'delivery' : 'presencial');
      
      // Preencher fotos existentes
      if (review.photos && review.photos.length > 0) {
        const existingPhotos: PhotoItem[] = review.photos.map((photo, idx) => ({
          id: `existing-${idx}`,
          preview: photo.url,
          isExisting: true
        }));
        setSelectedPhotos(existingPhotos);
      }
      
      // Preencher scores (mapear de volta para os campos)
      if (review.review_type === 'delivery') {
        setScores(prev => ({
          ...prev,
          embalagem: review.score_1 || 5.0,
          tempoEntrega: review.score_2 || 5.0,
          qualidadeComida: review.score_3 || 5.0,
          apresentacao: review.score_4 || 5.0
        }));
      } else {
        setScores(prev => ({
          ...prev,
          proposta: review.score_1 || 5.0,
          comida: review.score_2 || 5.0,
          apresentacao: review.score_3 || 5.0,
          atendimento: review.score_4 || 5.0
        }));
      }
    } else if (location.state?.restaurant) {
      const r = location.state.restaurant as Restaurant;
      setSelectedRestaurant(r);
      setRestaurantQuery(r.name);
    }
  }, [location.state]);

  // Search restaurants with debounce
  useEffect(() => {
    if (restaurantQuery.length < 3) {
      setRestaurantResults([]);
      setNoResultsFound(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingRestaurants(true);
      setNoResultsFound(false);
      
      try {
        const results = await searchRestaurantsWithGoogle(restaurantQuery);
        setRestaurantResults(results);
        setNoResultsFound(results.length === 0);
      } catch (err) {
        console.error('Erro na busca:', err);
        setNoResultsFound(true);
      }
      
      setSearchingRestaurants(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [restaurantQuery, searchRestaurantsWithGoogle]);

  // Load friends when tag modal opens
  useEffect(() => {
    if (showTagModal && friendsList.length === 0) {
      loadFriends();
    }
  }, [showTagModal]);

  const loadFriends = async () => {
    setLoadingFriends(true);
    const users = await getMutualFollowers();
    setFriendsList(users);
    setLoadingFriends(false);
  };

  // --- HELPERS ---

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isQuickPost = selectedPhotos.length === 0;

  const getCriteria = () => {
    if (reviewType === 'presencial') {
      return [
        { key: 'comida', label: 'Comida', dbKey: 'score_2' },
        { key: 'proposta', label: 'Proposta', dbKey: 'score_1' },
        { key: 'apresentacao', label: 'Apresentação', dbKey: 'score_3' },
        { key: 'atendimento', label: 'Atendimento', dbKey: 'score_4' }
      ];
    } else {
      return [
        { key: 'qualidadeComida', label: 'Qualidade da comida', dbKey: 'score_3' },
        { key: 'embalagem', label: 'Embalagem', dbKey: 'score_1' },
        { key: 'tempoEntrega', label: 'Tempo de entrega', dbKey: 'score_2' },
        { key: 'apresentacao', label: 'Apresentação', dbKey: 'score_4' }
      ];
    }
  };

  const calculateAverage = () => {
    const criteria = getCriteria();
    const sum = criteria.reduce((acc, curr) => acc + (scores[curr.key as keyof typeof scores] || 0), 0);
    return (sum / criteria.length).toFixed(1);
  };

  // --- ACTIONS: NAVIGATION ---

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      if (selectedRestaurant || description || selectedPhotos.length > 0) {
        setShowDiscardModal(true);
      } else {
        navigate(-1);
      }
    }
  };

  const confirmDiscard = () => {
    selectedPhotos.forEach(p => URL.revokeObjectURL(p.preview));
    navigate(-1);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!selectedRestaurant) {
        showToast("Selecione um restaurante");
        return;
      }
      if (!description.trim()) {
        showToast("Adicione uma descrição");
        return;
      }
      setStep(2);
    }
  };

  const handlePostReview = async () => {
    if (posting) return;
    setPosting(true);

    try {
      const criteria = getCriteria();
      
      if (isEditMode && editReviewId) {
        // --- MODO EDIÇÃO: Update da review existente ---
        const existingPhotos = selectedPhotos.filter(p => p.isExisting);
        
        const updateData: any = {
          description: description.trim(),
          review_type: reviewType === 'presencial' ? 'in_person' : 'delivery',
          score_1: scores[criteria[0].key as keyof typeof scores],
          score_2: scores[criteria[1].key as keyof typeof scores],
          score_3: scores[criteria[2].key as keyof typeof scores],
          score_4: scores[criteria[3].key as keyof typeof scores],
          photos: existingPhotos.map((p, i) => ({ url: p.preview, order: i + 1 })),
          updated_at: new Date().toISOString()
        };

        // Se mudou o restaurante
        if (selectedRestaurant?.id) {
          updateData.restaurant_id = selectedRestaurant.id;
        }

        const { error } = await supabase
          .from('reviews')
          .update(updateData)
          .eq('id', editReviewId);

        if (error) {
          console.error('Erro ao atualizar review:', error);
          showToast("Erro ao atualizar. Tente novamente.");
          setPosting(false);
          return;
        }

        showToast("Review atualizada!");
        await refreshFeed();
        setTimeout(() => navigate('/feed'), 1500);

      } else {
        // --- MODO CRIAÇÃO: Nova review ---
        const reviewData = {
          restaurantId: selectedRestaurant?.id,
          title: selectedRestaurant?.name || 'Review',
          description: description.trim(),
          reviewType,
          scores: {
            score_1: scores[criteria[0].key as keyof typeof scores],
            score_2: scores[criteria[1].key as keyof typeof scores],
            score_3: scores[criteria[2].key as keyof typeof scores],
            score_4: scores[criteria[3].key as keyof typeof scores]
          },
          photoFiles: selectedPhotos.filter(p => p.file).map(p => p.file!),
          taggedUserIds: taggedUsers.map(u => u.id),
          isQuickPost
        };

        const reviewId = await addReview(reviewData);

        if (reviewId) {
          selectedPhotos.forEach(p => URL.revokeObjectURL(p.preview));
          showToast("Review publicada!");
          setTimeout(() => navigate('/feed'), 1500);
        } else {
          showToast("Erro ao publicar. Tente novamente.");
          setPosting(false);
        }
      }
    } catch (error) {
      console.error('Erro ao postar review:', error);
      showToast("Erro ao publicar. Tente novamente.");
      setPosting(false);
    }
  };

  // --- ACTIONS: PHOTOS ---

  const handleRemovePhoto = (index: number) => {
    const photo = selectedPhotos[index];
    // Só revogar URL se não for foto existente (é blob URL)
    if (!photo.isExisting) {
      URL.revokeObjectURL(photo.preview);
    }
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 5 - selectedPhotos.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    for (const file of filesToAdd) {
      if (file.size > 10 * 1024 * 1024) {
        showToast("Foto muito grande (máx 10MB)");
        continue;
      }

      const preview = URL.createObjectURL(file);
      const newPhoto: PhotoItem = {
        id: `photo-${Date.now()}-${Math.random()}`,
        file,
        preview
      };
      setSelectedPhotos(prev => [...prev, newPhoto]);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- ACTIONS: RESTAURANT ---

  const handleSelectRestaurant = (r: Restaurant) => {
    setSelectedRestaurant(r);
    setRestaurantQuery(r.name);
    setShowRestaurantDropdown(false);
    setNoResultsFound(false);
  };

  // --- ACTIONS: TAGS ---

  const filteredFriendsToTag = useMemo(() => {
    if (!tagSearchQuery) return friendsList;
    const lower = tagSearchQuery.toLowerCase();
    return friendsList.filter(u => 
      u.full_name?.toLowerCase().includes(lower) || u.username?.toLowerCase().includes(lower)
    );
  }, [tagSearchQuery, friendsList]);

  const toggleTagUser = (user: User) => {
    if (taggedUsers.find(u => u.id === user.id)) {
      setTaggedUsers(prev => prev.filter(u => u.id !== user.id));
    } else {
      setTaggedUsers(prev => [...prev, user]);
    }
  };
  
  // --- ACTIONS: SCORES ---
  
  const handleScoreChange = (key: string, value: number) => {
    setScores(prev => ({ ...prev, [key]: value }));
  };

  // --- RENDER STEP 1 ---

  const renderStep1 = () => (
    <div className="p-6 space-y-6">
      
      {/* Restaurant Input */}
      <div className="space-y-2 relative">
        <label className="text-sm font-bold ml-1 flex items-center gap-1">
          Restaurante <span className="text-primary">*</span>
        </label>
        <div className="relative z-20">
          <span className="absolute left-4 top-3.5 text-gray-400 material-symbols-outlined">search</span>
          <input 
            type="text" 
            value={restaurantQuery}
            onChange={(e) => {
              setRestaurantQuery(e.target.value);
              setSelectedRestaurant(null);
              setShowRestaurantDropdown(true);
            }}
            onFocus={() => setShowRestaurantDropdown(true)}
            placeholder="Buscar restaurante..."
            className={`w-full h-12 pl-12 pr-4 rounded-xl border-2 bg-white outline-none font-medium shadow-sm transition-colors ${
              !selectedRestaurant && restaurantQuery.length > 0 && !showRestaurantDropdown 
                ? 'border-red-300' 
                : 'border-gray-200 focus:border-primary'
            }`}
          />
          {searchingRestaurants && (
            <span className="absolute right-4 top-3.5 material-symbols-outlined animate-spin text-primary">
              progress_activity
            </span>
          )}
          
          {/* Autocomplete Dropdown */}
          {showRestaurantDropdown && restaurantQuery.length >= 3 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-slide-down max-h-64 overflow-y-auto">
              {searchingRestaurants ? (
                <div className="p-4 text-center">
                  <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                  <p className="text-xs text-gray-400 mt-2">Pesquisando restaurantes...</p>
                </div>
              ) : restaurantResults.length > 0 ? (
                restaurantResults.map(r => (
                  <button 
                    key={r.id} 
                    onClick={() => handleSelectRestaurant(r)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left transition-colors border-b border-gray-50 last:border-0"
                  >
                    <img 
                      src={r.photo_url || DEFAULT_RESTAURANT} 
                      className="size-10 rounded-lg object-cover bg-gray-200" 
                      alt={r.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_RESTAURANT;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-dark text-sm truncate">{r.name}</p>
                      <p className="text-xs text-gray-500 truncate">{r.neighborhood || r.address}</p>
                    </div>
                    {r.rating && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="material-symbols-outlined filled text-yellow-400 text-sm">star</span>
                        <span className="text-xs font-bold text-yellow-500">{r.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </button>
                ))
              ) : noResultsFound ? (
                <div className="p-4 text-center">
                  <span className="material-symbols-outlined text-3xl text-gray-300 mb-2">search_off</span>
                  <p className="text-sm text-gray-500 mb-2">Restaurante não encontrado</p>
                  <p className="text-xs text-gray-400">
                    Entre em contato conosco para cadastrar:<br/>
                    <a href="mailto:contato@fomibrasil.com.br" className="text-primary font-bold">
                      contato@fomibrasil.com.br
                    </a>
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>
        {selectedRestaurant && (
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-100">
            <span className="material-symbols-outlined text-green-600">check_circle</span>
            <span className="text-xs font-bold text-green-700 truncate">
              Selecionado: {selectedRestaurant.name}
            </span>
          </div>
        )}
      </div>

      {/* Photos Section */}
      <div className="space-y-3">
        <label className="text-sm font-bold ml-1">Fotos</label>
        
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
        />

        {/* Selected Photos */}
        {selectedPhotos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
            {selectedPhotos.map((photo, i) => (
              <div 
                key={photo.id}
                className="relative size-20 shrink-0 rounded-xl overflow-hidden border border-black/5 shadow-sm"
              >
                <img src={photo.preview} className="w-full h-full object-cover" alt="Selected" />
                <button 
                  onClick={() => handleRemovePhoto(i)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full size-5 flex items-center justify-center hover:bg-red-500 transition-colors"
                >
                  <span className="material-symbols-outlined text-[12px]">close</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Photo Buttons - só mostra em modo criação */}
        {!isEditMode && selectedPhotos.length < 5 && (
          <div className="space-y-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-12 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-bold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">photo_library</span>
              Adicionar fotos ({selectedPhotos.length}/5)
            </button>
            <button 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.capture = 'environment';
                input.onchange = (e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.files) {
                    handleFileChange({ target } as React.ChangeEvent<HTMLInputElement>);
                  }
                };
                input.click();
              }}
              className="w-full h-12 rounded-xl bg-dark text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <span className="material-symbols-outlined">photo_camera</span>
              Tirar foto
            </button>
          </div>
        )}

        {/* Aviso em modo edição */}
        {isEditMode && selectedPhotos.length === 0 && (
          <p className="text-xs text-gray-400 text-center">
            As fotos foram removidas. Clique em "X" para remover fotos existentes.
          </p>
        )}
      </div>

      {/* Description Input */}
      <div className="space-y-2">
        <label className="text-sm font-bold ml-1 flex items-center gap-1">
          Descrição <span className="text-primary">*</span>
        </label>
        <textarea 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={700}
          placeholder="Conte sobre sua experiência..."
          className="w-full h-32 p-4 rounded-xl border-2 border-gray-200 bg-white outline-none font-medium focus:border-primary shadow-sm resize-none transition-colors"
        />
        <div className="text-right text-xs text-gray-400 font-medium">
          {description.length}/700
        </div>
      </div>

      {/* Tag Friends */}
      <div className="space-y-3">
        <label className="text-sm font-bold ml-1">Marcar amigos</label>
        
        {taggedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {taggedUsers.map(u => (
              <div key={u.id} className="flex items-center gap-2 bg-white border border-gray-200 pl-1 pr-2 py-1 rounded-full shadow-sm">
                <img 
                  src={u.profile_photo_url || DEFAULT_AVATAR} 
                  className="size-6 rounded-full" 
                  alt={u.username}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                  }}
                />
                <span className="text-xs font-bold text-dark">@{u.username}</span>
                <button 
                  onClick={() => toggleTagUser(u)} 
                  className="size-4 bg-gray-200 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-500"
                >
                  <span className="material-symbols-outlined text-[10px]">close</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <button 
          onClick={() => setShowTagModal(true)}
          className="w-full h-12 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-bold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">person_add</span> Adicionar amigos
        </button>
      </div>

      {/* --- TAG MODAL --- */}
      {showTagModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTagModal(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-sm h-[70vh] shadow-2xl overflow-hidden flex flex-col animate-bounce-in">
            
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">Marcar amigos</h3>
              <button onClick={() => setShowTagModal(false)}>
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 material-symbols-outlined text-[20px]">search</span>
                <input 
                  type="text"
                  value={tagSearchQuery}
                  onChange={e => setTagSearchQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Seus amigos
              </p>
              <p className="text-[10px] text-gray-400 mb-3">
                Pessoas que você segue e te seguem de volta
              </p>
              
              {loadingFriends ? (
                <div className="flex justify-center py-10">
                  <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                </div>
              ) : filteredFriendsToTag.length > 0 ? (
                filteredFriendsToTag.map(u => {
                  const isTagged = !!taggedUsers.find(tagged => tagged.id === u.id);
                  return (
                    <button 
                      key={u.id}
                      onClick={() => toggleTagUser(u)}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={u.profile_photo_url || DEFAULT_AVATAR} 
                          className="size-10 rounded-full border border-gray-100" 
                          alt={u.full_name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                          }}
                        />
                        <div className="text-left">
                          <p className="font-bold text-sm text-dark">@{u.username}</p>
                          <p className="text-xs text-gray-500">{u.full_name}</p>
                        </div>
                      </div>
                      <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isTagged ? 'bg-primary border-primary' : 'border-gray-300'
                      }`}>
                        {isTagged && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <span className="material-symbols-outlined text-3xl mb-2 opacity-50">group_off</span>
                  <p className="text-sm">Você ainda não tem amigos</p>
                  <p className="text-xs mt-1">Siga pessoas e aguarde elas te seguirem de volta</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100">
              <button 
                onClick={() => setShowTagModal(false)}
                className="w-full h-12 bg-dark text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform"
              >
                Confirmar ({taggedUsers.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // --- RENDER STEP 2 ---

  const renderStep2 = () => {
    const activeCriteria = getCriteria();
    const average = calculateAverage();

    return (
      <div className="p-6 space-y-8 touch-pan-y">
        {/* Type Toggle */}
        <div className="space-y-3">
          <label className="text-sm font-bold ml-1 text-secondary uppercase tracking-wider">
            Como foi a experiência?
          </label>
          <div className="flex bg-white rounded-xl p-1 border border-black/5 shadow-sm">
            <button 
              onClick={() => setReviewType('presencial')}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                reviewType === 'presencial' ? 'bg-dark text-white shadow-md' : 'text-gray-400 hover:text-dark'
              }`}
            >
              Presencial
            </button>
            <button 
              onClick={() => setReviewType('delivery')}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                reviewType === 'delivery' ? 'bg-dark text-white shadow-md' : 'text-gray-400 hover:text-dark'
              }`}
            >
              Delivery
            </button>
          </div>
        </div>

        <div className="h-px bg-black/5"></div>

        {/* Sliders - com touch-action para evitar tremor */}
        <div className="space-y-8">
          {activeCriteria.map(({ key, label }) => {
            const val = scores[key as keyof typeof scores];
            return (
              <div key={key} className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-bold text-gray-600">{label}</label>
                  <span className="font-bold text-primary text-lg tabular-nums w-12 text-right">{val.toFixed(1)}</span>
                </div>
                <div className="touch-none">
                  <input 
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={val}
                    onChange={(e) => handleScoreChange(key, parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    style={{ touchAction: 'none' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="h-px bg-black/5"></div>

        {/* Average Display */}
        <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-black/5 shadow-sm">
          <span className="text-lg font-bold text-dark">Média:</span>
          <div className="flex items-center gap-2 bg-yellow-400/10 px-3 py-1.5 rounded-lg border border-yellow-400/20">
            <span className="material-symbols-outlined filled text-yellow-400 text-[22px]">star</span>
            <span className="text-xl font-black text-yellow-500 tabular-nums">{average}</span>
          </div>
        </div>

        {/* Post Button */}
        <div className="pt-4 pb-20">
          <button 
            onClick={handlePostReview}
            disabled={posting}
            className="w-full py-4 bg-dark text-white font-bold text-lg rounded-2xl shadow-xl shadow-dark/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {posting ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                {isEditMode ? 'ATUALIZANDO...' : 'PUBLICANDO...'}
              </>
            ) : (
              isEditMode ? 'ATUALIZAR REVIEW' : 'POSTAR REVIEW'
            )}
          </button>
        </div>
      </div>
    );
  };

  const canProceedStep1 = () => {
    return selectedRestaurant && description.trim().length > 0;
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col relative overflow-x-hidden">
      
      {/* --- TOAST --- */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[70] animate-bounce-in">
          <div className="bg-dark/90 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-base">info</span>
            {toastMessage}
          </div>
        </div>
      )}

      {/* --- DISCARD MODAL --- */}
      {showDiscardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDiscardModal(false)} />
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl relative z-10 animate-bounce-in text-center">
            <h3 className="font-bold text-lg mb-2">Deseja descartar?</h3>
            <p className="text-secondary text-sm mb-6">Suas informações serão perdidas.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDiscardModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-500"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDiscard}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="flex items-center justify-between px-4 py-3 bg-cream/95 backdrop-blur-sm border-b border-black/5 sticky top-0 z-30">
        <button onClick={handleBack} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="font-bold text-lg">{isEditMode ? 'Editar Review' : 'Nova Review'}</span>
        
        {step === 1 ? (
          <button 
            onClick={handleNext}
            disabled={!canProceedStep1()}
            className={`font-bold text-sm px-3 py-1.5 rounded-full transition-colors ${
              canProceedStep1() 
                ? 'text-primary bg-primary/10' 
                : 'text-gray-300'
            }`}
          >
            Avançar
          </button>
        ) : (
          <div className="w-16"></div>
        )}
      </header>
      
      <main className="flex-1 overflow-y-auto no-scrollbar pb-10 overflow-x-hidden">
        {/* Step Progress */}
        <div className="px-6 pt-4 flex gap-2">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-gray-200'}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
        </div>
        
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </main>

    </div>
  );
};