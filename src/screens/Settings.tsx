import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../AppContext';
import { DEFAULT_AVATAR } from '../constants';

// --- MODAL GENÉRICO ---
const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-slide-up sm:animate-bounce-in overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="font-bold text-dark text-lg">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- MODAL DE CONFIRMAÇÃO ---
const ConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmDestructive?: boolean;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', confirmDestructive = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-xs text-center animate-bounce-in">
        <h3 className="font-bold text-lg mb-2 text-dark">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm} 
            className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
              confirmDestructive 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { signOut, supabase, currentUser } = useAppContext();

  // Estados dos modais
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // Estados do modal de edição de perfil
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    username: '',
    bio: '',
    city: '',
    neighborhood: '',
    profile_photo_url: ''
  });
  const [editSaving, setEditSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do reset de senha
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handler de logout
  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Handler de reset de senha
  const handlePasswordReset = async () => {
    setPwdError(null);

    if (!pwdForm.new || !pwdForm.confirm) {
      setPwdError('Preencha todos os campos');
      return;
    }

    if (pwdForm.new.length < 6) {
      setPwdError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (pwdForm.new !== pwdForm.confirm) {
      setPwdError('As senhas não conferem');
      return;
    }

    setPwdLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: pwdForm.new });
      
      if (error) throw error;

      setPwdSuccess(true);
      setPwdForm({ current: '', new: '', confirm: '' });
      
      setTimeout(() => {
        setShowSecurityModal(false);
        setPwdSuccess(false);
      }, 2000);
    } catch (err: any) {
      setPwdError(err.message || 'Erro ao alterar senha');
    } finally {
      setPwdLoading(false);
    }
  };

  // Handler para abrir modal de edição
  const handleOpenEditProfile = () => {
    if (currentUser) {
      setEditForm({
        full_name: currentUser.full_name || '',
        username: currentUser.username || '',
        bio: currentUser.bio || '',
        city: currentUser.city || '',
        neighborhood: currentUser.neighborhood || '',
        profile_photo_url: currentUser.profile_photo_url || ''
      });
      setShowEditProfileModal(true);
    }
  };

  // Handler de upload de imagem
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
      setEditForm(prev => ({ ...prev, profile_photo_url: urlData.publicUrl }));
    }
  };

  // Handler de salvar perfil
  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setEditSaving(true);

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

      setShowEditProfileModal(false);
      showToast("Perfil atualizado!");
      
      // Recarregar a página para atualizar o contexto
      window.location.reload();
    } catch {
      showToast("Erro ao atualizar");
    } finally {
      setEditSaving(false);
    }
  };

  // Estrutura das configurações
  const settingSections = [
    {
      title: 'Conta',
      items: [
        { label: 'Dados pessoais', icon: 'person', action: handleOpenEditProfile },
        { label: 'Segurança', icon: 'lock', action: () => setShowSecurityModal(true) },
        { label: 'Privacidade', icon: 'shield', action: () => setShowPrivacyModal(true) },
        { label: 'Notificações', icon: 'notifications', action: () => setShowNotificationsModal(true) },
      ]
    },
    {
      title: 'Suporte',
      items: [
        { label: 'Ajuda', icon: 'help', action: () => setShowHelpModal(true) },
        { label: 'Sobre o Fomí', icon: 'info', action: () => setShowAboutModal(true) },
      ]
    },
    {
      title: '',
      items: [
        { label: 'Sair', icon: 'logout', action: () => setShowLogoutConfirm(true), destructive: true },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-cream pb-safe">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] animate-bounce-in">
          <div className="bg-dark/90 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            {toastMessage}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur-sm border-b border-black/5 px-4 h-16 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold">Configurações</h1>
      </header>

      {/* Modal: Editar Perfil */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditProfileModal(false)} />
          <div className="relative bg-[#1c1c0d] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-bounce-in flex flex-col max-h-[90vh] text-white border border-white/10">
            
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <button onClick={() => setShowEditProfileModal(false)}>
                <span className="material-symbols-outlined text-gray-400">close</span>
              </button>
              <h3 className="text-lg font-bold">Editar Perfil</h3>
              <button onClick={handleSaveProfile} disabled={editSaving} className="text-primary font-bold text-sm disabled:opacity-50">
                {editSaving ? '...' : 'Salvar'}
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex flex-col items-center">
                <div 
                  className="relative size-24 mb-3 rounded-full overflow-hidden border border-white/20 cursor-pointer" 
                  onClick={() => fileInputRef.current?.click()}
                >
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
                <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-gray-400 uppercase hover:text-white">
                  Alterar foto
                </button>
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
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="p-4 space-y-6">
        {settingSections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {section.title && (
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2">
                {section.title}
              </h3>
            )}
            <div className="bg-white rounded-2xl overflow-hidden border border-black/5 shadow-sm">
              {section.items.map((item, idx) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={`w-full text-left px-5 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors ${
                    idx !== section.items.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-xl ${item.destructive ? 'text-red-500' : 'text-gray-500'}`}>
                      {item.icon}
                    </span>
                    <span className={`font-medium ${item.destructive ? 'text-red-500' : 'text-dark'}`}>
                      {item.label}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-gray-400 text-sm">arrow_forward_ios</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-8 text-center text-xs text-gray-400">
          Versão 1.0.0
        </div>
      </main>

      {/* Modal: Privacidade (Política de Privacidade) */}
      <Modal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} title="Política de Privacidade">
        <div className="p-6 space-y-4 text-sm text-gray-600 leading-relaxed">
          <h4 className="font-bold text-dark text-base">Política de Privacidade do Fomí</h4>
          
          <p>
            O Fomí valoriza a privacidade dos seus usuários. Esta política descreve como coletamos, 
            usamos e protegemos suas informações pessoais.
          </p>

          <h5 className="font-bold text-dark mt-4">1. Informações Coletadas</h5>
          <p>
            Coletamos informações que você nos fornece diretamente, como nome, e-mail, foto de perfil, 
            e suas avaliações de restaurantes. Também coletamos dados de uso do aplicativo para 
            melhorar sua experiência.
          </p>

          <h5 className="font-bold text-dark mt-4">2. Uso das Informações</h5>
          <p>
            Utilizamos suas informações para personalizar sua experiência, mostrar recomendações 
            relevantes, e permitir interações sociais dentro da plataforma.
          </p>

          <h5 className="font-bold text-dark mt-4">3. Compartilhamento</h5>
          <p>
            Não vendemos suas informações pessoais. Compartilhamos dados apenas conforme necessário 
            para operar o serviço ou quando exigido por lei.
          </p>

          <h5 className="font-bold text-dark mt-4">4. Segurança</h5>
          <p>
            Implementamos medidas de segurança técnicas e organizacionais para proteger suas 
            informações contra acesso não autorizado.
          </p>

          <h5 className="font-bold text-dark mt-4">5. Seus Direitos</h5>
          <p>
            Você pode acessar, corrigir ou excluir suas informações pessoais a qualquer momento 
            através das configurações do aplicativo ou entrando em contato conosco.
          </p>

          <h5 className="font-bold text-dark mt-4">6. Contato</h5>
          <p>
            Para dúvidas sobre privacidade, entre em contato pelo e-mail: 
            <a href="mailto:contato@fomibrasil.com.br" className="text-primary font-medium ml-1">
              contato@fomibrasil.com.br
            </a>
          </p>

          <p className="text-xs text-gray-400 mt-6">
            Última atualização: Dezembro de 2024
          </p>
        </div>
      </Modal>

      {/* Modal: Segurança (Reset de Senha) */}
      <Modal isOpen={showSecurityModal} onClose={() => setShowSecurityModal(false)} title="Segurança">
        <div className="p-6 space-y-6">
          {pwdSuccess ? (
            <div className="text-center py-8">
              <div className="size-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-green-500 text-3xl">check_circle</span>
              </div>
              <h4 className="font-bold text-lg text-dark mb-2">Senha alterada!</h4>
              <p className="text-sm text-gray-500">Sua senha foi atualizada com sucesso.</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-4">
                <div className="size-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-primary text-2xl">lock_reset</span>
                </div>
                <h4 className="font-bold text-dark">Alterar Senha</h4>
                <p className="text-sm text-gray-500 mt-1">Digite sua nova senha abaixo</p>
              </div>

              {pwdError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500 text-sm">error</span>
                  <span className="text-sm text-red-600">{pwdError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nova Senha</label>
                  <input
                    type="password"
                    value={pwdForm.new}
                    onChange={e => setPwdForm({ ...pwdForm, new: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-gray-50 border border-gray-200 p-3 text-dark outline-none focus:border-primary focus:bg-white rounded-xl transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    value={pwdForm.confirm}
                    onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                    placeholder="Digite novamente"
                    className="w-full bg-gray-50 border border-gray-200 p-3 text-dark outline-none focus:border-primary focus:bg-white rounded-xl transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handlePasswordReset}
                disabled={pwdLoading}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {pwdLoading ? (
                  <>
                    <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Alterando...
                  </>
                ) : (
                  'Alterar Senha'
                )}
              </button>
            </>
          )}
        </div>
      </Modal>

      {/* Modal: Notificações */}
      <Modal isOpen={showNotificationsModal} onClose={() => setShowNotificationsModal(false)} title="Notificações">
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500 text-center">
            As configurações de notificações estarão disponíveis em breve.
          </p>
          
          <div className="space-y-3 opacity-50 pointer-events-none">
            {[
              { label: 'Novos seguidores', enabled: true },
              { label: 'Curtidas nas suas reviews', enabled: true },
              { label: 'Comentários', enabled: true },
              { label: 'Recomendações personalizadas', enabled: false },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <span className="font-medium text-dark">{item.label}</span>
                <div className={`w-11 h-6 rounded-full p-0.5 transition-colors ${item.enabled ? 'bg-primary' : 'bg-gray-300'}`}>
                  <div className={`size-5 bg-white rounded-full shadow transition-transform ${item.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            Em breve você poderá personalizar suas notificações
          </p>
        </div>
      </Modal>

      {/* Modal: Ajuda */}
      <Modal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} title="Ajuda">
        <div className="p-6 text-center">
          <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">support_agent</span>
          </div>
          
          <h4 className="font-bold text-lg text-dark mb-2">Precisa de ajuda?</h4>
          <p className="text-sm text-gray-500 mb-6">
            Entre em contato com nossa equipe de suporte. Estamos aqui para ajudar!
          </p>

          <a
            href="mailto:contato@fomibrasil.com.br"
            className="inline-flex items-center gap-2 bg-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">mail</span>
            contato@fomibrasil.com.br
          </a>

          <p className="text-xs text-gray-400 mt-6">
            Respondemos em até 24 horas úteis
          </p>
        </div>
      </Modal>

      {/* Modal: Sobre o Fomí */}
      <Modal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} title="Sobre o Fomí">
        <div className="p-6 text-center">
          <img 
            src="/logo-fomi-vermelho.png" 
            alt="Fomí" 
            className="h-16 mx-auto mb-6"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          
          <h4 className="font-bold text-xl text-dark mb-2">Fomí Brasil</h4>
          <p className="text-sm text-gray-500 mb-6">
            Descubra os melhores restaurantes através das recomendações de quem você confia.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Versão</span>
              <span className="font-medium text-dark">1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Plataforma</span>
              <span className="font-medium text-dark">Web App</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            © 2024 Fomí Brasil. Todos os direitos reservados.
          </p>
        </div>
      </Modal>

      {/* Modal: Confirmação de Logout */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Sair da conta?"
        message="Você precisará fazer login novamente para acessar sua conta."
        confirmText="Sair"
        confirmDestructive
      />
    </div>
  );
};