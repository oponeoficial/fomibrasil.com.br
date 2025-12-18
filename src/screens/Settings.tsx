import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Settings: React.FC = () => {
  const navigate = useNavigate();

  const settingSections = [
    {
      title: 'Conta',
      items: ['Dados pessoais', 'Segurança', 'Privacidade']
    },
    {
      title: 'Preferências',
      items: ['Notificações', 'Idioma', 'Tema']
    },
    {
      title: 'Suporte',
      items: ['Ajuda', 'Sobre o Fomí', 'Sair']
    }
  ];

  return (
    <div className="min-h-screen bg-cream pb-safe">
      <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur-sm border-b border-black/5 px-4 h-16 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold">Configurações</h1>
      </header>

      <main className="p-4 space-y-6">
        {settingSections.map(section => (
          <div key={section.title}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2">{section.title}</h3>
            <div className="bg-white rounded-2xl overflow-hidden border border-black/5 shadow-sm">
               {section.items.map((item, idx) => (
                 <button 
                   key={item}
                   className={`w-full text-left px-5 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors ${idx !== section.items.length - 1 ? 'border-b border-gray-100' : ''}`}
                 >
                   <span className="font-medium text-dark">{item}</span>
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
    </div>
  );
};