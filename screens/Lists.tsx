import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Navigation';
import { List } from '../types';
import { useAppContext } from '../AppContext';

const SkeletonListCard = () => (
  <div className="flex flex-col gap-2 animate-pulse">
    <div className="relative aspect-[4/3] rounded-2xl bg-black/5 border border-black/5"></div>
    <div className="h-4 w-24 bg-black/5 rounded"></div>
  </div>
);

export const Lists: React.FC = () => {
  const navigate = useNavigate();
  const { lists, createList } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Loading State
  const [loading, setLoading] = useState(true);

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false); // For Create/Edit
  const [isMenuOpen, setIsMenuOpen] = useState(false); // For Long Press Menu
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  
  // Active List for Actions
  const [selectedList, setSelectedList] = useState<List | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    isPrivate: false,
    cover: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<any>(null);

  // Simulate loading
  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  // --- ACTIONS ---

  const handleCardClick = (list: List) => {
    // If we just finished a long press, don't navigate
    if (isMenuOpen) return; 
    navigate(`/lists/${list.id}`);
  };

  const handleTouchStart = (list: List) => {
    // Start timer for long press
    longPressTimer.current = setTimeout(() => {
      // "Quero ir" (default lists) cannot be deleted easily
      if (list.is_default && list.name === 'Quero ir') return;
      
      setSelectedList(list);
      setIsMenuOpen(true);
      // Vibrate if supported
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({ name: '', isPrivate: false, cover: '' });
    setSelectedList(null);
    setIsModalOpen(true);
  };

  const openEditModal = () => {
    if (!selectedList) return;
    setModalMode('edit');
    setFormData({
      name: selectedList.name,
      isPrivate: !!selectedList.is_private,
      cover: selectedList.cover_photo_url || ''
    });
    setIsMenuOpen(false);
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    if (!selectedList) return;
    if (window.confirm(`Tem certeza que deseja excluir "${selectedList.name}"?`)) {
      // In a real app we'd call deleteList from context
      alert("Delete logic to be implemented in context");
      setIsMenuOpen(false);
      setSelectedList(null);
    }
  };

  const handleSave = () => {
    if (!formData.name) return;

    if (modalMode === 'create') {
      createList(formData.name, formData.isPrivate, formData.cover);
    } else if (modalMode === 'edit' && selectedList) {
      // Edit logic to be implemented in context if needed
    }

    setIsModalOpen(false);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormData(prev => ({ ...prev, cover: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-cream text-dark pb-24 relative selection:bg-primary selection:text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* --- HEADER --- */}
      <div className="sticky top-0 z-50 bg-cream/95 backdrop-blur-sm p-4 border-b border-black/5 flex justify-between items-center">
        <button onClick={() => setSidebarOpen(true)} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
          <span className="material-symbols-outlined text-[28px]">menu</span>
        </button>
        <h1 className="text-lg font-bold tracking-wide">Minhas Listas</h1>
        <button onClick={openCreateModal} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
          <span className="material-symbols-outlined text-[32px]">add</span>
        </button>
      </div>

      {/* --- LIST GRID --- */}
      <div className="grid grid-cols-2 gap-4 p-4">
        {loading ? (
           <>
             {Array.from({ length: 4 }).map((_, i) => <SkeletonListCard key={i} />)}
           </>
        ) : (
           <>
             {lists.map(list => {
               const isQueroIr = list.name === 'Quero ir';
               return (
                 <div 
                   key={list.id} 
                   className="flex flex-col gap-2 group cursor-pointer select-none active:scale-[0.98] transition-transform"
                   onClick={() => handleCardClick(list)}
                   onTouchStart={() => handleTouchStart(list)}
                   onTouchEnd={handleTouchEnd}
                   onMouseDown={() => handleTouchStart(list)} // For desktop testing
                   onMouseUp={handleTouchEnd}
                   onMouseLeave={handleTouchEnd}
                 >
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border border-black/5">
                       {/* Cover Image */}
                       <img src={list.cover_photo_url} alt={list.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100" />
                       
                       {/* Gradient Overlay */}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                       
                       {/* Icon/Type Badge */}
                       {isQueroIr && (
                         <div className="absolute top-2 left-2 bg-primary/90 backdrop-blur-md px-2 py-1 rounded-md text-white flex items-center gap-1 shadow-md">
                           <span className="material-symbols-outlined text-[14px] filled">bookmark</span>
                           <span className="text-[10px] font-bold">Quero ir</span>
                         </div>
                       )}
                       
                       {/* Lock Icon if Private */}
                       {list.is_private && !isQueroIr && (
                          <div className="absolute top-2 right-2 text-white/90 drop-shadow-md">
                            <span className="material-symbols-outlined text-[16px]">lock</span>
                          </div>
                       )}

                       {/* Count Badge */}
                       <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-md text-white border border-white/10 text-xs font-bold px-2 py-0.5 rounded-md">
                         {list.count} lugares
                       </div>
                    </div>
                    
                    {/* Title */}
                    <h3 className="font-bold text-dark leading-tight pl-1 text-sm truncate">{list.name}</h3>
                 </div>
               );
             })}
           </>
        )}
      </div>

      {/* --- EMPTY STATE --- */}
      {!loading && lists.length === 0 && (
         <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">bookmark_add</span>
            <p className="font-bold text-dark mb-1">Comece a salvar restaurantes!</p>
            <p className="text-xs">Crie listas para organizar seus lugares favoritos.</p>
         </div>
      )}

      {/* --- MENU MODAL (Long Press) --- */}
      {isMenuOpen && selectedList && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
           <div className="relative bg-white rounded-t-3xl w-full max-w-md p-6 animate-slide-up text-dark">
              <h3 className="font-bold text-lg mb-4 text-center">Opções: {selectedList.name}</h3>
              <div className="space-y-2">
                 <button onClick={openEditModal} className="w-full p-4 rounded-xl bg-gray-50 font-bold flex items-center gap-3 hover:bg-gray-100 transition-colors">
                    <span className="material-symbols-outlined">edit</span> Editar lista
                 </button>
                 <button onClick={handleDelete} className="w-full p-4 rounded-xl bg-red-50 text-red-500 font-bold flex items-center gap-3 hover:bg-red-100 transition-colors">
                    <span className="material-symbols-outlined">delete</span> Excluir lista
                 </button>
                 <button onClick={() => setIsMenuOpen(false)} className="w-full p-4 rounded-xl font-bold text-gray-500 mt-2">
                    Cancelar
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- CREATE/EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white border border-gray-100 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-bounce-in flex flex-col">
             
             {/* Header */}
             <div className="flex justify-between items-center p-5 border-b border-gray-100">
                <h3 className="text-lg font-bold text-dark">{modalMode === 'create' ? 'Nova Lista' : 'Editar Lista'}</h3>
                <button onClick={() => setIsModalOpen(false)}>
                  <span className="material-symbols-outlined text-gray-400">close</span>
                </button>
             </div>

             <div className="p-6 space-y-6">
                
                {/* Cover Upload */}
                <div 
                  className="relative w-full aspect-[2/1] bg-gray-50 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                   {formData.cover ? (
                     <>
                        <img src={formData.cover} className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" alt="Cover" />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <span className="font-bold text-sm text-white drop-shadow-md flex items-center gap-2">
                             <span className="material-symbols-outlined filled">photo_camera</span> Toque para mudar
                           </span>
                        </div>
                     </>
                   ) : (
                     <div className="text-gray-400 flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                        <span className="text-xs font-bold uppercase">Adicionar Capa</span>
                     </div>
                   )}
                   <input type="file" ref={fileInputRef} onChange={handleCoverUpload} className="hidden" accept="image/*" />
                </div>

                {/* Name Input */}
                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-400 ml-1 uppercase">Nome da lista</label>
                   <input 
                     type="text" 
                     value={formData.name}
                     onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                     placeholder="Ex: Melhores Pizzas"
                     className="w-full h-12 rounded-xl bg-gray-50 border border-gray-200 px-4 text-dark focus:border-primary outline-none transition-colors"
                     autoFocus
                   />
                </div>

                {/* Private Toggle */}
                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer">
                   <div className={`size-5 rounded border flex items-center justify-center transition-colors ${formData.isPrivate ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}>
                      {formData.isPrivate && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                   </div>
                   <input 
                     type="checkbox" 
                     checked={formData.isPrivate} 
                     onChange={e => setFormData(prev => ({ ...prev, isPrivate: e.target.checked }))} 
                     className="hidden" 
                   />
                   <div className="flex flex-col">
                      <span className="font-bold text-sm text-dark">Lista privada</span>
                      <span className="text-[10px] text-gray-500">Só você poderá ver esta lista</span>
                   </div>
                </label>

                <button 
                  onClick={handleSave}
                  disabled={!formData.name}
                  className="w-full h-12 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   {modalMode === 'create' ? 'CRIAR' : 'SALVAR'}
                </button>
             </div>

          </div>
        </div>
      )}

    </div>
  );
};