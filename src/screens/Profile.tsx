import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, List, Review } from '../types';
import { useAppContext } from '../AppContext';
import { DEFAULT_AVATAR, DEFAULT_RESTAURANT } from '../constants';

// --- SKELETON ---
const SkeletonProfile = () => (
  <div className="animate-pulse flex flex-col items-center pt-4 pb-6">
     <div className="size-32 rounded-full bg-gray-200 mb-4"></div>
     <div className="h-6 w-40 bg-gray-200 rounded mb-2"></div>
     <div className="h-3 w-24 bg-gray-200 rounded mb-6"></div>
     <div className="flex gap-10 mb-6">
        {[1,2,3].map(i => (
          <div key={i} className="flex flex-col items-center gap-1">
             <div className="size-6 bg-gray-200 rounded"></div>
             <div className="h-3 w-10 bg-gray-200 rounded"></div>
          </div>
        ))}
     </div>
     <div className="h-3 w-64 bg-gray-200 rounded mb-2"></div>
     <div className="h-3 w-48 bg-gray-200 rounded mb-6"></div>
     <div className="flex gap-3 w-full px-5">
        <div className="flex-1 h-11 bg-gray-200 rounded-full"></div>
        <div className="flex-1 h-11 bg-gray-200 rounded-full"></div>
     </div>
  </div>
);

// --- FOLLOW LIST MODAL ---
const FollowListModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  users: User[];
  loading: boolean;
  onUserClick: (username: string) => void;
}> = ({ isOpen, onClose, title, users, loading, onUserClick }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-0 sm:p-4">
       <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
       <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm h-[70vh] flex flex-col shadow-2xl animate-slide-up sm:animate-bounce-in overflow-hidden">
         <div className="flex justify-between items-center p-4 border-b border-gray-100">
             <h3 className="font-bold text-dark text-lg">{title}</h3>
             <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
               <span className="material-symbols-outlined">close</span>
             </button>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-2">
             {loading ? (
               <div className="flex justify-center py-10">
                 <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
               </div>
             ) : users.length === 0 ? (
               <div className="text-center py-10 text-gray-400">
                 <span className="material-symbols-outlined text-4xl mb-2">group_off</span>
                 <p>Nenhum usuário encontrado</p>
               </div>
             ) : (
               users.map(u => (
                 <button 
                   key={u.id} 
                   onClick={() => { onClose(); onUserClick(u.username); }}
                   className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors"
                 >
                   <div className="flex items-center gap-3">
                      <img 
                        src={u.profile_photo_url || DEFAULT_AVATAR} 
                        className="size-10 rounded-full bg-gray-200 object-cover" 
                        alt={u.username}
                        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                      />
                      <div className="text-left">
                         <p className="font-bold text-sm text-dark">{u.full_name}</p>
                         <p className="text-xs text-gray-500">@{u.username}</p>
                      </div>
                   </div>
                   <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                 </button>
               ))
             )}
         </div>
       </div>
    </div>
  );
};

