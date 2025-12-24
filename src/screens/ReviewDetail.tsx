import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Review, Comment } from '../types';
import { useAppContext } from '../AppContext';
import { DEFAULT_AVATAR } from '../constants';

export const ReviewDetail: React.FC = () => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();
  const { currentUser, supabase, toggleLike } = useAppContext();
  
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Fetch review data
  useEffect(() => {
    const fetchReview = async () => {
      if (!reviewId) return;

      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          user:profiles!user_id(id, username, full_name, profile_photo_url, is_verified),
          restaurant:restaurants!restaurant_id(id, name, neighborhood, photo_url)
        `)
        .eq('id', reviewId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error('Review não encontrada:', error);
        navigate('/feed');
        return;
      }

      setReview(data as Review);
      setLoading(false);

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select(`*, user:profiles!user_id(id, username, full_name, profile_photo_url)`)
        .eq('review_id', reviewId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (commentsData) {
        setComments(commentsData as Comment[]);
      }
    };

    fetchReview();
  }, [reviewId, supabase, navigate]);

  // Show login modal after 3 seconds if not logged in
  useEffect(() => {
    if (!currentUser && !loading) {
      const timer = setTimeout(() => {
        setShowLoginModal(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentUser, loading]);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR');
  };

  const getReviewTypeLabel = (reviewType: string | undefined) => {
    if (reviewType === 'delivery') return 'Delivery';
    if (reviewType === 'in_person') return 'Presencial';
    return 'Presencial';
  };

  const handleShare = () => {
    const postUrl = window.location.href;
    const message = `Acabei de ver esse post no app da Fomí e lembrei de você: ${postUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleLike = async () => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    if (review) {
      await toggleLike(review.id);
      // Refresh review data
      const { data } = await supabase
        .from('reviews')
        .select('likes_count')
        .eq('id', review.id)
        .single();
      if (data) {
        setReview(prev => prev ? { ...prev, likes_count: data.likes_count, is_liked: !prev.is_liked } : null);
      }
    }
  };

  const handlePhotoScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollLeft = container.scrollLeft;
    const width = container.offsetWidth;
    const index = Math.round(scrollLeft / width);
    setPhotoIndex(index);
  };

  const hasPhotos = review?.photos && review.photos.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-gray-500">Review não encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-24">
      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-bounce-in p-6 text-center">
            <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <img src="/logo-fomi-vermelho.png" alt="Fomí" className="h-8" />
            </div>
            <h3 className="font-bold text-xl text-dark mb-2">Quer continuar vendo?</h3>
            <p className="text-gray-500 text-sm mb-6">
              Faça cadastro ou login para ver mais reviews incríveis e descobrir os melhores restaurantes!
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/signup')}
                className="w-full py-3.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
              >
                Criar conta grátis
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="w-full py-3.5 rounded-xl border-2 border-gray-200 text-dark font-bold hover:bg-gray-50 transition-colors"
              >
                Já tenho conta
              </button>
              <button 
                onClick={() => setShowLoginModal(false)}
                className="w-full py-2 text-gray-400 text-sm font-medium"
              >
                Continuar olhando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur-md border-b border-black/5 px-4 h-14 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="font-bold text-lg">Post</span>
      </header>

      {/* Review Card */}
      <main className="px-4 pt-4">
        <article className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
          
          {/* User Header */}
          <div className="flex items-center justify-between p-4 pb-2">
            <div 
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => currentUser ? navigate(`/profile/@${review.user?.username}`) : setShowLoginModal(true)}
            >
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
                  {getReviewTypeLabel(review.review_type)}
                  <span className="text-[10px]">•</span>
                  {formatTimeAgo(review.created_at)}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {!hasPhotos && (
                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full">
                  <span className="text-yellow-500 text-xs font-bold">{review.average_score?.toFixed(1) || '0.0'}</span>
                  <span className="text-yellow-400 text-xs">★</span>
                </div>
              )}
            </div>
          </div>

          {/* Photo Carousel */}
          {hasPhotos ? (
            <div className="relative w-full aspect-[4/5] bg-gray-100">
              <div 
                className="w-full h-full overflow-x-auto snap-x snap-mandatory flex no-scrollbar"
                onScroll={handlePhotoScroll}
              >
                {review.photos!.map((photo, idx) => (
                  <img 
                    key={idx} 
                    src={photo.url} 
                    className="w-full h-full object-cover shrink-0 snap-center" 
                    alt="Review" 
                  />
                ))}
              </div>
              
              <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs font-bold">
                {review.average_score?.toFixed(1) || '0.0'} <span className="text-yellow-400">★</span>
              </div>
              
              {review.photos!.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {review.photos!.map((_, i) => (
                    <div 
                      key={i} 
                      className={`size-1.5 rounded-full transition-colors ${i === photoIndex ? 'bg-white' : 'bg-white/50'}`} 
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 pb-3">
              <p className="text-[15px] text-dark leading-relaxed whitespace-pre-wrap">
                {review.description}
              </p>
            </div>
          )}

          {/* Actions Bar */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button onClick={handleLike} className="flex items-center gap-1 group">
                <span className={`material-symbols-outlined text-[26px] transition-transform active:scale-75 ${review.is_liked ? 'filled text-red-500' : 'text-dark group-hover:text-red-500'}`}>favorite</span>
              </button>
              <button className="flex items-center gap-1 group">
                <span className="material-symbols-outlined text-[26px] text-dark group-hover:text-primary transition-colors">chat_bubble</span>
              </button>
              <button onClick={handleShare} className="flex items-center gap-1 group">
                <span className="material-symbols-outlined text-[26px] text-dark group-hover:text-primary transition-colors">send</span>
              </button>
            </div>
            <button onClick={() => currentUser ? null : setShowLoginModal(true)}>
              <span className={`material-symbols-outlined text-[28px] transition-transform active:scale-75 ${review.is_saved ? 'filled text-primary' : 'text-dark'}`}>bookmark</span>
            </button>
          </div>
          
          {/* Description (for posts with photos) */}
          {hasPhotos && (
            <div className="px-4 pb-5">
              <div className="text-sm font-bold text-dark mb-1">{review.likes_count || 0} curtidas</div>
              <p className="text-sm text-dark leading-relaxed">
                <span className="font-bold mr-2">{review.user?.username}</span>
                {review.description}
              </p>
            </div>
          )}

          {/* Likes for text-only posts */}
          {!hasPhotos && (
            <div className="px-4 pb-5 pt-0">
              <div className="text-sm font-bold text-dark">{review.likes_count || 0} curtidas</div>
            </div>
          )}
        </article>

        {/* Comments Section */}
        <div className="mt-4 bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-dark">Comentários ({comments.length})</h3>
          </div>
          
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <span className="material-symbols-outlined text-3xl mb-2 block opacity-50">chat_bubble</span>
                <p className="text-sm">Nenhum comentário ainda</p>
              </div>
            ) : (
              comments.map(c => (
                <div key={c.id} className="flex gap-3">
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
                    <span className="text-xs text-gray-400">{formatTimeAgo(c.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <div className="p-4 border-t border-gray-100">
            <button 
              onClick={() => currentUser ? null : setShowLoginModal(true)}
              className="w-full bg-gray-100 rounded-full py-2.5 px-4 text-sm text-gray-400 text-left"
            >
              {currentUser ? 'Adicione um comentário...' : 'Faça login para comentar...'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};