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

interface LoginProps {
  onLogin: (user: UserType) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulated login delay
    setTimeout(() => {
      let userData: UserType | null = null;

      if (username === 'admin' && password === 'admin123') {
        userData = { username: 'admin', name: 'Administrator', role: 'admin' };
      } else if (username === 'student' && password === 'student123') {
        userData = { username: 'student', name: 'Sample Student', role: 'student' };
      }

      if (userData) {
        localStorage.setItem('cdm_user', JSON.stringify(userData));
        onLogin(userData);
        toast.success(`Welcome back, ${userData.name}!`);
        navigate('/dashboard');
      } else {
        toast.error('Invalid credentials. Please try again.');
      }
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#8fb09f] p-4 overflow-hidden font-sans">
      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-6">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="mb-1"
          >
            <img 
              src="cdm-logo.png" 
              alt="Colegio de Montalban Logo" 
              className="h-20 w-20 object-contain"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <h1 className="text-3xl font-bold text-white tracking-tight text-center drop-shadow-sm">Colegio de Montalban</h1>
          <p className="text-white/90 text-xs font-semibold tracking-wide mt-0.5">Student Enrollment Portal</p>
        </div>

        <Card className="border-none shadow-2xl bg-[#e3eae6] rounded-2xl overflow-hidden">
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 px-1">Username</label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="w-full py-2.5 pl-9 pr-4 rounded-lg border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-700 bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 px-1">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full py-2.5 pl-9 pr-10 rounded-lg border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm text-slate-700 bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-3.5 h-3.5 border-slate-300 rounded text-blue-600 focus:ring-blue-500" />
                  <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">Remember me</span>
                </label>
                <button type="button" className="text-xs text-blue-600 font-bold hover:underline">
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                className={cn(
                  "w-full h-11 rounded-lg font-bold bg-[#1e60ff] hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20",
                  loading && "opacity-80"
                )}
                isLoading={loading}
              >
                Sign In to Portal
              </Button>
              
              <div className="flex flex-col items-center gap-4 pt-4">
                <div className="bg-white/50 rounded-lg p-3 border border-slate-200 w-full">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Demo Accounts</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center font-sans">
                      <p className="text-[10px] font-bold text-slate-700">Admin</p>
                      <p className="text-[9px] text-slate-500">admin / admin123</p>
                    </div>
                    <div className="text-center font-sans border-l border-slate-200">
                      <p className="text-[10px] font-bold text-slate-700">Student</p>
                      <p className="text-[9px] text-slate-500">student / student123</p>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  CDMES v2.0 • Authorized Personnel Only
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