// --- ACTIVITY CARD (ESTILO BELI) ---
const ActivityCard: React.FC<{
  activity: { type: 'review' | 'bookmark'; data: Review; date: Date };
  user: User;
  onPhotoClick: () => void;
  onSaveToList: (restaurantId: string) => void;
  onToggleWantToGo: (restaurantId: string) => void;
}> = ({ activity, user, onPhotoClick, onSaveToList, onToggleWantToGo }) => {
  const { data } = activity;
  const restaurant = data.restaurant;
  const photoUrl = data.photos?.[0]?.url || null;
  const hasPhoto = !!photoUrl;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Header: User action */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* User + Action */}
            <div className="flex items-center gap-1 text-sm mb-1 flex-wrap">
              <span className="font-bold text-dark">{user.full_name?.split(' ')[0] || user.username}</span>
              <span className="text-gray-500">
                {activity.type === 'bookmark' ? 'salvou' : 'avaliou'}
              </span>
              <span className="font-bold text-dark truncate">{restaurant?.name || 'Restaurante'}</span>
            </div>
            
            {/* Location */}
            {restaurant && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <span className="material-symbols-outlined text-[12px]">restaurant</span>
                <span>
                  {restaurant.neighborhood && `${restaurant.neighborhood}, `}
                  {restaurant.city || 'Recife'}
                </span>
              </div>
            )}
          </div>

          {/* Score Badge - Vermelho */}
          {data.average_score && (
            <div className="size-12 rounded-full border-2 border-primary flex items-center justify-center shrink-0 ml-3">
              <span className="text-primary font-bold text-lg">{data.average_score.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Photo - Só mostra se tiver foto, clicável para ir ao post */}
      {hasPhoto && (
        <div className="px-4 pb-3">
          <img 
            src={photoUrl} 
            alt={restaurant?.name || 'Review'} 
            className="w-full h-48 object-cover rounded-xl bg-gray-100 cursor-pointer hover:opacity-95 transition-opacity active:scale-[0.99]"
            onClick={onPhotoClick}
            onError={(e) => { 
              (e.target as HTMLImageElement).style.display = 'none'; 
            }}
          />
        </div>
      )}

      {/* Notes + Actions (lado a lado) */}
      <div className="px-4 pb-3 flex items-start justify-between gap-3">
        {/* Notes / Description */}
        <div className="flex-1 min-w-0">
          {data.description && (
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-dark">Notas: </span>
              <span className="line-clamp-2">{data.description}</span>
            </p>
          )}
          {/* Timestamp */}
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-2">
            {formatRelativeDate(activity.date)}
          </p>
        </div>

        {/* Actions - Pequenos, lado direito */}
        <div className="flex items-center gap-1 shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); restaurant?.id && onSaveToList(restaurant.id); }}
            className="size-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-primary transition-colors active:scale-95"
            title="Adicionar a uma lista"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); restaurant?.id && onToggleWantToGo(restaurant.id); }}
            className="size-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-primary transition-colors active:scale-95"
            title="Quero ir"
          >
            <span className="material-symbols-outlined text-lg">bookmark</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper: Formatar data relativa
const formatRelativeDate = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
};

