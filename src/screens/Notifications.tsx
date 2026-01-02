import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../AppContext';
import { DEFAULT_AVATAR, DEFAULT_RESTAURANT } from '../constants';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'new_follower' | 'tag' | 'new_review';
  actor_id: string;
  actor?: {
    id: string;
    username: string;
    full_name: string;
    profile_photo_url: string;
  };
  review_id?: string;
  review?: {
    id: string;
    title: string;
    photos: { url: string }[];
    restaurant?: {
      name: string;
    };
  };
  is_read: boolean;
  created_at: string;
}

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { supabase, currentUser, following, followUser, unfollowUser } = useAppContext();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingState, setFollowingState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser]);

  // Initialize following state from context
  useEffect(() => {
    const state: Record<string, boolean> = {};
    following.forEach(id => { state[id] = true; });
    setFollowingState(state);
  }, [following]);

  const fetchNotifications = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles!actor_id(id, username, full_name, profile_photo_url),
          review:reviews!review_id(
            id, 
            title, 
            photos,
            restaurant:restaurants!restaurant_id(name)
          )
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data as Notification[]);

      // Mark all as read after fetching
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUser.id)
        .eq('is_read', false);

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (actorId: string) => {
    const isCurrentlyFollowing = followingState[actorId];
    
    // Optimistic update
    setFollowingState(prev => ({ ...prev, [actorId]: !isCurrentlyFollowing }));
    
    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(actorId);
      } else {
        await followUser(actorId);
      }
    } catch (err) {
      // Revert on error
      setFollowingState(prev => ({ ...prev, [actorId]: isCurrentlyFollowing }));
    }
  };

  const getNotificationContent = (notif: Notification): { text: string; target?: string } => {
    switch (notif.type) {
      case 'like':
        return {
          text: 'curtiu seu review de',
          target: notif.review?.restaurant?.name || notif.review?.title
        };
      case 'comment':
        return {
          text: 'comentou em seu review de',
          target: notif.review?.restaurant?.name || notif.review?.title
        };
      case 'new_follower':
        return { text: 'começou a seguir você' };
      case 'tag':
        return {
          text: 'marcou você em um review de',
          target: notif.review?.restaurant?.name
        };
      case 'new_review':
        return {
          text: 'postou um novo review de',
          target: notif.review?.restaurant?.name
        };
      default:
        return { text: 'interagiu com você' };
    }
  };

  const getNotificationIcon = (type: string): { icon: string; color: string } => {
    switch (type) {
      case 'like':
        return { icon: 'favorite', color: 'text-red-500' };
      case 'comment':
        return { icon: 'chat_bubble', color: 'text-blue-500' };
      case 'new_follower':
        return { icon: 'person_add', color: 'text-primary' };
      case 'tag':
        return { icon: 'sell', color: 'text-purple-500' };
      case 'new_review':
        return { icon: 'rate_review', color: 'text-green-500' };
      default:
        return { icon: 'notifications', color: 'text-gray-500' };
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const getReviewImage = (notif: Notification): string | null => {
    if (notif.review?.photos && notif.review.photos.length > 0) {
      return notif.review.photos[0].url;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur-sm border-b border-black/5 px-4 h-16 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold">Notificações</h1>
      </header>

      <main className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-400 text-sm">Carregando...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-3 opacity-30">notifications_none</span>
            <p className="font-bold text-dark">Você está em dia! 🎉</p>
            <p className="text-sm mt-1">Nenhuma notificação no momento</p>
          </div>
        ) : (
          notifications.map(notif => {
            const content = getNotificationContent(notif);
            const iconInfo = getNotificationIcon(notif.type);
            const reviewImage = getReviewImage(notif);
            const isFollowingActor = followingState[notif.actor_id];

            // Handler para navegação ao clicar na notificação
            const handleNotificationClick = () => {
              if (notif.type === 'new_follower') {
                // Vai para o perfil da pessoa
                if (notif.actor?.username) {
                  navigate(`/profile/@${notif.actor.username}`);
                }
              } else if (notif.review_id) {
                // Vai para o detalhe da review
                navigate(`/review/${notif.review_id}`);
              }
            };

            return (
              <div
                key={notif.id}
                onClick={handleNotificationClick}
                className={`flex items-start gap-3 p-4 border-b border-black/5 transition-colors cursor-pointer ${
                  !notif.is_read ? 'bg-primary/5' : 'hover:bg-black/[0.02]'
                }`}
              >
                {/* User Avatar with Icon Badge */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (notif.actor?.username) navigate(`/profile/@${notif.actor.username}`);
                  }}
                  className="relative shrink-0"
                >
                  <img 
                    src={notif.actor?.profile_photo_url || DEFAULT_AVATAR} 
                    className="size-12 rounded-full object-cover border border-black/5" 
                    alt={notif.actor?.full_name}
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                  />
                  <div className="absolute -bottom-1 -right-1 size-5 rounded-full border-2 border-cream flex items-center justify-center bg-white shadow-sm">
                    <span className={`material-symbols-outlined text-[12px] ${iconInfo.color} filled`}>
                      {iconInfo.icon}
                    </span>
                  </div>
                </button>
                
                {/* Content */}
                <div className="flex-1 text-sm pt-0.5 min-w-0">
                  <p className="text-dark leading-snug">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (notif.actor?.username) navigate(`/profile/@${notif.actor.username}`);
                      }}
                      className="font-bold hover:underline"
                    >
                      {notif.actor?.full_name || 'Usuário'}
                    </button>
                    {' '}{content.text}
                    {content.target && (
                      <span className="font-bold"> {content.target}</span>
                    )}
                  </p>
                  <p className="text-gray-400 text-xs mt-1 font-medium">{formatTime(notif.created_at)}</p>
                </div>

                {/* Action (Image or Button) */}
                {reviewImage && (
                  <img
                    src={reviewImage}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (notif.review_id) navigate(`/review/${notif.review_id}`);
                    }}
                    className="size-11 rounded-lg object-cover shrink-0 border border-black/5 cursor-pointer hover:opacity-80 transition-opacity"
                    alt="Review"
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_RESTAURANT; }}
                  />
                )}

                {notif.type === 'new_follower' && notif.actor_id !== currentUser?.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollowToggle(notif.actor_id);
                    }}
                    className={`px-4 py-1.5 text-xs font-bold rounded-full shadow-sm active:scale-95 transition-all ${
                      isFollowingActor
                        ? 'bg-gray-100 text-dark hover:bg-gray-200'
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    {isFollowingActor ? 'Seguindo' : 'Seguir'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
};