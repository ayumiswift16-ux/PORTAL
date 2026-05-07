import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { GraduationCap, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card, CardContent } from '@/src/components/ui/Card';
import toast from 'react-hot-toast';
import { BackgroundBlobs } from '@/src/components/layout/BackgroundBlobs';
import { User as UserType } from '../types';

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
      if (username === 'admin' && password === 'admin123') {
        const userData: UserType = { username: 'admin', name: 'Administrator', role: 'admin' };
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
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <BackgroundBlobs />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/30 mb-4"
          >
            <GraduationCap className="h-10 w-10" />
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Collegio de Montalban</h1>
          <p className="text-slate-500 font-medium">Student Enrollment Portal</p>
        </div>

        <Card glass className="border-none shadow-2xl">
          <CardContent className="pt-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3.5 top-[42px] -translate-y-1/2 h-5 w-5 text-slate-400 z-10" />
                  <Input
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="pl-11"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-[42px] -translate-y-1/2 h-5 w-5 text-slate-400 z-10" />
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-11 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-[42px] -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-slate-500 group-hover:text-slate-700">Remember me</span>
                </label>
                <button type="button" className="text-sm text-blue-600 font-semibold hover:underline">
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={loading}
              >
                Sign In to Portal
              </Button>
              
              <div className="text-center pt-2">
                <p className="text-xs text-slate-400">
                  CDMES v2.0 • Authorized Personnel Only
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
