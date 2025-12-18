import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Navigation';
import { List } from '../types';
import { useAppContext } from '../AppContext';
import { DEFAULT_COVER } from '../constants';

// --- SKELETON ---
const SkeletonListCard = () => (
  <div className="animate-pulse">
    <div className="aspect-[4/3] rounded-2xl bg-black/5 mb-2"></div>
    <div className="h-4 w-3/4 bg-black/5 rounded ml-1"></div>
  </div>
);

// --- MAIN COMPONENT ---
export const Lists: React.FC = () => {
  const navigate = useNavigate();
  const { lists, createList, updateList, deleteList, loading } = useAppContext();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    isPrivate: false,
    cover: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- HANDLERS ---
  
  const handleListClick = (list: List) => {
    navigate(`/lists/${list.id}`);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedList(null);
    setFormData({ name: '', isPrivate: false, cover: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, list: List) => {
    e.stopPropagation(); // Prevent navigation to list details
    setModalMode('edit');
    setSelectedList(list);
    setFormData({
      name: list.name,
      isPrivate: list.is_private || false,
      cover: list.cover_photo_url || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    
    setSaving(true);
    try {
      if (modalMode === 'create') {
        await createList(formData.name.trim(), formData.isPrivate, formData.cover || undefined);
      } else if (modalMode === 'edit' && selectedList) {
        await updateList(selectedList.id, {
          name: formData.name.trim(),
          is_private: formData.isPrivate,
          cover_photo_url: formData.cover || undefined
        });
      }
      setIsModalOpen(false);
      setFormData({ name: '', isPrivate: false, cover: '' });
      setSelectedList(null);
    } catch (error) {
      console.error('Erro ao salvar lista:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedList) return;
    
    if (selectedList.is_default) {
      alert('Não é possível excluir listas padrão.');
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir "${selectedList.name}"?`)) {
      setSaving(true);
      try {
        await deleteList(selectedList.id);
        setIsModalOpen(false);
        setSelectedList(null);
      } catch (error) {
        console.error('Erro ao excluir lista:', error);
        alert('Erro ao excluir lista. Tente novamente.');
      } finally {
        setSaving(false);
      }
    }
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

  const removeCover = () => {
    setFormData(prev => ({ ...prev, cover: '' }));
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
              const isQueroIr = list.is_default && list.name === 'Quero ir';
              const coverUrl = list.cover_photo_url || DEFAULT_COVER;
              const canEdit = !list.is_default; // Can't edit default lists
              
              return (
                <div 
                  key={list.id}
                  onClick={() => handleListClick(list)}
                  className="cursor-pointer group"
                >
                   {/* Cover Image */}
                   <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md mb-2 border border-black/5">
                      <img 
                        src={coverUrl} 
                        alt={list.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_COVER;
                        }}
                      />
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      
                      {/* Quero ir Badge */}
                      {isQueroIr && (
                        <div className="absolute top-2 left-2 bg-primary text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px] filled">bookmark</span>
                          <span className="text-[10px] font-bold">Quero ir</span>
                        </div>
                      )}
                      
                      {/* Edit Button (Lápis) */}
                      {canEdit && (
                        <button
                          onClick={(e) => openEditModal(e, list)}
                          className="absolute top-2 right-2 size-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px] text-dark">edit</span>
                        </button>
                      )}
                      
                      {/* Lock Icon if Private (only show if not editing) */}
                      {list.is_private && !canEdit && (
                        <div className="absolute top-2 right-2 text-white/90 drop-shadow-md">
                          <span className="material-symbols-outlined text-[16px]">lock</span>
                        </div>
                      )}

                      {/* Lock + Edit for private custom lists */}
                      {list.is_private && canEdit && (
                        <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">lock</span>
                          <span className="text-[10px] font-medium">Privada</span>
                        </div>
                      )}

                      {/* Count Badge */}
                      <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-md text-white border border-white/10 text-xs font-bold px-2 py-0.5 rounded-md">
                        {list.count || 0} lugares
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
          <button 
            onClick={openCreateModal}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-full font-bold"
          >
            Criar primeira lista
          </button>
        </div>
      )}

      {/* --- CREATE/EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)} />
          <div className="relative bg-white border border-gray-100 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-bounce-in flex flex-col">
             
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-dark">
                {modalMode === 'create' ? 'Nova Lista' : 'Editar Lista'}
              </h3>
              <button onClick={() => !saving && setIsModalOpen(false)} disabled={saving}>
                <span className="material-symbols-outlined text-gray-400">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
               
              {/* Cover Upload */}
              <div className="relative">
                <div 
                  className="relative w-full aspect-[2/1] bg-gray-50 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {formData.cover ? (
                    <>
                      <img 
                        src={formData.cover} 
                        alt="Cover preview" 
                        className="absolute inset-0 w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-3xl">edit</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-3xl text-gray-400 mb-1">add_photo_alternate</span>
                      <span className="text-xs text-gray-400">Adicionar capa</span>
                    </>
                  )}
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleCoverUpload} 
                    className="hidden" 
                  />
                </div>
                
                {/* Remove cover button */}
                {formData.cover && (
                  <button
                    onClick={removeCover}
                    className="absolute -top-2 -right-2 size-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                )}
              </div>

              {/* Name Input */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">NOME DA LISTA</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Melhores Burgers"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none transition-colors text-dark font-medium"
                  autoFocus
                  disabled={saving}
                />
              </div>

              {/* Private Toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div 
                  onClick={() => !saving && setFormData(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
                  className={`size-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    formData.isPrivate ? 'bg-primary border-primary' : 'bg-white border-gray-300'
                  }`}
                >
                  {formData.isPrivate && (
                    <span className="material-symbols-outlined text-white text-[14px]">check</span>
                  )}
                </div>
                <input 
                  type="checkbox" 
                  checked={formData.isPrivate} 
                  onChange={e => setFormData(prev => ({ ...prev, isPrivate: e.target.checked }))} 
                  className="hidden"
                  disabled={saving}
                />
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-dark">Lista privada</span>
                  <span className="text-[10px] text-gray-500">Só você poderá ver esta lista</span>
                </div>
              </label>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Save Button */}
                <button 
                  onClick={handleSave}
                  disabled={!formData.name.trim() || saving}
                  className="w-full h-12 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      Salvando...
                    </>
                  ) : (
                    modalMode === 'create' ? 'CRIAR LISTA' : 'SALVAR ALTERAÇÕES'
                  )}
                </button>

                {/* Delete Button (only in edit mode for non-default lists) */}
                {modalMode === 'edit' && selectedList && !selectedList.is_default && (
                  <button 
                    onClick={handleDelete}
                    disabled={saving}
                    className="w-full h-12 rounded-xl bg-red-50 text-red-500 font-bold border border-red-200 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                    Excluir lista
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};