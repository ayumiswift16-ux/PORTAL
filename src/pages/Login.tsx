import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, CheckCircle2, UserCheck } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card, CardContent } from '@/src/components/ui/Card';
import toast from 'react-hot-toast';
import { User as UserType } from '../types';
import { cn } from '@/src/utils/cn';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showProfessorForm, setShowProfessorForm] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [userEnteredCode, setUserEnteredCode] = useState('');
  const [profData, setProfData] = useState({
    fullName: '',
    institute: 'ICS',
    username: '',
    password: '',
    email: ''
  });
  const navigate = useNavigate();

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profData.email) {
      toast.error("Please provide an email address.");
      return;
    }
    
    setLoading(true);
    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(code);
      
      // Call backend API to send the email
      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profData.email, code }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.message?.includes("not configured")) {
          toast.success("Verification code logged to server console (Credentials not set).", { duration: 6000 });
        } else {
          toast.success(`Verification code sent to ${profData.email}!`);
        }
        setIsVerifying(true);
      } else {
        const errorMsg = result.message || result.error || "Failed to send code";
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error("Email error:", error);
      toast.error(error.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfessorRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (userEnteredCode !== verificationCode) {
      toast.error('Invalid verification code.');
      return;
    }

    setLoading(true);
    try {
      const { collection, addDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      const { createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
      
      // 1. Create the Auth account immediately with portal email
      // This ensures they can login later with signInWithEmailAndPassword
      // Sanitize username to prevent invalid emails (remove spaces)
      const sanitizedUsername = profData.username.toLowerCase().replace(/\s+/g, '');
      const portalEmail = `${sanitizedUsername}@school.portal`;
      let uid = '';
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, portalEmail, profData.password);
        uid = userCredential.user.uid;
        // Sign out immediately as their request is still pending
        await signOut(auth);
      } catch (authError: any) {
        if (authError.code === 'auth/invalid-email') {
          toast.error("Invalid username format for portal access.");
          throw authError;
        }
        // If user already exists, it's fine, maybe they are resubmitting
        if (authError.code === 'auth/email-already-in-use') {
          // This is tricky if we don't have the UID. But we'll try to handle it in approval if UID is missing.
        } else {
          throw authError;
        }
      }

      await addDoc(collection(db, 'teacher_requests'), {
        ...profData,
        username: sanitizedUsername, // Use sanitized username
        uid: uid || null,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      
      toast.success('Request submitted! Please wait for admin approval.');
      setShowProfessorForm(false);
      setProfData({
        fullName: '',
        institute: 'ICS',
        username: '',
        password: '',
        email: ''
      });
    } catch (error) {
      console.error("Error submitting professor request:", error);
      toast.error('Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Logged in successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Sign in cancelled.');
      } else {
        console.error("Google login error:", error);
        toast.error('Failed to sign in with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const sanitizedInput = username.toLowerCase().replace(/\s+/g, '');
      // Map Admin1-Admin5 to their secure email accounts
      if (sanitizedInput.match(/^admin[1-5]$/)) {
        const email = `${sanitizedInput}@school.portal`;
        await signInWithEmailAndPassword(auth, email, password);
        toast.success(`Welcome back, ${username}!`);
        navigate('/dashboard');
      } else {
        const email = `${sanitizedInput}@school.portal`;
        try {
          // Try to sign in directly first - this avoids the unauthorized Firestore query
          await signInWithEmailAndPassword(auth, email, password);
          
          // If successful, now we can fetch the user doc because we are authenticated
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          
          // First try by username as ID
          let userDoc = await getDoc(doc(db, 'users', sanitizedInput));
          
          // If not found, try by Auth UID
          if (!userDoc.exists()) {
             userDoc = await getDoc(doc(db, 'users', auth.currentUser?.uid || ''));
          }

          if (userDoc.exists()) {
            const userData = userDoc.data();
            toast.success(`Welcome back, Professor ${userData.fullName || userData.name}!`);
            navigate('/dashboard');
          } else {
            // Document missing but Auth exists? This shouldn't happen but log it
            console.warn("User authenticated but profile missing in Firestore.");
            toast.success("Welcome back!");
            navigate('/dashboard');
          }
        } catch (authError: any) {
          console.error("Auth error:", authError);
          if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential' || authError.code === 'auth/invalid-email') {
             toast.error("Invalid credentials or account not found.");
          } else {
             toast.error("Login failed. Please check your credentials.");
          }
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('Admin login is not yet configured. Please enable Email/Password in Firebase Console.');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        toast.error('Invalid credentials. Please check your username and password.');
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden font-sans bg-[#051410]">
      {/* Background Image with Opacity */}
      <img 
        src={`${import.meta.env.BASE_URL}school-bg.jpg`}
        alt="School Campus"
        className="fixed inset-0 w-full h-full object-cover z-0 opacity-40 blur-[1px]"
        referrerPolicy="no-referrer"
      />
      {/* Overlay for Contrast */}
      <div className="fixed inset-0 z-0 bg-[#051410]/70 lg:bg-[#051410]/60" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-6">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="mb-3 relative group"
          >
            <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
            <img 
              src={`${import.meta.env.BASE_URL}cdm-logo.png`} 
              alt="Colegio de Montalban Logo" 
              className="h-24 w-24 object-contain relative z-10 transform transition-transform group-hover:rotate-12 duration-500"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <h1 className="text-3xl font-black text-white tracking-tight text-center drop-shadow-md italic uppercase">CdM Portal</h1>
          <p className="text-white font-black text-[9px] uppercase tracking-[0.4em] mt-1 opacity-40">Student Enrollment System</p>
        </div>

        <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-[#0a2018]/40 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden border border-white/5">
          <CardContent className="p-10">
            {showProfessorForm ? (
              isVerifying ? (
                <form onSubmit={handleProfessorRequest} className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="h-16 w-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                      <ShieldCheck className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-black text-white italic uppercase">Verify Email</h2>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">
                      Enter the 6-digit code sent to<br />
                      <span className="text-white font-black">{profData.email}</span>
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="relative group">
                      <input
                        type="text"
                        maxLength={6}
                        value={userEnteredCode}
                        onChange={(e) => setUserEnteredCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full h-14 text-center tracking-[1em] text-2xl font-black rounded-2xl border border-white/5 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all text-white bg-white/5 placeholder:text-white/10"
                        placeholder="000000"
                        required
                      />
                    </div>
                    <p className="text-[9px] text-white/30 text-center uppercase tracking-widest font-bold">
                      Didn't receive the code? 
                      <button 
                        type="button" 
                        onClick={handleSendVerification}
                        className="ml-1 text-emerald-400 hover:underline"
                      >
                        Resend
                      </button>
                    </p>
                  </div>

                  <div className="pt-4 space-y-3">
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-[0_10px_30px_rgba(16,185,129,0.2)]"
                      isLoading={loading}
                    >
                      Confirm & Create Account
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsVerifying(false)}
                      className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] text-white/40 hover:text-white"
                    >
                      Change Email
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSendVerification} className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-black text-white italic uppercase">Professor Access</h2>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mt-1">Fill out the request form below</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Full Name</label>
                    <input
                      type="text"
                      value={profData.fullName}
                      onChange={(e) => setProfData({...profData, fullName: e.target.value})}
                      placeholder="Enter full name"
                      className="w-full h-11 pl-4 pr-4 rounded-xl border border-white/5 outline-none focus:border-emerald-500/50 text-sm text-white bg-white/5 font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Institute</label>
                    <select
                      value={profData.institute}
                      onChange={(e) => setProfData({...profData, institute: e.target.value as any})}
                      className="w-full h-11 pl-4 pr-4 rounded-xl border border-white/5 outline-none focus:border-emerald-500/50 text-sm text-white bg-[#0a2018] font-bold"
                      required
                    >
                      <option value="ICS">ICS</option>
                      <option value="IBE">IBE</option>
                      <option value="ITE">ITE</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Gmail</label>
                    <input
                      type="email"
                      value={profData.email}
                      onChange={(e) => setProfData({...profData, email: e.target.value})}
                      placeholder="Enter gmail"
                      className="w-full h-11 pl-4 pr-4 rounded-xl border border-white/5 outline-none focus:border-emerald-500/50 text-sm text-white bg-white/5 font-bold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Username</label>
                      <input
                        type="text"
                        value={profData.username}
                        onChange={(e) => setProfData({...profData, username: e.target.value})}
                        placeholder="Username"
                        className="w-full h-11 pl-4 pr-4 rounded-xl border border-white/5 outline-none focus:border-emerald-500/50 text-sm text-white bg-white/5 font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Password</label>
                      <input
                        type="password"
                        value={profData.password}
                        onChange={(e) => setProfData({...profData, password: e.target.value})}
                        placeholder="Password"
                        className="w-full h-11 pl-4 pr-4 rounded-xl border border-white/5 outline-none focus:border-emerald-500/50 text-sm text-white bg-white/5 font-bold"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-[0_10px_30px_rgba(16,185,129,0.2)]"
                    isLoading={loading}
                  >
                    Send Verification Code
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowProfessorForm(false)}
                    className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] text-white/40 hover:text-white"
                  >
                    Back to Login
                  </Button>
                </div>
              </form>
            )) : (
              <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-1">Registrar ID</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-emerald-400 transition-colors" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full h-12 pl-12 pr-4 rounded-2xl border border-white/5 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm text-white bg-white/5 placeholder:text-white/10 font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-1">Security Key</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-emerald-400 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full h-12 pl-12 pr-12 rounded-2xl border border-white/5 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm text-white bg-white/5 placeholder:text-white/10 font-bold"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-emerald-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 border-white/5 rounded-lg bg-white/5 text-emerald-500 focus:ring-emerald-500/20" />
                  <span className="text-[10px] text-emerald-500/30 font-bold uppercase tracking-widest group-hover:text-emerald-500/50 transition-colors">Remember</span>
                </label>
                <button type="button" className="text-[10px] text-emerald-400 font-black uppercase tracking-widest hover:text-emerald-300 transition-colors">
                  Recovery
                </button>
              </div>

              <Button
                type="submit"
                className={cn(
                  "w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all",
                  loading && "opacity-80"
                )}
                isLoading={loading}
              >
                Enter Portal
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5"></div>
                </div>
                <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-black">
                  <span className="bg-transparent px-4 text-white/20">Student Access</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] border border-white/5 hover:bg-white/5 bg-transparent text-white transition-all active:scale-[0.98]"
                disabled={loading}
              >
                <div className="flex items-center justify-center gap-3">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Google Account</span>
                </div>
              </Button>
              
              <div className="flex flex-col items-center gap-6 pt-6">
                <div className="w-full pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Office Access</p>
                      <p className="text-[9px] font-bold text-white/40 mt-1 uppercase tracking-tighter">Registrar [1-5]</p>
                    </div>
                    <div className="text-center border-l border-white/5">
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Enrollment</p>
                      <p className="text-[9px] font-bold text-white/40 mt-1 uppercase tracking-tighter">Verified OAuth</p>
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-white/10 font-black uppercase tracking-[0.4em]">
                  CDMES v2.0 • Security Optimized
                </p>
                <button
                  type="button"
                  onClick={() => setShowProfessorForm(true)}
                  className="text-[10px] text-emerald-500/50 hover:text-emerald-500 font-black uppercase tracking-widest transition-colors mt-2"
                >
                  Create Professor Account
                </button>
              </div>
            </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
