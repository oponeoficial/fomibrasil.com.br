import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Navigation';
import { MOCK_RESTAURANTS, MOCK_USERS, CUISINE_OPTIONS, RESTRICTION_OPTIONS } from '../constants';
import { Restaurant } from '../types';
import { RestaurantDetailsModal } from '../components/RestaurantDetailsModal';
import { GoogleGenAI } from "@google/genai";

// --- HELPER ---
const parseDistance = (d: string | undefined): number => {
  if (!d) return 99999;
  // Assumes format like "1.2km" or "500m"
  if (d.includes('km')) {
    return parseFloat(d.replace('km', ''));
  }
  if (d.includes('m')) {
    return parseFloat(d.replace('m', '')) / 1000;
  }
  return 99999;
};

// --- TOAST COMPONENT ---
const Toast: React.FC<{ message: string | null; onClose: () => void }> = ({ message, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] animate-slide-up">
      <div className="bg-dark/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border border-white/10">
        <span className="material-symbols-outlined text-green-400 filled">check_circle</span>
        <span className="font-bold text-sm">{message}</span>
      </div>
    </div>
  );
};

// --- FILTER INTERFACE & MODAL ---

interface FilterState {
  cuisines: string[];
  occasions: string[];
  minRating: number;
  prices: string[];
  maxDistance: number;
  dietary: string[];
}

const FilterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  currentFilters: FilterState;
}> = ({ isOpen, onClose, onApply, currentFilters }) => {
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(currentFilters.cuisines);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(currentFilters.occasions);
  const [minRating, setMinRating] = useState(currentFilters.minRating);
  const [selectedPrices, setSelectedPrices] = useState<string[]>(currentFilters.prices);
  const [maxDistance, setMaxDistance] = useState(currentFilters.maxDistance);
  const [selectedDietary, setSelectedDietary] = useState<string[]>(currentFilters.dietary);

  // Sync internal state if props change when reopening
  useEffect(() => {
    if (isOpen) {
      setSelectedCuisines(currentFilters.cuisines);
      setSelectedOccasions(currentFilters.occasions);
      setMinRating(currentFilters.minRating);
      setSelectedPrices(currentFilters.prices);
      setMaxDistance(currentFilters.maxDistance);
      setSelectedDietary(currentFilters.dietary);
    }
  }, [isOpen, currentFilters]);

  if (!isOpen) return null;

  const toggleCuisine = (c: string) => {
    setSelectedCuisines(prev => prev.includes(c) ? prev.filter(i => i !== c) : [...prev, c]);
  };

  const toggleOccasion = (o: string) => {
    setSelectedOccasions(prev => prev.includes(o) ? prev.filter(i => i !== o) : [...prev, o]);
  };

  const togglePrice = (p: string) => {
    setSelectedPrices(prev => prev.includes(p) ? prev.filter(i => i !== p) : [...prev, p]);
  };

  const toggleDietary = (d: string) => {
    setSelectedDietary(prev => prev.includes(d) ? prev.filter(i => i !== d) : [...prev, d]);
  };

  const handleApply = () => {
    onApply({ 
      cuisines: selectedCuisines, 
      occasions: selectedOccasions, 
      minRating,
      prices: selectedPrices,
      maxDistance,
      dietary: selectedDietary
    });
    onClose();
  };

  const handleClear = () => {
    const cleared: FilterState = { 
      cuisines: [], 
      occasions: [], 
      minRating: 0,
      prices: [],
      maxDistance: 50,
      dietary: []
    };
    setSelectedCuisines([]);
    setSelectedOccasions([]);
    setMinRating(0);
    setSelectedPrices([]);
    setMaxDistance(50);
    setSelectedDietary([]);
    onApply(cleared);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark rounded-3xl w-full max-w-sm max-h-[85vh] shadow-2xl animate-bounce-in flex flex-col overflow-hidden text-cream border border-gray-800">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/10">
          <h3 className="text-xl font-bold">Filtros</h3>
          <button onClick={onClose} className="size-8 flex items-center justify-center rounded-full hover:bg-white/10">
             <span className="material-symbols-outlined text-white">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          
          {/* Cuisine */}
          <div>
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Tipo de cozinha</h4>
            <div className="flex flex-wrap gap-2">
              {CUISINE_OPTIONS.slice(0, 8).map(c => (
                <button 
                  key={c}
                  onClick={() => toggleCuisine(c)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${selectedCuisines.includes(c) ? 'bg-cream text-dark border-cream' : 'bg-transparent text-gray-300 border-gray-600 hover:border-gray-400'}`}
                >
                  {c}
                </button>
              ))}
              <span className="text-xs text-gray-500 self-center">...</span>
            </div>
          </div>

          {/* Occasion */}
          <div>
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Ocasião</h4>
            <div className="flex flex-wrap gap-2">
              {['Date', 'Amigos', 'Família', 'Trabalho', 'Sozinho'].map(o => (
                <button 
                  key={o}
                  onClick={() => toggleOccasion(o)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${selectedOccasions.includes(o) ? 'bg-cream text-dark border-cream' : 'bg-transparent text-gray-300 border-gray-600 hover:border-gray-400'}`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
             <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Faixa de Preço</h4>
             <div className="flex gap-2">
                {['$', '$$', '$$$', '$$$$'].map(p => (
                   <button 
                     key={p}
                     onClick={() => togglePrice(p)}
                     className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-colors ${selectedPrices.includes(p) ? 'bg-cream text-dark border-cream' : 'bg-transparent text-gray-300 border-gray-600 hover:border-gray-400'}`}
                   >
                     {p}
                   </button>
                ))}
             </div>
          </div>

          {/* Distance Slider */}
          <div>
            <div className="flex justify-between items-center mb-4">
               <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Distância Máxima</h4>
               <div className="flex items-center gap-1 text-cream font-bold text-sm">
                 {maxDistance >= 50 ? '50km+' : `${maxDistance}km`}
               </div>
            </div>
            <input 
              type="range" 
              min="1" 
              max="50" 
              step="1" 
              value={maxDistance}
              onChange={e => setMaxDistance(parseFloat(e.target.value))}
              className="w-full accent-primary h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
               <span>1km</span>
               <span>50km+</span>
            </div>
          </div>

          {/* Rating Slider */}
          <div>
            <div className="flex justify-between items-center mb-4">
               <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Avaliação mínima</h4>
               <div className="flex items-center gap-1 text-yellow-400 font-bold text-lg">
                 <span className="material-symbols-outlined filled text-[20px]">star</span>
                 {minRating > 0 ? minRating.toFixed(1) : 'Qualquer'}
               </div>
            </div>
            <input 
              type="range" 
              min="0" 
              max="10" 
              step="0.5" 
              value={minRating}
              onChange={e => setMinRating(parseFloat(e.target.value))}
              className="w-full accent-primary h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
               <span>0.0</span>
               <span>10.0</span>
            </div>
          </div>

          {/* Dietary Restrictions */}
          <div>
             <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Restrições Alimentares</h4>
             <div className="flex flex-wrap gap-2">
                {RESTRICTION_OPTIONS.filter(r => r.type !== 'special').map(opt => (
                   <button
                     key={opt.label}
                     onClick={() => toggleDietary(opt.label)}
                     className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${selectedDietary.includes(opt.label) ? 'bg-cream text-dark border-cream' : 'bg-transparent text-gray-300 border-gray-600 hover:border-gray-400'}`}
                   >
                     {opt.label}
                   </button>
                ))}
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 flex gap-4 bg-dark">
          <button onClick={handleClear} className="flex-1 py-3 rounded-xl border border-white/20 text-white font-bold hover:bg-white/5 transition-colors">
            Limpar
          </button>
          <button onClick={handleApply} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform">
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};


// --- MAIN DISCOVER SCREEN ---

export const Discover: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'restaurants' | 'profiles'>('restaurants');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiRestaurants, setAiRestaurants] = useState<Restaurant[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Modals & Feedback
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    cuisines: [],
    occasions: [],
    minRating: 0,
    prices: [],
    maxDistance: 50,
    dietary: []
  });

  // --- GOOGLE MAPS GENAI INTEGRATION ---
  const fetchRestaurantsFromAI = async (query: string) => {
    setLoadingAi(true);
    setAiRestaurants([]); // Clear previous results
    
    try {
      // Get current location if possible, default to São Paulo
      let lat = -23.5505;
      let lng = -46.6333;
      
      if ("geolocation" in navigator) {
         try {
           const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
             navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
           });
           lat = pos.coords.latitude;
           lng = pos.coords.longitude;
         } catch (e) {
           console.log("Using default location");
         }
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Find 8 actual, highly-rated restaurants near latitude ${lat}, longitude ${lng} using Google Maps. 
      ${query ? `Filter matching: "${query}".` : ''} 
      ${filters.cuisines.length > 0 ? `Cuisine types: ${filters.cuisines.join(', ')}.` : ''}
      
      Return a strict list where each line is a restaurant formatted exactly like this:
      Name | Type | Price (1-4) | Rating (number) | Address | Detailed Description
      
      Verify using Google Maps tool. Ensure these are real places.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
        }
      });

      const text = response.text || "";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      const parsedRestaurants: Restaurant[] = [];
      const lines = text.split('\n');

      lines.forEach((line, index) => {
         const parts = line.split('|').map(s => s.trim());
         if (parts.length >= 6) {
           const name = parts[0];
           
           // Find grounding metadata for Google Maps URL
           // Specifically look for chunks from 'maps' or fall back to web uri if maps missing
           const mapChunk = groundingChunks.find(c => {
             const titleMatch = c.web?.title?.toLowerCase().includes(name.toLowerCase());
             const uriMatch = c.web?.uri?.toLowerCase().includes(name.toLowerCase().replace(/ /g, '+'));
             // Check for maps specific chunk (although SDK typings might vary, usually it's in groundingChunks)
             return titleMatch || uriMatch;
           });
           
           const mapsUrl = mapChunk?.web?.uri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + parts[4])}`;

           // Generate random coords for abstract map placement (10% to 90%) since we don't get exact screen XY
           const randX = 10 + Math.random() * 80;
           const randY = 10 + Math.random() * 80;

           parsedRestaurants.push({
             id: `ai-${Date.now()}-${index}`,
             name: name,
             type: parts[1], 
             cuisine_types: [parts[1]],
             price_level: parseInt(parts[2]) || 2,
             rating: parseFloat(parts[3]) || 4.5,
             address: parts[4],
             description: parts[5],
             reviews_count: Math.floor(Math.random() * 500) + 50, // Mock count
             photo_url: `https://picsum.photos/seed/${name.replace(/ /g, '')}/400/300`,
             coords: { x: randX, y: randY },
             occasions: ['Casual'], 
             phone: '',
             website: '',
             distance: '1.2km', 
             google_maps_url: mapsUrl
           });
         }
      });
      
      setAiRestaurants(parsedRestaurants);
      setHasSearched(true);

    } catch (e) {
      console.error("AI Fetch Error", e);
      setToastMessage("Erro ao buscar restaurantes com IA");
    } finally {
      setLoadingAi(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    if (!hasSearched) {
      fetchRestaurantsFromAI("");
    }
  }, []);

  // Derived State: Filtered Restaurants
  const displayRestaurants = useMemo(() => {
    if (aiRestaurants.length > 0) return aiRestaurants;
    
    // Fallback to local filtering of mocks
    let res = MOCK_RESTAURANTS;
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      res = res.filter(r => r.name.toLowerCase().includes(lower) || (r.type && r.type.toLowerCase().includes(lower)));
    }
    return res;
  }, [aiRestaurants, searchQuery, filters]); 

  // Derived State: Filtered Profiles
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return MOCK_USERS; 
    const lower = searchQuery.toLowerCase();
    return MOCK_USERS.filter(u => 
      u.full_name.toLowerCase().includes(lower) || 
      u.username.toLowerCase().includes(lower)
    );
  }, [searchQuery]);

  const activeFiltersCount = 
    filters.cuisines.length + 
    filters.occasions.length + 
    (filters.minRating > 0 ? 1 : 0) + 
    filters.prices.length + 
    (filters.maxDistance < 50 ? 1 : 0) +
    filters.dietary.length;

  const handleSearch = () => {
    if (viewMode === 'restaurants') {
      fetchRestaurantsFromAI(searchQuery);
    }
  };

  return (
    <div className="h-screen bg-cream flex flex-col overflow-hidden relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Toast Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      
      {/* Modals */}
      <FilterModal 
        isOpen={showFilters} 
        onClose={() => setShowFilters(false)} 
        onApply={(newFilters) => {
           setFilters(newFilters);
           // Re-trigger AI search with new filters
           setTimeout(() => fetchRestaurantsFromAI(searchQuery), 100);
        }}
        currentFilters={filters}
      />
      <RestaurantDetailsModal 
        restaurant={selectedRestaurant} 
        onClose={() => setSelectedRestaurant(null)} 
        onShowToast={setToastMessage}
      />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4 pt-4 pb-2">
        <div className="flex items-center justify-between gap-4">
          <button onClick={() => setSidebarOpen(true)} className="flex items-center justify-center size-10 rounded-full bg-white shadow-md hover:bg-gray-50 active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-[28px]">menu</span>
          </button>
          
          <div className="flex items-center p-1 bg-white rounded-full shadow-md border border-black/5 flex-1 max-w-[240px]">
             <button 
               onClick={() => { setViewMode('restaurants'); }}
               className={`flex-1 py-2 px-4 rounded-full text-sm font-bold transition-all ${viewMode === 'restaurants' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
             >
               Restaurantes
             </button>
             <button 
               onClick={() => { setViewMode('profiles'); }}
               className={`flex-1 py-2 px-4 rounded-full text-sm font-bold transition-all ${viewMode === 'profiles' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
             >
               Perfis
             </button>
          </div>

          {viewMode === 'restaurants' && (
            <button 
              onClick={() => setShowFilters(true)}
              className={`flex items-center justify-center size-10 rounded-full shadow-md active:scale-95 transition-all relative ${
                activeFiltersCount > 0 ? 'bg-primary text-white' : 'bg-white text-primary hover:bg-gray-50'
              }`}
            >
              <span className={`material-symbols-outlined text-[24px] ${activeFiltersCount > 0 ? 'filled' : ''}`}>tune</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 size-4 bg-white text-primary text-[10px] font-bold rounded-full flex items-center justify-center border border-gray-100">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          )}
          {viewMode === 'profiles' && <div className="size-10" />} {/* Spacer */}
        </div>
        
        {/* Search Bar */}
        <div className="mt-4 bg-white rounded-full shadow-lg flex items-center p-3 gap-3 animate-slide-down">
          <span className="material-symbols-outlined text-gray-400 ml-1">search</span>
          <input 
            className="flex-1 bg-transparent border-none outline-none text-sm text-dark placeholder-gray-400 focus:ring-0 p-0" 
            placeholder={viewMode === 'restaurants' ? "Buscar restaurantes (IA)..." : "Buscar pessoas..."} 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); handleSearch(); }} className="text-gray-400 hover:text-dark">
               <span className="material-symbols-outlined text--[18px]">close</span>
            </button>
          )}
        </div>
      </header>

      {/* Map Content (Restaurants Mode) */}
      {viewMode === 'restaurants' && (
        <div className="absolute inset-0 z-0 bg-[#E5E5D0] overflow-hidden">
          {/* Abstract Map UI Layer */}
          <div className="absolute inset-0 pointer-events-auto cursor-move">
             <svg className="absolute w-full h-full opacity-30 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                   <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#C8C8B0" strokeWidth="1"/>
                   </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                <path d="M-100,100 Q200,50 400,200 T900,100" fill="none" stroke="#FFF" strokeWidth="12" />
                <path d="M50,400 Q150,200 300,300 T600,600" fill="none" stroke="#FFF" strokeWidth="12" />
             </svg>
             
             {loadingAi && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-50">
                  <div className="bg-white px-6 py-4 rounded-2xl shadow-xl flex flex-col items-center">
                    <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="font-bold text-dark text-sm">Buscando com IA...</p>
                  </div>
               </div>
             )}

             {/* Pins */}
             {displayRestaurants.map(r => (
               <div 
                  key={r.id}
                  className="absolute transform -translate-x-1/2 -translate-y-full flex flex-col items-center cursor-pointer group z-10 hover:z-20 transition-all duration-300 pointer-events-auto"
                  style={{ top: `${r.coords?.y || 50}%`, left: `${r.coords?.x || 50}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRestaurant(r);
                  }}
               >
                 <div className="relative transition-transform duration-300 hover:scale-110 active:scale-95">
                   <div className="bg-dark text-white rounded-none px-0 py-0 flex flex-col items-center shadow-xl border-none z-10 relative">
                     {/* Custom Pin Shape */}
                     <div className="bg-dark text-white size-12 flex items-center justify-center border-2 border-white shadow-lg hover:bg-primary transition-colors">
                        <span className="material-symbols-outlined text-sm">restaurant</span>
                     </div>
                     {/* Stick */}
                     <div className="w-0.5 h-4 bg-dark"></div>
                   </div>
                 </div>
                 {/* Label */}
                 <div className="mt-1 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md border border-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center">
                    <span className="text-xs font-bold text-dark whitespace-nowrap">{r.name}</span>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <span>{r.price_level ? '$'.repeat(r.price_level) : '$$'}</span>
                        <span>•</span>
                        <span className="flex items-center text-yellow-500">
                            {r.rating} <span className="material-symbols-outlined text-[10px] filled">star</span>
                        </span>
                    </div>
                 </div>
               </div>
             ))}

          </div>
          
          {/* Google Logo Mock */}
          <div className="absolute bottom-24 left-4 pointer-events-none opacity-50">
             <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">map</span>
                POWERED BY GOOGLE MAPS
             </span>
          </div>
        </div>
      )}

      {/* Profiles View Mode */}
      {viewMode === 'profiles' && (
        <div className="absolute inset-0 z-0 bg-cream pt-36 px-4 overflow-y-auto pb-24">
           {filteredUsers.length === 0 ? (
             <div className="flex flex-col items-center justify-center mt-20 text-gray-400">
               <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
               <p>Nenhum resultado para '{searchQuery}'</p>
             </div>
           ) : (
             <div className="space-y-4">
               {filteredUsers.map(user => (
                 <div 
                   key={user.id} 
                   onClick={() => navigate(`/profile/@${user.username}`)}
                   className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-black/5 hover:border-primary/20 transition-all cursor-pointer"
                 >
                   <img src={user.profile_photo_url} className="size-14 rounded-full object-cover border border-gray-100" alt={user.full_name} />
                   <div className="flex-1 min-w-0">
                     <h3 className="font-bold text-dark truncate">{user.full_name}</h3>
                     <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                     {/* Mock Mutuals */}
                     <p className="text-xs text-secondary mt-1 flex items-center gap-1">
                       <span className="material-symbols-outlined text-[12px]">group</span>
                       {Math.floor(Math.random() * 10)} seguidores em comum
                     </p>
                   </div>
                   <button 
                     onClick={(e) => { e.stopPropagation(); /* Follow logic would go here if needed in list */ }}
                     className="px-4 py-2 bg-black/5 text-dark text-xs font-bold rounded-full hover:bg-black/10 active:scale-95 transition-all"
                   >
                     Ver
                   </button>
                 </div>
               ))}
             </div>
           )}
        </div>
      )}

    </div>
  );
};