import React, { useState } from 'react';
import {
  Sparkles,
  Home,
  FileText,
  Users,
  Calendar,
  CheckCircle2,
  Workflow,
  MapPin,
  Clock,
  Layers,
  ChevronDown,
  Building,
  Shield,
  Smartphone,
  Menu,
  X,
  Bell,
  LogOut,
} from 'lucide-react';
import { Tenant, User, SyncStatus } from '../types/index.js';

interface ShellProps {
  currentTenant: Tenant | null;
  currentUser: User | null;
  tenants: Tenant[];
  onSwitchTenant: (tenantId: string) => void;
  onSignOut?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  syncStatus: SyncStatus | null;
  pendingProposalsCount: number;
  hasMeetingRadar?: boolean;
  radarMinutes?: number;
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({
  currentTenant,
  currentUser,
  tenants,
  onSwitchTenant,
  onSignOut,
  activeTab,
  setActiveTab,
  syncStatus,
  pendingProposalsCount,
  hasMeetingRadar,
  radarMinutes,
  children,
}) => {
  const [isTenantMenuOpen, setIsTenantMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home Brief', icon: Home, badge: hasMeetingRadar ? `${radarMinutes}m` : null, badgeColor: 'bg-blue-500' },
    { id: 'notes', label: 'Notes & Dictation', icon: FileText },
    { id: 'meetings', label: 'Live Diarization', icon: Users },
    { id: 'calendar', label: 'Calendar & Sync', icon: Calendar },
    { id: 'proposals', label: 'Schedule Approvals', icon: Sparkles, badge: pendingProposalsCount > 0 ? String(pendingProposalsCount) : null, badgeColor: 'bg-purple-500' },
    { id: 'canvas', label: 'Schema & Vision', icon: Workflow },
    { id: 'tasks', label: 'Tasks & Commitments', icon: CheckCircle2 },
    { id: 'geofences', label: 'GPS Reminders', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Enterprise Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-8 py-3 flex items-center justify-between">
        {/* Left: Brand & Tenant Switcher */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-600/30">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                OmniFlow AI
              </span>
              <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800">
                Enterprise OS
              </span>
            </div>
          </div>

          {/* Tenant Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsTenantMenuOpen(!isTenantMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition shadow-inner"
            >
              <Building className="w-3.5 h-3.5 text-indigo-400" />
              <span className="max-w-[130px] truncate">{currentTenant?.name || 'Pebble Global'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isTenantMenuOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1">Switch Tenant Workspace</p>
                {tenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSwitchTenant(t.id);
                      setIsTenantMenuOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition ${
                      currentTenant?.id === t.id ? 'bg-indigo-950 text-indigo-200 font-bold border border-indigo-800' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="truncate">{t.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{t.plan}</p>
                    </div>
                    {currentTenant?.id === t.id && <span className="w-2 h-2 rounded-full bg-indigo-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center/Right: Live Sync Status Indicators & User Profile */}
        <div className="flex items-center gap-3">
          {/* Sync status pill */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Google Cal</span>
            </div>
            <span className="text-slate-700">•</span>
            <div className="flex items-center gap-1.5 text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>Outlook</span>
            </div>
          </div>

          {/* Meeting Radar Badge */}
          {hasMeetingRadar && (
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950 text-blue-300 border border-blue-800 text-xs font-semibold animate-pulse"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Meeting in {radarMinutes}m</span>
            </button>
          )}

          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
              alt={currentUser?.name}
              className="w-8 h-8 rounded-full border border-indigo-400/50 object-cover"
            />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-100">{currentUser?.name || 'Gio Becchetti'}</p>
              <p className="text-[10px] text-slate-400 uppercase font-mono">{currentUser?.role || 'Admin'}</p>
            </div>
            {onSignOut && (
              <button
                onClick={onSignOut}
                title="Sign Out of Tenant"
                className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main App Layout: Sidebar + Content */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto p-4 md:p-6 gap-6">
        {/* Desktop Sidebar Navigation */}
        <aside className="w-64 flex-shrink-0 hidden md:flex flex-col space-y-2 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4 shadow-2xl h-[calc(100vh-100px)] sticky top-20">
          <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500 px-3 py-2">Workspace Navigation</p>
          <div className="space-y-1.5 flex-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Security / Architecture Badge */}
          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
              <Shield className="w-3.5 h-3.5" />
              <span>Multi-Tenant Zero Bleed</span>
            </div>
            <p className="text-slate-500 leading-tight">
              Cosmos DB & Azure OpenAI strictly partitioned by tenant ID.
            </p>
          </div>
        </aside>

        {/* Dynamic Main View */}
        <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
      </div>

      {/* Mobile Bottom Navigation Bar (Optimized for Phone UX with horizontal swipe / scroll) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/90 px-2 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
                isActive ? 'text-indigo-400 bg-indigo-950/50 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[9px] font-bold text-white bg-indigo-500">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] whitespace-nowrap">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
