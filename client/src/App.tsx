import React, { useState, useEffect } from 'react';
import { api } from './services/api.js';
import { Shell } from './components/Shell.js';
import { HomeBrief } from './components/HomeBrief.js';
import { NotesView } from './components/NotesView.js';
import { MeetingsView } from './components/MeetingsView.js';
import { CalendarView } from './components/CalendarView.js';
import { ProposalsView } from './components/ProposalsView.js';
import { CanvasView } from './components/CanvasView.js';
import { TasksView } from './components/TasksView.js';
import { GeofenceView } from './components/GeofenceView.js';
import { CompanionWidget } from './components/CompanionWidget.js';
import { AuthGate } from './components/AuthGate.js';
import { Tenant, User, Note, Meeting, Proposal, CalendarEvent, Task, CanvasSchema, Geofence, SyncStatus } from './types/index.js';
import { X, Copy, Download, FileText } from 'lucide-react';

export function App() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('omniflow_auth_token');
  });
  const [activeTab, setActiveTab] = useState<string>('home');

  // Workspace Data State
  const [briefData, setBriefData] = useState<any>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [canvases, setCanvases] = useState<CanvasSchema[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  // Document Modal Preview
  const [documentModal, setDocumentModal] = useState<{ open: boolean; title: string; markdown: string }>({
    open: false,
    title: '',
    markdown: '',
  });

  // Load Tenants & Initialize Session
  const loadTenantsList = async () => {
    try {
      const loadedTenants = await api.getTenants();
      setTenants(loadedTenants);
      return loadedTenants;
    } catch (err) {
      console.warn('Tenant load error:', err);
      return [];
    }
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        const loadedTenants = await loadTenantsList();
        if (loadedTenants.length > 0) {
          const savedTenantId = localStorage.getItem('omniflow_tenant_id');
          const activeTenant = loadedTenants.find((t) => t.id === savedTenantId) || loadedTenants[0];
          setCurrentTenant(activeTenant);

          const users = await api.getUsers(activeTenant.id);
          const savedUserId = localStorage.getItem('omniflow_user_id');
          const activeUser = users.find((u) => u.id === savedUserId) || users[0] || null;
          setCurrentUser(activeUser);

          if (activeUser) {
            api.setSession(activeTenant.id, activeUser.id);
          }
        }
      } catch (err) {
        console.warn('Init error, using fallbacks:', err);
      }
    };
    initApp();
  }, []);

  // Reload Workspace Data when Tenant/User changes
  const refreshAllData = async () => {
    try {
      const [
        loadedBrief,
        loadedNotes,
        loadedMeetings,
        loadedProposals,
        loadedEvents,
        loadedTasks,
        loadedCanvases,
        loadedGeofences,
        loadedSync,
      ] = await Promise.all([
        api.getBrief(),
        api.getNotes(),
        api.getMeetings(),
        api.getProposals(),
        api.getCalendarEvents(),
        api.getTasks(),
        api.getCanvases(),
        api.getGeofences(),
        api.getSyncStatus(),
      ]);

      setBriefData(loadedBrief);
      setNotes(loadedNotes);
      setMeetings(loadedMeetings);
      setProposals(loadedProposals);
      setCalendarEvents(loadedEvents);
      setTasks(loadedTasks);
      setCanvases(loadedCanvases);
      setGeofences(loadedGeofences);
      setSyncStatus(loadedSync);
    } catch (err) {
      console.warn('Failed refreshing workspace data:', err);
    }
  };

  useEffect(() => {
    if (currentTenant) {
      refreshAllData();
    }
  }, [currentTenant]);

  // Tenant Switch Handler (Strict zero-bleed multi-tenancy)
  const handleSwitchTenant = async (tenantId: string) => {
    const targetTenant = tenants.find((t) => t.id === tenantId);
    if (!targetTenant) return;
    const users = await api.getUsers(tenantId);
    const targetUser = users[0] || null;

    setCurrentTenant(targetTenant);
    setCurrentUser(targetUser);
    if (targetUser) {
      api.setSession(targetTenant.id, targetUser.id);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('omniflow_auth_token');
    localStorage.removeItem('omniflow_tenant_id');
    localStorage.removeItem('omniflow_user_id');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const handleApproveProposal = async (proposalId: string) => {
    await api.approveProposal(proposalId);
    refreshAllData();
  };

  const handleDeclineProposal = async (proposalId: string) => {
    await api.declineProposal(proposalId);
    refreshAllData();
  };

  const handleOpenDocumentModal = (title: string, markdown: string) => {
    setDocumentModal({ open: true, title, markdown });
  };

  // Enforce Multi-Tenant Authentication Gate before showing Dashboard
  if (!isAuthenticated || !currentTenant) {
    return (
      <AuthGate
        tenants={tenants}
        onAuthenticated={(tenant, user, token) => {
          localStorage.setItem('omniflow_auth_token', token);
          localStorage.setItem('omniflow_tenant_id', tenant.id);
          localStorage.setItem('omniflow_user_id', user.id);
          setCurrentTenant(tenant);
          setCurrentUser(user);
          setIsAuthenticated(true);
          api.setSession(tenant.id, user.id);
          refreshAllData();
        }}
        onRefreshTenants={loadTenantsList}
      />
    );
  }

  const radar = briefData?.brief?.preMeetingRadar;

  return (
    <Shell
      currentTenant={currentTenant}
      currentUser={currentUser}
      tenants={tenants}
      onSwitchTenant={handleSwitchTenant}
      onSignOut={handleSignOut}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      syncStatus={syncStatus}
      pendingProposalsCount={proposals.filter((p) => p.status === 'pending').length}
      hasMeetingRadar={!!radar}
      radarMinutes={radar?.minutesUntil}
    >
      {/* Dynamic Tab Router */}
      {activeTab === 'home' && (
        <HomeBrief
          briefData={briefData}
          proposals={proposals}
          calendarEvents={calendarEvents}
          tasks={tasks}
          onApproveProposal={handleApproveProposal}
          onDeclineProposal={handleDeclineProposal}
          onOpenDocumentModal={handleOpenDocumentModal}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === 'notes' && (
        <NotesView
          notes={notes}
          onRefreshNotes={refreshAllData}
          onOpenDocumentModal={handleOpenDocumentModal}
        />
      )}

      {activeTab === 'meetings' && (
        <MeetingsView
          meetings={meetings}
          onRefreshMeetings={refreshAllData}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === 'calendar' && (
        <CalendarView
          events={calendarEvents}
          syncStatus={syncStatus}
          onRefreshEvents={refreshAllData}
        />
      )}

      {activeTab === 'proposals' && (
        <ProposalsView
          proposals={proposals}
          onRefreshProposals={refreshAllData}
          onRefreshEvents={refreshAllData}
        />
      )}

      {activeTab === 'canvas' && (
        <CanvasView
          canvases={canvases}
          onRefreshCanvases={refreshAllData}
          onRefreshTasks={refreshAllData}
        />
      )}

      {activeTab === 'tasks' && (
        <TasksView
          tasks={tasks}
          onRefreshTasks={refreshAllData}
        />
      )}

      {activeTab === 'geofences' && (
        <GeofenceView
          geofences={geofences}
          onRefreshGeofences={refreshAllData}
          onRefreshTasks={refreshAllData}
        />
      )}

      {/* Global Interactive Animated Draggable Companion Widget */}
      <CompanionWidget
        onRefreshData={refreshAllData}
        activeView={activeTab}
        setActiveView={setActiveTab}
      />

      {/* Fullscreen Document Viewer & Exporter Modal */}
      {documentModal.open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-white">{documentModal.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(documentModal.markdown);
                    alert('Copied document markdown to clipboard!');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([documentModal.markdown], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${documentModal.title.replace(/\s+/g, '_')}.md`;
                    a.click();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .md</span>
                </button>
                <button
                  onClick={() => setDocumentModal({ open: false, title: '', markdown: '' })}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-6 overflow-y-auto flex-1 text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap bg-slate-950">
              {documentModal.markdown}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

export default App;
