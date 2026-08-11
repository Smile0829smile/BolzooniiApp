import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { supabase } from './supabaseClient';

import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import NotificationPage from './pages/NotificationPage';
import ProfileViewPage from './pages/ProfileViewPage';
import RulesAgreementPage from './pages/rulesAgreementPage'; // ✅ Import your new page
import AdminBonusHistoryPage from "./pages/AdminBonusHistoryPage";
import AdminBonusPage from './pages/AdminBonusPage';
import CreatorReportsPage from './pages/CreatorReportsPage';
import CreatorDatingRequestsPage from './pages/CreatorDatingRequestsPage';
import CreatorActiveDatingPage from './pages/CreatorActiveDatingPage';
import CreatorTasksPage from './pages/CreatorTasksPage';
import ProfileEdit from './pages/ProfileEdit';
import WarningPage from './pages/WarningPage';
import DeleteUser from './pages/DeleteUser';

function ProtectedRoute({ user, children }) {
  const location = useLocation();
  const [hasAgreed, setHasAgreed] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAgreement = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('agreed_to_rules')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking agreement:', error.message);
        return;
      }

      setHasAgreed(data.agreed_to_rules);
      setLoading(false);
    };

    checkAgreement();
  }, [user]);

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!hasAgreed && location.pathname !== '/rules-agreement') {
    return <Navigate to="/rules-agreement" replace />;
  }

  return children;
}

function AppWrapper() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setCheckingSession(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  if (checkingSession) return <p>Loading...</p>;

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/profile" replace /> : <AuthPage />}
      />
      <Route
        path="/rules-agreement"
        element={
          <ProtectedRoute user={user}>
            <RulesAgreementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute user={user}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute user={user}>
            <LeaderboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute user={user}>
            <NotificationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile-view/:id"
        element={
          <ProtectedRoute user={user}>
            <ProfileViewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-bonus-history/:userId"
        element={
          <ProtectedRoute user={user}>
            <AdminBonusHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-bonus/:userId"
        element={
          <ProtectedRoute user={user}>
            <AdminBonusPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator-reports"
        element={<CreatorReportsPage />}
      />
      <Route
        path="/creator-dating-requests"
        element={<CreatorDatingRequestsPage />}
      />
      <Route
        path="/creator-active-dating"
        element={<CreatorActiveDatingPage />}
      />
      <Route
        path="/creator-tasks"
        element={<CreatorTasksPage />}
      />
      <Route
        path="/profile-edit/:id"
        element={<ProfileEdit />}
      />
      <Route
        path="/warning/:id"
        element={
          <ProtectedRoute user={user}>
            <WarningPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/delete-user/:id"
        element={
          <ProtectedRoute user={user}>
            <DeleteUser />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppWrapper />
    </Router>
  );
}
