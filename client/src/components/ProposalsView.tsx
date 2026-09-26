import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Users,
  ThumbsUp,
  XCircle,
  Edit3,
  Trash2,
  CheckCircle2,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Proposal } from '../types/index.js';
import { api } from '../services/api.js';
import confetti from 'canvas-confetti';

interface ProposalsViewProps {
  proposals: Proposal[];
  onRefreshProposals: () => void;
  onRefreshEvents: () => void;
}

export const ProposalsView: React.FC<ProposalsViewProps> = ({ proposals, onRefreshProposals, onRefreshEvents }) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'declined'>('pending');
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);

  const handleApprove = async (id: string) => {
    try {
      await api.approveProposal(id);
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      onRefreshProposals();
      onRefreshEvents();
    } catch (err: any) {
      alert('Error approving proposal: ' + err.message);
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await api.declineProposal(id);
      onRefreshProposals();
    } catch (err: any) {
      alert('Error declining proposal: ' + err.message);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProposal) return;

    try {
      await api.editProposal(editingProposal.id, {
        title: editingProposal.title,
        startTime: editingProposal.startTime,
        durationMinutes: editingProposal.durationMinutes,
        location: editingProposal.location,
        targetCalendar: editingProposal.targetCalendar,
      });
      setEditingProposal(null);
      onRefreshProposals();
    } catch (err: any) {
      alert('Failed saving edits: ' + err.message);
    }
  };

  const filtered = proposals.filter((p) => {
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Tabs */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            AI Schedule Approval Inbox
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            OmniFlow’s human-in-the-loop commitment ledger. Review AI-synthesized scheduling proposals with explainable rationales before booking to Google, Outlook, or Local calendars.
          </p>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs self-start sm:self-auto">
          {(['pending', 'approved', 'declined', 'all'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg capitalize font-medium transition ${
                filterStatus === st ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st} ({proposals.filter((p) => (st === 'all' ? true : p.status === st)).length})
            </button>
          ))}
        </div>
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-12 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">No Proposals in "{filterStatus}"</p>
            <p className="text-xs text-slate-500 mt-1">All action items and commitments are processed.</p>
          </div>
        ) : (
          filtered.map((prop) => (
            <div
              key={prop.id}
              className={`rounded-2xl border p-5 md:p-6 transition shadow-xl space-y-4 ${
                prop.status === 'approved'
                  ? 'bg-emerald-950/20 border-emerald-800/40'
                  : prop.status === 'declined'
                  ? 'bg-slate-950/40 border-slate-800 opacity-60'
                  : 'bg-slate-900/90 border-purple-900/50 hover:border-purple-700/60'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                        prop.targetCalendar === 'google'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : prop.targetCalendar === 'outlook'
                          ? 'bg-sky-950 text-sky-400 border-sky-800'
                          : 'bg-indigo-950 text-indigo-400 border-indigo-800'
                      }`}
                    >
                      Target: {prop.targetCalendar}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                      Source: {prop.sourceType}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        prop.status === 'approved'
                          ? 'bg-emerald-950 text-emerald-300'
                          : prop.status === 'declined'
                          ? 'bg-rose-950 text-rose-300'
                          : 'bg-amber-950 text-amber-300'
                      }`}
                    >
                      {prop.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100">{prop.title}</h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {new Date(prop.startTime).toLocaleString()} ({prop.durationMinutes} min)
                      </span>
                    </p>
                    {prop.location && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{prop.location}</span>
                      </p>
                    )}
                    {prop.attendees && prop.attendees.length > 0 && (
                      <p className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{prop.attendees.join(', ')}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Status Action Buttons */}
                {prop.status === 'pending' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(prop.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Approve & Book</span>
                    </button>
                    <button
                      onClick={() => setEditingProposal(prop)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                      title="Edit & Reschedule"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDecline(prop.id)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-xs font-semibold border border-slate-700 transition"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Explainable AI Rationale & Coherent Scheduling Tip */}
              <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-3.5 space-y-1.5 text-xs">
                <p className="text-slate-300">
                  <strong className="text-indigo-400 font-semibold">Evidence & Rationale:</strong> {prop.rationale}
                </p>
                <p className="text-slate-400 italic">
                  💡 <strong className="text-slate-300 font-normal">Scheduling Tip:</strong> {prop.tip}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit & Reschedule Proposal Modal */}
      {editingProposal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">Edit & Reschedule Proposal</h3>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Proposal Title</label>
                <input
                  type="text"
                  value={editingProposal.title}
                  onChange={(e) => setEditingProposal({ ...editingProposal, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Target Calendar</label>
                <select
                  value={editingProposal.targetCalendar}
                  onChange={(e) => setEditingProposal({ ...editingProposal, targetCalendar: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="google">Google Calendar</option>
                  <option value="outlook">Microsoft Outlook</option>
                  <option value="local">Local Workspace</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Duration (Min)</label>
                <input
                  type="number"
                  value={editingProposal.durationMinutes}
                  onChange={(e) => setEditingProposal({ ...editingProposal, durationMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProposal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
