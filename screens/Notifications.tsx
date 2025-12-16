import React from 'react';
import { useNavigate } from 'react-router-dom';

// Mock Notifications Data
const NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'like',
    user: { name: 'João Silva', avatar: 'https://picsum.photos/seed/joao/100/100' },
    content: 'curtiu seu review de',
    target: 'Cantina da Nona',
    time: '2h',
    read: false,
    image: 'https://picsum.photos/seed/pasta/100/100'
  },
  {
    id: 'n2',
    type: 'follow',
    user: { name: 'Maria Costa', avatar: 'https://picsum.photos/seed/maria/100/100' },
    content: 'começou a seguir você',
    time: '5h',
    read: false,
    isFollowing: false
  },
  {
    id: 'n3',
    type: 'comment',
    user: { name: 'Pedro Santos', avatar: 'https://picsum.photos/seed/pedro/100/100' },
    content: 'comentou: "Que lugar incrível! 😍"',
    target: 'Sushi Omakase',
    time: '1d',
    read: true,
    image: 'https://picsum.photos/seed/sushi/100/100'
  },
  {
    id: 'n4',
    type: 'like',
    user: { name: 'Lucas Oliveira', avatar: 'https://picsum.photos/seed/lucas/100/100' },
    content: 'curtiu seu comentário em',
    target: 'Burger Joint',
    time: '2d',
    read: true,
    image: 'https://picsum.photos/seed/burger/100/100'
  }
];

export const Notifications: React.FC = () => {
  const navigate = useNavigate();

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
        {NOTIFICATIONS.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-3 opacity-30">check_circle</span>
            <p className="font-bold text-dark">Você está em dia! 🎉</p>
          </div>
        ) : (
          NOTIFICATIONS.map(notif => (
            <div 
              key={notif.id} 
              className={`flex items-start gap-3 p-4 border-b border-black/5 transition-colors ${!notif.read ? 'bg-primary/5' : 'hover:bg-black/[0.02]'}`}
            >
               {/* User Avatar with Icon Badge */}
               <div className="relative shrink-0">
                 <img src={notif.user.avatar} className="size-12 rounded-full object-cover border border-black/5" alt={notif.user.name} />
                 <div className="absolute -bottom-1 -right-1 size-5 rounded-full border-2 border-cream flex items-center justify-center bg-white shadow-sm">
                    <span className={`material-symbols-outlined text-[12px] ${
                      notif.type === 'like' ? 'text-red-500' : 
                      notif.type === 'follow' ? 'text-primary' : 'text-blue-500'
                    } filled`}>
                      {notif.type === 'like' ? 'favorite' : notif.type === 'follow' ? 'person_add' : 'chat_bubble'}
                    </span>
                 </div>
               </div>
               
               {/* Content */}
               <div className="flex-1 text-sm pt-0.5">
                 <p className="text-dark leading-snug">
                   <span className="font-bold cursor-pointer hover:underline">{notif.user.name}</span> {notif.content} {notif.target && <span className="font-bold">{notif.target}</span>}
                 </p>
                 <p className="text-gray-400 text-xs mt-1 font-medium">{notif.time}</p>
               </div>

               {/* Action (Image or Button) */}
               {notif.image && (
                 <img src={notif.image} className="size-11 rounded-lg object-cover shrink-0 border border-black/5" alt="Context" />
               )}
               
               {notif.type === 'follow' && (
                  <button className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-full shadow-sm active:scale-95 transition-transform hover:bg-primary/90">
                    Seguir
                  </button>
               )}
            </div>
          ))
        )}
      </main>
    </div>
  );
};