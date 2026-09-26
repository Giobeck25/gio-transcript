import React, { useState } from 'react';
import {
  Sun,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  UserCheck,
  AlertCircle,
  FileText,
  MapPin,
  ChevronRight,
  ShieldCheck,
  ThumbsUp,
  XCircle,
  Bot,
  Zap,
} from 'lucide-react';
import { Proposal, CalendarEvent, Task } from '../types/index.js';
import { api } from '../services/api.js';

interface HomeBriefProps {
  briefData: any;
  proposals: Proposal[];
  calendarEvents: CalendarEvent[];
  tasks: Task[];
  onApproveProposal: (proposalId: string) => void;
  onDeclineProposal: (proposalId: string) => void;
  onOpenDocumentModal: (title: string, markdown: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const HomeBrief: React.FC<HomeBriefProps> = ({
  briefData,
  proposals,
  calendarEvents,
  tasks,
  onApproveProposal,
  onDeclineProposal,
  onOpenDocumentModal,
  onNavigateTab,
}) => {
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const brief = briefData?.brief || {};
  const weather = briefData?.weather || { location: 'Sydney, NSW', temperature: 22, condition: 'Sunny' };
  const radar = brief?.preMeetingRadar;

  // Local Time-Aware Greeting
  const getClientTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Late night focus';
  };

  const currentGreeting = getClientTimeGreeting();

  // Dynamic Situational Advice
  const getSituationalTips = () => {
    const tips: string[] = [];
    const urgentTasks = tasks.filter((t) => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed');
    if (urgentTasks.length > 0) {
      tips.push(`High Priority: "${urgentTasks[0].title}" requires action today.`);
    }
    if (pendingProposals.length > 0) {
      tips.push(`${pendingProposals.length} calendar block(s) waiting for human approval in the Commitment Ledger.`);
    }
    if (calendarEvents.length > 0) {
      const nextEvt = calendarEvents[0];
      tips.push(`Upcoming event: "${nextEvt.title}" at ${new Date(nextEvt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
    } else {
      tips.push(`Calendar clear for deep work blocks.`);
    }
    const hour = new Date().getHours();
    if (hour >= 17) {
      tips.push(`Evening wrap-up: Review completed subtasks and confirm tomorrow's commitments.`);
    } else if (hour >= 12) {
      tips.push(`Midday pace: Protect a 30-min focus buffer prior to afternoon syncs.`);
    }
    return tips;
  };

  const handleGenerateRadarBrief = async () => {
    if (!radar) return;
    setIsGeneratingBrief(true);
    try {
      const markdown = await api.generatePreMeetingBrief(radar.meetingTitle, radar.attendees);
      onOpenDocumentModal(`Pre-Meeting Executive Brief: ${radar.meetingTitle}`, markdown);
    } catch (err: any) {
      alert('Failed generating brief: ' + err.message);
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  const pendingProposals = proposals.filter((p) => p.status === 'pending');
  const todayTasks = tasks.slice(0, 3);
  const upcomingEvents = calendarEvents.slice(0, 4);
  const activeTips = aiSuggestions.length > 0 ? aiSuggestions : getSituationalTips();

  return (
    <div className="space-y-6">
      {/* 🌅 Time-Aware Executive Brief Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-purple-950/50 border border-indigo-900/40 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>OmniFlow Executive Briefing • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {currentGreeting}, Gio
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-xl">
              Today is <strong className="text-slate-200">{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())}</strong>. You have{' '}
              <span className="text-indigo-400 font-semibold">{upcomingEvents.length} events scheduled</span>,{' '}
              <span className="text-amber-400 font-semibold">{tasks.filter(t => t.status !== 'completed').length} active tasks</span>, and{' '}
              <span className="text-purple-400 font-semibold">{pendingProposals.length} schedule proposals</span> awaiting review.
            </p>
          </div>

          {/* Live Weather Card */}
          <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl px-5 py-3.5 backdrop-blur-md self-start md:self-auto">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sun className="w-7 h-7 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{weather.temperature}°C</span>
                <span className="text-xs text-amber-300 font-medium">{weather.condition}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span>{weather.location} (Phone GPS)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total Notes</p>
            <p className="text-xl font-bold text-slate-100 mt-0.5">{brief.totalNotes || 3}</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Active Tasks</p>
            <p className="text-xl font-bold text-amber-400 mt-0.5">{brief.activeTasks || 2}</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Calendar Feeds</p>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">3 Active</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Pending Approvals</p>
            <p className="text-xl font-bold text-purple-400 mt-0.5">{pendingProposals.length}</p>
          </div>
        </div>

        {/* 🧠 Dynamic Cognitive Suggestions & Proactive Tips */}
        {activeTips.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 bg-slate-950/40 rounded-2xl p-4 border border-indigo-900/30">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Astra AI Proactive Radar & Situational Tips
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Real-Time Context</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {activeTips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-300">
                  <span className="text-amber-400 text-sm">💡</span>
                  <span className="leading-relaxed">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ⚡ PRE-MEETING CONTEXT RADAR (e.g. Byron Meeting in 20 Min) */}
      {radar && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-2 border-blue-500/50 p-5 md:p-6 shadow-xl relative overflow-hidden animate-pulse-slow">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/40">
                <Clock className="w-3.5 h-3.5 text-blue-300 animate-spin" />
                <span>MEETING IN {radar.minutesUntil} MINUTES</span>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                {radar.meetingTitle}
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                <span className="font-semibold text-blue-300">Cognitive Radar:</span> {radar.contextSnippet}
              </p>
              <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                <span>👥 Attendees: {radar.attendees.join(', ')}</span>
                <span>📑 {radar.relevantNotesCount} linked notes</span>
                <span>✅ {radar.relevantTasksCount} open action items</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 flex-shrink-0">
              <button
                onClick={handleGenerateRadarBrief}
                disabled={isGeneratingBrief}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>{isGeneratingBrief ? 'Synthesizing...' : '1-Click Prep Brief'}</span>
              </button>
              <button
                onClick={() => onNavigateTab('calendar')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center transition"
              >
                <span>View on Calendar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📋 PROACTIVE SCHEDULE PROPOSALS (Human-in-the-Loop Review) */}
      {pendingProposals.length > 0 && (
        <div className="rounded-2xl bg-slate-900/80 border border-purple-900/40 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  Proactive Schedule Proposals
                  <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-[10px]">
                    {pendingProposals.length} pending
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Extracted by AI from notes & meetings — review and approve before booking</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('proposals')}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingProposals.map((prop) => (
              <div
                key={prop.id}
                className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-3 hover:border-purple-800/60 transition group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/50">
                      Destination: {prop.targetCalendar.toUpperCase()}
                    </span>
                    <h4 className="font-semibold text-sm text-slate-200 mt-1.5">{prop.title}</h4>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(prop.startTime).toLocaleString()} ({prop.durationMinutes} min)
                    </p>
                  </div>
                </div>

                {/* AI Rationale & Coherent Scheduling Tip */}
                <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800/80 text-[11px] space-y-1">
                  <p className="text-slate-300">
                    <strong className="text-indigo-300">Why book this:</strong> {prop.rationale}
                  </p>
                  <p className="text-slate-400 italic">
                    💡 <strong className="text-slate-300 font-normal">Tip:</strong> {prop.tip}
                  </p>
                </div>

                {/* Approval Action Controls */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => onApproveProposal(prop.id)}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Approve & Book</span>
                  </button>
                  <button
                    onClick={() => onDeclineProposal(prop.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 text-xs font-medium border border-slate-700 transition"
                  >
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🎯 DAY AT A GLANCE: Calendar & Tasks Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar Feed Card */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-100">Today's Agenda & Feeds</h3>
            </div>
            <button
              onClick={() => onNavigateTab('calendar')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              <span>Full Calendar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {upcomingEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: evt.color || '#3b82f6' }}
                  />
                  <div>
                    <h4 className="font-semibold text-xs text-slate-200">{evt.title}</h4>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(evt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {evt.location && ` • ${evt.location}`}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    evt.provider === 'google'
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                      : evt.provider === 'outlook'
                      ? 'bg-sky-950/60 text-sky-400 border-sky-800'
                      : 'bg-indigo-950/60 text-indigo-400 border-indigo-800'
                  }`}
                >
                  {evt.provider.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Tasks Card */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-100">Top Priority Tasks & Tips</h3>
            </div>
            <button
              onClick={() => onNavigateTab('tasks')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
            >
              <span>All Tasks</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {todayTasks.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-slate-200">{t.title}</h4>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      t.priority === 'urgent'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{t.description}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-900">
                  <span>Subtasks: {t.subtasks.filter((s) => s.completed).length} / {t.subtasks.length}</span>
                  <span className="text-indigo-400 font-medium">Due: {t.dueDate || 'Today'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
