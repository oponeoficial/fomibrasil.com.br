import React, { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppProvider } from './AppContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';

// Lazy load todas as telas
const Login = lazy(() => import('./screens/Auth').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./screens/Auth').then(m => ({ default: m.Register })));
const Onboarding = lazy(() => import('./screens/Onboarding').then(m => ({ default: m.Onboarding })));
const Feed = lazy(() => import('./screens/Feed').then(m => ({ default: m.Feed })));
const Discover = lazy(() => import('./screens/Discover').then(m => ({ default: m.Discover })));
const Profile = lazy(() => import('./screens/Profile').then(m => ({ default: m.Profile })));
const Settings = lazy(() => import('./screens/Settings').then(m => ({ default: m.Settings })));
const Lists = lazy(() => import('./screens/Lists').then(m => ({ default: m.Lists })));
const ListDetails = lazy(() => import('./screens/ListDetails').then(m => ({ default: m.ListDetails })));
const Recommendations = lazy(() => import('./screens/Recommendations').then(m => ({ default: m.Recommendations })));
const NewReview = lazy(() => import('./screens/NewReview').then(m => ({ default: m.NewReview })));
const Notifications = lazy(() => import('./screens/Notifications').then(m => ({ default: m.Notifications })));
const ReviewDetail = lazy(() => import('./screens/ReviewDetail').then(m => ({ default: m.ReviewDetail })));

// Lazy load Navigation
const BottomNav = lazy(() => import('./components/Navigation').then(m => ({ default: m.BottomNav })));

// Loading spinner
const PageLoader = () => (
  <div className="min-h-screen bg-cream flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-secondary text-sm font-medium">Carregando...</span>
    </div>
  </div>
);

// Layout com Bottom Nav (protegido)
const AppLayout: React.FC = () => (
  <ProtectedRoute>
    <Suspense fallback={<PageLoader />}>
      <Outlet />
      <BottomNav />
    </Suspense>
  </ProtectedRoute>
);

export default function App() {
  return (
    <AppProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Rotas Públicas - redireciona logados para /feed */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            
            {/* Review Detail - Pública (qualquer um pode ver via link compartilhado) */}
            <Route path="/review/:reviewId" element={<ReviewDetail />} />
            
            {/* Onboarding - requer auth mas não requer onboarding completo */}
            <Route path="/onboarding" element={
              <ProtectedRoute requireOnboarding={false}>
                <Onboarding />
              </ProtectedRoute>
            } />
            
            {/* Rotas Autenticadas com Bottom Nav */}
            <Route element={<AppLayout />}>
              <Route path="/feed" element={<Feed />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:username" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/lists" element={<Lists />} />
              <Route path="/lists/:id" element={<ListDetails />} />
              <Route path="/recommendations" element={<Recommendations />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>

            {/* Full Screen Modal - protegido */}
            <Route path="/new-review" element={
              <ProtectedRoute>
                <NewReview />
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </Router>
    </AppProvider>
  );
}