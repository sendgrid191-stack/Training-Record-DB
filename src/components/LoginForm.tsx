/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, LogIn, Lock, Sparkles } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { seedDatabaseIfNeeded } from '../db/storage';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        // Seed default training database elements in Firebase if it is empty
        await seedDatabaseIfNeeded();
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('[Google Auth Error]:', err);
      let errorMsg = 'Failed to authenticate via Google. ';
      if (err?.code === 'auth/popup-blocked') {
        errorMsg += 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
      } else {
        errorMsg += err?.message || 'Please check your connection and try again.';
      }
      setError(errorMsg);
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
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {/* Visual Brand Header Banner */}
        <div className="bg-slate-900 px-6 py-8 text-center relative overflow-hidden flex flex-col items-center">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 opacity-90" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center border border-indigo-500/20 mb-3 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">Admin Security Portal</h3>
            <p className="text-slate-450 text-[11px] mt-1.5 max-w-xs mx-auto leading-relaxed">
              Authenticate using Google to connect to the TrainLogic cloud database.
            </p>
          </div>
        </div>

        {/* Form area */}
        <div className="p-6 space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 text-red-650 border border-red-250 text-xs px-3.5 py-2.5 rounded-lg font-semibold leading-relaxed"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-850 active:bg-slate-950 text-white font-bold text-xs py-3 px-4 rounded-lg shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 transition-colors border border-slate-800"
              id="google-login-btn"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.12a7.11 7.11 0 010-4.24V7.04H2.18a11.952 11.952 0 000 9.92l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Sign in with Google Account
                </>
              )}
            </button>
          </div>

          {/* Secure Workspace Admin Configuration Helper Indicator */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg flex items-start gap-2.5 text-[10px] text-slate-500 leading-relaxed font-medium">
            <div className="mt-0.5 bg-indigo-50 text-indigo-600 p-1 rounded">
              <Sparkles className="w-3 h-3" />
            </div>
            <div>
              <p className="font-bold text-slate-700">Database Access Admin Identity</p>
              <p className="mt-0.5">
                Authorized cloud configuration designated for: <span className="font-bold font-mono text-indigo-600 break-all">ullahikram307@gmail.com</span>.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
