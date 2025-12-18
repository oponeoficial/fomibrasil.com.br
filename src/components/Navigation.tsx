import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../AppContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, supabase } = useAppContext();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleHelp = () => {
    window.location.href = 'mailto:contato@fomibrasil.com.br';
    onClose();
  };

  const handleInvite = async () => {
    const shareData = {
      title: 'Fomí',
      text: 'Descubra e compartilhe experiências gastronômicas no Fomí!',
      url: 'https://fomi.com.br'
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      navigator.clipboard.writeText('https://fomi.com.br');
      alert('Link copiado: fomi.com.br');
    }
    onClose();
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    await supabase.auth.signOut();
    setShowLogoutConfirm(false);
    onClose();
    navigate('/login');
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const renderMenuItem = (label: string, icon: string, path: string) => {
    const active = isActive(path);
    const baseClass = "w-full flex items-center gap-4 px-5 h-14 rounded-full transition-colors";
     
    if (active) {
        return (
           <button onClick={() => handleNav(path)} className={`${baseClass} bg-primary text-white shadow-sm shadow-primary/20`}>
             <span className="material-symbols-outlined filled">{icon}</span>
             <span className="font-bold">{label}</span>
           </button>
        );
    }
     
    return (
       <button onClick={() => handleNav(path)} className={`${baseClass} hover:bg-black/5 text-dark`}>
         <span className="material-symbols-outlined">{icon}</span>
         <span className="font-medium">{label}</span>
       </button>
    );
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed inset-y-0 left-0 w-[85%] max-w-xs bg-cream z-50 shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full relative">
          
          {/* Header */}
          <div className="pt-12 px-6 pb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full border-2 border-primary/20 overflow-hidden bg-gray-200">
                  {currentUser.profile_photo_url ? (
                    <img src={currentUser.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="material-symbols-outlined">person</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bem-vindo</p>
                  <p className="text-lg font-bold text-dark">{currentUser.full_name}</p>
                </div>
              </div>
              <button onClick={onClose} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          {/* Links */}
          <div className="flex-1 overflow-y-auto px-4 space-y-2">
            {renderMenuItem('Início', 'home', '/feed')}
            {renderMenuItem('Minhas Listas', 'format_list_bulleted', '/lists')}
            {renderMenuItem('Para Você', 'auto_awesome', '/recommendations')}
            
            <div className="h-px bg-gray-200 my-2 mx-5" />
            
            <button onClick={handleHelp} className="w-full flex items-center gap-4 px-5 h-14 rounded-full hover:bg-black/5 text-dark">
              <span className="material-symbols-outlined">help</span>
              <span className="font-medium">Ajuda e Feedback</span>
            </button>
            <button onClick={handleInvite} className="w-full flex items-center gap-4 px-5 h-14 rounded-full hover:bg-black/5 text-dark">
              <span className="material-symbols-outlined">person_add</span>
              <span className="font-medium">Convidar amigos</span>
            </button>
            <button onClick={handleLogoutClick} className="w-full flex items-center gap-4 px-5 h-14 rounded-full hover:bg-primary/10 text-primary">
              <span className="material-symbols-outlined">logout</span>
              <span className="font-medium">Sair</span>
            </button>
          </div>
          
          <div className="p-6 pb-8">
             <div className="flex items-center gap-2 opacity-90">
               <img 
                 src="/logo-fomi-vermelho.png" 
                 alt="Fomí" 
                 className="h-8 object-contain" 
               />
             </div>
             <p className="text-gray-400 text-xs mt-2">© 2025 Fomí.</p>
          </div>

          {/* Logout Confirmation Modal */}
          {showLogoutConfirm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
               {/* Darker backdrop for modal focus */}
               <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={cancelLogout}></div>
               
               <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl relative z-10 animate-bounce-in flex flex-col items-center text-center">
                  <h3 className="text-lg font-bold text-dark mb-6">Tem certeza que deseja sair?</h3>
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={cancelLogout}
                      className="flex-1 h-12 rounded-xl border-2 border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={confirmLogout}
                      className="flex-1 h-12 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                    >
                      Sair
                    </button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-black/5 pb-safe pt-2 px-2 z-30">
      <div className="flex items-center justify-around h-[60px] max-w-md mx-auto">
        <button 
          onClick={() => navigate('/feed')}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 ${isActive('/feed') ? 'text-primary' : 'text-gray-400'}`}
        >
          <span className={`material-symbols-outlined text-[28px] ${isActive('/feed') ? 'filled' : ''}`}>home</span>
          <span className="text-[10px] font-bold">Início</span>
        </button>
        
        <button 
          onClick={() => navigate('/discover')}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 ${isActive('/discover') ? 'text-primary' : 'text-gray-400'}`}
        >
          <span className={`material-symbols-outlined text-[28px] ${isActive('/discover') ? 'filled' : ''}`}>explore</span>
          <span className="text-[10px] font-medium">Descobrir</span>
        </button>

        <div className="w-16 h-full flex items-center justify-center relative">
          <button 
            onClick={() => navigate('/new-review')}
            className="absolute -top-6 h-14 w-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 text-white transition-transform active:scale-95 border-4 border-surface"
          >
            <span className="material-symbols-outlined text-[32px]">add</span>
          </button>
        </div>

        <button 
          onClick={() => navigate('/recommendations')}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 ${isActive('/recommendations') ? 'text-primary' : 'text-gray-400'}`}
        >
          <span className={`material-symbols-outlined text-[28px] ${isActive('/recommendations') ? 'filled' : ''}`}>thumb_up</span>
          <span className="text-[10px] font-medium">Recom.</span>
        </button>

        <button 
          onClick={() => navigate('/profile')}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 ${isActive('/profile') ? 'text-primary' : 'text-gray-400'}`}
        >
          <span className={`material-symbols-outlined text-[28px] ${isActive('/profile') ? 'filled' : ''}`}>person</span>
          <span className="text-[10px] font-medium">Perfil</span>
        </button>
      </div>
    </div>
  );
};