// --- MAIN COMPONENT ---
export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { username } = useParams();
  const { supabase, currentUser, following, followUser, unfollowUser, toggleSaveRestaurant, lists, addRestaurantToList } = useAppContext();
  
  // Profile data
  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userLists, setUserLists] = useState<List[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isFollowingProfile, setIsFollowingProfile] = useState(false);

  // Follow modal
  const [followersList, setFollowersList] = useState<User[]>([]);
  const [followingList, setFollowingList] = useState<User[]>([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);
  const [followListType, setFollowListType] = useState<'followers' | 'following' | null>(null);

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editStep, setEditStep] = useState<'main' | 'email' | 'password'>('main');
  const [editForm, setEditForm] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emailForm, setEmailForm] = useState({ newEmail: '', currentPwd: '' });
  const [emailStep, setEmailStep] = useState(0);
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });

  // Other
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showListSelector, setShowListSelector] = useState<string | null>(null); // restaurantId para adicionar

  const isCurrentUser = !username || username === currentUser?.username;
  const targetUsername = username?.replace('@', '') || currentUser?.username;

  // --- FETCH PROFILE (OTIMIZADO - 1 RPC) ---
  useEffect(() => {
    if (!targetUsername) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      
      try {
        const { data, error } = await supabase.rpc('get_profile_data', {
          p_username: targetUsername,
          p_viewer_id: currentUser?.id || null
        });

        if (error) {
          console.error('RPC error:', error);
          setLoading(false);
          return;
        }

        if (data?.error === 'user_not_found') {
          setProfileUser(null);
          setLoading(false);
          return;
        }

        // Set all data from single RPC
        const { profile, counts, lists, reviews, is_following, is_blocked } = data;
        
        setProfileUser({
          ...profile,
          reviews_count: counts.reviews_count,
          followers_count: counts.followers_count,
          following_count: counts.following_count
        });
        
        setUserLists(lists || []);
        setUserReviews(reviews || []);
        setIsFollowingProfile(is_following || false);
        setIsBlocked(is_blocked || false);
        
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [targetUsername, currentUser?.id, supabase]);

  // Sync follow state from context
  useEffect(() => {
    if (profileUser && following) {
      setIsFollowingProfile(following.includes(profileUser.id));
    }
  }, [following, profileUser?.id]);

  // --- FETCH FOLLOWERS/FOLLOWING (lazy load on modal open) ---
  const fetchFollowers = useCallback(async () => {
    if (!profileUser) return;
    setLoadingFollowList(true);
    try {
      const { data } = await supabase
        .from('follows')
        .select('follower:profiles!follower_id(id, username, full_name, profile_photo_url)')
        .eq('following_id', profileUser.id);

      setFollowersList(data?.map((f: any) => f.follower).filter(Boolean) || []);
    } catch (err) {
      console.error('Error fetching followers:', err);
    } finally {
      setLoadingFollowList(false);
    }
  }, [profileUser?.id, supabase]);

  const fetchFollowing = useCallback(async () => {
    if (!profileUser) return;
    setLoadingFollowList(true);
    try {
      const { data } = await supabase
        .from('follows')
        .select('following:profiles!following_id(id, username, full_name, profile_photo_url)')
        .eq('follower_id', profileUser.id);

      setFollowingList(data?.map((f: any) => f.following).filter(Boolean) || []);
    } catch (err) {
      console.error('Error fetching following:', err);
    } finally {
      setLoadingFollowList(false);
    }
  }, [profileUser?.id, supabase]);

  useEffect(() => {
    if (followListType === 'followers') fetchFollowers();
    else if (followListType === 'following') fetchFollowing();
  }, [followListType, fetchFollowers, fetchFollowing]);

  // --- COMPUTED ---
  // Todas as listas para o slider (default primeiro, depois as outras)
  const allDisplayLists = useMemo(() => {
    const defaultList = userLists.find(l => l.is_default);
    const otherLists = userLists.filter(l => {
      if (l.is_default) return false;
      if (isCurrentUser) return true;
      return !l.is_private;
    });
    
    // Default list primeiro, depois as outras
    const result: List[] = [];
    if (defaultList && (isCurrentUser || isFollowingProfile)) {
      result.push(defaultList);
    }
    result.push(...otherLists);
    
    return result;
  }, [userLists, isCurrentUser, isFollowingProfile]);

  const activities = useMemo(() => 
    userReviews.map(r => ({ type: 'review' as const, data: r, date: new Date(r.created_at) }))
      .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [userReviews]
  );

  // --- HELPERS ---
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `Perfil de ${profileUser?.full_name}`, url: window.location.href }); } 
      catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast("Link copiado!");
    }
  };

  // --- EDIT ACTIONS ---
  const handleEditOpen = () => {
    if (profileUser) {
      setEditForm({ ...profileUser });
      setEditStep('main');
      setIsEditModalOpen(true);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${currentUser.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      showToast('Erro ao fazer upload');
      return;
    }

    const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(filePath);
    if (urlData?.publicUrl) {
      setEditForm(prev => prev ? { ...prev, profile_photo_url: urlData.publicUrl } : null);
    }
  };

  const handleSaveMain = async () => {
    if (!editForm || !currentUser) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          username: editForm.username,
          bio: editForm.bio,
          city: editForm.city,
          neighborhood: editForm.neighborhood,
          profile_photo_url: editForm.profile_photo_url
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      setProfileUser(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditModalOpen(false);
      showToast("Perfil atualizado!");
    } catch {
      showToast("Erro ao atualizar");
    } finally {
      setSaving(false);
    }
  };

  const startEmailFlow = () => {
    setEmailStep(0);
    setEmailForm({ newEmail: '', currentPwd: '' });
    setEditStep('email');
  };

  const processEmailChange = () => {
    if (emailStep < 2) {
      setEmailStep(prev => prev + 1);
    } else {
      setEditStep('main');
      showToast("E-mail atualizado!");
    }
  };

  const startPwdFlow = () => {
    setPwdForm({ current: '', new: '', confirm: '' });
    setEditStep('password');
  };

  const processPwdChange = async () => {
    if (pwdForm.new !== pwdForm.confirm) {
      showToast("Senhas não conferem");
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: pwdForm.new });
      if (error) throw error;
      setEditStep('main');
      showToast("Senha alterada!");
    } catch {
      showToast("Erro ao alterar senha");
    }
  };

  // --- FOLLOW/BLOCK ---
  const toggleFollow = async () => {
    if (!profileUser) return;
    
    if (isFollowingProfile) {
      await unfollowUser(profileUser.id);
      setProfileUser(prev => prev ? { ...prev, followers_count: Math.max(0, (prev.followers_count || 0) - 1) } : null);
      setIsFollowingProfile(false);
      showToast("Deixou de seguir");
    } else {
      await followUser(profileUser.id);
      setProfileUser(prev => prev ? { ...prev, followers_count: (prev.followers_count || 0) + 1 } : null);
      setIsFollowingProfile(true);
      showToast("Seguindo!");
    }
  };

  // --- SAVE TO LIST ---
  const handleToggleWantToGo = async (restaurantId: string) => {
    if (!currentUser) {
      showToast("Faça login para salvar");
      return;
    }
    const saved = await toggleSaveRestaurant(restaurantId);
    showToast(saved ? "Salvo em 'Quero ir'" : "Removido de 'Quero ir'");
  };

  const handleOpenListSelector = (restaurantId: string) => {
    if (!currentUser) {
      showToast("Faça login para salvar");
      return;
    }
    setShowListSelector(restaurantId);
  };

  const handleBlock = async () => {
    if (!profileUser || !currentUser) return;
    
    try {
      await supabase.from('blocks').insert({
        blocker_id: currentUser.id,
        blocked_id: profileUser.id
      });
      setShowBlockConfirm(false);
      setIsBlocked(true);
      setShowMenu(false);
      showToast(`Bloqueou @${profileUser.username}`);
    } catch {
      showToast("Erro ao bloquear");
    }
  };

  // --- RENDER ---
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-4xl text-gray-400 mb-4">block</span>
        <h2 className="text-xl font-bold mb-2">Usuário Bloqueado</h2>
        <p className="text-gray-500 mb-6">Desbloqueie para ver o perfil.</p>
        <button onClick={() => navigate(-1)} className="text-primary font-bold">Voltar</button>
      </div>
    );
  }

  if (!loading && !profileUser) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-4xl text-gray-400 mb-4">person_off</span>
        <h2 className="text-xl font-bold mb-2">Usuário não encontrado</h2>
        <p className="text-gray-500 mb-6">O perfil não existe.</p>
        <button onClick={() => navigate(-1)} className="text-primary font-bold">Voltar</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-24 relative">
      
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] animate-bounce-in">
          <div className="bg-dark/90 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            {toastMessage}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-[#1c1c0d] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-bounce-in flex flex-col max-h-[90vh] text-white border border-white/10">
            
            <div className="flex justify-between items-center p-5 border-b border-white/10">
               <button onClick={() => editStep === 'main' ? setIsEditModalOpen(false) : setEditStep('main')}>
                 <span className="material-symbols-outlined text-gray-400">arrow_back</span>
               </button>
               <h3 className="text-lg font-bold">
                 {editStep === 'main' ? 'Editar Perfil' : editStep === 'email' ? 'Alterar E-mail' : 'Alterar Senha'}
               </h3>
               {editStep === 'main' ? (
                 <button onClick={handleSaveMain} disabled={saving} className="text-primary font-bold text-sm disabled:opacity-50">
                   {saving ? '...' : 'Salvar'}
                 </button>
               ) : <div className="w-6" />}
            </div>
            
            {editStep === 'main' && (
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="flex flex-col items-center">
                  <div className="relative size-24 mb-3 rounded-full overflow-hidden border border-white/20 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <img src={editForm.profile_photo_url || DEFAULT_AVATAR} alt="Avatar" className="size-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }} />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined">photo_camera</span>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-gray-400 uppercase hover:text-white">Alterar foto</button>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'Nome', key: 'full_name' },
                    { label: 'Username', key: 'username' },
                    { label: 'Cidade', key: 'city' },
                    { label: 'Bairro', key: 'neighborhood' },
                  ].map(field => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">{field.label}</label>
                      <input 
                        value={(editForm as any)[field.key] || ''} 
                        onChange={e => setEditForm({...editForm, [field.key]: e.target.value})} 
                        className="w-full bg-transparent border border-white/20 p-3 text-white focus:border-primary outline-none rounded-lg" 
                      />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Bio</label>
                    <textarea 
                      value={editForm.bio || ''} 
                      onChange={e => setEditForm({...editForm, bio: e.target.value})} 
                      className="w-full h-24 bg-transparent border border-white/20 p-3 text-white focus:border-primary outline-none resize-none rounded-lg" 
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-3">
                  <button onClick={startEmailFlow} className="w-full flex justify-between items-center py-2 text-gray-300 hover:text-white">
                    <span>Alterar e-mail</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                  <button onClick={startPwdFlow} className="w-full flex justify-between items-center py-2 text-gray-300 hover:text-white">
                    <span>Alterar senha</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {editStep === 'email' && (
              <div className="p-6 space-y-6">
                {emailStep === 0 && (
                  <>
                    <p className="text-sm text-gray-400">Enviaremos um link de confirmação para o e-mail atual.</p>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Novo E-mail</label>
                        <input value={emailForm.newEmail} onChange={e => setEmailForm({...emailForm, newEmail: e.target.value})} className="w-full bg-transparent border border-white/20 p-3 text-white outline-none focus:border-primary rounded-lg" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Senha Atual</label>
                        <input type="password" value={emailForm.currentPwd} onChange={e => setEmailForm({...emailForm, currentPwd: e.target.value})} className="w-full bg-transparent border border-white/20 p-3 text-white outline-none focus:border-primary rounded-lg" />
                      </div>
                    </div>
                    <button onClick={processEmailChange} className="w-full py-3 bg-primary text-white font-bold rounded-lg">Enviar Link</button>
                  </>
                )}
                {emailStep === 1 && (
                  <div className="text-center py-6">
                    <span className="material-symbols-outlined text-4xl text-yellow-400 mb-2">mark_email_unread</span>
                    <h4 className="font-bold mb-2">Verifique seu e-mail atual</h4>
                    <p className="text-sm text-gray-400 mb-4">Enviamos um link para confirmar.</p>
                    <button onClick={processEmailChange} className="text-primary font-bold text-sm">Simular confirmação</button>
                  </div>
                )}
                {emailStep === 2 && (
                  <div className="text-center py-6">
                    <span className="material-symbols-outlined text-4xl text-green-400 mb-2">mark_email_read</span>
                    <h4 className="font-bold mb-2">Confirme o novo e-mail</h4>
                    <p className="text-sm text-gray-400 mb-4">Enviamos um link para <b>{emailForm.newEmail}</b>.</p>
                    <button onClick={processEmailChange} className="text-primary font-bold text-sm">Finalizar</button>
                  </div>
                )}
              </div>
            )}

            {editStep === 'password' && (
              <div className="p-6 space-y-4">
                {['current', 'new', 'confirm'].map((key, i) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      {i === 0 ? 'Senha Atual' : i === 1 ? 'Nova Senha' : 'Confirmar'}
                    </label>
                    <input 
                      type="password" 
                      value={(pwdForm as any)[key]} 
                      onChange={e => setPwdForm({...pwdForm, [key]: e.target.value})} 
                      className="w-full bg-transparent border border-white/20 p-3 text-white outline-none focus:border-primary rounded-lg" 
                    />
                  </div>
                ))}
                <button onClick={processPwdChange} className="w-full py-3 bg-primary text-white font-bold mt-4 rounded-lg">Alterar Senha</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Block Confirm Modal */}
      {showBlockConfirm && profileUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBlockConfirm(false)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-xs text-center animate-bounce-in">
            <h3 className="font-bold text-lg mb-2 text-dark">Bloquear @{profileUser.username}?</h3>
            <p className="text-sm text-gray-500 mb-6">Eles não poderão ver seu perfil.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowBlockConfirm(false)} className="flex-1 py-2 rounded-xl border border-gray-200 font-bold text-gray-500">Cancelar</button>
              <button onClick={handleBlock} className="flex-1 py-2 rounded-xl bg-red-500 text-white font-bold">Bloquear</button>
            </div>
          </div>
        </div>
      )}

      {/* Follow List Modal */}
      <FollowListModal 
        isOpen={followListType !== null} 
        onClose={() => setFollowListType(null)} 
        title={followListType === 'followers' ? 'Seguidores' : 'Seguindo'}
        users={followListType === 'followers' ? followersList : followingList}
        loading={loadingFollowList}
        onUserClick={(uname) => navigate(`/profile/${uname}`)}
      />

      {/* List Selector Modal */}
      {showListSelector && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowListSelector(null)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm max-h-[70vh] flex flex-col shadow-2xl animate-slide-up sm:animate-bounce-in overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-dark text-lg">Salvar em uma lista</h3>
              <button onClick={() => setShowListSelector(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {lists.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <span className="material-symbols-outlined text-4xl mb-2">playlist_add</span>
                  <p>Nenhuma lista criada</p>
                  <button 
                    onClick={() => { setShowListSelector(null); navigate('/lists'); }}
                    className="mt-4 text-primary font-bold text-sm"
                  >
                    Criar primeira lista
                  </button>
                </div>
              ) : (
                lists.map(list => (
                  <button
                    key={list.id}
                    onClick={async () => {
                      try {
                        await addRestaurantToList(list.id, showListSelector);
                        showToast(`Salvo em "${list.name}"`);
                      } catch {
                        showToast("Erro ao salvar");
                      }
                      setShowListSelector(null);
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <div className={`size-10 rounded-lg flex items-center justify-center ${list.is_default ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                      <span className="material-symbols-outlined">{list.is_default ? 'bookmark' : 'list'}</span>
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-sm text-dark">{list.name}</p>
                      <p className="text-xs text-gray-500">{list.count || 0} lugares</p>
                    </div>
                    {list.is_private && (
                      <span className="material-symbols-outlined text-gray-400 text-sm">lock</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navbar com Logo centralizada */}
      <nav className="sticky top-0 z-50 bg-cream/95 backdrop-blur-sm border-b border-black/5">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          
          {/* Logo Fomí centralizada */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <img 
              src="/logo-fomi-vermelho.png" 
              alt="Fomí" 
              className="h-10"
              onError={(e) => {
                // Fallback para texto se logo não carregar
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  parent.innerHTML = '<span class="text-xl font-bold text-primary">fomí</span>';
                }
              }}
            />
          </div>
          
          {isCurrentUser ? (
            <button onClick={() => navigate('/settings')} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5">
              <span className="material-symbols-outlined">settings</span>
            </button>
          ) : (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5">
                <span className="material-symbols-outlined">more_horiz</span>
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-slide-down">
                  <button onClick={() => setShowBlockConfirm(true)} className="w-full text-left px-4 py-3 text-red-500 font-bold text-sm hover:bg-red-50">Bloquear</button>
                  <button onClick={() => { showToast("Denúncia enviada"); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-dark font-medium text-sm hover:bg-gray-50">Denunciar</button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <main>
        {loading ? (
          <SkeletonProfile />
        ) : profileUser && (
          <>
            {/* Profile Header */}
            <section className="px-5 pt-4 pb-6 flex flex-col items-center animate-fade-in">
              <div className="relative mb-4">
                <div className="size-32 rounded-full p-1 border-2 border-primary/20">
                  <img 
                    src={profileUser.profile_photo_url || DEFAULT_AVATAR} 
                    alt="Profile" 
                    className="size-full rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-center">{profileUser.full_name}</h1>
                {profileUser.is_verified && (
                  <img src="/selo-verificado.png" alt="Verificado" className="size-5" />
                )}
              </div>

              <p className="text-sm text-gray-500 mb-3">@{profileUser.username}</p>
              
              {(profileUser.city || profileUser.neighborhood) && (
                <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  {profileUser.city} {profileUser.city && profileUser.neighborhood ? '•' : ''} {profileUser.neighborhood}
                </p>
              )}
              
              {/* Stats */}
              <div className="flex gap-10 mb-5">
                <div className="text-center">
                  <span className="block text-xl font-bold">{profileUser.reviews_count || 0}</span>
                  <span className="text-xs text-secondary">Reviews</span>
                </div>
                <div className="w-px bg-black/10"></div>
                <button onClick={() => setFollowListType('followers')} className="text-center hover:opacity-70 transition-opacity">
                  <span className="block text-xl font-bold">{profileUser.followers_count || 0}</span>
                  <span className="text-xs text-secondary">Seguidores</span>
                </button>
                <div className="w-px bg-black/10"></div>
                <button onClick={() => setFollowListType('following')} className="text-center hover:opacity-70 transition-opacity">
                  <span className="block text-xl font-bold">{profileUser.following_count || 0}</span>
                  <span className="text-xs text-secondary">Seguindo</span>
                </button>
              </div>

              {/* Bio com destaque */}
              {profileUser.bio && (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl px-5 py-4 w-full max-w-sm border border-black/5 shadow-sm">
                  <p className="text-center text-sm text-dark leading-relaxed">{profileUser.bio}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6 w-full">
                {isCurrentUser ? (
                  <>
                    <button onClick={handleEditOpen} className="flex-1 h-11 rounded-full border-2 border-primary text-primary font-bold text-sm hover:bg-primary/5 transition-colors">
                      Editar Perfil
                    </button>
                    <button onClick={handleShare} className="flex-1 h-11 rounded-full bg-primary text-white font-bold text-sm shadow-md active:scale-95 transition-transform">
                      Compartilhar
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={toggleFollow}
                      className={`flex-1 h-11 rounded-full font-bold text-sm shadow-md active:scale-95 transition-all ${
                        isFollowingProfile ? 'bg-white border border-gray-200 text-dark' : 'bg-primary text-white'
                      }`}
                    >
                      {isFollowingProfile ? 'Seguindo ✓' : 'Seguir'}
                    </button>
                    <button className="flex-1 h-11 rounded-full border-2 border-gray-300 text-dark font-bold text-sm hover:bg-gray-100 transition-colors">
                      Mensagem
                    </button>
                  </>
                )}
              </div>
            </section>

            {/* Lists Slider (Unificado - Quero ir + outras listas + botão adicionar) */}
            {(isCurrentUser || isFollowingProfile) && (
              <section className="mt-2 px-5 mb-8 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Minhas Listas</h3>
                  <button onClick={() => navigate('/lists')} className="text-primary font-bold text-sm">Ver todas</button>
                </div>
                
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {/* Todas as listas (default primeiro) */}
                  {allDisplayLists.map((list) => (
                    <div
                      key={list.id}
                      className="relative w-40 shrink-0 aspect-[4/5] rounded-2xl overflow-hidden group bg-gray-200"
                    >
                      <div
                        onClick={() => navigate(`/lists/${list.id}`)}
                        className="absolute inset-0 cursor-pointer active:scale-95 transition-transform"
                      >
                        <img
                          src={list.cover_photo_url || DEFAULT_RESTAURANT}
                          className="absolute inset-0 size-full object-cover"
                          alt={list.name}
                          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_RESTAURANT; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                      </div>

                      {/* Badge para lista default */}
                      {list.is_default && (
                        <div className="absolute top-2 left-2 bg-primary/90 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 pointer-events-none">
                          <span className="material-symbols-outlined text-[12px] filled">bookmark</span>
                          Quero ir
                        </div>
                      )}

                      {/* Share button */}
                      {!list.is_private && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const shareUrl = `${window.location.origin}/lists/${list.id}`;
                            if (navigator.share) {
                              try { await navigator.share({ title: list.name, url: shareUrl }); } catch {}
                            } else {
                              await navigator.clipboard.writeText(shareUrl);
                              showToast("Link copiado!");
                            }
                          }}
                          className="absolute top-2 right-2 size-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors active:scale-95 z-10"
                        >
                          <span className="material-symbols-outlined text-[14px] text-dark">share</span>
                        </button>
                      )}

                      {list.is_private && !list.is_default && (
                        <div className="absolute top-2 right-2 text-white/70 pointer-events-none">
                          <span className="material-symbols-outlined text-sm">lock</span>
                        </div>
                      )}

                      <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                        <div className="text-white font-bold text-lg leading-tight mb-1">
                          {list.is_default ? 'Quero ir' : list.name}
                        </div>
                        <div className="text-white/70 text-xs">{list.count || 0} lugares</div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Card de Adicionar Lista (sempre no final para o próprio usuário) */}
                  {isCurrentUser && (
                    <div 
                      onClick={() => navigate('/lists')}
                      className="w-40 shrink-0 aspect-[4/5] rounded-2xl bg-white border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all active:scale-95 group"
                    >
                      <div className="size-12 rounded-full bg-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-white text-2xl">add</span>
                      </div>
                      <span className="text-sm font-bold text-gray-600 group-hover:text-primary transition-colors">
                        Criar nova lista
                      </span>
                    </div>
                  )}
                  
                  {/* Se não tem nenhuma lista e não é o próprio usuário */}
                  {!isCurrentUser && allDisplayLists.length === 0 && (
                    <div className="w-full py-8 text-center text-gray-400 text-sm">
                      Nenhuma lista pública disponível.
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Recent Activity (Estilo Beli) */}
            {(isCurrentUser || isFollowingProfile) && (
              <section className="px-5 mb-8 animate-fade-in">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">ATIVIDADE RECENTE</h3>
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <ActivityCard
                      key={activity.data.id}
                      activity={activity}
                      user={profileUser}
                      onPhotoClick={() => navigate(`/review/${activity.data.id}`)}
                      onSaveToList={handleOpenListSelector}
                      onToggleWantToGo={handleToggleWantToGo}
                    />
                  ))}
                  
                  {activities.length === 0 && (
                    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
                      <span className="material-symbols-outlined text-4xl text-gray-300 mb-3">rate_review</span>
                      <p className="text-gray-500 text-sm font-medium">Nenhuma atividade recente</p>
                      {isCurrentUser && (
                        <button 
                          onClick={() => navigate('/feed')}
                          className="mt-4 text-primary font-bold text-sm hover:underline"
                        >
                          Fazer primeira avaliação
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}
            
            {(!isCurrentUser && !isFollowingProfile) && (
              <div className="px-6 py-4 text-center text-gray-400 text-sm italic animate-fade-in">
                Siga @{profileUser.username} para ver as atividades.
              </div>
            )}

            <div className="h-10"></div>
          </>
        )}
      </main>
    </div>
  );
};