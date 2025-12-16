import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, List, Review, Comment } from '../types';
import { useAppContext } from '../AppContext';
import { DEFAULT_AVATAR, DEFAULT_RESTAURANT } from '../constants';

// --- COMPONENTS ---

const SkeletonProfile = () => (
  <div className="animate-pulse flex flex-col items-center pt-4 pb-6">
     <div className="size-32 rounded-full bg-gray-200 mb-4"></div>
     <div className="h-6 w-40 bg-gray-200 rounded mb-2"></div>
     <div className="h-3 w-24 bg-gray-200 rounded mb-6"></div>
     <div className="flex gap-10 mb-6">
        <div className="flex flex-col items-center gap-1">
           <div className="size-6 bg-gray-200 rounded"></div>
           <div className="h-3 w-10 bg-gray-200 rounded"></div>
        </div>
        <div className="flex flex-col items-center gap-1">
           <div className="size-6 bg-gray-200 rounded"></div>
           <div className="h-3 w-10 bg-gray-200 rounded"></div>
        </div>
        <div className="flex flex-col items-center gap-1">
           <div className="size-6 bg-gray-200 rounded"></div>
           <div className="h-3 w-10 bg-gray-200 rounded"></div>
        </div>
     </div>
     <div className="h-3 w-64 bg-gray-200 rounded mb-2"></div>
     <div className="h-3 w-48 bg-gray-200 rounded mb-6"></div>
     <div className="flex gap-3 w-full px-5">
        <div className="flex-1 h-11 bg-gray-200 rounded-full"></div>
        <div className="flex-1 h-11 bg-gray-200 rounded-full"></div>
     </div>
  </div>
);

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
                        className="size-10 rounded-full bg-gray-200" 
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

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { username } = useParams();
  const { supabase, currentUser, following, followUser, unfollowUser } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userLists, setUserLists] = useState<List[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [userComments, setUserComments] = useState<Comment[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);

  // Followers/Following lists
  const [followersList, setFollowersList] = useState<User[]>([]);
  const [followingList, setFollowingList] = useState<User[]>([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);

  // Determine if viewing own profile
  const isCurrentUser = !username || username === currentUser?.username;
  const isFollowing = profileUser ? following.includes(profileUser.id) : false;

  // --- FETCH PROFILE DATA ---
  useEffect(() => {
    if (isCurrentUser && currentUser) {
      setProfileUser(currentUser);
      fetchUserData(currentUser.id);
    } else if (username) {
      fetchProfileByUsername(username.replace('@', ''));
    }
  }, [username, currentUser, isCurrentUser]);

  const fetchProfileByUsername = async (uname: string) => {
    setLoading(true);
    try {
      const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', uname)
        .single();

      if (error || !user) {
        console.error('User not found:', error);
        setLoading(false);
        return;
      }

      // Fetch counts
      const [reviewsRes, followersRes, followingRes] = await Promise.all([
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id)
      ]);

      setProfileUser({
        ...user,
        reviews_count: reviewsRes.count || 0,
        followers_count: followersRes.count || 0,
        following_count: followingRes.count || 0
      });

      await fetchUserData(user.id);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async (userId: string) => {
    setLoading(true);
    try {
      // Fetch user's lists
      const { data: listsData } = await supabase
        .from('lists')
        .select('*, list_restaurants(restaurant_id)')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (listsData) {
        setUserLists(listsData.map(l => ({
          ...l,
          count: l.list_restaurants?.length || 0,
          items: l.list_restaurants?.map((lr: any) => lr.restaurant_id) || []
        })));
      }

      // Fetch user's reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          *,
          restaurant:restaurants!restaurant_id(id, name, photo_url, neighborhood)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reviewsData) {
        setUserReviews(reviewsData as Review[]);
      }

      // Fetch user's comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (commentsData) {
        setUserComments(commentsData as Comment[]);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- FETCH FOLLOWERS/FOLLOWING ---
  const fetchFollowers = async () => {
    if (!profileUser) return;
    setLoadingFollowList(true);
    try {
      const { data } = await supabase
        .from('follows')
        .select('follower:profiles!follower_id(id, username, full_name, profile_photo_url)')
        .eq('following_id', profileUser.id);

      if (data) {
        setFollowersList(data.map((f: any) => f.follower).filter(Boolean));
      }
    } catch (err) {
      console.error('Error fetching followers:', err);
    } finally {
      setLoadingFollowList(false);
    }
  };

  const fetchFollowing = async () => {
    if (!profileUser) return;
    setLoadingFollowList(true);
    try {
      const { data } = await supabase
        .from('follows')
        .select('following:profiles!following_id(id, username, full_name, profile_photo_url)')
        .eq('follower_id', profileUser.id);

      if (data) {
        setFollowingList(data.map((f: any) => f.following).filter(Boolean));
      }
    } catch (err) {
      console.error('Error fetching following:', err);
    } finally {
      setLoadingFollowList(false);
    }
  };

  // --- ACTIVITIES ---
  const activities = useMemo(() => {
    const mixed = [
       ...userReviews.map(r => ({ type: 'review' as const, data: r, date: new Date(r.created_at) })),
       ...userComments.map(c => ({ type: 'comment' as const, data: c, date: new Date(c.created_at) }))
    ];
    return mixed.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [userReviews, userComments]);

  // Default and public lists
  const defaultList = userLists.find(l => l.is_default);
  const publicLists = userLists.filter(l => !l.is_default && (!l.is_private || isCurrentUser));
  
  // --- EDIT MODAL STATE ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editStep, setEditStep] = useState<'main' | 'email' | 'password'>('main');
  const [editForm, setEditForm] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Email Sub-flow State
  const [emailForm, setEmailForm] = useState({ newEmail: '', currentPwd: '' });
  const [emailStep, setEmailStep] = useState(0);

  // Edit Password Sub-flow State
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });

  // --- OTHER MODALS ---
  const [followListType, setFollowListType] = useState<'followers' | 'following' | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load followers/following when modal opens
  useEffect(() => {
    if (followListType === 'followers') {
      fetchFollowers();
    } else if (followListType === 'following') {
      fetchFollowing();
    }
  }, [followListType]);

  // --- HELPERS ---
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleShare = async () => {
    if (navigator.share) {
        try { await navigator.share({ title: `Perfil de ${profileUser?.full_name}`, url: window.location.href }); } 
        catch (e) {}
    } else {
        showToast("Link do perfil copiado!");
    }
  };

  // --- EDIT ACTIONS ---
  const handleEditOpen = () => {
    if (!profileUser) return;
    setEditForm({ ...profileUser });
    setEditStep('main');
    setIsEditModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${currentUser.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      showToast('Erro ao fazer upload da foto');
      return;
    }

    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(filePath);

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

      setProfileUser(editForm);
      setIsEditModalOpen(false);
      showToast("Perfil atualizado!");
    } catch (err) {
      console.error('Error updating profile:', err);
      showToast("Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  // Email Flow
  const startEmailFlow = () => {
     setEmailStep(0);
     setEmailForm({ newEmail: '', currentPwd: '' });
     setEditStep('email');
  };
  
  const processEmailChange = async () => {
     if (emailStep === 0) {
        // In real app: send verification to old email
        setEmailStep(1);
     } else if (emailStep === 1) {
        // In real app: verify old email confirmed
        setEmailStep(2);
     } else {
        // In real app: update email in auth
        setEditForm(prev => prev ? { ...prev, email: emailForm.newEmail } : null);
        setEditStep('main');
        showToast("E-mail atualizado!");
     }
  };

  // Password Flow
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
        const { error } = await supabase.auth.updateUser({
          password: pwdForm.new
        });

        if (error) throw error;
        
        setEditStep('main');
        showToast("Senha alterada com sucesso!");
      } catch (err) {
        console.error('Error updating password:', err);
        showToast("Erro ao alterar senha");
      }
  };

  // --- OTHER USER ACTIONS ---
  const toggleFollow = async () => {
      if (!profileUser) return;
      
      if (isFollowing) {
        await unfollowUser(profileUser.id);
        setProfileUser(prev => prev ? { ...prev, followers_count: Math.max(0, (prev.followers_count || 0) - 1) } : null);
        showToast("Deixou de seguir");
      } else {
        await followUser(profileUser.id);
        setProfileUser(prev => prev ? { ...prev, followers_count: (prev.followers_count || 0) + 1 } : null);
        showToast("Seguindo!");
      }
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
        showToast(`Você bloqueou @${profileUser.username}`);
      } catch (err) {
        console.error('Error blocking user:', err);
        showToast("Erro ao bloquear usuário");
      }
  };

  // --- RENDER ---

  if (isBlocked) {
      return (
          <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-center">
              <span className="material-symbols-outlined text-4xl text-gray-400 mb-4">block</span>
              <h2 className="text-xl font-bold mb-2">Usuário Bloqueado</h2>
              <p className="text-gray-500 mb-6">Você bloqueou este usuário. Desbloqueie para ver o perfil.</p>
              <button onClick={() => navigate(-1)} className="text-primary font-bold">Voltar</button>
          </div>
      );
  }

  if (!loading && !profileUser) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-gray-400 mb-4">person_off</span>
          <h2 className="text-xl font-bold mb-2">Usuário não encontrado</h2>
          <p className="text-gray-500 mb-6">O perfil que você está procurando não existe.</p>
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

      {/* --- EDIT MODAL (DARK THEME) --- */}
      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-[#1c1c0d] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-bounce-in flex flex-col max-h-[90vh] text-white border border-white/10">
            
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-white/10">
               {editStep === 'main' ? (
                  <button onClick={() => setIsEditModalOpen(false)}><span className="material-symbols-outlined text-gray-400">arrow_back</span></button>
               ) : (
                  <button onClick={() => setEditStep('main')}><span className="material-symbols-outlined text-gray-400">arrow_back</span></button>
               )}
               <h3 className="text-lg font-bold">
                   {editStep === 'main' ? 'Editar Perfil' : editStep === 'email' ? 'Alterar E-mail' : 'Alterar Senha'}
               </h3>
               {editStep === 'main' && (
                  <button onClick={handleSaveMain} disabled={saving} className="text-primary font-bold text-sm disabled:opacity-50">
                    {saving ? '...' : 'Salvar'}
                  </button>
               )}
               {editStep !== 'main' && <div className="w-6"></div>}
            </div>
            
            {/* MAIN EDIT STEP */}
            {editStep === 'main' && (
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Avatar */}
                    <div className="flex flex-col items-center">
                        <div className="relative size-24 mb-3 border border-white/20 p-1 bg-white/5 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                           <img 
                             src={editForm.profile_photo_url || DEFAULT_AVATAR} 
                             alt="Avatar" 
                             className="size-full object-cover"
                             onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                           />
                           <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                               <span className="material-symbols-outlined">photo_camera</span>
                           </div>
                           <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                        </div>
                        <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-white">Alterar foto</button>
                    </div>

                    {/* Fields */}
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Nome</label>
                            <input 
                                value={editForm.full_name || ''} 
                                onChange={e => setEditForm({...editForm, full_name: e.target.value})} 
                                className="w-full bg-transparent border border-white/20 p-3 text-white focus:border-primary outline-none" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Username</label>
                            <input 
                                value={editForm.username || ''} 
                                onChange={e => setEditForm({...editForm, username: e.target.value})} 
                                className="w-full bg-transparent border border-white/20 p-3 text-white focus:border-primary outline-none" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Cidade</label>
                            <input 
                                value={editForm.city || ''} 
                                onChange={e => setEditForm({...editForm, city: e.target.value})} 
                                className="w-full bg-transparent border border-white/20 p-3 text-white focus:border-primary outline-none" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Bairro</label>
                            <input 
                                value={editForm.neighborhood || ''} 
                                onChange={e => setEditForm({...editForm, neighborhood: e.target.value})} 
                                className="w-full bg-transparent border border-white/20 p-3 text-white focus:border-primary outline-none" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Bio</label>
                            <textarea 
                                value={editForm.bio || ''} 
                                onChange={e => setEditForm({...editForm, bio: e.target.value})} 
                                className="w-full h-24 bg-transparent border border-white/20 p-3 text-white focus:border-primary outline-none resize-none" 
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

            {/* EMAIL STEP */}
            {editStep === 'email' && (
                <div className="p-6 space-y-6">
                    {emailStep === 0 && (
                        <>
                            <p className="text-sm text-gray-400">Para alterar seu e-mail, enviaremos um link de confirmação para o endereço atual.</p>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Novo E-mail</label>
                                <input value={emailForm.newEmail} onChange={e => setEmailForm({...emailForm, newEmail: e.target.value})} className="w-full bg-transparent border border-white/20 p-3 text-white outline-none focus:border-primary" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Senha Atual</label>
                                <input type="password" value={emailForm.currentPwd} onChange={e => setEmailForm({...emailForm, currentPwd: e.target.value})} className="w-full bg-transparent border border-white/20 p-3 text-white outline-none focus:border-primary" />
                            </div>
                            <button onClick={processEmailChange} className="w-full py-3 bg-primary text-white font-bold mt-4">Enviar Link</button>
                        </>
                    )}
                    {emailStep === 1 && (
                        <div className="text-center py-6">
                            <span className="material-symbols-outlined text-4xl text-yellow-400 mb-2">mark_email_unread</span>
                            <h4 className="font-bold mb-2">Verifique seu e-mail atual</h4>
                            <p className="text-sm text-gray-400 mb-4">Enviamos um link para confirmar a alteração.</p>
                            <button onClick={processEmailChange} className="text-primary font-bold text-sm">Simular confirmação</button>
                        </div>
                    )}
                    {emailStep === 2 && (
                        <div className="text-center py-6">
                             <span className="material-symbols-outlined text-4xl text-green-400 mb-2">mark_email_read</span>
                             <h4 className="font-bold mb-2">Confirme o novo e-mail</h4>
                             <p className="text-sm text-gray-400 mb-4">Enviamos um link para <b>{emailForm.newEmail}</b>.</p>
                             <button onClick={processEmailChange} className="text-primary font-bold text-sm">Simular verificação final</button>
                        </div>
                    )}
                </div>
            )}

            {/* PASSWORD STEP */}
            {editStep === 'password' && (
                <div className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Senha Atual</label>
                        <input type="password" value={pwdForm.current} onChange={e => setPwdForm({...pwdForm, current: e.target.value})} className="w-full bg-transparent border border-white/20 p-3 text-white outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Nova Senha</label>
                        <input type="password" value={pwdForm.new} onChange={e => setPwdForm({...pwdForm, new: e.target.value})} className="w-full bg-transparent border border-white/20 p-3 text-white outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Confirmar Nova Senha</label>
                        <input type="password" value={pwdForm.confirm} onChange={e => setPwdForm({...pwdForm, confirm: e.target.value})} className="w-full bg-transparent border border-white/20 p-3 text-white outline-none focus:border-primary" />
                    </div>
                    <button onClick={processPwdChange} className="w-full py-3 bg-primary text-white font-bold mt-4">Alterar Senha</button>
                </div>
            )}
            
          </div>
        </div>
      )}

      {/* --- BLOCK CONFIRM MODAL --- */}
      {showBlockConfirm && profileUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBlockConfirm(false)} />
           <div className="relative bg-white rounded-3xl p-6 w-full max-w-xs text-center animate-bounce-in">
               <h3 className="font-bold text-lg mb-2 text-dark">Bloquear @{profileUser.username}?</h3>
               <p className="text-sm text-gray-500 mb-6">Eles não poderão ver seu perfil ou interagir com você.</p>
               <div className="flex gap-3">
                   <button onClick={() => setShowBlockConfirm(false)} className="flex-1 py-2 rounded-xl border border-gray-200 font-bold text-gray-500">Cancelar</button>
                   <button onClick={handleBlock} className="flex-1 py-2 rounded-xl bg-red-500 text-white font-bold">Bloquear</button>
               </div>
           </div>
        </div>
      )}

      {/* --- FOLLOW LISTS MODALS --- */}
      <FollowListModal 
        isOpen={followListType !== null} 
        onClose={() => setFollowListType(null)} 
        title={followListType === 'followers' ? 'Seguidores' : 'Seguindo'}
        users={followListType === 'followers' ? followersList : followingList}
        loading={loadingFollowList}
        onUserClick={(uname) => navigate(`/profile/${uname}`)}
      />

      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 z-50 bg-cream/95 backdrop-blur-sm border-b border-black/5">
        <div className="flex items-center justify-between px-4 h-14">
           <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5">
             <span className="material-symbols-outlined">arrow_back</span>
           </button>
           
           <h2 className="text-lg font-bold">@{profileUser?.username || '...'}</h2>
           
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
                           <button onClick={() => { setShowBlockConfirm(true); }} className="w-full text-left px-4 py-3 text-red-500 font-bold text-sm hover:bg-red-50">Bloquear</button>
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
            <section className="px-5 pt-4 pb-6 flex flex-col items-center animate-fade-in">
               {/* Avatar */}
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
               {(profileUser.city || profileUser.neighborhood) && (
                 <p className="text-xs text-gray-500 mb-5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {profileUser.city} {profileUser.city && profileUser.neighborhood ? '•' : ''} {profileUser.neighborhood}
                 </p>
               )}
               
               {/* Stats */}
               <div className="flex gap-10 mb-6">
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

               {profileUser.bio && (
                 <p className="text-center text-sm leading-relaxed max-w-xs">{profileUser.bio}</p>
               )}

               {/* Buttons */}
               <div className="flex gap-3 mt-6 w-full">
                 {isCurrentUser ? (
                     <>
                        <button 
                            onClick={handleEditOpen}
                            className="flex-1 h-11 rounded-full border-2 border-primary text-primary font-bold text-sm hover:bg-primary/5 transition-colors"
                        >
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
                                isFollowing 
                                ? 'bg-white border border-gray-200 text-dark' 
                                : 'bg-primary text-white'
                            }`}
                        >
                            {isFollowing ? 'Seguindo ✓' : 'Seguir'}
                        </button>
                        <button className="flex-1 h-11 rounded-full border-2 border-gray-300 text-dark font-bold text-sm hover:bg-gray-100 transition-colors">
                            Mensagem
                        </button>
                     </>
                 )}
               </div>
            </section>

            {/* --- DEFAULT LIST (Quero ir) --- */}
            {(isCurrentUser || isFollowing) && defaultList && (
                <section className="px-5 space-y-4 mb-8 animate-fade-in">
                    <div 
                        onClick={() => navigate(`/lists/${defaultList.id}`)}
                        className="bg-white rounded-2xl p-4 flex items-center justify-between border border-black/5 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-full text-primary">
                            <span className="material-symbols-outlined filled">bookmark</span>
                        </div>
                        <span className="font-bold text-lg">{defaultList.name}</span>
                        </div>
                        <span className="text-secondary font-medium text-sm">{defaultList.count || 0} lugares</span>
                    </div>
                </section>
            )}
            
            {/* --- PUBLIC LISTS SLIDER --- */}
            {(isCurrentUser || isFollowing) && publicLists.length > 0 && (
                <section className="mt-8 px-5 mb-8 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Listas {isCurrentUser ? '' : 'Públicas'}</h3>
                    {isCurrentUser && (
                      <button onClick={() => navigate('/lists')} className="text-primary font-bold text-sm">Ver todas</button>
                    )}
                  </div>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                     {publicLists.map((list) => (
                        <div 
                            key={list.id} 
                            onClick={() => navigate(`/lists/${list.id}`)}
                            className="relative w-40 shrink-0 aspect-[4/5] rounded-2xl overflow-hidden group bg-gray-200 cursor-pointer active:scale-95 transition-transform"
                        >
                           <img 
                             src={list.cover_photo_url || DEFAULT_RESTAURANT} 
                             className="absolute inset-0 size-full object-cover" 
                             alt={list.name}
                             onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_RESTAURANT; }}
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                           <div className="absolute bottom-4 left-4 text-white font-bold text-lg leading-tight">{list.name}</div>
                           {list.is_private && <div className="absolute top-2 right-2 text-white/70"><span className="material-symbols-outlined text-sm">lock</span></div>}
                        </div>
                     ))}
                  </div>
                </section>
            )}

            {/* --- ATIVIDADE RECENTE --- */}
            {(isCurrentUser || isFollowing) && (
               <section className="px-5 mb-8 animate-fade-in">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">ATIVIDADE RECENTE</h3>
                  <div className="space-y-4">
                     {activities.map((activity) => (
                        activity.type === 'review' ? (
                            <div 
                               key={activity.data.id}
                               onClick={() => navigate('/feed')}
                               className="border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-dark transition-colors bg-white/50 active:scale-[0.99]"
                            >
                               <div className="flex items-start gap-3">
                                  {activity.data.photos && activity.data.photos.length > 0 ? (
                                    <img 
                                      src={activity.data.photos[0].url} 
                                      className="size-16 rounded-lg object-cover bg-gray-200 shrink-0" 
                                      alt="Review"
                                      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_RESTAURANT; }}
                                    />
                                  ) : (
                                    <div className="size-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-400">
                                       <span className="material-symbols-outlined">restaurant</span>
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                     <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-dark truncate">{activity.data.restaurant?.name || 'Restaurante'}</h4>
                                        <div className="flex items-center gap-0.5 text-yellow-500">
                                           <span className="material-symbols-outlined filled text-[14px]">star</span>
                                           <span className="text-xs font-bold">{activity.data.average_score?.toFixed(1)}</span>
                                        </div>
                                     </div>
                                     <p className="text-sm text-gray-600 line-clamp-2 italic">"{activity.data.description}"</p>
                                     <p className="text-[10px] text-gray-400 mt-1">{new Date(activity.data.created_at).toLocaleDateString()}</p>
                                  </div>
                               </div>
                            </div>
                        ) : (
                            <div 
                               key={activity.data.id}
                               className="border border-gray-200 rounded-xl p-4 bg-white/50"
                            >
                                <div className="flex gap-2 items-start">
                                    <span className="material-symbols-outlined text-gray-400 text-[18px] mt-0.5">chat_bubble</span>
                                    <div>
                                        <p className="text-sm text-gray-700 italic">"{activity.data.content}"</p>
                                        <p className="text-[10px] text-gray-400 mt-1">{new Date(activity.data.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        )
                     ))}
                     
                     {activities.length === 0 && (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-400 text-sm">
                            Nenhuma atividade recente.
                        </div>
                     )}
                  </div>
               </section>
            )}
            
            {(!isCurrentUser && !isFollowing) && (
                 <div className="px-6 py-4 text-center text-gray-400 text-sm italic animate-fade-in">
                     Siga @{profileUser.username} para ver as atividades recentes.
                 </div>
            )}

            <div className="h-10 flex items-center justify-center text-xs text-gray-600 font-medium tracking-widest">
                ... scroll
            </div>
           </>
        )}

      </main>
    </div>
  );
};