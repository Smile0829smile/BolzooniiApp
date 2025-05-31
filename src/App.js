import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import NotificationPage from './pages/NotificationPage';
import ProfileViewPage from './pages/ProfileViewPage';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/notifications" element={<NotificationPage />} />
        <Route path="/profile-view/:id" element={<ProfileViewPage />} />
      </Routes>
    </Router>
  );
}

export default App;
