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
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleGoToProfile = () => {
    navigate('/profile');
    onClose();
  };

  const handleHelp = () => {
    window.location.href = 'mailto:contato@fomibrasil.com.br';
    onClose();
  };

  const handleInvite = () => {
    const registerUrl = `${window.location.origin}/#/register`;
    const message = `Descubra e compartilhe novas experiências gastronômicas no Fomí! ${registerUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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
          
          {/* Header - Clicável para ir ao perfil */}
          <div className="pt-12 px-6 pb-6">
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={handleGoToProfile}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="size-12 rounded-full border-2 border-primary/20 overflow-hidden bg-gray-200">
                  {currentUser.profile_photo_url ? (
                    <img src={currentUser.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="material-symbols-outlined">person</span>
                    </div>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bem-vindo</p>
                  <p className="text-lg font-bold text-dark">@{currentUser.username}</p>
                </div>
              </button>
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
            <button onClick={() => setShowPrivacyPolicy(true)} className="w-full flex items-center gap-4 px-5 h-14 rounded-full hover:bg-black/5 text-dark">
              <span className="material-symbols-outlined">policy</span>
              <span className="font-medium">Política de Privacidade</span>
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

          {/* Privacy Policy Modal */}
          {showPrivacyPolicy && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowPrivacyPolicy(false)}></div>
               
               <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] shadow-2xl relative z-10 animate-bounce-in flex flex-col overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
                    <h3 className="text-lg font-bold text-dark">Política de Privacidade</h3>
                    <button 
                      onClick={() => setShowPrivacyPolicy(false)}
                      className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                    >
                      <span className="material-symbols-outlined text-gray-500">close</span>
                    </button>
                  </div>

                 {/* Content */}
<div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-gray-600 leading-relaxed">
  <p className="text-xs text-gray-400">Última atualização: Dezembro de 2024</p>
  
  <section>
    <h4 className="font-bold text-dark mb-2">1. Controlador dos Dados</h4>
    <p className="mb-2">
      A <strong>FOMI LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob nº 
      <strong> 63.925.178/0001-63</strong>, com sede na cidade de Recife, Estado de Pernambuco, 
      é a controladora dos dados pessoais tratados por meio do aplicativo Fomí, nos termos da 
      Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais - LGPD).
    </p>
    <p><strong>Representante Legal:</strong> Filippe Perrelli</p>
    <p><strong>Encarregado de Proteção de Dados (DPO):</strong>{' '}
      <a href="mailto:dpo@fomibrasil.com.br" className="text-primary font-medium">
        dpo@fomibrasil.com.br
      </a>
    </p>
  </section>

  <section>
    <h4 className="font-bold text-dark mb-2">2. Definições</h4>
    <p className="mb-2">Para fins desta Política, considera-se:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>Dados Pessoais:</strong> informação relacionada a pessoa natural identificada ou identificável</li>
      <li><strong>Tratamento:</strong> toda operação realizada com dados pessoais, como coleta, armazenamento, uso, compartilhamento ou eliminação</li>
      <li><strong>Titular:</strong> pessoa natural a quem se referem os dados pessoais objeto de tratamento</li>
      <li><strong>Controlador:</strong> pessoa natural ou jurídica a quem competem as decisões referentes ao tratamento de dados pessoais</li>
      <li><strong>Operador:</strong> pessoa natural ou jurídica que realiza o tratamento de dados pessoais em nome do controlador</li>
      <li><strong>Consentimento:</strong> manifestação livre, informada e inequívoca pela qual o titular concorda com o tratamento de seus dados</li>
    </ul>
  </section>

  <section>
    <h4 className="font-bold text-dark mb-2">3. Dados Coletados, Finalidades e Bases Legais</h4>
    <p className="mb-3">O Fomí coleta e trata os seguintes dados pessoais:</p>
    
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse border border-gray-200 mb-3">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 p-2 text-left">Categoria</th>
            <th className="border border-gray-200 p-2 text-left">Dados</th>
            <th className="border border-gray-200 p-2 text-left">Finalidade</th>
            <th className="border border-gray-200 p-2 text-left">Base Legal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-200 p-2">Cadastro</td>
            <td className="border border-gray-200 p-2">Nome, e-mail, data de nascimento</td>
            <td className="border border-gray-200 p-2">Criação e gestão de conta</td>
            <td className="border border-gray-200 p-2">Execução contratual (art. 7º, V)</td>
          </tr>
          <tr>
            <td className="border border-gray-200 p-2">Cadastro</td>
            <td className="border border-gray-200 p-2">Foto de perfil</td>
            <td className="border border-gray-200 p-2">Identificação na comunidade</td>
            <td className="border border-gray-200 p-2">Consentimento (art. 7º, I)</td>
          </tr>
          <tr>
            <td className="border border-gray-200 p-2">Uso</td>
            <td className="border border-gray-200 p-2">Reviews, curtidas, comentários, listas</td>
            <td className="border border-gray-200 p-2">Funcionalidades sociais da plataforma</td>
            <td className="border border-gray-200 p-2">Execução contratual (art. 7º, V)</td>
          </tr>
          <tr>
            <td className="border border-gray-200 p-2">Localização</td>
            <td className="border border-gray-200 p-2">Cidade, bairro</td>
            <td className="border border-gray-200 p-2">Recomendações personalizadas</td>
            <td className="border border-gray-200 p-2">Consentimento (art. 7º, I)</td>
          </tr>
          <tr>
            <td className="border border-gray-200 p-2">Preferências</td>
            <td className="border border-gray-200 p-2">Restrições alimentares, culinárias preferidas</td>
            <td className="border border-gray-200 p-2">Personalização de experiência</td>
            <td className="border border-gray-200 p-2">Consentimento (art. 7º, I)</td>
          </tr>
          <tr>
            <td className="border border-gray-200 p-2">Técnicos</td>
            <td className="border border-gray-200 p-2">Endereço IP, dispositivo, logs de acesso</td>
            <td className="border border-gray-200 p-2">Segurança e prevenção de fraudes</td>
            <td className="border border-gray-200 p-2">Legítimo interesse (art. 7º, IX)</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section>
    <h4 className="font-bold text-dark mb-2">4. Como Usamos suas Informações</h4>
    <p className="mb-2">Utilizamos suas informações para:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Fornecer, operar e melhorar nossos serviços</li>
      <li>Personalizar recomendações de restaurantes com base em suas preferências</li>
      <li>Permitir interações sociais (seguir, curtir, comentar)</li>
      <li>Enviar notificações relevantes sobre a plataforma</li>
      <li>Garantir a segurança e integridade da plataforma</li>
      <li>Cumprir obrigações legais e regulatórias</li>
      <li>Exercer direitos em processos judiciais, administrativos ou arbitrais</li>
    </ul>
  </section>

  <section>
    <h4 className="font-bold text-dark mb-2">5. Compartilhamento de Dados</h4>
    <p className="mb-2">
      <strong>Não vendemos seus dados pessoais.</strong> Compartilhamos informações apenas nas seguintes hipóteses:
    </p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>Com outros usuários:</strong> seu perfil público, reviews e interações são visíveis na plataforma conforme suas configurações de privacidade</li>
      <li><strong>Prestadores de serviços operacionais:</strong>
        <ul className="list-disc pl-5 mt-1">
          <li>Infraestrutura em nuvem (armazenamento seguro de dados)</li>
          <li>Serviços de analytics (dados anonimizados para melhoria do app)</li>
          <li>Serviços de e-mail transacional (notificações)</li>
        </ul>
      </li>
      <li><strong>Autoridades competentes:</strong> quando exigido por lei, decisão judicial ou requisição de autoridade competente</li>
    </ul>
    <p className="mt-2 text-xs text-gray-500">
      <strong>Transferência internacional:</strong> Caso seus dados sejam transferidos para servidores localizados 
      fora do Brasil, adotaremos as salvaguardas previstas no art. 33 da LGPD, incluindo cláusulas contratuais 
      padrão e verificação de nível adequado de proteção.
    </p>
  </section>

  <section>
    <h4 className="font-bold text-dark mb-2">6. Segurança dos Dados</h4>
    <p>
      Implementamos medidas técnicas e organizacionais apropriadas para proteger suas informações 
      contra acesso não autorizado, alteração, divulgação ou destruição, incluindo:
    </p>
    <ul className="list-disc pl-5 space-y-1 mt-2">
      <li>Criptografia de dados em trânsito e em repouso</li>
      <li>Autenticação segura com hash de senhas</li>
      <li>Controle de acesso baseado em funções (RBAC)</li>
      <li>Monitoramento contínuo de acessos e incidentes</li>
      <li>Backups regulares com redundância geográfica</li>
    </ul>
  </section>

  <section>
    <h4 className="font-bold text-dark mb-2">7. Retenção de Dados</h4>
    <p className="mb-2">Mantemos seus dados pelos seguintes períodos:</p>
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 p-2 text-left">Categoria</th>
            <th className="border border-gray-200 p-2 text-left">Período de Retenção</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-200 p-2">Dados de conta ativa</td>
            <td className="border border-gray-200 p-2">Enquanto a conta existir</td>
          </tr>
          <tr>
            <td className="border border-gray-200 p-2">Reviews e interações públicas</td>
            <td className="border border-gray-200 p-2">Enquanto a conta existir ou até exclusão pelo usuário</td>
          </tr>
          <tr>
            <td className="border border-gray-200 p-2">Logs de segurança</td>
            <td className="border border-gray-200 p-2">6 meses</td>
          </tr>
          <tr>
            <td className="border border-gray-200 p-2">Dados após exclusão de conta</td>
            <td className="border border-gray-200 p-2">Até 30 dias (backup operacional)</td>
          </tr>
          <tr>
            <td className="border border-gray-200 p-2">Dados para obrigações legais</td>
            <td className="border border-gray-200 p-2">Conforme prazo legal aplicável</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p className="mt-2">Após os períodos acima, os dados são eliminados ou anonimizados de forma irreversível.</p>
  </section>

  <section>
    <h4 className="font-bold text-dark mb-2">8. Seus Direitos</h4>
    <p className="mb-2">Nos termos da LGPD (art. 18), você pode exercer os seguintes direitos:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Confirmação da existência de tratamento</li>
      <li>Acesso aos dados pessoais</li>
      <li>Correção de dados incompletos, inexatos ou desatualizados</li>
      <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos</li>
      <li>Portabilidade dos dados a outro fornecedor de serviço</li>
      <li>Eliminação dos dados tratados com base no consentimento</li>
      <li>Informação sobre entidades públicas e privadas com as quais compartilhamos dados</li>
      <li>Informação sobre a possibilidade de não fornecer consentimento e suas consequências</li>
      <li>Revogação do consentimento a qualquer momento</li>
      <li>Revisão de decisões automatizadas que afetem seus interesses</li>
    </ul>
    <p className="mt-3">
      <strong>Como exercer seus direitos:</strong> Envie solicitação para{' '}
      <a href="mailto:privacidade@fomibrasil.com.br" className="text-primary font-medium">
        privacidade@fomibrasil.com.br
      </a>
    </p>
    <p className="mt-1">
      <strong>Prazo de resposta:</strong> Responderemos em até 15 (quinze) dias úteis.
    </p>
    <p className="mt-2 text-xs text-gray-500">
      Caso não fique satisfeito com nossa resposta, você pode apresentar reclamação à 
      Autoridade Nacional de Proteção de Dados (ANPD) através do site{' '}
      <a href="https://www.gov.br/anpd" className="text-primary">www.gov.br/anpd</a>.
    </p>
  </section>

  <section>
    <h4 className="font-bold text-dark mb-2">9. Cookies e Tecnologias Similares</h4>
    <p className="mb-2">
      Utilizamos cookies e tecnologias similares para melhorar sua experiência. Classificamos em:
    </p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>Essenciais:</strong> necessários para o funcionamento básico do aplicativo (não requerem consentimento)</li>
      <li><strong>Funcionais:</strong> lembram suas preferências e configurações</li>
      <li><strong>Analíticos:</strong> coletam dados anonimizados para melhoria do serviço</li>
    </ul>
    <p className="mt-2">
      Você pode gerenciar suas preferências de cookies nas configurações do aplicativo.
    </p>
  </section>

  <section>
    <h4 className="font-bold text-dark mb-2">10. Menores de Idade</h4>
    <p>
      O Fomí não é destinado a menores de 13 anos. Não coletamos intencionalmente dados 
      de crianças. Se tomarmos conhecimento de que coletamos dados de menor de 13 anos 
      sem consentimento parental verificável, tomaremos medidas para eliminar essas 
      informações de nossos servidores. Se você é pai ou responsável e acredita que 
      seu filho nos forneceu dados pessoais, entre em contato conosco.
    </p>
  </section>

  <section>
    <h4 className="font-bold text-dark mb-2">11. Alterações nesta Política</h4>
    <p>
      Podemos atualizar esta Política periodicamente para refletir mudanças em nossas 
      práticas ou por exigências legais. Notificaremos sobre alterações significativas 
      através do aplicativo ou por e-mail cadastrado. Recomendamos revisar esta página 
      periodicamente. A data da última atualização está indicada no topo deste documento.
    </p>
  </section>

  <section>
    <h4 className="font-bold text-dark mb-2">12. Contato</h4>
    <p>Para dúvidas sobre esta Política ou sobre o tratamento de seus dados:</p>
    <p className="mt-2">
      <strong>Encarregado de Proteção de Dados:</strong>{' '}
      <a href="mailto:dpo@fomibrasil.com.br" className="text-primary font-medium">
        dpo@fomibrasil.com.br
      </a>
    </p>
    <p className="mt-1">
      <strong>Canal de Privacidade:</strong>{' '}
      <a href="mailto:privacidade@fomibrasil.com.br" className="text-primary font-medium">
        privacidade@fomibrasil.com.br
      </a>
    </p>
    <p className="mt-3">
      <strong>FOMI LTDA</strong><br />
      CNPJ: 63.925.178/0001-63<br />
      Recife - PE
    </p>
  </section>

  <section>
    <h4 className="font-bold text-dark mb-2">13. Legislação e Foro</h4>
    <p>
      Esta Política é regida pela legislação brasileira, em especial pela Lei nº 13.709/2018 
      (LGPD), pelo Marco Civil da Internet (Lei nº 12.965/2014) e pelo Código de Defesa do 
      Consumidor (Lei nº 8.078/1990). Fica eleito o foro da Comarca de Recife/PE para 
      dirimir quaisquer controvérsias oriundas desta Política, com renúncia a qualquer 
      outro, por mais privilegiado que seja.
    </p>
  </section>

  <section className="pt-4 border-t border-gray-100">
    <p className="text-xs text-gray-400 text-center">
      Ao usar o Fomí, você declara ter lido e compreendido esta Política de Privacidade.
    </p>
  </section>
</div>

                  {/* Footer */}
                  <div className="p-4 border-t border-gray-100 shrink-0">
                    <button 
                      onClick={() => setShowPrivacyPolicy(false)}
                      className="w-full h-12 rounded-xl bg-dark text-white font-bold active:scale-95 transition-transform"
                    >
                      Entendi
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