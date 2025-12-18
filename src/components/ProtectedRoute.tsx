import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../AppContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireOnboarding = true 
}) => {
  const { currentUser, loading } = useAppContext();
  const location = useLocation();

  // Mostra loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-secondary text-sm font-medium">Carregando...</span>
        </div>
      </div>
    );
  }

  // Não autenticado → redireciona para login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Autenticado mas não completou onboarding → redireciona para onboarding
  if (requireOnboarding && !currentUser.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

// Rota pública - redireciona usuários logados para o feed
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAppContext();

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-secondary text-sm font-medium">Carregando...</span>
        </div>
      </div>
    );
  }

  // Já logado → redireciona para feed ou onboarding
  if (currentUser) {
    return <Navigate to={currentUser.onboarding_completed ? '/feed' : '/onboarding'} replace />;
  }

  return <>{children}</>;
};