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
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
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

        // Sync with users collection for extra data like role, profile picture, and assigned section
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const extraData = docSnap.data();
            setUser(prev => {
              const updated = prev ? { ...prev, ...extraData } : { ...initialUser, ...extraData };
              localStorage.setItem('cdm_user', JSON.stringify(updated));
              return updated;
            });
          } else {
            // Check if this is a professor logging in for the first time
            const checkProfessorMigration = async () => {
              // 1. Check by portal username if applicable
              const portalMatch = firebaseUser.email?.match(/^(.+)@school\.portal$/);
              if (portalMatch) {
                const username = portalMatch[1];
                const { getDoc } = await import('firebase/firestore');
                const usernameDoc = await getDoc(doc(db, 'users', username));
                if (usernameDoc.exists()) {
                  const data = usernameDoc.data();
                  await setDoc(userDocRef, data);
                  return true;
                }
              }
              
              // 2. Check the admins collection to see if their Gmail is approved
              if (firebaseUser.email) {
                const { getDoc } = await import('firebase/firestore');
                const emailId = firebaseUser.email.replace(/\./g, '_');
                const adminDoc = await getDoc(doc(db, 'admins', emailId));
                if (adminDoc.exists()) {
                  // This is an approved professor using Gmail
                  const adminData = adminDoc.data();
                  const profProfile: any = {
                    name: adminData.name,
                    email: firebaseUser.email,
                    role: 'professor',
                    assignedSections: adminData.assignedSections || [],
                    assignedSection: adminData.assignedSection || (adminData.assignedSections?.[0] || null),
                    createdAt: adminData.createdAt || new Date().toISOString()
                  };
                  await setDoc(userDocRef, profProfile);
                  return true;
                }
              }
              return false;
            };

            checkProfessorMigration().then(migrated => {
              if (!migrated && !isAdmin) {
                setDoc(userDocRef, initialUser);
              }
            });
          }
        }, (error) => {
          console.error("Firestore Error in App.tsx user listener:", error);
        });
      } else {
        if (unsubscribeUserDoc) unsubscribeUserDoc();
        setUser(null);
        localStorage.removeItem('cdm_user');
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
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
                  <Route path="/enroll" element={<PageTransition><Enroll /></PageTransition>} />
                  <Route 
                    path="/records" 
                    element={
                      (user.role === 'admin' || user.role === 'professor')
                        ? <PageTransition><Records /></PageTransition> 
                        : <Navigate to="/dashboard" replace />
                    } 
                  />
                  <Route path="/steps" element={<PageTransition><Steps /></PageTransition>} />
                  <Route path="/courses" element={<PageTransition><Courses /></PageTransition>} />
                  <Route 
                    path="/scheduling" 
                    element={
                      (user.role === 'admin' || user.role === 'professor')
                        ? <PageTransition><Scheduling /></PageTransition> 
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

