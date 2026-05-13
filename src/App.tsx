/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { User, EnrollmentRecord } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Enroll from './pages/Enroll';
import Records from './pages/Records';
import Courses from './pages/Courses';
import Settings from './pages/Settings';
import Scheduling from './pages/Scheduling';
import Steps from './pages/Steps';
import { MainLayout } from './components/layout/MainLayout';
import { PageTransition } from './components/layout/PageTransition';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;
    let unsubscribeAdminDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous listeners if auth state changes
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (unsubscribeAdminDoc) unsubscribeAdminDoc();
      unsubscribeUserDoc = null;
      unsubscribeAdminDoc = null;

      if (firebaseUser) {
        const isAdmin = firebaseUser.email === 'davevenzon789@gmail.com' || 
                        !!firebaseUser.email?.match(/^admin[1-5]@school\.portal$/);
        
        const initialUser: User = {
          username: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          role: isAdmin ? 'admin' : 'student'
        };
        
        setUser(initialUser);
        localStorage.setItem('cdm_user', JSON.stringify(initialUser));

        // Sync with users collection
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setUser(prev => {
              const updated = { ...prev, ...userData } as User;
              localStorage.setItem('cdm_user', JSON.stringify(updated));
              return updated;
            });
          }
        }, (err) => console.error("User doc error:", err));

        // Professor sync
        if (firebaseUser.email) {
          unsubscribeAdminDoc = onSnapshot(doc(db, 'admins', firebaseUser.email), (snap) => {
            if (snap.exists()) {
              const adminData = snap.data();
              setUser(prev => {
                if (!prev) return prev;
                const updated = {
                  ...prev,
                  role: 'professor' as any,
                  assignedSections: adminData.assignedSections || [],
                  assignedSection: adminData.assignedSection || adminData.assignedSections?.[0] || null
                };
                localStorage.setItem('cdm_user', JSON.stringify(updated));
                return updated;
              });
            }
          }, (err) => {
            // Silence permission denied errors for non-admins/non-profs
            if (err.code !== 'permission-denied') {
              console.error("Admin check error:", err);
            }
          });
        }
      } else {
        setUser(null);
        localStorage.removeItem('cdm_user');
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (unsubscribeAdminDoc) unsubscribeAdminDoc();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
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
                  <Route path="/dashboard" element={<PageTransition><Dashboard user={user} /></PageTransition>} />
                  <Route path="/enroll" element={<PageTransition><Enroll user={user} /></PageTransition>} />
                  <Route 
                    path="/records" 
                    element={
                      (user.role === 'admin' || user.role === 'professor')
                        ? <PageTransition><Records user={user} /></PageTransition> 
                        : <Navigate to="/dashboard" replace />
                    } 
                  />
                  <Route path="/steps" element={<PageTransition><Steps /></PageTransition>} />
                  <Route path="/courses" element={<PageTransition><Courses /></PageTransition>} />
                  <Route 
                    path="/scheduling" 
                    element={
                      (user.role === 'admin' || user.role === 'professor' || user.role === 'student')
                        ? <PageTransition><Scheduling user={user} /></PageTransition> 
                        : <Navigate to="/dashboard" replace />
                    }
                  />
                  <Route 
                    path="/settings" 
                    element={
                      user.role === 'admin' 
                        ? <PageTransition><Settings user={user} /></PageTransition> 
                        : <Navigate to="/dashboard" replace />
                    } 
                  />
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

