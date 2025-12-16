import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CUISINE_OPTIONS, OCCASION_GROUPS, RADAR_OPTIONS, RESTRICTION_OPTIONS } from '../constants';
import { OnboardingStep } from '../types';
import { useAppContext } from '../AppContext';

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { setUserPreferences, currentUser } = useAppContext();
  const [step, setStep] = useState<OnboardingStep>(OnboardingStep.DISLIKES);
  const [saving, setSaving] = useState(false);
  
  // -- State --
  // Step 1
  const [dislikes, setDislikes] = useState<string[]>([]);
  
  // Step 2
  const [occasions, setOccasions] = useState<string[]>([]);
  const [occasionError, setOccasionError] = useState<string | null>(null);

  // Step 3
  const [radar, setRadar] = useState<{
    frequency: string;
    placeTypes: string[];
    behavior: string[];
  }>({
    frequency: '',
    placeTypes: [],
    behavior: []
  });
  const [radarError, setRadarError] = useState<string | null>(null);

  // Step 4
  const [restrictions, setRestrictions] = useState<string[]>([]);

  // -- Actions --

  const handleNext = async () => {
    if (step === OnboardingStep.DISLIKES) {
      setStep(OnboardingStep.OCCASIONS);
      window.scrollTo(0, 0);
    } 
    else if (step === OnboardingStep.OCCASIONS) {
      if (occasions.length < 2) {
        setOccasionError("Selecione pelo menos 2 ocasiões");
        return;
      }
      setStep(OnboardingStep.RADAR);
      window.scrollTo(0, 0);
    } 
    else if (step === OnboardingStep.RADAR) {
      setStep(OnboardingStep.RESTRICTIONS);
      window.scrollTo(0, 0);
    } 
    else if (step === OnboardingStep.RESTRICTIONS) {
      setSaving(true);
      try {
        await setUserPreferences({
          dislikes,
          occasions,
          radar,
          restrictions
        });
        navigate('/feed');
      } catch (error) {
        console.error('Erro ao salvar preferências:', error);
        alert('Erro ao salvar. Tente novamente.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo(0, 0);
    } else {
      navigate(-1);
    }
  };

  // -- Toggles --

  const toggleDislike = (item: string) => {
    if (dislikes.includes(item)) {
      setDislikes(prev => prev.filter(i => i !== item));
    } else {
      setDislikes(prev => [...prev, item]);
    }
  };

  const toggleOccasion = (item: string) => {
    setOccasionError(null);
    if (occasions.includes(item)) {
      setOccasions(prev => prev.filter(i => i !== item));
    } else {
      if (occasions.length >= 5) {
        setOccasionError("Máximo 5 ocasiões");
        return;
      }
      setOccasions(prev => [...prev, item]);
    }
  };

  const toggleRadarPlaceType = (item: string) => {
    setRadarError(null);
    const list = radar.placeTypes;
    if (list.includes(item)) {
      setRadar(prev => ({ ...prev, placeTypes: list.filter(i => i !== item) }));
    } else {
      if (list.length >= 5) {
         return; 
      }
      setRadar(prev => ({ ...prev, placeTypes: [...list, item] }));
    }
  };

  const toggleRadarBehavior = (item: string) => {
    setRadarError(null);
    const list = radar.behavior;
    if (list.includes(item)) {
      setRadar(prev => ({ ...prev, behavior: list.filter(i => i !== item) }));
    } else {
      if (list.length >= 2) {
         return;
      }
      setRadar(prev => ({ ...prev, behavior: [...list, item] }));
    }
  };

  const toggleRestriction = (label: string) => {
    const NO_RESTRICTIONS = 'Não tenho restrições';

    if (label === NO_RESTRICTIONS) {
      setRestrictions([NO_RESTRICTIONS]);
    } else {
      let newRestrictions = [...restrictions];
      
      if (newRestrictions.includes(NO_RESTRICTIONS)) {
        newRestrictions = newRestrictions.filter(r => r !== NO_RESTRICTIONS);
      }

      if (newRestrictions.includes(label)) {
        newRestrictions = newRestrictions.filter(r => r !== label);
      } else {
        newRestrictions.push(label);
      }

      setRestrictions(newRestrictions);
    }
  };

  // -- Validation Checks --
  
  const canContinue = () => {
    if (step === OnboardingStep.OCCASIONS) {
      return occasions.length >= 2;
    }
    if (step === OnboardingStep.RADAR) {
      const { frequency, placeTypes, behavior } = radar;
      const freqOk = !!frequency;
      const typesOk = placeTypes.length >= 2 && placeTypes.length <= 5;
      const behaviorOk = behavior.length >= 1 && behavior.length <= 2;
      return freqOk && typesOk && behaviorOk;
    }
    return true; 
  };

  // -- Render Helpers --

  const renderHeader = () => (
    <div className="sticky top-0 z-30 bg-cream/95 backdrop-blur-sm pt-4 pb-2 px-6 border-b border-black/5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={handleBack} className="size-10 flex items-center justify-center rounded-full bg-white shadow-sm active:scale-95 transition-transform">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-secondary">Passo {step} de 4</span>
        <div className="w-10"></div>
      </div>
      <div className="flex w-full gap-2 mb-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? 'bg-primary' : 'bg-black/10'}`} />
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold leading-tight mb-2">O que você não curte?</h1>
        <p className="text-lg text-secondary leading-snug">Vamos evitar recomendar o que não combina com você</p>
      </div>
      <div className="flex flex-wrap gap-3 pb-32">
        {CUISINE_OPTIONS.map(opt => {
          const isSelected = dislikes.includes(opt.label);
          return (
            <button
              key={opt.label}
              onClick={() => toggleDislike(opt.label)}
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 transition-all active:scale-95 text-sm font-bold border ${
                isSelected 
                  ? 'bg-primary border-primary text-white shadow-md' 
                  : 'bg-white border-black/5 text-dark hover:border-black/20'
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${isSelected ? '' : 'text-primary'}`}>
                {opt.icon}
              </span>
              {opt.label}
              {isSelected && <span className="material-symbols-outlined text-[16px]">close</span>}
            </button>
          );
        })}
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold leading-tight mb-2">Conta pra gente quando você sai para comer</h1>
        <p className="text-lg text-secondary leading-snug">Escolha de 2 a 5 ocasiões que mais combinam com você</p>
      </div>
      
      {occasionError && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg z-50 text-sm font-bold animate-bounce-in">
          {occasionError}
        </div>
      )}

      <div className="space-y-8 pb-32">
        {OCCASION_GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="text-base font-bold text-gray-400 uppercase tracking-wide mb-3 ml-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">{group.icon}</span>
              {group.title}
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {group.options.map(opt => {
                const isSelected = occasions.includes(opt.label);
                return (
                  <button
                    key={opt.label}
                    onClick={() => toggleOccasion(opt.label)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2.5 transition-all active:scale-95 text-sm font-medium border ${
                      isSelected
                        ? 'bg-primary border-primary text-white shadow-md'
                        : 'bg-white border-black/5 text-dark'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[16px] ${isSelected ? '' : 'text-primary'}`}>
                      {opt.icon}
                    </span>
                    {opt.label}
                    {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );

  const renderStep3 = () => (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold leading-tight mb-2">Vamos afinar o radar</h1>
        <p className="text-lg text-secondary leading-snug">Entenda melhor seu jeito de escolher lugares</p>
      </div>

      <div className="space-y-8 pb-32">
        <section>
          <h2 className="text-lg font-bold text-dark mb-3 flex items-center gap-2">
            Frequência
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-normal">1 opção</span>
          </h2>
          <div className="flex flex-col gap-2">
            {RADAR_OPTIONS.frequencies.map(f => {
              const isSelected = radar.frequency === f.label;
              return (
                <button
                  key={f.label}
                  onClick={() => setRadar(prev => ({...prev, frequency: f.label}))}
                  className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-primary border-primary text-white shadow-md'
                      : 'bg-white border-transparent text-dark hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[20px] ${isSelected ? '' : 'text-primary'}`}>
                      {f.icon}
                    </span>
                    <span className="font-medium">{f.label}</span>
                  </div>
                  <div className={`size-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-white' : 'border-gray-300'}`}>
                     {isSelected && <div className="size-2.5 bg-white rounded-full" />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-dark mb-3 flex items-center gap-2">
            Tipo de lugar
            <span className={`text-xs px-2 py-0.5 rounded-md font-normal transition-colors ${
               radar.placeTypes.length >= 2 && radar.placeTypes.length <= 5 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {radar.placeTypes.length} selecionados (2 a 5)
            </span>
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {RADAR_OPTIONS.placeTypes.map(t => {
               const isSelected = radar.placeTypes.includes(t.label);
               return (
                <button
                  key={t.label}
                  onClick={() => toggleRadarPlaceType(t.label)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2.5 transition-all active:scale-95 text-sm font-medium border ${
                    isSelected
                      ? 'bg-primary border-primary text-white shadow-md'
                      : 'bg-white border-black/5 text-dark'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[16px] ${isSelected ? '' : 'text-primary'}`}>
                    {t.icon}
                  </span>
                  {t.label}
                  {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                </button>
               )
            })}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-dark mb-3 flex items-center gap-2">
            Comportamento
            <span className={`text-xs px-2 py-0.5 rounded-md font-normal transition-colors ${
               radar.behavior.length >= 1 && radar.behavior.length <= 2 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {radar.behavior.length} selecionados (1 a 2)
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-3">
             {RADAR_OPTIONS.behaviors.map(b => {
               const isSelected = radar.behavior.includes(b.label);
               return (
                 <button 
                   key={b.label}
                   onClick={() => toggleRadarBehavior(b.label)}
                   className={`w-full flex justify-between items-center px-5 py-4 rounded-2xl border transition-all active:scale-[0.98] ${
                     isSelected ? 'bg-primary border-primary text-white shadow-md' : 'bg-white border-transparent'
                   }`}
                 >
                   <div className="flex items-center gap-3">
                     <span className={`material-symbols-outlined text-[20px] ${isSelected ? '' : 'text-primary'}`}>
                       {b.icon}
                     </span>
                     <span className={`font-medium ${isSelected ? 'font-bold' : ''}`}>{b.label}</span>
                   </div>
                   {isSelected && <span className="material-symbols-outlined text-[20px]">check_circle</span>}
                   {!isSelected && <span className="material-symbols-outlined text-[20px] text-gray-300">circle</span>}
                 </button>
               )
             })}
          </div>
        </section>
      </div>
    </>
  );

  const renderStep4 = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold leading-tight mb-2">Alguma restrição alimentar?</h1>
        <p className="text-lg text-secondary leading-snug">Vamos garantir que as sugestões funcionem pra você</p>
      </div>
      <div className="flex flex-col gap-3 pb-32">
        {RESTRICTION_OPTIONS.map(opt => {
          const isSelected = restrictions.includes(opt.label);
          const isSpecial = opt.type === 'special';
          
          return (
            <button
              key={opt.label}
              onClick={() => toggleRestriction(opt.label)}
              className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl border transition-all active:scale-[0.98] ${
                isSelected
                  ? 'bg-primary border-primary text-white shadow-md'
                  : 'bg-white border-transparent hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                 <span className={`material-symbols-outlined text-[20px] ${isSelected ? '' : isSpecial ? 'text-green-500' : 'text-primary'}`}>
                   {opt.icon}
                 </span>
                 <span className={`text-base ${isSelected ? 'font-bold' : 'font-medium'}`}>{opt.label}</span>
              </div>
              {isSelected 
                ? <span className="material-symbols-outlined text-[24px]">check_circle</span>
                : <span className="material-symbols-outlined text-[24px] text-gray-200">circle</span>
              }
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-cream flex flex-col max-w-md mx-auto shadow-2xl relative">
      {renderHeader()}
      
      <main className="flex-1 px-6 pt-4 relative overflow-y-auto no-scrollbar">
        {step === OnboardingStep.DISLIKES && renderStep1()}
        {step === OnboardingStep.OCCASIONS && renderStep2()}
        {step === OnboardingStep.RADAR && renderStep3()}
        {step === OnboardingStep.RESTRICTIONS && renderStep4()}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-cream via-cream/90 to-transparent w-full max-w-md mx-auto z-20">
        <button 
          onClick={handleNext}
          disabled={!canContinue() || saving}
          className={`w-full h-14 rounded-full font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
             canContinue() && !saving
               ? 'bg-primary hover:bg-[#e6352b] text-white shadow-primary/20' 
               : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
          }`}
        >
          {saving ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Salvando...
            </>
          ) : step === OnboardingStep.RESTRICTIONS ? (
            'Comece a explorar!'
          ) : (
            <>
              Continuar
              <span className="material-symbols-outlined font-bold">arrow_forward</span>
            </>
          )}
        </button>
        {occasionError && step === OnboardingStep.OCCASIONS && !canContinue() && (
             <p className="text-center text-xs text-primary font-bold mt-2">{occasionError}</p>
        )}
      </div>
    </div>
  );
};