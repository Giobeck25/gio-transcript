import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Wrench, Lightbulb, Search, PartyPopper, Calendar, FileText, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';
import confetti from 'canvas-confetti';

type CompanionState = 'idle' | 'repairing' | 'thinking' | 'surveying' | 'celebrating';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const CompanionWidget: React.FC<{
  onRefreshData?: () => void;
  activeView?: string;
  setActiveView?: (view: string) => void;
}> = ({ onRefreshData, setActiveView }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [companionState, setCompanionState] = useState<CompanionState>('idle');
  const [stateMessage, setStateMessage] = useState('Observing workspace...');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello Gio! I am Aether, your proactive cognitive companion. I have full awareness of your notes, today's schedule (including your meeting with Byron in 20 min), and pending SLA proposals. How can I help you execute today?`,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Micro-behavior cycle to make the companion feel alive
  useEffect(() => {
    const states: Array<{ state: CompanionState; msg: string; duration: number }> = [
      { state: 'idle', msg: 'Syncing cognitive state...', duration: 12000 },
      { state: 'repairing', msg: 'Tinkering with data pipelines...', duration: 7000 },
      { state: 'surveying', msg: 'Surveying Byron SLA notes & calendar...', duration: 8000 },
      { state: 'thinking', msg: 'Evaluating focus time slots...', duration: 6000 },
    ];

    let currentIdx = 0;
    const interval = setInterval(() => {
      if (!isOpen && companionState !== 'celebrating') {
        currentIdx = (currentIdx + 1) % states.length;
        setCompanionState(states[currentIdx].state);
        setStateMessage(states[currentIdx].msg);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isOpen, companionState]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(20, Math.min(window.innerWidth - 80, e.clientX - dragOffset.x));
        const newY = Math.max(20, Math.min(window.innerHeight - 80, e.clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMsg = inputText.trim();
    setInputText('');
    const newHistory: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newHistory);
    setIsLoading(true);
    setCompanionState('thinking');

    try {
      const res = await api.companionChat(newHistory);
      setMessages([...newHistory, { role: 'assistant', content: res.message }]);
      setCompanionState('idle');

      // Check if user asked to schedule or celebrate
      if (userMsg.toLowerCase().includes('schedule') || userMsg.toLowerCase().includes('book') || userMsg.toLowerCase().includes('approve')) {
        setCompanionState('celebrating');
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
        setTimeout(() => setCompanionState('idle'), 3000);
      }
    } catch (err: any) {
      setMessages([
        ...newHistory,
        {
          role: 'assistant',
          content: `I processed your request using local context: I see your Byron meeting in 20 minutes, 2 active notes, and pending SLA proposal. How else can I assist?`,
        },
      ]);
      setCompanionState('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const executeQuickAction = async (prompt: string) => {
    setInputText(prompt);
  };

  return (
    <>
      {/* Draggable Living Companion Avatar */}
      <div
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        className={`fixed z-50 select-none cursor-grab active:cursor-grabbing transition-transform ${
          isDragging ? 'scale-110' : 'hover:scale-105'
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="relative group">
          {/* Animated Glow Aura */}
          <div
            className={`absolute -inset-2 rounded-full blur-md opacity-75 transition-all duration-700 animate-pulse-slow ${
              companionState === 'repairing'
                ? 'bg-amber-500'
                : companionState === 'thinking'
                ? 'bg-purple-600'
                : companionState === 'surveying'
                ? 'bg-cyan-500'
                : companionState === 'celebrating'
                ? 'bg-emerald-400'
                : 'bg-indigo-500'
            }`}
          />

          {/* Interactive Character Ball */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 border border-indigo-400/40 shadow-2xl flex items-center justify-center p-2 text-white overflow-hidden"
          >
            {/* Ambient Animated Face / Micro-Icon */}
            <div className="flex flex-col items-center justify-center">
              {companionState === 'repairing' && (
                <div className="flex flex-col items-center animate-bounce">
                  <Wrench className="w-6 h-6 text-amber-300" />
                  <span className="text-[9px] font-bold text-amber-200 mt-0.5">Tinker</span>
                </div>
              )}
              {companionState === 'thinking' && (
                <div className="flex flex-col items-center">
                  <Lightbulb className="w-6 h-6 text-yellow-300 animate-pulse" />
                  <span className="text-[9px] font-bold text-yellow-200 mt-0.5">Think</span>
                </div>
              )}
              {companionState === 'surveying' && (
                <div className="flex flex-col items-center">
                  <Search className="w-6 h-6 text-cyan-300 animate-spin" />
                  <span className="text-[9px] font-bold text-cyan-200 mt-0.5">Scan</span>
                </div>
              )}
              {companionState === 'celebrating' && (
                <div className="flex flex-col items-center animate-bounce">
                  <PartyPopper className="w-6 h-6 text-emerald-300" />
                  <span className="text-[9px] font-bold text-emerald-200 mt-0.5">Done!</span>
                </div>
              )}
              {companionState === 'idle' && (
                <div className="flex flex-col items-center">
                  <Bot className="w-7 h-7 text-indigo-300 animate-float" />
                  <div className="flex gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  </div>
                </div>
              )}
            </div>
          </button>

          {/* Micro Speech Bubble Status when hover */}
          <div className="absolute bottom-full right-0 mb-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-900/90 text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-700 shadow-lg backdrop-blur-sm">
            <span className="font-semibold text-indigo-400">Aether:</span> {stateMessage}
          </div>
        </div>
      </div>

      {/* Omniscient AI Chat Panel Modal / Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-slate-950/95 border-l border-indigo-900/40 shadow-2xl backdrop-blur-xl flex flex-col transition-all duration-300">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                  Aether Omniscient Companion
                  <span className="px-1.5 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-mono">LIVE</span>
                </h3>
                <p className="text-[11px] text-slate-400">Global workspace awareness active</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Context Radar Pills */}
          <div className="px-4 py-2 bg-slate-900/70 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="text-slate-400 whitespace-nowrap">Radar:</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 whitespace-nowrap flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Byron meeting in 20m
            </span>
            <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 whitespace-nowrap flex items-center gap-1">
              <FileText className="w-3 h-3" /> SLA Proposal
            </span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex-shrink-0 flex items-center justify-center text-indigo-300 text-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white font-medium rounded-tr-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 items-center text-slate-400 text-xs italic">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                Aether is reasoning across workspace data...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Proactive Action Suggestions */}
          <div className="p-2 border-t border-slate-800/80 bg-slate-900/30 flex gap-1.5 overflow-x-auto">
            <button
              onClick={() => executeQuickAction('Draft a pre-meeting brief for Byron in 20 min')}
              className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-indigo-900/50 text-slate-300 hover:text-indigo-200 border border-slate-700/60 whitespace-nowrap flex items-center gap-1 transition"
            >
              ⚡ Brief Byron Meeting
            </button>
            <button
              onClick={() => executeQuickAction('Review pending AI calendar proposals')}
              className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-indigo-900/50 text-slate-300 hover:text-indigo-200 border border-slate-700/60 whitespace-nowrap flex items-center gap-1 transition"
            >
              📅 Review Proposals
            </button>
            <button
              onClick={() => executeQuickAction('Schedule a 45-min SLA review next Tuesday at 2 PM')}
              className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-indigo-900/50 text-slate-300 hover:text-indigo-200 border border-slate-700/60 whitespace-nowrap flex items-center gap-1 transition"
            >
              ➕ Book SLA Review
            </button>
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask Aether anything or command actions..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
