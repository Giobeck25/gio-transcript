import React, { useState } from 'react';
import { Sparkles, Building, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Plus, CheckCircle2, Globe, Cpu } from 'lucide-react';
import { Tenant, User } from '../types/index.js';
import { api } from '../services/api.js';

interface AuthGateProps {
  tenants: Tenant[];
  onAuthenticated: (tenant: Tenant, user: User, token: string) => void;
  onRefreshTenants: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ tenants, onAuthenticated, onRefreshTenants }) => {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.id || 'tenant-enterprise-1');
  const [email, setEmail] = useState('g.becchetti@pebbleassistant.com');
  const [password, setPassword] = useState('••••••••••••');
  
  // Registration Form State
  const [newOrgName, setNewOrgName] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newPlan, setNewPlan] = useState('Enterprise Tier');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: selectedTenantId, email }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Authentication failed');
      }
      onAuthenticated(data.tenant, data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in. Verify tenant selection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName || !newAdminName || !newAdminEmail) {
      setErrorMsg('Please complete all organization fields.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/register-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantName: newOrgName,
          adminName: newAdminName,
          adminEmail: newAdminEmail,
          plan: newPlan,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to provision tenant');
      }
      onRefreshTenants();
      onAuthenticated(data.tenant, data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register tenant.');
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
            Enterprise Cognitive OS • Multi-Tenant Partitioning
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setMode('signin')}
            className={`py-2 rounded-xl transition ${
              mode === 'signin' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Enterprise Sign In
          </button>
          <button
            onClick={() => setMode('register')}
            className={`py-2 rounded-xl transition ${
              mode === 'register' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Provision New Tenant
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Tab 1: Enterprise Sign In */}
        {mode === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-400" />
                Select Tenant Workspace
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.plan})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Zero-bleed isolation: Data is securely scoped to this tenant ID.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                Enterprise Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@enterprise.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                Password / Passkey
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              <span>{isLoading ? 'Verifying Tenant Security...' : 'Authorize & Open Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Tab 2: Provision New Tenant Organization */
          <form onSubmit={handleRegisterTenant} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Organization / Company Name</label>
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="e.g. Acme Global Logistics"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Admin Full Name</label>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="e.g. Gio Becchetti"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Tier</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="Enterprise Tier">Enterprise Tier</option>
                  <option value="Professional Tier">Professional Tier</option>
                  <option value="Dedicated VPC">Dedicated VPC</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Admin Email Address</label>
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@acmeglobal.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isLoading ? 'Creating Partition...' : 'Provision Dedicated Tenant'}</span>
            </button>
          </form>
        )}

        {/* Multi-Tenant Security Guarantee Badges */}
        <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Azure Cosmos Partitioning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>GPT-6 Astra Reasoning</span>
          </div>
        </div>
      </div>
    </div>
  );
};
