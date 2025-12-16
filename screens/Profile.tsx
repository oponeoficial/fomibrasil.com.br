import React, { useState, useRef, useMemo, useEffect } from 'react';
import { CURRENT_USER, MOCK_USERS, MOCK_LISTS, MOCK_REVIEWS, MOCK_COMMENTS } from '../constants';
import { useNavigate, useParams } from 'react-router-dom';
import { User, List, Review, Comment } from '../types';
import { useAppContext } from '../AppContext';

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
  users: User[]; // Mock users to show
}> = ({ isOpen, onClose, title, users }) => {
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
             {users.slice(0, 8).map(u => (
               <div key={u.id} className="flex items-center justify-between p-2">
                 <div className="flex items-center gap-3">
                    <img src={u.profile_photo_url} className="size-10 rounded-full bg-gray-200" alt={u.username}/>
                    <div>
                       <p className="font-bold text-sm text-dark">{u.full_name}</p>
                       <p className="text-xs text-gray-500">@{u.username}</p>
                    </div>
                 </div>
                 <button className="text-xs font-bold px-3 py-1.5 bg-gray-100 rounded-full hover:bg-gray-200">
                    Ver
                 </button>
               </div>
             ))}
         </div>
       </div>
    </div>
  );
};

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { username } = useParams();
  const { following, followUser, unfollowUser } = useAppContext();
  
  const [loading, setLoading] = useState(true);

  // --- USER RESOLUTION ---
  const isCurrentUser = !username || username === CURRENT_USER.username;
  
  // Find user data
  const initialUser = useMemo(() => {
    if (isCurrentUser) return CURRENT_USER;
    const found = MOCK_USERS.find(u => u.username === username || u.username === username?.replace('@', ''));
    return found || CURRENT_USER; // Fallback to current if not found (or handle 404)
  }, [username, isCurrentUser]);

  // Local state for "Other User" interactions
  const [user, setUser] = useState(initialUser);
  const isFollowing = following.includes(user.id);
  const [isBlocked, setIsBlocked] = useState(false);

  // Calculate dynamic follower count based on initial mock data assumptions
  const displayedFollowers = useMemo(() => {
    const INITIAL_FOLLOWING_IDS = ['u2', 'u3'];
    const wasFollowingInitially = INITIAL_FOLLOWING_IDS.includes(user.id);
    
    let count = user.followers_count || 0;
    
    if (isFollowing) {
        if (!wasFollowingInitially) count += 1;
    } else {
        if (wasFollowingInitially) count -= 1;
    }
    return Math.max(0, count);
  }, [user.followers_count, user.id, isFollowing]);
  
  // Simulate loading
  useEffect(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  }, [username]);

  // --- DATA FETCHING (MOCK) ---
  const activities = useMemo(() => {
    let reviews = MOCK_REVIEWS.filter(r => r.user_id === user.id);
    let comments = MOCK_COMMENTS.filter(c => c.user?.id === user.id);

    // DEMO: Inject fake activity for CURRENT_USER if empty, so the UI isn't blank
    if (user.id === CURRENT_USER.id && reviews.length === 0) {
       reviews = [
         {
            id: 'mock-rv-ana',
            user_id: user.id,
            user: user,
            restaurant_id: 'r1',
            restaurant: undefined, // Mock
            title: 'Mock Review',
            description: 'Jantar maravilhoso! O ambiente é super aconchegante e a massa estava no ponto perfeito.',
            average_score: 4.8,
            review_type: 'in_person',
            photos: [{ url: 'https://picsum.photos/seed/pasta/300/300', order: 1 }],
            likes_count: 45,
            comments_count: 2,
            created_at: new Date(Date.now() - 172800000).toISOString(),
            is_liked: true,
            is_saved: false
         },
         // ... more mocks if needed
       ];
       comments = [
         {
           id: 'mock-c-ana',
           user_id: user.id,
           user: user,
           review_id: 'r1',
           content: 'Preciso voltar nesse lugar! 😍',
           created_at: new Date(Date.now() - 18000000).toISOString(),
         }
       ];
    }

    const mixed = [
       ...reviews.map(r => ({ type: 'review' as const, data: r })),
       ...comments.map(c => ({ type: 'comment' as const, data: c }))
    ];
    
    return mixed;
  }, [user.id]);
  
  // --- EDIT MODAL STATE (Dark Theme) ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editStep, setEditStep] = useState<'main' | 'email' | 'password'>('main');
  const [editForm, setEditForm] = useState(CURRENT_USER);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Email Sub-flow State
  const [emailForm, setEmailForm] = useState({ newEmail: '', currentPwd: '' });
  const [emailStep, setEmailStep] = useState(0); // 0: input, 1: sent old, 2: sent new

  // Edit Password Sub-flow State
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });

  // --- OTHER MODALS ---
  const [followListType, setFollowListType] = useState<'followers' | 'following' | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- HELPERS ---
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleShare = async () => {
    if (navigator.share) {
        try { await navigator.share({ title: `Perfil de ${user.full_name}`, url: window.location.href }); } 
        catch (e) {}
    } else {
        showToast("Link do perfil copiado!");
    }
  };

  // --- EDIT ACTIONS ---
  const handleEditOpen = () => {
    setEditForm(user);
    setEditStep('main');
    setIsEditModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setEditForm(prev => ({ ...prev, profile_photo_url: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveMain = () => {
    setUser(editForm);
    setIsEditModalOpen(false);
    showToast("Perfil atualizado!");
  };

  // Email Flow
  const startEmailFlow = () => {
     setEmailStep(0);
     setEmailForm({ newEmail: '', currentPwd: '' });
     setEditStep('email');
  };
  
  const processEmailChange = () => {
     if (emailStep === 0) {
        setEmailStep(1);
     } else if (emailStep === 1) {
        setEmailStep(2);
     } else {
        setEditForm(prev => ({ ...prev, email: emailForm.newEmail }));
        setEditStep('main');
        showToast("E-mail atualizado!");
     }
  };

  // Password Flow
  const startPwdFlow = () => {
      setPwdForm({ current: '', new: '', confirm: '' });
      setEditStep('password');
  };

  const processPwdChange = () => {
      if (pwdForm.new !== pwdForm.confirm) {
          alert("Senhas não conferem");
          return;
      }
      setEditStep('main');
      showToast("Senha alterada com sucesso!");
  };

  // --- OTHER USER ACTIONS ---
  const toggleFollow = () => {
      if (isFollowing) {
        unfollowUser(user.id);
        showToast("Deixou de seguir");
      } else {
        followUser(user.id);
        showToast("Seguindo!");
      }
  };

  const handleBlock = () => {
      setShowBlockConfirm(false);
      setIsBlocked(true);
      setShowMenu(false);
      showToast(`Você bloqueou @${user.username}`);
  };

  // --- RENDER ---

  if (isBlocked) {
      return (
          <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-center">
              <span className="material-symbols-outlined text-4xl text-gray-400 mb-4">block</span>
              <h2 className="text-xl font-bold mb-2">Usuário Bloqueado</h2>
              <p className="text-gray-500 mb-6">Você bloqueou este usuário. Desbloqueie para ver o perfil.</p>
              <button onClick={() => navigate(-1)} className="text-primary font-bold">Voltar</button>
              <button onClick={() => setIsBlocked(false)} className="mt-8 text-xs text-gray-400 underline">Desbloquear (Demo)</button>
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
      {isEditModalOpen && (
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
                  <button onClick={handleSaveMain} className="text-primary font-bold text-sm">Salvar</button>
               )}
               {editStep !== 'main' && <div className="w-6"></div>}
            </div>
            
            {/* MAIN EDIT STEP */}
            {editStep === 'main' && (
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Avatar */}
                    <div className="flex flex-col items-center">
                        <div className="relative size-24 mb-3 border border-white/20 p-1 bg-white/5 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                           <img src={editForm.profile_photo_url} alt="Avatar" className="size-full object-cover" />
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
                                value={editForm.full_name} 
                                onChange={e => setEditForm({...editForm, full_name: e.target.value})} 
                                className="w-full bg-transparent border border-white/20 p-3 text-white focus:border-primary outline-none" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Username</label>
                            <input 
                                value={editForm.username} 
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
      {showBlockConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBlockConfirm(false)} />
           <div className="relative bg-white rounded-3xl p-6 w-full max-w-xs text-center animate-bounce-in">
               <h3 className="font-bold text-lg mb-2 text-dark">Bloquear @{user.username}?</h3>
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
        users={MOCK_USERS} 
      />

      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 z-50 bg-cream/95 backdrop-blur-sm border-b border-black/5">
        <div className="flex items-center justify-between px-4 h-14">
           {isCurrentUser ? (
               <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5"><span className="material-symbols-outlined">arrow_back</span></button>
           ) : (
               <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5"><span className="material-symbols-outlined">arrow_back</span></button>
           )}
           
           <h2 className="text-lg font-bold">@{user.username}</h2>
           
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
                           <button onClick={() => { alert("Denunciado"); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-dark font-medium text-sm hover:bg-gray-50">Denunciar</button>
                       </div>
                   )}
               </div>
           )}
        </div>
      </nav>

      <main>
        {loading ? (
           <SkeletonProfile />
        ) : (
           <>
            <section className="px-5 pt-4 pb-6 flex flex-col items-center animate-fade-in">
               {/* Avatar */}
               <div className="relative mb-4">
                 <div className="size-32 rounded-full p-1 border-2 border-primary/20">
                   <img src={user.profile_photo_url} alt="Profile" className="size-full rounded-full object-cover" />
                 </div>
               </div>
               
               <h1 className="text-2xl font-bold mb-1 text-center">{user.full_name}</h1>
               {(user.city || user.neighborhood) && (
                 <p className="text-xs text-gray-500 mb-5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {user.city} {user.city && user.neighborhood ? '•' : ''} {user.neighborhood}
                 </p>
               )}
               
               {/* Stats */}
               <div className="flex gap-10 mb-6">
                 <div className="text-center">
                   <span className="block text-xl font-bold">{user.reviews_count || 0}</span>
                   <span className="text-xs text-secondary">Reviews</span>
                 </div>
                 <div className="w-px bg-black/10"></div>
                 <button onClick={() => setFollowListType('followers')} className="text-center hover:opacity-70 transition-opacity">
                   <span className="block text-xl font-bold">{displayedFollowers}</span>
                   <span className="text-xs text-secondary">Seguidores</span>
                 </button>
                 <div className="w-px bg-black/10"></div>
                 <button onClick={() => setFollowListType('following')} className="text-center hover:opacity-70 transition-opacity">
                   <span className="block text-xl font-bold">{user.following_count || 0}</span>
                   <span className="text-xs text-secondary">Seguindo</span>
                 </button>
               </div>

               <p className="text-center text-sm leading-relaxed max-w-xs">{user.bio}</p>

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
                            {isFollowing ? 'Seguindo' : 'Seguir'} {isFollowing && '✓'}
                        </button>
                        <button className="flex-1 h-11 rounded-full border-2 border-gray-300 text-dark font-bold text-sm hover:bg-gray-100 transition-colors">
                            Mensagem
                        </button>
                     </>
                 )}
               </div>
            </section>

            {/* --- DEFAULT ACTIVITY & LISTS --- */}
            {(isCurrentUser || isFollowing) && (
                <section className="px-5 space-y-4 mb-8 animate-fade-in">
                    <div 
                        onClick={() => navigate('/lists/l0', { state: { list: MOCK_LISTS.find(l => l.id === 'l0') } })}
                        className="bg-white rounded-2xl p-4 flex items-center justify-between border border-black/5 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-full text-primary">
                            <span className="material-symbols-outlined filled">restaurant</span>
                        </div>
                        <span className="font-bold text-lg">Já foi</span>
                        </div>
                        <span className="text-secondary font-medium text-sm">45 places</span>
                    </div>

                    <div 
                        onClick={() => navigate('/lists/l1')} // l1 is "Quero ir" mock ID
                        className="bg-white rounded-2xl p-4 flex items-center justify-between border border-black/5 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-full text-primary">
                            <span className="material-symbols-outlined filled">bookmark</span>
                        </div>
                        <span className="font-bold text-lg">Quero ir</span>
                        </div>
                        <span className="text-secondary font-medium text-sm">23 places</span>
                    </div>
                </section>
            )}
            
            {/* --- PUBLIC LISTS SLIDER --- */}
            {(isCurrentUser || isFollowing) && (
                <section className="mt-8 px-5 mb-8 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Listas {isCurrentUser ? '' : 'Públicas'}</h3>
                    <button onClick={() => navigate('/lists')} className="text-primary font-bold text-sm">Ver todas</button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                     {MOCK_LISTS.filter(l => !l.is_default && (!l.is_private || isCurrentUser)).map((list) => (
                        <div 
                            key={list.id} 
                            onClick={() => navigate(`/lists/${list.id}`, { state: { list } })}
                            className="relative w-40 shrink-0 aspect-[4/5] rounded-2xl overflow-hidden group bg-gray-200 cursor-pointer active:scale-95 transition-transform"
                        >
                           <img src={list.cover_photo_url} className="absolute inset-0 size-full object-cover" alt={list.name}/>
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                           <div className="absolute bottom-4 left-4 text-white font-bold text-lg leading-tight">{list.name}</div>
                           {list.is_private && <div className="absolute top-2 right-2 text-white/70"><span className="material-symbols-outlined text-sm">lock</span></div>}
                        </div>
                     ))}
                  </div>
                </section>
            )}

            {/* --- ATIVIDADE RECENTE (LIST) --- */}
            {(isCurrentUser || isFollowing) && (
               <section className="px-5 mb-8 animate-fade-in">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">ATIVIDADE RECENTE</h3>
                  <div className="space-y-4">
                     {activities.map((activity) => (
                        activity.type === 'review' ? (
                            <div 
                               key={activity.data.id}
                               onClick={() => navigate('/feed')} // In a real app, go to specific review detail
                               className="border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-dark transition-colors bg-white/50 active:scale-[0.99]"
                            >
                               <div className="flex items-start gap-3">
                                  {activity.data.photos && activity.data.photos.length > 0 ? (
                                    <img 
                                      src={activity.data.photos[0].url} 
                                      className="size-16 rounded-lg object-cover bg-gray-200 shrink-0" 
                                      alt="Review" 
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
                                           <span className="text-xs font-bold">{activity.data.average_score}</span>
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
                     Siga @{user.username} para ver as atividades recentes.
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