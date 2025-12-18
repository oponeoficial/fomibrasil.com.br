import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Navigation';
import { Review, Comment } from '../types';
import { useAppContext } from '../AppContext';
import { DEFAULT_AVATAR } from '../constants';

// --- SUB-COMPONENTS ---

const SkeletonReviewCard = () => (
  <div className="bg-cream mb-6 border-b border-black/5 pb-2 animate-pulse">
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-black/5"></div>
        <div className="flex flex-col gap-2">
          <div className="h-3 w-24 bg-black/5 rounded"></div>
          <div className="h-2 w-16 bg-black/5 rounded"></div>
        </div>
      </div>
      <div className="size-8 rounded-full bg-black/5"></div>
    </div>
    <div className="w-full aspect-[4/5] bg-black/5"></div>
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-5">
          <div className="size-7 rounded-full bg-black/5"></div>
          <div className="size-7 rounded-full bg-black/5"></div>
          <div className="size-7 rounded-full bg-black/5"></div>
        </div>
        <div className="flex items-center gap-5">
           <div className="size-7 rounded-full bg-black/5"></div>
           <div className="size-7 rounded-full bg-black/5"></div>
        </div>
      </div>
      <div className="h-3 w-20 bg-black/5 rounded mb-3"></div>
      <div className="space-y-2 mb-3">
        <div className="h-3 w-full bg-black/5 rounded"></div>
        <div className="h-3 w-2/3 bg-black/5 rounded"></div>
      </div>
      <div className="h-2 w-12 bg-black/5 rounded"></div>
    </div>
  </div>
);

const CommentsModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void;
  review: Review | null;
}> = ({ isOpen, onClose, review }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [sending, setSending] = useState(false);
  const { currentUser, fetchComments, addComment } = useAppContext();

  // Fetch comments when modal opens
  useEffect(() => {
    if (isOpen && review) {
      setLoadingComments(true);
      fetchComments(review.id).then(data => {
        setComments(data);
        setLoadingComments(false);
      });
    }
  }, [isOpen, review?.id]);

  if (!isOpen || !review) return null;

  const handleSend = async () => {
    if (!newComment.trim() || !currentUser || sending) return;
    
    setSending(true);
    const comment = await addComment(review.id, newComment.trim());
    
    if (comment) {
      setComments(prev => [...prev, comment]);
      setNewComment('');
    }
    setSending(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl h-[75vh] flex flex-col shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
           <span className="w-8"></span>
           <h3 className="font-bold text-dark">Comentários</h3>
           <button onClick={onClose} className="w-8 flex justify-end">
             <span className="material-symbols-outlined">close</span>
           </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
           {/* Post Description as first item context */}
           <div className="flex gap-3 pb-4 border-b border-gray-50">
             <img 
               src={review.user?.profile_photo_url || DEFAULT_AVATAR} 
               className="size-8 rounded-full object-cover shrink-0" 
               alt="Author" 
             />
             <div className="flex-1">
               <div className="text-sm">
                 <span className="font-bold mr-2">{review.user?.username}</span>
                 {review.description}
               </div>
               <p className="text-xs text-gray-400 mt-1">{formatDate(review.created_at)}</p>
             </div>
           </div>

           {loadingComments ? (
             <div className="flex justify-center py-8">
               <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
             </div>
           ) : comments.length === 0 ? (
             <div className="text-center py-8 text-gray-400">
               <span className="material-symbols-outlined text-3xl mb-2 block opacity-50">chat_bubble</span>
               <p className="text-sm">Nenhum comentário ainda</p>
               <p className="text-xs">Seja o primeiro a comentar!</p>
             </div>
           ) : (
             comments.map(c => (
               <div key={c.id} className="flex gap-3 relative group">
                  <img 
                    src={c.user?.profile_photo_url || DEFAULT_AVATAR} 
                    className="size-8 rounded-full object-cover shrink-0" 
                    alt="User" 
                  />
                  <div className="flex-1">
                     <div className="text-sm">
                        <span className="font-bold mr-2">{c.user?.username}</span>
                        {c.content}
                     </div>
                     <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                     </div>
                  </div>
               </div>
             ))
           )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 bg-white pb-safe">
           <div className="flex items-center gap-3">
              <img 
                src={currentUser?.profile_photo_url || DEFAULT_AVATAR} 
                className="size-8 rounded-full object-cover" 
                alt="Me" 
              />
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Adicione um comentário..."
                  className="w-full bg-gray-100 rounded-full py-2.5 pl-4 pr-16 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                />
                <button 
                  onClick={handleSend}
                  disabled={!newComment.trim() || sending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-primary font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/10 px-2 py-1 rounded-md transition-all"
                >
                  {sending ? (
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  ) : (
                    'Enviar'
                  )}
                </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const ListModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  review: Review | null;
  onShowToast: (msg: string) => void;
}> = ({ isOpen, onClose, review, onShowToast }) => {
  const { lists, addRestaurantToList, removeRestaurantFromList, createList } = useAppContext();
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListPrivate, setNewListPrivate] = useState(false);
  
  if (!isOpen || !review) return null;

  const toggleList = async (listId: string) => {
    const list = lists.find(l => l.id === listId);
    if (!list) return;

    const isInList = list.items?.includes(review.restaurant_id);
    
    if (isInList) {
      await removeRestaurantFromList(listId, review.restaurant_id);
      onShowToast(`Removido de ${list.name}`);
    } else {
      await addRestaurantToList(listId, review.restaurant_id);
      onShowToast(`Salvo em ${list.name}`);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    await createList(newListName.trim(), newListPrivate);
    setNewListName('');
    setNewListPrivate(false);
    setShowCreate(false);
    onShowToast('Lista criada!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
       <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-bounce-in overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
             <span className="w-6"></span>
             <h3 className="font-bold text-dark">Salvar em...</h3>
             <button onClick={onClose} className="w-6">
               <span className="material-symbols-outlined text-gray-500">close</span>
             </button>
          </div>
          
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
             {lists.map(list => {
               const isChecked = list.items?.includes(review.restaurant_id);
               return (
                <button 
                  key={list.id} 
                  onClick={() => toggleList(list.id)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${list.is_default ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                       <span className="material-symbols-outlined text-[20px] filled">
                         {list.is_default ? 'bookmark' : 'folder'}
                       </span>
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-dark block">{list.name}</span>
                      <span className="text-xs text-gray-400">{list.count || 0} lugares</span>
                    </div>
                  </div>
                  <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-colors ${isChecked ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                     {isChecked && <span className="material-symbols-outlined text-white text-[16px]">check</span>}
                  </div>
                </button>
               );
             })}
          </div>

          {showCreate ? (
            <div className="p-4 border-t border-gray-100 space-y-3">
              <input
                type="text"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="Nome da lista"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                autoFocus
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newListPrivate}
                  onChange={e => setNewListPrivate(e.target.checked)}
                  className="accent-primary"
                />
                Lista privada
              </label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-500"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateList}
                  disabled={!newListName.trim()}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-bold disabled:opacity-50"
                >
                  Criar
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 pt-0">
               <button 
                 onClick={() => setShowCreate(true)}
                 className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-bold hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
               >
                  <span className="material-symbols-outlined">add</span> Criar nova lista
               </button>
            </div>
          )}
       </div>
    </div>
  );
};

const OptionsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  review: Review | null;
}> = ({ isOpen, onClose, review }) => {
  const [reportView, setReportView] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const { currentUser, supabase } = useAppContext();

  if (!isOpen || !review) return null;

  const isMyPost = review.user_id === currentUser?.id;

  const handleReport = async () => {
    if (!currentUser || !reportReason) return;

    await supabase.from('reports').insert({
      reporter_id: currentUser.id,
      reported_review_id: review.id,
      reason: reportReason
    });

    alert('Denúncia enviada. Obrigado.');
    onClose();
    setReportView(false);
    setReportReason('');
  };

  if (reportView) {
    return (
       <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setReportView(false); onClose(); }} />
          <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-bounce-in p-6">
             <h3 className="font-bold text-lg mb-4">Por que você está denunciando?</h3>
             <div className="space-y-3 mb-6">
               {['Spam', 'Conteúdo impróprio', 'Informação falsa', 'Assédio ou bullying', 'Outro'].map(r => (
                 <label key={r} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <input 
                      type="radio" 
                      name="report" 
                      value={r} 
                      onChange={e => setReportReason(e.target.value)} 
                      className="accent-primary size-5" 
                    />
                    <span className="font-medium text-dark">{r}</span>
                 </label>
               ))}
             </div>
             {reportReason === 'Outro' && (
                <textarea 
                  className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm mb-4 outline-none focus:border-primary" 
                  placeholder="Detalhes (opcional)"
                ></textarea>
             )}
             <div className="flex gap-3">
               <button onClick={() => setReportView(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 border-2 border-gray-100">Cancelar</button>
               <button onClick={handleReport} disabled={!reportReason} className="flex-1 py-3 rounded-xl font-bold bg-primary text-white disabled:opacity-50">Denunciar</button>
             </div>
          </div>
       </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
       <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
       <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl animate-slide-up space-y-2">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
          
          {isMyPost ? (
            <>
              <button className="w-full p-4 rounded-xl bg-gray-50 font-bold text-dark flex items-center gap-3 hover:bg-gray-100 transition-colors">
                 <span className="material-symbols-outlined">edit</span> Editar
              </button>
              <button className="w-full p-4 rounded-xl bg-red-50 font-bold text-red-500 flex items-center gap-3 hover:bg-red-100 transition-colors">
                 <span className="material-symbols-outlined">delete</span> Excluir
              </button>
            </>
          ) : (
            <button onClick={() => setReportView(true)} className="w-full p-4 rounded-xl bg-red-50 font-bold text-red-500 flex items-center gap-3 hover:bg-red-100 transition-colors">
               <span className="material-symbols-outlined">report</span> Denunciar
            </button>
          )}
          
          <button onClick={onClose} className="w-full p-4 rounded-xl font-bold text-dark mt-2 hover:bg-gray-50 transition-colors">
             Cancelar
          </button>
       </div>
    </div>
  );
};


// --- MAIN COMPONENT ---

export const Feed: React.FC = () => {
  const navigate = useNavigate();
  const { reviews, toggleSaveRestaurant, toggleLike, following, refreshFeed, loading, currentUser } = useAppContext();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'For You' | 'Friends'>('For You');
  
  // Interactions State
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pull to Refresh State
  const [pullY, setPullY] = useState(0);
  const startY = useRef(0);
  const isDragging = useRef(false);

  // Modals State
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'comments' | 'lists' | 'options' | null>(null);

  // Photo carousel state per review
  const [photoIndexes, setPhotoIndexes] = useState<Record<string, number>>({});

  // Pull to Refresh Logic
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        isDragging.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      if (window.scrollY > 0) {
        isDragging.current = false;
        setPullY(0);
        return;
      }
      const currentY = e.touches[0].clientY;
      const dy = currentY - startY.current;
      if (dy > 0) {
        const damped = Math.min(dy * 0.4, 150); 
        setPullY(damped);
        if (e.cancelable && dy > 10) e.preventDefault(); 
      } else {
        setPullY(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (pullY > 60) {
        setPullY(60); 
        setRefreshing(true);
        refreshFeed().then(() => {
          setRefreshing(false);
          setPullY(0);
          if (navigator.vibrate) navigator.vibrate(50);
        });
      } else {
        setPullY(0);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullY, refreshing, refreshFeed]);

  const displayedReviews = useMemo(() => {
    if (activeTab === 'For You') return reviews;
    return reviews.filter(r => following.includes(r.user_id) || r.user_id === currentUser?.id);
  }, [reviews, activeTab, following, currentUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleLike = async (id: string) => {
    await toggleLike(id);
  };

  const handleToggleSave = async (review: Review) => {
    const isSaved = await toggleSaveRestaurant(review.restaurant_id);
    if (isSaved) showToast('Salvo em Quero ir!');
    else showToast('Removido de Quero ir');
  };

  const handleShare = async () => {
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Review no Fomí',
                text: 'Olha que lugar incrível!',
                url: window.location.href
            });
        } catch (e) { console.log('Share aborted'); }
    } else {
        navigator.clipboard.writeText(window.location.href);
        showToast('Link copiado!');
    }
  };

  const getActiveReview = () => reviews.find(r => r.id === activeReviewId) || null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR');
  };

  const handlePhotoScroll = (reviewId: string, e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollLeft = container.scrollLeft;
    const width = container.offsetWidth;
    const index = Math.round(scrollLeft / width);
    setPhotoIndexes(prev => ({ ...prev, [reviewId]: index }));
  };

  return (
    <div className="min-h-screen bg-cream pb-24 relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[80] animate-bounce-in">
          <div className="bg-dark/90 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-base filled text-primary">bookmark</span>
            {toastMessage}
          </div>
        </div>
      )}

      {/* Modals */}
      <CommentsModal 
        isOpen={modalType === 'comments'} 
        onClose={() => setModalType(null)} 
        review={getActiveReview()} 
      />
      <ListModal 
        isOpen={modalType === 'lists'} 
        onClose={() => setModalType(null)} 
        review={getActiveReview()} 
        onShowToast={showToast}
      />
      <OptionsModal 
        isOpen={modalType === 'options'} 
        onClose={() => setModalType(null)} 
        review={getActiveReview()} 
      />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur-md border-b border-black/5 transition-shadow shadow-sm pb-3">
        <div className="flex items-center justify-between px-4 h-16 mb-1">
          <button onClick={() => setSidebarOpen(true)} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 active:bg-black/10 transition-colors">
            <span className="material-symbols-outlined text-3xl text-dark">menu</span>
          </button>
          
          <div className="flex items-center justify-center">
             <img 
               src="/logo-fomi-vermelho.png" 
               alt="Fomí" 
               className="h-10 object-contain"
             />
          </div>
          
          <button onClick={() => navigate('/notifications')} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 active:bg-black/10 transition-colors relative">
            <span className="material-symbols-outlined text-3xl text-dark">notifications</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-6">
           <button 
             onClick={() => setActiveTab('For You')}
             className={`pb-2 text-sm font-bold transition-all relative ${activeTab === 'For You' ? 'text-dark' : 'text-gray-400'}`}
           >
             Para Você
             {activeTab === 'For You' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-scale-in" />}
           </button>
           <button 
             onClick={() => setActiveTab('Friends')}
             className={`pb-2 text-sm font-bold transition-all relative ${activeTab === 'Friends' ? 'text-dark' : 'text-gray-400'}`}
           >
             Amigos
             {activeTab === 'Friends' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-scale-in" />}
           </button>
        </div>
      </header>
      
      {/* Pull Refresh Indicator */}
      <div 
        className="fixed top-28 left-0 right-0 flex justify-center pointer-events-none transition-transform duration-200 z-20"
        style={{ transform: `translateY(${pullY - 40}px)` }}
      >
        <div className={`bg-white size-10 rounded-full shadow-lg flex items-center justify-center ${refreshing ? 'animate-spin' : ''}`}>
           <span className="material-symbols-outlined text-primary">{refreshing ? 'refresh' : 'arrow_downward'}</span>
        </div>
      </div>

      {/* Feed Content */}
      <main className="px-4 pt-4 space-y-6">
        {loading ? (
           <>
             {Array.from({ length: 3 }).map((_, i) => <SkeletonReviewCard key={i} />)}
           </>
        ) : displayedReviews.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <span className="material-symbols-outlined text-5xl mb-4 opacity-20">sentiment_dissatisfied</span>
              <p className="font-bold text-dark">Nada por aqui ainda.</p>
              <p className="text-sm">Siga mais pessoas ou poste sua primeira review!</p>
              <button 
                onClick={() => navigate('/discover')}
                className="mt-4 px-6 py-2 bg-primary text-white rounded-full font-bold"
              >
                Explorar restaurantes
              </button>
           </div>
        ) : (
           displayedReviews.map((review) => {
             const currentPhotoIndex = photoIndexes[review.id] || 0;
             
             return (
               <article key={review.id} className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden animate-fade-in">
                 
                 {/* User Header */}
                 <div className="flex items-center justify-between p-4 pb-2">
                   <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/@${review.user?.username}`)}>
                      <img 
                        src={review.user?.profile_photo_url || DEFAULT_AVATAR} 
                        className="size-10 rounded-full object-cover border border-gray-100" 
                        alt={review.user?.username} 
                      />
                      <div className="leading-tight">
                         <div className="flex items-center gap-1">
                           <p className="font-bold text-sm text-dark">{review.user?.username}</p>
                           {review.user?.is_verified && (
  <img src="/selo-verificado.png" alt="Verificado" className="size-4" />
)}
                         </div>
                         <p className="text-xs text-gray-500 flex items-center gap-1">
                           {review.restaurant?.name} 
                           <span className="text-[10px]">•</span> 
                           {formatDate(review.created_at)}
                         </p>
                      </div>
                   </div>
                   <button onClick={() => { setActiveReviewId(review.id); setModalType('options'); }} className="text-gray-400 hover:text-dark p-1">
                      <span className="material-symbols-outlined">more_horiz</span>
                   </button>
                 </div>

                 {/* Photo Carousel (Snap) */}
                 <div className="relative w-full aspect-[4/5] bg-gray-100">
                    <div 
                      className="w-full h-full overflow-x-auto snap-x snap-mandatory flex no-scrollbar"
                      onScroll={(e) => handlePhotoScroll(review.id, e)}
                    >
                      {review.photos && review.photos.length > 0 ? (
                        review.photos.map((photo, idx) => (
                           <img 
                             key={idx} 
                             src={photo.url} 
                             className="w-full h-full object-cover shrink-0 snap-center" 
                             alt="Review" 
                           />
                        ))
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <span className="material-symbols-outlined text-4xl text-gray-400">image</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs font-bold">
                       {review.average_score?.toFixed(1) || '0.0'} <span className="text-yellow-400">★</span>
                    </div>
                    
                    {review.photos && review.photos.length > 1 && (
                       <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {review.photos.map((_, i) => (
                             <div 
                               key={i} 
                               className={`size-1.5 rounded-full transition-colors ${i === currentPhotoIndex ? 'bg-white' : 'bg-white/50'}`} 
                             />
                          ))}
                       </div>
                    )}
                 </div>

                 {/* Actions Bar */}
                 <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                       <button onClick={() => handleToggleLike(review.id)} className="flex items-center gap-1 group">
                          <span className={`material-symbols-outlined text-[26px] transition-transform active:scale-75 ${review.is_liked ? 'filled text-red-500' : 'text-dark group-hover:text-red-500'}`}>favorite</span>
                       </button>
                       <button onClick={() => { setActiveReviewId(review.id); setModalType('comments'); }} className="flex items-center gap-1 group">
                          <span className="material-symbols-outlined text-[26px] text-dark group-hover:text-primary transition-colors">chat_bubble</span>
                       </button>
                       <button onClick={handleShare} className="flex items-center gap-1 group">
                          <span className="material-symbols-outlined text-[26px] text-dark group-hover:text-primary transition-colors">send</span>
                       </button>
                    </div>
                    <button onClick={() => { setActiveReviewId(review.id); setModalType('lists'); }}>
                       <span className={`material-symbols-outlined text-[28px] transition-transform active:scale-75 ${review.is_saved ? 'filled text-primary' : 'text-dark'}`}>bookmark</span>
                    </button>
                 </div>
                 
                 {/* Description */}
                 <div className="px-4 pb-5">
                    <div className="text-sm font-bold text-dark mb-1">{review.likes_count || 0} curtidas</div>
                    <p className="text-sm text-dark leading-relaxed">
                       <span className="font-bold mr-2">{review.user?.username}</span>
                       {review.description}
                    </p>
                    {(review.comments_count || 0) > 0 && (
                      <button 
                        onClick={() => { setActiveReviewId(review.id); setModalType('comments'); }}
                        className="text-gray-500 text-xs mt-2 font-medium"
                      >
                        Ver todos os {review.comments_count} comentários
                      </button>
                    )}
                 </div>

               </article>
             );
           })
        )}
      </main>
    </div>
  );
};