import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Sparkles,
  Users,
  Clock,
  Play,
  Pause,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Plus,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { Meeting, TranscriptSegment } from '../types/index.js';
import { api } from '../services/api.js';

interface MeetingsViewProps {
  meetings: Meeting[];
  onRefreshMeetings: () => void;
  onNavigateTab: (tab: string) => void;
}

export const MeetingsView: React.FC<MeetingsViewProps> = ({ meetings, onRefreshMeetings, onNavigateTab }) => {
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(meetings[0] || null);
  const [isRecordingLive, setIsRecordingLive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [liveDuration, setLiveDuration] = useState(0);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // New simulated speech input
  const [simSpeaker, setSimSpeaker] = useState('Byron Spencer');
  const [simText, setSimText] = useState('');

  useEffect(() => {
    if (meetings.length > 0 && !selectedMeeting) {
      setSelectedMeeting(meetings[0]);
    } else if (selectedMeeting) {
      const refreshed = meetings.find((m) => m.id === selectedMeeting.id);
      if (refreshed) setSelectedMeeting(refreshed);
    }
  }, [meetings]);

  // Live timer
  useEffect(() => {
    let interval: any;
    if (isRecordingLive && !isPaused) {
      interval = setInterval(() => {
        setLiveDuration((d) => d + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecordingLive, isPaused]);

  const handleStartLiveMeeting = async () => {
    const meeting = await api.startMeeting('Live Executive Strategy Session', ['Gio Becchetti', 'Byron Spencer', 'Maya Chen']);
    setSelectedMeeting(meeting);
    setIsRecordingLive(true);
    setIsPaused(false);
    setLiveDuration(0);
    onRefreshMeetings();
  };

  const handleAppendSegment = async () => {
    if (!selectedMeeting || !simText.trim()) return;
    const minutes = Math.floor(liveDuration / 60);
    const seconds = liveDuration % 60;
    const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    await api.appendSegment(selectedMeeting.id, {
      speaker: simSpeaker,
      text: simText.trim(),
      timestamp,
    });

    setSimText('');
    onRefreshMeetings();
  };

  const handleSummarizeWithAI = async () => {
    if (!selectedMeeting) return;
    setIsSummarizing(true);
    setIsRecordingLive(false);

    try {
      const updated = await api.summarizeMeeting(selectedMeeting.id);
      setSelectedMeeting(updated);
      onRefreshMeetings();
      alert('Meeting summarized! Key decisions and pending calendar proposals generated.');
    } catch (err: any) {
      alert('Summarization error: ' + err.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[700px]">
      {/* Left Column: Meetings History */}
      <div className="lg:col-span-4 flex flex-col space-y-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              Meeting Sessions
            </h2>
            <p className="text-[11px] text-slate-400">Multi-speaker diarization & summaries</p>
          </div>
          <button
            onClick={handleStartLiveMeeting}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition"
          >
            <Plus className="w-4 h-4" /> Start Live
          </button>
        </div>

        {/* Meeting Cards */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {meetings.map((m) => {
            const isSelected = selectedMeeting?.id === m.id;
            return (
              <div
                key={m.id}
                onClick={() => setSelectedMeeting(m)}
                className={`p-3.5 rounded-xl cursor-pointer transition border text-left ${
                  isSelected
                    ? 'bg-purple-950/60 border-purple-500/60 shadow-md shadow-purple-950'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                      m.status === 'recording'
                        ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {m.status}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(m.date).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-semibold text-xs text-slate-200 mt-1.5 line-clamp-1">{m.title}</h3>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                  <span>👥 {m.speakers.length} speakers</span>
                  <span>•</span>
                  <span>🎙️ {m.transcriptSegments.length} segments</span>
                </div>
                {m.summary && (
                  <p className="text-[11px] text-emerald-400 mt-2 font-medium flex items-center gap-1 line-clamp-1">
                    <Sparkles className="w-3 h-3" /> Summarized with AI
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Active Live Diarization & Meeting Details */}
      <div className="lg:col-span-8 flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        {selectedMeeting ? (
          <>
            {/* Header & Recording Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800 uppercase">
                    {selectedMeeting.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(selectedMeeting.date).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mt-1">{selectedMeeting.title}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>Speakers:</span>
                  {selectedMeeting.speakers.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2">
                {isRecordingLive && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPaused(!isPaused)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{isPaused ? 'Resume' : 'Pause'}</span>
                    </button>
                    <span className="font-mono text-xs text-rose-400 font-bold px-2 py-1 bg-rose-950/60 rounded border border-rose-800">
                      {Math.floor(liveDuration / 60)}:{(liveDuration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}

                <button
                  onClick={handleSummarizeWithAI}
                  disabled={isSummarizing || selectedMeeting.transcriptSegments.length === 0}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{isSummarizing ? 'Summarizing AI...' : 'Summarize with AI'}</span>
                </button>
              </div>
            </div>

            {/* Live Diarization Speech Input simulator (to append speech seamlessly) */}
            {selectedMeeting.status === 'recording' && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-purple-900/40 space-y-2.5">
                <p className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  Live Audio Diarizer: Transcribe Speaker
                </p>
                <div className="flex gap-2">
                  <select
                    value={simSpeaker}
                    onChange={(e) => setSimSpeaker(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Byron Spencer">Byron Spencer (Client)</option>
                    <option value="Gio Becchetti">Gio Becchetti (Host)</option>
                    <option value="Maya Chen">Maya Chen (Architect)</option>
                  </select>
                  <input
                    type="text"
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAppendSegment()}
                    placeholder="Enter what speaker is saying or click mic..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={handleAppendSegment}
                    disabled={!simText.trim()}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Send Speech
                  </button>
                </div>
              </div>
            )}

            {/* Diarized Transcript Stream */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Live Diarized Transcript Stream ({selectedMeeting.transcriptSegments.length} Segments)
              </h3>

              {selectedMeeting.transcriptSegments.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No speech segments yet. Start recording or type above to add spoken remarks.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedMeeting.transcriptSegments.map((seg) => {
                    const isByron = seg.speaker.toLowerCase().includes('byron');
                    const isGio = seg.speaker.toLowerCase().includes('gio');
                    return (
                      <div
                        key={seg.id}
                        className={`p-3.5 rounded-xl border transition ${
                          isByron
                            ? 'bg-blue-950/40 border-blue-800/60'
                            : isGio
                            ? 'bg-purple-950/40 border-purple-800/60'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span
                            className={`font-bold ${
                              isByron ? 'text-blue-300' : isGio ? 'text-purple-300' : 'text-slate-300'
                            }`}
                          >
                            {seg.speaker}
                          </span>
                          <span className="font-mono text-slate-500">[{seg.timestamp}]</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">{seg.text}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI Summarized Section */}
            {selectedMeeting.summary && (
              <div className="rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-800/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    AI Executive Meeting Summary & Next Steps
                  </h4>
                  <button
                    onClick={() => onNavigateTab('proposals')}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    <span>Check AI Calendar Proposals</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedMeeting.summary}</p>

                {selectedMeeting.decisions && selectedMeeting.decisions.length > 0 && (
                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Decisions Made</p>
                    <ul className="space-y-1">
                      {selectedMeeting.decisions.map((d, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <Users className="w-12 h-12 stroke-1 text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-300">No Meeting Selected</p>
            <p className="text-xs text-slate-500 mt-1">Select an existing meeting or start a live session.</p>
          </div>
        )}
      </div>
    </div>
  );
};
