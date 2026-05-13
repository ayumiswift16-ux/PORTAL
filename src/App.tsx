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
        unsubscribeUserDoc = onSnapshot(userDocRef, async (docSnap) => {
          let userData = docSnap.exists() ? docSnap.data() : null;
          
          // Check if this user (Gmail) is an approved professor, even if they have a student doc
          if (firebaseUser.email) {
            const { getDoc } = await import('firebase/firestore');
            const emailId = firebaseUser.email;
            const adminDoc = await getDoc(doc(db, 'admins', emailId));
            
            if (adminDoc.exists()) {
              const adminData = adminDoc.data();
              const isAlreadyProfessor = userData?.role === 'professor';
              
              if (!isAlreadyProfessor) {
                 // Upgrade or create professor profile
                 const profProfile: any = {
                    ...(userData || {}),
                    name: adminData.name || firebaseUser.displayName || firebaseUser.email.split('@')[0],
                    email: userData?.email || `${adminData.username || firebaseUser.email.split('@')[0]}@school.portal`,
                    gmail: firebaseUser.email,
                    role: 'professor',
                    assignedSections: adminData.assignedSections || [],
                    assignedSection: adminData.assignedSection || adminData.assignedSections?.[0] || null,
                    updatedAt: new Date().toISOString()
                 };
                 await setDoc(userDocRef, profProfile, { merge: true });
                 // The snapshot will trigger again with updated data
                 return;
              }
            }
          }

          if (userData) {
            setUser(prev => {
              const updated = prev ? { ...prev, ...userData } : { ...initialUser, ...userData };
              localStorage.setItem('cdm_user', JSON.stringify(updated));
              return updated;
            });
          } else {
            // New user doc not found.
            // If it's a portal account and not a hardcoded admin, don't auto-create as student
            // unless it's explicitly a student email (all students use Google/Gmail)
            const isPortalEmail = firebaseUser.email?.endsWith('@school.portal');
            if (isAdmin) {
              // Admin handled by exists/admins check usually, but for hardcoded:
              setUser(initialUser);
            } else if (isPortalEmail) {
              // Don't auto-create for portal emails as they are professors-to-be
              // We'll show a "Pending" or "Access Denied" state via Dashboard if they login
              setUser({ ...initialUser, role: 'student' as any, status: 'pending_approval' } as any);
            } else {
              // Standard Google user (Student)
              await setDoc(userDocRef, initialUser);
            }
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

