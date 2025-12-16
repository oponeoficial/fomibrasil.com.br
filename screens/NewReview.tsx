import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Restaurant, User } from '../types';
import { useAppContext } from '../AppContext';
import { DEFAULT_AVATAR, DEFAULT_RESTAURANT } from '../constants';

type ReviewType = 'presencial' | 'delivery';

interface PhotoItem {
  id: string;
  file: File;
  preview: string;
}

export const NewReview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addReview, searchRestaurants, getFollowingUsers, currentUser } = useAppContext();
  
  // --- STATE ---
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // STEP 1: Photos
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoItem[]>([]);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // STEP 2: Info
  const [restaurantQuery, setRestaurantQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showRestaurantDropdown, setShowRestaurantDropdown] = useState(false);
  const [searchingRestaurants, setSearchingRestaurants] = useState(false);
  const [restaurantResults, setRestaurantResults] = useState<Restaurant[]>([]);
  const [noResultsFound, setNoResultsFound] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const [taggedUsers, setTaggedUsers] = useState<User[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [followingUsers, setFollowingUsers] = useState<User[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  // STEP 3: Evaluation
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

  // Check for passed restaurant state
  useEffect(() => {
    if (location.state?.restaurant) {
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
      const results = await searchRestaurants(restaurantQuery);
      setRestaurantResults(results);
      setNoResultsFound(results.length === 0);
      setSearchingRestaurants(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [restaurantQuery, searchRestaurants]);

  // Load following users when tag modal opens
  useEffect(() => {
    if (showTagModal && followingUsers.length === 0) {
      loadFollowingUsers();
    }
  }, [showTagModal]);

  const loadFollowingUsers = async () => {
    setLoadingFollowing(true);
    const users = await getFollowingUsers();
    setFollowingUsers(users);
    setLoadingFollowing(false);
  };

  // --- HELPERS ---

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getCriteria = () => {
    if (reviewType === 'presencial') {
      return [
        { key: 'proposta', label: 'Proposta', dbKey: 'score_1' },
        { key: 'comida', label: 'Comida', dbKey: 'score_2' },
        { key: 'apresentacao', label: 'Apresentação', dbKey: 'score_3' },
        { key: 'atendimento', label: 'Atendimento', dbKey: 'score_4' }
      ];
    } else {
      return [
        { key: 'embalagem', label: 'Embalagem', dbKey: 'score_1' },
        { key: 'tempoEntrega', label: 'Tempo de entrega', dbKey: 'score_2' },
        { key: 'qualidadeComida', label: 'Qualidade da comida', dbKey: 'score_3' },
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
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    } else {
      if (selectedPhotos.length > 0) {
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
      if (selectedPhotos.length === 0) return;
      setStep(2);
    } else if (step === 2) {
      if (!selectedRestaurant) {
        showToast("Selecione um restaurante");
        return;
      }
      if (title.length < 1 || title.length > 100) {
        showToast("Título inválido (1-100 caracteres)");
        return;
      }
      if (description.length < 1 || description.length > 700) {
        showToast("Descrição inválida (1-700 caracteres)");
        return;
      }
      setStep(3);
    }
  };

  const handlePostReview = async () => {
    if (posting) return;
    setPosting(true);

    try {
      const criteria = getCriteria();
      
      const reviewData = {
        restaurantId: selectedRestaurant?.id,
        title,
        description,
        reviewType,
        scores: {
          score_1: scores[criteria[0].key as keyof typeof scores],
          score_2: scores[criteria[1].key as keyof typeof scores],
          score_3: scores[criteria[2].key as keyof typeof scores],
          score_4: scores[criteria[3].key as keyof typeof scores]
        },
        photoFiles: selectedPhotos.map(p => p.file),
        taggedUserIds: taggedUsers.map(u => u.id)
      };

      const reviewId = await addReview(reviewData);

      if (reviewId) {
        // Cleanup previews
        selectedPhotos.forEach(p => URL.revokeObjectURL(p.preview));
        showToast("Review publicada!");
        setTimeout(() => navigate('/feed'), 1500);
      } else {
        showToast("Erro ao publicar. Tente novamente.");
        setPosting(false);
      }
    } catch (error) {
      console.error('Erro ao postar review:', error);
      showToast("Erro ao publicar. Tente novamente.");
      setPosting(false);
    }
  };

  // --- ACTIONS: STEP 1 (PHOTOS) ---

  const handleRemovePhoto = (index: number) => {
    const photo = selectedPhotos[index];
    URL.revokeObjectURL(photo.preview);
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

  const onDragStart = (index: number) => setDraggedItemIndex(index);
  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const newPhotos = [...selectedPhotos];
    const draggedItem = newPhotos[draggedItemIndex];
    newPhotos.splice(draggedItemIndex, 1);
    newPhotos.splice(index, 0, draggedItem);
    setSelectedPhotos(newPhotos);
    setDraggedItemIndex(index);
  };
  const onDragEnd = () => setDraggedItemIndex(null);

  // --- ACTIONS: STEP 2 (INFO) ---

  const handleSelectRestaurant = (r: Restaurant) => {
    setSelectedRestaurant(r);
    setRestaurantQuery(r.name);
    setShowRestaurantDropdown(false);
    setNoResultsFound(false);
  };

  const filteredUsersToTag = useMemo(() => {
    if (!tagSearchQuery) return followingUsers;
    const lower = tagSearchQuery.toLowerCase();
    return followingUsers.filter(u => 
      u.full_name?.toLowerCase().includes(lower) || u.username?.toLowerCase().includes(lower)
    );
  }, [tagSearchQuery, followingUsers]);

  const toggleTagUser = (user: User) => {
    if (taggedUsers.find(u => u.id === user.id)) {
      setTaggedUsers(prev => prev.filter(u => u.id !== user.id));
    } else {
      setTaggedUsers(prev => [...prev, user]);
    }
  };
  
  // --- ACTIONS: STEP 3 (EVALUATION) ---
  
  const handleScoreChange = (key: string, value: number) => {
    setScores(prev => ({ ...prev, [key]: value }));
  };

  // --- RENDERS ---

  const renderStep1 = () => (
    <div className="p-6">
      {/* Selected Photos */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
            Fotos selecionadas ({selectedPhotos.length}/5)
          </h2>
          {selectedPhotos.length > 0 && (
            <span className="text-[10px] text-gray-400">Arraste para ordenar</span>
          )}
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
          {Array.from({ length: 5 }).map((_, i) => {
            const photo = selectedPhotos[i];
            if (photo) {
              return (
                <div 
                  key={photo.id}
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragOver={(e) => onDragOver(e, i)}
                  onDragEnd={onDragEnd}
                  className={`relative size-24 shrink-0 rounded-2xl overflow-hidden border border-black/5 shadow-sm transition-transform ${
                    draggedItemIndex === i ? 'opacity-50 scale-90' : 'opacity-100'
                  }`}
                >
                  <img src={photo.preview} className="w-full h-full object-cover" alt="Selected" />
                  <button 
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full size-6 flex items-center justify-center hover:bg-red-500 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/40 px-1.5 rounded text-[10px] text-white font-bold">
                    {i + 1}
                  </div>
                </div>
              );
            } else {
              return (
                <div 
                  key={`empty-${i}`} 
                  className="size-24 shrink-0 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50/50"
                >
                  {i === selectedPhotos.length ? (
                    <span className="material-symbols-outlined text-gray-300">add_photo_alternate</span>
                  ) : (
                    <span className="text-gray-200 text-xs font-bold">{i + 1}</span>
                  )}
                </div>
              );
            }
          })}
        </div>
      </div>

      <div className="h-px bg-black/5 w-full mb-8"></div>

      {/* Upload Options */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Adicionar fotos</h2>
        
        <input 
          type="file" 
          accept="image/*" 
          capture="environment"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
        />

        {/* Camera Button */}
        <button 
          onClick={() => {
            if (selectedPhotos.length >= 5) {
              showToast("Máximo de 5 fotos atingido");
            } else {
              fileInputRef.current?.click();
            }
          }}
          className="w-full h-14 bg-dark text-white rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
        >
          <span className="material-symbols-outlined filled">photo_camera</span>
          TIRAR FOTO
        </button>

        {/* Gallery Button */}
        <button 
          onClick={() => {
            if (selectedPhotos.length >= 5) {
              showToast("Máximo de 5 fotos atingido");
            } else {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.multiple = true;
              input.onchange = (e) => {
                const target = e.target as HTMLInputElement;
                if (target.files) {
                  handleFileChange({ target } as React.ChangeEvent<HTMLInputElement>);
                }
              };
              input.click();
            }
          }}
          className="w-full h-14 bg-white text-dark border-2 border-gray-200 rounded-2xl font-bold text-lg shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-transform hover:border-primary"
        >
          <span className="material-symbols-outlined">photo_library</span>
          ESCOLHER DA GALERIA
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          Máximo 5 fotos • 10MB por foto
        </p>
      </div>
    </div>
  );

  const renderStep2 = () => (
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

      {/* Title Input */}
      <div className="space-y-2">
        <label className="text-sm font-bold ml-1 flex items-center gap-1">
          Título <span className="text-primary">*</span>
        </label>
        <input 
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="Ex: A melhor pizza da cidade"
          className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 bg-white outline-none font-medium focus:border-primary shadow-sm transition-colors"
        />
        <div className="text-right text-xs text-gray-400 font-medium">
          {title.length}/100
        </div>
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

      {/* Tag People */}
      <div className="space-y-3">
        <label className="text-sm font-bold ml-1">Marcar pessoas</label>
        
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
          <span className="material-symbols-outlined">add</span> Adicionar
        </button>
      </div>

      {/* --- TAG MODAL --- */}
      {showTagModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTagModal(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-sm h-[70vh] shadow-2xl overflow-hidden flex flex-col animate-bounce-in">
            
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">Marcar pessoas</h3>
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
                Pessoas que você segue
              </p>
              
              {loadingFollowing ? (
                <div className="flex justify-center py-10">
                  <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                </div>
              ) : filteredUsersToTag.length > 0 ? (
                filteredUsersToTag.map(u => {
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
                  <p className="text-sm">Você ainda não segue ninguém</p>
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

  const renderStep3 = () => {
    const activeCriteria = getCriteria();
    const average = calculateAverage();

    return (
      <div className="p-6 space-y-8">
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

        {/* Sliders */}
        <div className="space-y-8">
          {activeCriteria.map(({ key, label }) => {
            const val = scores[key as keyof typeof scores];
            return (
              <div key={key} className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-bold text-gray-600">{label}</label>
                  <span className="font-bold text-primary text-lg">{val.toFixed(1)}</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={val}
                  onChange={(e) => handleScoreChange(key, parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
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
            <span className="text-xl font-black text-yellow-500">{average}</span>
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
                PUBLICANDO...
              </>
            ) : (
              'POSTAR REVIEW'
            )}
          </button>
        </div>
      </div>
    );
  };

  const canProceedStep2 = selectedRestaurant && title.length > 0 && title.length <= 100 && description.length > 0 && description.length <= 700;

  return (
    <div className="min-h-screen bg-cream flex flex-col relative">
      
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
            <p className="text-secondary text-sm mb-6">Suas fotos selecionadas serão perdidas.</p>
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
        <span className="font-bold text-lg">Nova Review</span>
        
        {step < 3 ? (
          <button 
            onClick={handleNext}
            disabled={step === 1 ? selectedPhotos.length === 0 : !canProceedStep2}
            className={`font-bold text-sm px-3 py-1.5 rounded-full transition-colors ${
              (step === 1 && selectedPhotos.length > 0) || (step === 2 && canProceedStep2) 
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
      
      <main className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {/* Step Progress */}
        <div className="px-6 pt-4 flex gap-2">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-gray-200'}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-gray-200'}`} />
        </div>
        
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </main>

    </div>
  );
};