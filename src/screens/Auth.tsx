import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../AppContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { supabase, currentUser } = useAppContext();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    // Recuperar preferência salva
    return localStorage.getItem('fomi_remember_me') === 'true';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [socialLoading, setSocialLoading] = useState<'google' | null>(null);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);
  
  useEffect(() => {
    if (hasAttemptedLogin && currentUser) {
      navigate(currentUser.onboarding_completed ? '/feed' : '/onboarding');
    }
  }, [currentUser, hasAttemptedLogin, navigate]);

  // Verificar se veio de OAuth redirect
  useEffect(() => {
    const checkOAuthRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setHasAttemptedLogin(true);
      }
    };
    checkOAuthRedirect();
  }, [supabase]);

  // Salvar preferência de "Lembrar de mim"
  useEffect(() => {
    localStorage.setItem('fomi_remember_me', rememberMe.toString());
  }, [rememberMe]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const isEmail = identifier.includes('@');
      let email = identifier;

      if (!isEmail) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', identifier.toLowerCase())
          .maybeSingle();

        if (error || !profile?.email) {
          setErrorMessage(error ? 'Erro ao buscar usuário' : 'Usuário não encontrado');
          setIsLoading(false);
          return;
        }
        email = profile.email;
      }

      // Se "Lembrar de mim" estiver desmarcado, a sessão expira ao fechar o navegador
      const { error } = await supabase.auth.signInWithPassword({ 
        email, 
        password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setShowVerifyModal(true);
        } else if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('E-mail ou senha incorretos');
        } else {
          setErrorMessage(error.message);
        }
        setIsLoading(false);
        return;
      }

      // Se não quer lembrar, limpar ao fechar aba (sessionStorage flag)
      if (!rememberMe) {
        sessionStorage.setItem('fomi_session_only', 'true');
      } else {
        sessionStorage.removeItem('fomi_session_only');
      }

      setHasAttemptedLogin(true);
      setIsLoading(false);
      
    } catch {
      setErrorMessage('Erro ao fazer login. Tente novamente.');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading('google');
    setErrorMessage('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/feed`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setErrorMessage('Erro ao conectar com Google');
        setSocialLoading(null);
      }
    } catch {
      setErrorMessage('Erro ao conectar com Google');
      setSocialLoading(null);
    }
  };

  const handleForgotPassword = () => {
    setForgotEmail('');
    setForgotSent(false);
    setShowForgotModal(true);
  };

  const submitForgotPassword = async () => {
    if (!forgotEmail) return;
    setForgotLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    setForgotLoading(false);
    if (!error) {
      setForgotSent(true);
    }
  };

  const resendVerificationEmail = async () => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: identifier.includes('@') ? identifier : ''
    });

    if (!error) {
      alert('E-mail de verificação reenviado!');
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col p-6 relative">
      
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForgotModal(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-bounce-in">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-dark">Recuperar senha</h3>
              <button onClick={() => setShowForgotModal(false)} className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            
            <div className="p-6">
              {!forgotSent ? (
                <>
                  <label className="block text-sm font-bold text-dark mb-2">Digite seu e-mail</label>
                  <input 
                    type="email" 
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="w-full h-12 rounded-xl border-2 border-gray-200 px-4 mb-6 focus:border-primary outline-none transition-colors bg-gray-50 placeholder:text-gray-400"
                    placeholder="seu@email.com"
                    autoFocus
                  />
                  <button 
                    onClick={submitForgotPassword}
                    disabled={!forgotEmail || forgotLoading}
                    className="w-full h-12 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
                  >
                    {forgotLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                  </button>
                </>
              ) : (
                <div className="text-center py-2">
                  <div className="size-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <span className="material-symbols-outlined text-3xl">mark_email_read</span>
                  </div>
                  <p className="font-bold text-lg mb-1 text-dark">Link enviado!</p>
                  <p className="text-secondary text-sm mb-6">Verifique sua caixa de entrada para redefinir sua senha.</p>
                  <button 
                    onClick={() => setShowForgotModal(false)}
                    className="text-primary font-bold text-sm hover:underline"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowVerifyModal(false)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div className="size-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">mark_email_unread</span>
            </div>
            <h3 className="text-xl font-bold text-dark mb-2">Verifique seu e-mail</h3>
            <p className="text-secondary text-sm mb-6">
              Para sua segurança, você precisa confirmar seu endereço de e-mail antes de acessar sua conta.
            </p>
            
            <button 
              onClick={resendVerificationEmail}
              className="w-full h-12 bg-dark text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform mb-3"
            >
              Reenviar e-mail
            </button>
            <button onClick={() => setShowVerifyModal(false)} className="text-sm font-medium text-gray-400 hover:text-dark">
              Fechar
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo-fomi-vermelho.png"
            alt="Fomí"
            className="h-20 mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold text-dark text-center leading-tight">
            Bem vindo à comunidade<br />de quem come bem!
          </h1>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {errorMessage}
            </div>
          )}

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors">mail</span>
            </div>
            <input 
              type="text" 
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="E-mail ou Usuário" 
              className="w-full rounded-full border-2 border-gray-100 bg-white py-4 pl-12 pr-4 text-dark placeholder:text-gray-400 focus:border-primary focus:outline-none shadow-sm transition-all" 
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors">lock</span>
            </div>
            <input 
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha" 
              className="w-full rounded-full border-2 border-gray-100 bg-white py-4 pl-12 pr-12 text-dark placeholder:text-gray-400 focus:border-primary focus:outline-none shadow-sm transition-all" 
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-dark transition-colors"
            >
              <span className="material-symbols-outlined">{showPassword ? 'visibility' : 'visibility_off'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div className={`size-5 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}>
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="hidden" 
                />
                {rememberMe && <span className="material-symbols-outlined text-white text-[16px]">check</span>}
              </div>
              <span className="text-sm text-secondary font-medium">Lembrar de mim</span>
            </label>
            <button type="button" onClick={handleForgotPassword} className="text-sm font-bold text-dark hover:text-primary transition-colors">
              Esqueceu a Senha?
            </button>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="mt-4 w-full rounded-full bg-primary py-4 text-white font-bold shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-8 mb-6 relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
          <div className="relative flex justify-center"><span className="bg-cream px-4 text-sm text-gray-500">Ou continuar com</span></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={socialLoading !== null}
          className="w-full flex items-center justify-center gap-3 bg-white py-3.5 rounded-full border border-gray-100 shadow-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {socialLoading === 'google' ? (
            <span className="size-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
          ) : (
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
          )}
          Continuar com Google
        </button>

        <p className="text-center mt-8 text-sm text-secondary">
          Ainda não tem uma conta?{' '}
          <button
            onClick={() => navigate('/register')}
            className="font-bold text-primary hover:underline text-base"
          >
            Criar conta
          </button>
        </p>
      </main>
    </div>
  );
};

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { supabase } = useAppContext();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    birthDate: '',
    gender: 'no_answer',
    location: '',
    password: ''
  });

  const [touched, setTouched] = useState<{[key: string]: boolean}>({});
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [passwordStrength, setPasswordStrength] = useState<0 | 1 | 2 | 3>(0);
  const [showPassword, setShowPassword] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [socialLoading, setSocialLoading] = useState<'google' | null>(null);

  useEffect(() => {
    const currentErrors: {[key: string]: string} = {};

    if (touched.name && formData.name.length < 3) {
      currentErrors.name = 'Mínimo 3 caracteres';
    }

    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const disposableDomains = ['tempmail.com', '10minutemail.com', 'mailinator.com', 'throwawaymail.com', 'guerrillamail.com', 'yopmail.com'];
      
      if (!emailRegex.test(formData.email)) {
        if (touched.email) currentErrors.email = 'E-mail inválido';
      } else {
        const domain = formData.email.split('@')[1];
        if (domain && disposableDomains.includes(domain)) {
          currentErrors.email = 'E-mails temporários não são permitidos';
        }
      }
    }

    if (formData.birthDate) {
      const today = new Date();
      const birth = new Date(formData.birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      if (age < 18) {
        currentErrors.birthDate = 'Você precisa ter 18 anos ou mais';
      }
    } else if (touched.birthDate) {
      currentErrors.birthDate = 'Data de nascimento obrigatória';
    }
    
    if (touched.gender && formData.gender === 'no_answer') {
      currentErrors.gender = 'Selecione um gênero';
    }

    if (touched.location && !formData.location) {
      currentErrors.location = 'Localização é obrigatória';
    }

    if (touched.password && formData.password.length < 8) {
      currentErrors.password = 'A senha deve ter no mínimo 8 caracteres';
    }

    setErrors(currentErrors);
  }, [formData, touched]);

  // Verificação de username com timeout
  useEffect(() => {
    if (!formData.username) {
      setUsernameStatus('idle');
      return;
    }

    // Validações locais primeiro
    if (formData.username.length < 3) {
      setUsernameStatus('taken');
      return;
    }

    if (formData.username.includes(' ')) {
      setUsernameStatus('taken');
      return;
    }

    // Verificar caracteres válidos (apenas letras, números e underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setUsernameStatus('taken');
      return;
    }

    setUsernameStatus('checking');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const checkUsername = async () => {
      try {
        // Primeiro tentar RPC com timeout
        const rpcPromise = supabase.rpc('check_username_available', {
          target_username: formData.username.toLowerCase()
        });

        const { data, error } = await rpcPromise;

        clearTimeout(timeoutId);

        if (error) {
          console.warn('RPC error, trying fallback:', error);
          // Fallback: query direta
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', formData.username.toLowerCase())
            .limit(1);
          
          setUsernameStatus(profiles && profiles.length > 0 ? 'taken' : 'available');
        } else {
          setUsernameStatus(data ? 'available' : 'taken');
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn('Username check error:', err);
        
        // Em caso de erro/timeout, tentar fallback simples
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', formData.username.toLowerCase())
            .limit(1);
          
          setUsernameStatus(profiles && profiles.length > 0 ? 'taken' : 'available');
        } catch {
          // Se tudo falhar, assumir disponível para não travar
          setUsernameStatus('available');
        }
      }
    };

    const debounceTimeout = setTimeout(checkUsername, 500);

    return () => {
      clearTimeout(debounceTimeout);
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [formData.username, supabase]);

  useEffect(() => {
    const pwd = formData.password;
    if (!pwd) {
      setPasswordStrength(0);
      return;
    }
    let strength: 0 | 1 | 2 | 3 = 0;
    if (pwd.length >= 8) strength = 1;
    if (pwd.length >= 8 && /\d/.test(pwd)) strength = 2;
    if (pwd.length >= 8 && /\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) strength = 3;
    
    setPasswordStrength(strength);
  }, [formData.password]);

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGPS = () => {
    setIsLocating(true);
    if (errors.location) {
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs.location;
        return newErrs;
      });
    }

    if (!("geolocation" in navigator)) {
      setIsLocating(false);
      alert("Geolocalização não é suportada pelo seu navegador.");
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Zoom 18 para máxima precisão (nível de rua)
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
            headers: {
              'User-Agent': 'FomiApp/1.0',
              'Accept-Language': 'pt-BR'
            }
          });
          if (response.ok) {
            const data = await response.json();
            const addr = data.address || {};

            // Montar endereço completo
            const road = addr.road || addr.street || addr.pedestrian || '';
            const houseNumber = addr.house_number || '';
            const neighbourhood = addr.neighbourhood || addr.suburb || addr.district || '';
            const city = addr.city || addr.town || addr.village || addr.municipality || '';
            const state = addr.state || '';

            // Construir string de localização
            const parts: string[] = [];
            if (road) {
              parts.push(houseNumber ? `${road}, ${houseNumber}` : road);
            }
            if (neighbourhood) parts.push(neighbourhood);
            if (city) parts.push(city);
            if (state && state !== city) parts.push(state);

            let locationText = parts.length > 0
              ? parts.join(' - ')
              : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

            setFormData(prev => ({ ...prev, location: locationText }));
          } else {
            throw new Error("Nominatim API error");
          }
        } catch {
          setFormData(prev => ({ ...prev, location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
        }

        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        let errorMessage = "Erro ao obter localização.";
        let detail = error.message;

        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Permissão de localização negada.";
            detail = "Verifique as configurações do navegador e permita o acesso.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Localização indisponível.";
            detail = "Sinal de GPS fraco ou erro de rede.";
            break;
          case error.TIMEOUT:
            errorMessage = "Tempo esgotado.";
            detail = "Não foi possível obter a localização a tempo.";
            break;
        }

        alert(`${errorMessage}\nDetalhe: ${detail}`);
      },
      options
    );
  };

  const canSubmit = () => {
    const hasErrors = Object.keys(errors).length > 0;
    const requiredFilled = formData.name && formData.username && formData.email && formData.birthDate && formData.location && formData.password;
    const isAdult = !errors.birthDate;
    const isUsernameOk = usernameStatus === 'available';

    return !hasErrors && requiredFilled && isAdult && isUsernameOk && !isSubmitting;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit()) {
      setTouched({
        name: true,
        username: true,
        email: true,
        birthDate: true,
        gender: true,
        location: true,
        password: true
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            username: formData.username.toLowerCase(),
            date_of_birth: formData.birthDate,
            gender: formData.gender === 'no_answer' ? 'other' : formData.gender,
            city: formData.location
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setSubmitError('Este e-mail já está cadastrado');
        } else {
          setSubmitError(authError.message);
        }
        setIsSubmitting(false);
        return;
      }

      if (authData.user) {
        setShowSuccessModal(true);
      }
    } catch {
      setSubmitError('Erro ao criar conta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setSocialLoading('google');
    setSubmitError('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setSubmitError('Erro ao conectar com Google');
        setSocialLoading(null);
      }
    } catch {
      setSubmitError('Erro ao conectar com Google');
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col p-6 relative">
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div className="bg-white rounded-3xl p-8 w-full max-w-xs shadow-2xl relative z-10 flex flex-col items-center text-center animate-bounce-in">
            <div className="size-16 rounded-full bg-green-100 flex items-center justify-center mb-4 text-green-600">
              <span className="material-symbols-outlined text-4xl">mark_email_read</span>
            </div>
            <h3 className="text-xl font-bold text-dark mb-2">Conta criada!</h3>
            <p className="text-secondary text-sm mb-6">Enviamos um link de confirmação para <b>{formData.email}</b>. Verifique sua caixa de entrada.</p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full py-3.5 rounded-full bg-primary text-white font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
            >
              Ir para o Login
            </button>
          </div>
        </div>
      )}

      <header className="flex items-center py-4 relative">
        <button onClick={() => navigate('/login')} className="size-10 flex items-center justify-center rounded-full hover:bg-black/5">
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <h1 className="flex-1 text-center font-bold text-xl">Criar Conta</h1>
        <div className="size-10"></div>
      </header>

      <main className="flex-1 flex flex-col pt-4 pb-8 max-w-md mx-auto w-full">
        
        {/* Google Sign Up */}
        <button 
          onClick={handleGoogleSignUp}
          disabled={socialLoading !== null}
          className="w-full flex items-center justify-center gap-3 bg-white py-3.5 rounded-full border border-gray-100 shadow-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 mb-6"
        >
          {socialLoading === 'google' ? (
            <span className="size-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
          ) : (
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
          )}
          Cadastrar com Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
          <div className="relative flex justify-center"><span className="bg-cream px-4 text-sm text-gray-500">Ou cadastre com e-mail</span></div>
        </div>

        <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex gap-3 mb-6">
          <span className="material-symbols-outlined text-orange-600 shrink-0">info</span>
          <div className="text-sm text-dark">
            <p className="font-bold">Confirmação necessária</p>
            <p className="opacity-80">Você precisará confirmar seu e-mail após o cadastro.</p>
          </div>
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <label className="text-sm font-bold ml-1">Nome Completo</label>
            <div className="relative">
              <input 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                onBlur={() => handleBlur('name')}
                type="text" 
                placeholder="Ex: Ana Silva" 
                className={`w-full h-14 rounded-full border-2 ${errors.name ? 'border-primary' : 'border-transparent'} bg-white px-5 pr-12 font-medium shadow-sm focus:border-primary focus:ring-0`} 
              />
              {formData.name.length >= 3 && (
                <span className="absolute right-4 top-4 text-green-600 material-symbols-outlined">check</span>
              )}
              {errors.name && (
                <span className="absolute right-4 top-4 text-primary material-symbols-outlined">close</span>
              )}
            </div>
            {errors.name && <p className="text-xs text-primary font-medium ml-2">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold ml-1">Nome de Usuário</label>
            <div className="relative">
              <span className="absolute left-5 top-4 text-gray-400 font-medium">@</span>
              <input 
                name="username" 
                value={formData.username} 
                onChange={handleChange}
                onBlur={() => handleBlur('username')}
                type="text" 
                placeholder="usuario" 
                autoCapitalize="none"
                autoCorrect="off"
                className={`w-full h-14 rounded-full border-2 transition-colors ${
                  usernameStatus === 'taken' ? 'border-primary' : 
                  usernameStatus === 'available' ? 'border-green-500' : 
                  'border-transparent'
                } bg-white pl-10 pr-12 font-medium shadow-sm focus:outline-none focus:ring-0 ${usernameStatus === 'idle' ? 'focus:border-primary' : ''}`} 
              />
              <div className="absolute right-4 top-4 flex items-center pointer-events-none">
                {usernameStatus === 'checking' && (
                  <span className="block size-5 rounded-full border-2 border-gray-300 border-t-primary animate-spin" />
                )}
                {usernameStatus === 'available' && (
                  <span className="material-symbols-outlined text-green-600">check_circle</span>
                )}
                {usernameStatus === 'taken' && (
                  <span className="material-symbols-outlined text-primary">cancel</span>
                )}
              </div>
            </div>
            <div className="ml-2 min-h-[20px] flex items-center">
              {usernameStatus === 'taken' && (
                <p className="text-xs text-primary font-medium">
                  {formData.username.length < 3 ? 'Mínimo de 3 caracteres.' : 
                   formData.username.includes(' ') ? 'Não pode conter espaços.' :
                   !/^[a-zA-Z0-9_]+$/.test(formData.username) ? 'Apenas letras, números e _' :
                   'Nome de usuário indisponível.'}
                </p>
              )}
              {usernameStatus === 'available' && (
                <p className="text-xs text-green-600 font-medium">Nome de usuário disponível!</p>
              )}
              {usernameStatus === 'checking' && (
                <p className="text-xs text-gray-400 font-medium">Verificando disponibilidade...</p>
              )}
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-bold ml-1">E-mail</label>
            <input 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
              onBlur={() => handleBlur('email')}
              type="email" 
              placeholder="nome@exemplo.com" 
              className={`w-full h-14 rounded-full border-2 ${errors.email ? 'border-primary' : 'border-transparent'} bg-white px-5 font-medium shadow-sm focus:border-primary focus:ring-0`} 
            />
            {errors.email && <p className="text-xs text-primary font-medium ml-2">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold ml-1">Data de Nascimento</label>
            <input 
              name="birthDate" 
              value={formData.birthDate} 
              onChange={handleChange} 
              onBlur={() => handleBlur('birthDate')}
              type="date" 
              className={`w-full h-14 rounded-full border-2 ${errors.birthDate ? 'border-primary' : 'border-transparent'} bg-white px-5 font-medium shadow-sm focus:border-primary focus:ring-0`} 
            />
            {errors.birthDate && <p className="text-xs text-primary font-medium ml-2">{errors.birthDate}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold ml-1">Gênero</label>
            <div className="relative">
              <select 
                name="gender" 
                value={formData.gender} 
                onChange={handleChange} 
                onBlur={() => handleBlur('gender')}
                className="w-full h-14 rounded-full border-2 border-transparent bg-white px-5 font-medium shadow-sm focus:border-primary focus:ring-0 appearance-none"
              >
                <option value="no_answer" disabled>Selecione</option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
                <option value="other">Outros</option>
              </select>
              <span className="absolute right-5 top-4 text-gray-500 pointer-events-none material-symbols-outlined">expand_more</span>
            </div>
            {errors.gender && <p className="text-xs text-primary font-medium ml-2">{errors.gender}</p>}
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-bold ml-1">Localização</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={handleGPS}
                disabled={isLocating}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all bg-white shadow-sm text-primary hover:bg-gray-50 border border-transparent disabled:opacity-50"
              >
                {isLocating ? (
                  <span className="block size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">my_location</span>
                )}
                {isLocating ? 'Localizando...' : formData.location ? 'Atualizar localização' : 'Usar minha localização'}
              </button>
            </div>
            <input
              name="location"
              value={formData.location}
              onChange={handleChange}
              onBlur={() => handleBlur('location')}
              type="text"
              placeholder="Ex: Rua das Flores, 123 - Jardins - São Paulo"
              className={`w-full h-14 rounded-full border-2 ${errors.location ? 'border-primary' : 'border-transparent'} bg-white px-5 font-medium shadow-sm focus:border-primary focus:ring-0`}
            />
            <p className="text-xs text-gray-400 ml-2">Use o GPS ou digite seu endereço completo</p>
            {errors.location && <p className="text-xs text-primary font-medium ml-2">{errors.location}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold ml-1">Senha</label>
            <div className="relative">
              <input 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                onBlur={() => handleBlur('password')}
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres" 
                className={`w-full h-14 rounded-full border-2 ${touched.password && formData.password.length < 8 ? 'border-primary' : 'border-transparent'} bg-white pl-5 pr-14 font-medium shadow-sm focus:border-primary focus:ring-0`} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-dark transition-colors"
              >
                <span className="material-symbols-outlined">{showPassword ? 'visibility' : 'visibility_off'}</span>
              </button>
            </div>
            {formData.password.length > 0 && (
              <div className="mt-2 ml-1 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      passwordStrength === 1 ? 'w-1/3 bg-red-500' : 
                      passwordStrength === 2 ? 'w-2/3 bg-yellow-500' : 
                      passwordStrength === 3 ? 'w-full bg-green-500' : 'w-0'
                    }`} 
                  />
                </div>
                <span className="text-[10px] font-bold uppercase text-gray-500">
                  {passwordStrength === 1 ? 'Fraca' : passwordStrength === 2 ? 'Média' : passwordStrength === 3 ? 'Forte' : 'Curta'}
                </span>
              </div>
            )}
            {errors.password && <p className="text-xs text-primary font-medium ml-2">{errors.password}</p>}
          </div>

          <button 
            type="submit" 
            disabled={!canSubmit()}
            className={`mt-4 w-full h-14 rounded-full text-white text-xl font-bold shadow-lg transition-all active:scale-[0.98] ${
              canSubmit() 
                ? 'bg-primary shadow-primary/30' 
                : 'bg-gray-300 cursor-not-allowed shadow-none'
            }`}
          >
            {isSubmitting ? 'Criando conta...' : 'Criar Conta'}
          </button>

          <div className="text-center pb-4">
            <button type="button" onClick={() => navigate('/login')} className="text-sm text-secondary font-medium">
              Já tem conta? <span className="font-bold text-primary">Entrar</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};