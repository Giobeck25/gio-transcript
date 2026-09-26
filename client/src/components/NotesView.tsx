import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  PenTool,
  Sparkles,
  FileText,
  CheckCircle2,
  Trash2,
  Plus,
  RefreshCw,
  Copy,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Note, ActionStep } from '../types/index.js';
import { api } from '../services/api.js';

interface NotesViewProps {
  notes: Note[];
  onRefreshNotes: () => void;
  onOpenDocumentModal: (title: string, markdown: string) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({ notes, onRefreshNotes, onOpenDocumentModal }) => {
  const [selectedNote, setSelectedNote] = useState<Note | null>(notes[0] || null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<'text' | 'voice'>('text');
  const [newTags, setNewTags] = useState('Enterprise, Roadmap');
  
  // Voice Recording Simulation State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activePlanTab, setActivePlanTab] = useState<'overview' | 'steps' | 'bullets' | 'tips' | 'document'>('overview');

  useEffect(() => {
    if (notes.length > 0 && !selectedNote) {
      setSelectedNote(notes[0]);
    } else if (selectedNote) {
      const refreshed = notes.find((n) => n.id === selectedNote.id);
      if (refreshed) setSelectedNote(refreshed);
    }
  }, [notes]);

  // Voice recording timer
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartVoiceRecording = () => {
    setIsCreating(true);
    setNewType('voice');
    setNewTitle('Voice Dictation Note ' + new Date().toLocaleTimeString());
    setIsRecording(true);
  };

  const handleStopVoiceRecording = () => {
    setIsRecording(false);
    // Simulated speech-to-text transcription result
    const sampleVoiceTranscript = `Voice recording captured: Need to finalize the Byron SLA proposal document by Thursday morning. Also remember to check in with Maya regarding Google Calendar webhook listeners and setup a geofence trigger at Central Supermarket to buy organic coffee beans and oat milk.`;
    setNewContent((prev) => (prev ? prev + '\n' + sampleVoiceTranscript : sampleVoiceTranscript));
  };

  const handleSaveNote = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      alert('Please provide a title and content for the note.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const tagsArray = newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const note = await api.createNote({
        title: newTitle,
        content: newContent,
        type: newType,
        tags: tagsArray,
      });

      setIsCreating(false);
      setNewTitle('');
      setNewContent('');
      onRefreshNotes();
      setSelectedNote(note);
    } catch (err: any) {
      alert('Error creating note: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRegeneratePlan = async (noteId: string) => {
    setIsAnalyzing(true);
    try {
      const updated = await api.regeneratePlan(noteId);
      setSelectedNote(updated);
      onRefreshNotes();
    } catch (err: any) {
      alert('Failed regenerating plan: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    await api.deleteNote(noteId);
    onRefreshNotes();
    setSelectedNote(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[700px]">
      {/* Left Column: Notes List & Controls */}
      <div className="lg:col-span-4 flex flex-col space-y-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Notes & Dictations
            </h2>
            <p className="text-[11px] text-slate-400">Typing or speech with AI Action Plans</p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                setIsCreating(true);
                setNewType('text');
                setNewTitle('');
                setNewContent('');
              }}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition"
              title="New Text Note"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={handleStartVoiceRecording}
              className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition"
              title="Dictate with Voice"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Note Item Cards */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {notes.map((n) => {
            const isSelected = selectedNote?.id === n.id;
            return (
              <div
                key={n.id}
                onClick={() => {
                  setSelectedNote(n);
                  setIsCreating(false);
                }}
                className={`p-3.5 rounded-xl cursor-pointer transition border text-left ${
                  isSelected
                    ? 'bg-indigo-950/60 border-indigo-500/60 shadow-md shadow-indigo-950'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 uppercase">
                    {n.type}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-semibold text-xs text-slate-200 mt-1.5 line-clamp-1">{n.title}</h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{n.content}</p>
                {n.actionablePlan && (
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-400 font-medium">
                    <Sparkles className="w-3 h-3" />
                    <span>Action Plan Ready ({n.actionablePlan.actionSteps.length} steps)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Note Editor or Selected Note Actionable Plan */}
      <div className="lg:col-span-8 flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        {isCreating ? (
          /* Creating Note Form */
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                {newType === 'voice' ? <Mic className="w-5 h-5 text-rose-400" /> : <PenTool className="w-5 h-5 text-indigo-400" />}
                {newType === 'voice' ? 'Live Voice Dictation Note' : 'Create Written Note'}
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>

            {/* Voice Dictation Active State */}
            {newType === 'voice' && (
              <div className="rounded-xl bg-slate-950 p-4 border border-rose-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-slate-600'}`} />
                  <div>
                    <p className="text-xs font-bold text-white">
                      {isRecording ? `Recording Audio... (${recordingSeconds}s)` : 'Audio Paused'}
                    </p>
                    <p className="text-[11px] text-slate-400">Speak clearly; AI will transcribe and create actionable plan.</p>
                  </div>
                </div>
                {isRecording ? (
                  <button
                    onClick={handleStopVoiceRecording}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition"
                  >
                    <MicOff className="w-4 h-4" /> Stop & Transcribe
                  </button>
                ) : (
                  <button
                    onClick={() => setIsRecording(true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition"
                  >
                    <Mic className="w-4 h-4" /> Resume Dictation
                  </button>
                )}
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Note Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Enterprise SLA Terms & Project Checklist"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex-1 flex flex-col">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Content / Transcript</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write your note or inspect transcribed dictation..."
                rows={10}
                className="w-full flex-1 bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Tags (Comma-separated)</label>
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="Roadmap, Byron, Client, SLA"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={isAnalyzing}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isAnalyzing ? 'Extracting Action Plan...' : 'Save & Generate Action Plan'}</span>
              </button>
            </div>
          </div>
        ) : selectedNote ? (
          /* Selected Note Detailed View & AI Actionable Plan */
          <div className="space-y-5 flex-1 flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 uppercase">
                  {selectedNote.type} note
                </span>
                <h2 className="text-xl font-bold text-white mt-1">{selectedNote.title}</h2>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                  <span>Created: {new Date(selectedNote.createdAt).toLocaleString()}</span>
                  <div className="flex gap-1">
                    {selectedNote.tags.map((t, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRegeneratePlan(selectedNote.id)}
                  disabled={isAnalyzing}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
                  title="Re-run AI Analysis"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>Re-analyze</span>
                </button>
                <button
                  onClick={() => handleDeleteNote(selectedNote.id)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 transition"
                  title="Delete Note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Raw Note Content Preview (Collapsible/Scrollable) */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-300 font-mono max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {selectedNote.content}
            </div>

            {/* AI Actionable Plan Core Section */}
            {selectedNote.actionablePlan ? (
              <div className="flex-1 flex flex-col rounded-2xl bg-gradient-to-b from-indigo-950/30 to-slate-950/40 border border-indigo-900/40 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-900/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span className="font-bold text-xs text-slate-100 uppercase tracking-wider">
                      Cognitive Actionable Plan
                    </span>
                  </div>

                  {/* Plan Tabs */}
                  <div className="flex gap-1 text-[11px]">
                    <button
                      onClick={() => setActivePlanTab('overview')}
                      className={`px-2.5 py-1 rounded-lg transition font-medium ${
                        activePlanTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setActivePlanTab('steps')}
                      className={`px-2.5 py-1 rounded-lg transition font-medium ${
                        activePlanTab === 'steps' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Action Steps ({selectedNote.actionablePlan.actionSteps.length})
                    </button>
                    <button
                      onClick={() => setActivePlanTab('bullets')}
                      className={`px-2.5 py-1 rounded-lg transition font-medium ${
                        activePlanTab === 'bullets' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Key Takeaways
                    </button>
                    <button
                      onClick={() => setActivePlanTab('tips')}
                      className={`px-2.5 py-1 rounded-lg transition font-medium ${
                        activePlanTab === 'tips' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Smart Tips
                    </button>
                    {selectedNote.actionablePlan.generatedDocument && (
                      <button
                        onClick={() => setActivePlanTab('document')}
                        className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                          activePlanTab === 'document' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-purple-200'
                        }`}
                      >
                        <FileText className="w-3 h-3" />
                        Executive Doc
                      </button>
                    )}
                  </div>
                </div>

                {/* Tab 1: Overview */}
                {activePlanTab === 'overview' && (
                  <div className="space-y-3 text-xs">
                    <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Core Objective</p>
                      <p className="text-sm font-semibold text-white mt-1">{selectedNote.actionablePlan.objective}</p>
                    </div>
                    <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Executive Summary</p>
                      <p className="text-slate-300 mt-1 leading-relaxed">{selectedNote.actionablePlan.summary}</p>
                    </div>
                  </div>
                )}

                {/* Tab 2: Action Steps Checklist */}
                {activePlanTab === 'steps' && (
                  <div className="space-y-2.5 text-xs flex-1 overflow-y-auto">
                    {selectedNote.actionablePlan.actionSteps.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-start justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition"
                      >
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className={`w-4 h-4 mt-0.5 ${st.completed ? 'text-emerald-400' : 'text-slate-500'}`} />
                          <div>
                            <p className="font-semibold text-slate-200">{st.step}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Owner: <strong className="text-indigo-300 font-normal">{st.owner}</strong>
                              {st.deadline && ` • Deadline: ${new Date(st.deadline).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            st.priority === 'urgent'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {st.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab 3: Key Bullet Points */}
                {activePlanTab === 'bullets' && (
                  <ul className="space-y-2 text-xs bg-slate-900/80 rounded-xl p-4 border border-slate-800">
                    {selectedNote.actionablePlan.bulletPoints.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Tab 4: Smart Tips */}
                {activePlanTab === 'tips' && (
                  <div className="space-y-2 text-xs bg-slate-900/80 rounded-xl p-4 border border-slate-800">
                    {selectedNote.actionablePlan.smartTips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                        <span className="text-amber-400 text-sm">💡</span>
                        <span className="leading-relaxed">{tip}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab 5: Executive Document Generator */}
                {activePlanTab === 'document' && selectedNote.actionablePlan.generatedDocument && (
                  <div className="space-y-3 bg-slate-900/90 rounded-xl p-4 border border-purple-900/40">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-purple-300">
                        {selectedNote.actionablePlan.generatedDocument.title}
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedNote.actionablePlan?.generatedDocument?.markdown || '');
                            alert('Copied document markdown to clipboard!');
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                        <button
                          onClick={() =>
                            onOpenDocumentModal(
                              selectedNote.actionablePlan!.generatedDocument!.title,
                              selectedNote.actionablePlan!.generatedDocument!.markdown
                            )
                          }
                          className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Full View
                        </button>
                      </div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-300 font-mono max-h-56 overflow-y-auto whitespace-pre-wrap">
                      {selectedNote.actionablePlan.generatedDocument.markdown}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
                <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse mb-2" />
                <p className="text-sm font-semibold text-slate-200">Action Plan Pending</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Click below to synthesize a structured objective, steps, and document from this note.
                </p>
                <button
                  onClick={() => handleRegeneratePlan(selectedNote.id)}
                  disabled={isAnalyzing}
                  className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate Action Plan with AI</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <FileText className="w-12 h-12 stroke-1 text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-300">No Note Selected</p>
            <p className="text-xs text-slate-500 mt-1">Select an existing note from the left or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
};
