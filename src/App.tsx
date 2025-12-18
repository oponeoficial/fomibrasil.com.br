import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Login, Register } from './screens/Auth';
import { Onboarding } from './screens/Onboarding';
import { Feed } from './screens/Feed';
import { Discover } from './screens/Discover';
import { Profile } from './screens/Profile';
import { Settings } from './screens/Settings';
import { Lists } from './screens/Lists';
import { ListDetails } from './screens/ListDetails';
import { Recommendations } from './screens/Recommendations';
import { NewReview } from './screens/NewReview';
import { Notifications } from './screens/Notifications';
import { BottomNav } from './components/Navigation';
import { AppProvider } from './AppContext';

const AppLayout: React.FC = () => {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Onboarding Flow */}
          <Route path="/onboarding" element={<Onboarding />} />
          
          {/* Authenticated Routes with Bottom Nav */}
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

          {/* Full Screen Modals */}
          <Route path="/new-review" element={<NewReview />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}