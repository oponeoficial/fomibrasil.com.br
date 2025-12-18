import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Navigation';
import { useAppContext } from '../AppContext';
import { RestaurantDetailsModal } from '../components/RestaurantDetailsModal';
import { Restaurant } from '../types';
import { DEFAULT_RESTAURANT } from '../constants';

interface RecommendationSection {
  title: string;
  subtitle: string;
  items: Restaurant[];
}

export const Recommendations: React.FC = () => {
  const navigate = useNavigate();
  const { supabase, currentUser } = useAppContext();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<RecommendationSection[]>([]);

  // Fetch recommendations based on user preferences
  useEffect(() => {
    fetchRecommendations();
  }, [currentUser]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const recommendationSections: RecommendationSection[] = [];

      // 1. Top Rated - Melhores avaliados
      const { data: topRated } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(10);

      if (topRated && topRated.length > 0) {
        recommendationSections.push({
          title: 'Mais Bem Avaliados',
          subtitle: 'Os favoritos da comunidade',
          items: topRated.map(r => ({ ...r, matchScore: Math.floor(85 + Math.random() * 15) }))
        });
      }

      // 2. Based on user preferences (if available)
      if (currentUser?.occasions && currentUser.occasions.length > 0) {
        const { data: byOccasion } = await supabase
          .from('restaurants')
          .select('*')
          .eq('is_active', true)
          .contains('occasions', currentUser.occasions.slice(0, 2))
          .limit(10);

        if (byOccasion && byOccasion.length > 0) {
          recommendationSections.push({
            title: 'Para suas ocasiões',
            subtitle: `Perfeitos para ${currentUser.occasions[0]?.toLowerCase() || 'você'}`,
            items: byOccasion.map(r => ({ ...r, matchScore: Math.floor(80 + Math.random() * 20) }))
          });
        }
      }

      // 3. New restaurants
      const { data: newest } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (newest && newest.length > 0) {
        recommendationSections.push({
          title: 'Novidades',
          subtitle: 'Recém chegados na plataforma',
          items: newest.map(r => ({ ...r, matchScore: Math.floor(70 + Math.random() * 20) }))
        });
      }

      // 4. By cuisine type (excluding user dislikes)
      const dislikedCuisines = currentUser?.cuisines_disliked || [];
      const { data: byCuisine } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true)
        .limit(30);

      if (byCuisine && byCuisine.length > 0) {
        // Filter out disliked cuisines
        const filtered = byCuisine.filter(r => {
          if (!r.cuisine_types || r.cuisine_types.length === 0) return true;
          return !r.cuisine_types.some((c: string) => dislikedCuisines.includes(c));
        });

        if (filtered.length > 0) {
          recommendationSections.push({
            title: 'Feitos para você',
            subtitle: 'Baseado no seu paladar',
            items: filtered.slice(0, 10).map(r => ({ ...r, matchScore: Math.floor(75 + Math.random() * 25) }))
          });
        }
      }

      // 5. By neighborhood (if user has location)
      if (currentUser?.neighborhood) {
        const { data: nearby } = await supabase
          .from('restaurants')
          .select('*')
          .eq('is_active', true)
          .ilike('neighborhood', `%${currentUser.neighborhood}%`)
          .limit(10);

        if (nearby && nearby.length > 0) {
          recommendationSections.push({
            title: 'Perto de você',
            subtitle: `Em ${currentUser.neighborhood}`,
            items: nearby.map(r => ({ ...r, matchScore: Math.floor(80 + Math.random() * 15) }))
          });
        }
      }

      // If no sections, show general recommendations
      if (recommendationSections.length === 0) {
        const { data: general } = await supabase
          .from('restaurants')
          .select('*')
          .eq('is_active', true)
          .limit(20);

        if (general && general.length > 0) {
          recommendationSections.push({
            title: 'Descubra',
            subtitle: 'Restaurantes para explorar',
            items: general.map(r => ({ ...r, matchScore: Math.floor(70 + Math.random() * 20) }))
          });
        }
      }

      setSections(recommendationSections);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream pb-24 relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] animate-bounce-in">
          <div className="bg-dark/90 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-base filled text-primary">bookmark</span>
            {toastMessage}
          </div>
        </div>
      )}

      {/* Modal */}
      <RestaurantDetailsModal 
        restaurant={selectedRestaurant} 
        onClose={() => setSelectedRestaurant(null)} 
        onShowToast={setToastMessage}
      />

      {/* Header */}
      <div className="sticky top-0 z-50 bg-cream/95 backdrop-blur-sm p-4 flex justify-between items-center border-b border-black/5">
        <button onClick={() => setSidebarOpen(true)} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5">
          <span className="material-symbols-outlined text-[28px]">menu</span>
        </button>
        <h1 className="text-lg font-bold">Para Você</h1>
        <button 
          onClick={() => navigate('/notifications')}
          className="size-10 flex items-center justify-center rounded-full hover:bg-black/5"
        >
          <span className="material-symbols-outlined filled text-primary">notifications</span>
        </button>
      </div>

      <main className="space-y-8 mt-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-center text-gray-400 px-6">
            <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-bold text-dark mb-2">Preparando suas recomendações...</p>
            <p className="text-sm">Analisando suas preferências</p>
          </div>
        ) : sections.length > 0 ? (
           sections.map(section => (
            <section key={section.title} className="px-4">
               <div className="mb-4 px-2">
                 <h3 className="font-black text-lg text-dark">{section.title}</h3>
                 <p className="text-xs font-bold text-primary bg-primary/10 inline-block px-2 py-1 rounded-md mt-1">{section.subtitle}</p>
               </div>
               
               {/* Horizontal Scroll */}
               <div className="flex overflow-x-auto gap-4 pb-4 px-2 no-scrollbar snap-x">
                 {section.items.map(restaurant => (
                   <div 
                     key={restaurant.id} 
                     onClick={() => setSelectedRestaurant(restaurant)}
                     className="min-w-[280px] snap-center relative rounded-2xl overflow-hidden shadow-md group cursor-pointer active:scale-[0.98] transition-transform"
                   >
                      <img 
                        src={restaurant.photo_url || DEFAULT_RESTAURANT} 
                        className="w-full h-48 object-cover" 
                        alt={restaurant.name}
                        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_RESTAURANT; }}
                      />
                      
                      {/* Match Badge */}
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <span className="material-symbols-outlined text-primary text-[16px] filled">favorite</span>
                        <span className="text-primary text-xs font-extrabold">
                          {(restaurant as any).matchScore || Math.floor(80 + Math.random() * 15)}% Match
                        </span>
                      </div>
                      
                      {/* Content */}
                      <div className="p-4 bg-white">
                        <h4 className="font-bold text-lg leading-tight mb-1">{restaurant.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                           <span>{restaurant.cuisine_types?.[0] || 'Restaurante'}</span>
                           <span>•</span>
                           <span>{restaurant.price_level ? '$'.repeat(restaurant.price_level) : '$$'}</span>
                           {restaurant.neighborhood && (
                             <>
                               <span>•</span>
                               <span>{restaurant.neighborhood}</span>
                             </>
                           )}
                        </div>
                        <button className="w-full py-2.5 rounded-xl bg-black/5 text-dark font-bold text-sm hover:bg-black/10 transition-colors">
                           Ver detalhes
                        </button>
                      </div>
                   </div>
                 ))}
               </div>
            </section>
          ))
        ) : (
           <div className="flex flex-col items-center justify-center py-32 text-center text-gray-400 px-6">
              <span className="material-symbols-outlined text-5xl mb-4 text-gray-300">restaurant</span>
              <p className="font-bold text-dark mb-2">Nenhuma recomendação disponível</p>
              <p className="text-sm mb-6">Complete seu perfil para receber sugestões personalizadas</p>
              <button 
                onClick={() => navigate('/profile')}
                className="px-6 py-2 bg-primary text-white font-bold rounded-full"
              >
                Completar Perfil
              </button>
           </div>
        )}
      </main>
    </div>
  );
};