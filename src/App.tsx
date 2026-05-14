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
          } else {
            // If user doc is deleted, we only log out if they were PREVIOUSLY a student 
            // and we had a record for them (this implies administrative deletion)
            // For new users, it's normal to not have a doc yet.
            if (!isAdmin) {
               setUser(prev => {
                 if (prev?.role === 'student' && docSnap.id === firebaseUser.uid) {
                    // Check if they have specific fields that only exist after registration
                    // If they are just a "new" user, don't log out.
                 }
                 return prev;
               });
            }
          }
        }, (err) => console.error("User doc error:", err));

        // Professor/Admin sync
        if (firebaseUser.email) {
          // We only track admin/professor docs if they aren't already a hardcoded admin
          if (!isAdmin) {
            const adminIds = [firebaseUser.email, firebaseUser.uid];
            const adminUnsubs = adminIds.map(id => 
              onSnapshot(doc(db, 'admins', id), (snap) => {
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
                  
                  // Check master request status for deletion (REAL-TIME)
                  const emailToCheck = adminData.email || (id.includes('@') ? id : null);
                  if (emailToCheck) {
                    const reqRef = doc(db, 'teacher_requests', emailToCheck);
                    const unsubReq = onSnapshot(reqRef, (reqSnap) => {
                      if (reqSnap.exists() && reqSnap.data().status === 'deleted') {
                        console.warn("Professor account deleted by admin, signing out...");
                        signOut(auth);
                      }
                    });
                    (window as any)._teacherReqUnsubs = (window as any)._teacherReqUnsubs || [];
                    (window as any)._teacherReqUnsubs.push(unsubReq);
                  }
                } else {
                  // If we WERE a professor, and the admin doc is gone, we check the other ID
                  // but to be safe and avoid loops, we only sign out if the role stays professor 
                  // and we have confirmed NO admin doc exists for either ID
                  setUser(prev => {
                    if (prev?.role === 'professor') {
                       // One-time check if other record exists
                       import('firebase/firestore').then(({ getDoc, doc: fDoc }) => {
                         const otherId = id === firebaseUser.email ? firebaseUser.uid : firebaseUser.email!;
                         getDoc(fDoc(db, 'admins', otherId)).then(otherSnap => {
                           if (!otherSnap.exists()) {
                             console.warn("Professor record missing, signing out...");
                             signOut(auth);
                           }
                         });
                       });
                    }
                    return prev;
                  });
                }
              }, (err) => {
                // Silently ignore permission errors for non-admins
                if (err.code !== 'permission-denied') console.error("Admin sync error:", err);
              })
            );
            unsubscribeAdminDoc = () => adminUnsubs.forEach(unsub => unsub());
          }
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

