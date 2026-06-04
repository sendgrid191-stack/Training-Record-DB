/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, LogIn, Lock, User, Eye, EyeOff } from 'lucide-react';
import { auth } from '../firebase';
import { signInAnonymously } from 'firebase/auth';
import { seedDatabaseIfNeeded } from '../db/storage';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const cleanUser = username.trim();
    let assignedRole: 'admin' | 'manager' | null = null;

    if (cleanUser === 'Admin' && password === 'Ideatrg@3305') {
      assignedRole = 'admin';
    } else if (cleanUser === 'amhrd' && password === 'amhrd@2026') {
      assignedRole = 'manager';
    }

    if (!assignedRole) {
      setError('Invalid username or password. Please verify your portal credentials.');
      setIsLoading(false);
      return;
    }

    try {
      // Seed database if empty so there is rich content instantly
      await seedDatabaseIfNeeded();
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userRole', assignedRole);
      onLoginSuccess();
    } catch (err: any) {
      console.error('[Database Seed Error]:', err);
      // Even if seed fails due to some transient error, allow entering and show status
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userRole', assignedRole);
      onLoginSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto" id="login-container">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden"
      >
        {/* Visual Brand Header Banner */}
        <div className="bg-slate-950 px-6 py-8 text-center relative overflow-hidden flex flex-col items-center">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 opacity-90" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20 mb-3 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-white tracking-tight">TrainLogic Portal</h3>
            <p className="text-slate-400 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
              Sign in with your credentials to access and manage training records.
            </p>
          </div>
        </div>

        {/* Form area */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 text-red-750 border border-red-200 text-xs px-3.5 py-2.5 rounded-xl font-medium leading-relaxed"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 transition-colors"
                  id="login-username-input"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 transition-colors"
                  id="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs py-3 px-4 rounded-xl shadow-md shadow-indigo-150 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            id="admin-form-login-btn"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
