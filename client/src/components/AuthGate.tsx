import React, { useState } from 'react';
import { Sparkles, Lock, Mail, ArrowRight, User as UserIcon, Plus, ShieldCheck } from 'lucide-react';
import { Tenant, User } from '../types/index.js';

interface AuthGateProps {
  tenants: Tenant[];
  onAuthenticated: (tenant: Tenant, user: User, token: string) => void;
  onRefreshTenants: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ tenants, onAuthenticated, onRefreshTenants }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Signup State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Email and password are required.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error(`Server returned ${res.status} ${res.statusText}. Please retry.`);
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please check your credentials.');
      }
      onAuthenticated(data.tenant, data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword || !confirmPassword) {
      setErrorMsg('Please complete all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          password: newPassword,
        }),
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error(`Server returned ${res.status} ${res.statusText}. Please retry.`);
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create account.');
      }
      onRefreshTenants();
      onAuthenticated(data.tenant, data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="relative z-10 max-w-lg w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-0.5 shadow-xl shadow-indigo-600/30 mb-2">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            OmniFlow AI
          </h1>
          <p className="text-xs text-slate-400">
            Intelligent Cognitive Workflow
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => { setMode('signin'); setErrorMsg(''); }}
            className={`py-2 rounded-xl transition ${
              mode === 'signin' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setErrorMsg(''); }}
            className={`py-2 rounded-xl transition ${
              mode === 'signup' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Tab 1: Sign In */}
        {mode === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              <span>{isLoading ? 'Verifying...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Tab 2: Sign Up */
          <form onSubmit={handleSignUp} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                Full Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                Email Address
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  Confirm
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition disabled:opacity-50 mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
            </button>
          </form>
        )}

        {/* Simple Security Badge */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Secured by OmniFlow AI</span>
        </div>
      </div>
    </div>
  );
};
