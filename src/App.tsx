/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { User, EnrollmentData } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Enroll from './pages/Enroll';
import Records from './pages/Records';
import Courses from './pages/Courses';
import Settings from './pages/Settings';
import Steps from './pages/Steps';
import { MainLayout } from './components/layout/MainLayout';
import { PageTransition } from './components/layout/PageTransition';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('cdm_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('cdm_user');
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" gutter={8} />
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login onLogin={setUser} /> : <Navigate to="/dashboard" replace />} 
        />
        
        <Route
          path="/*"
          element={
            user ? (
              <MainLayout user={user} onLogout={handleLogout}>
                <Routes>
                  <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
                  <Route path="/enroll" element={<PageTransition><Enroll /></PageTransition>} />
                  <Route path="/records" element={<PageTransition><Records /></PageTransition>} />
                  <Route path="/steps" element={<PageTransition><Steps /></PageTransition>} />
                  <Route path="/courses" element={<PageTransition><Courses /></PageTransition>} />
                  <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </MainLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

