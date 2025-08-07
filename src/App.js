import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { supabase } from './supabaseClient';

import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import NotificationPage from './pages/NotificationPage';
import ProfileViewPage from './pages/ProfileViewPage';
import RulesAgreementPage from './pages/rulesAgreementPage'; // ✅ Import your new page

function ProtectedRoute({ user, children }) {
  const location = useLocation();
  const [hasAgreed, setHasAgreed] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
