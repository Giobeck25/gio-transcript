import React, { useState, useRef, useEffect } from 'react';
import {
  Square,
  Circle,
  Diamond,
  Database,
  StickyNote,
  ArrowRight,
  Type,
  Trash2,
  Plus,
  Move,
  Sparkles,
  Save,
  Download,
  Copy,
  RefreshCw,
  CheckCircle2,
  Cpu,
  Layers,
  Lightbulb,
  Edit3,
  Palette,
  Workflow,
  MousePointer,
  RotateCcw,
} from 'lucide-react';
import { CanvasSchema } from '../types/index.js';
import { api } from '../services/api.js';

export interface DiagramNode {
  id: string;
  type: 'card' | 'circle' | 'diamond' | 'cylinder' | 'sticky' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle?: string;
  color: string; // e.g. '#6366f1'
}

export interface DiagramConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
}

interface CanvasViewProps {
  canvases: CanvasSchema[];
  onRefreshCanvases: () => void;
  onRefreshTasks: () => void;
}

const COLOR_PRESETS = [
  { name: 'Indigo', hex: '#6366f1', bg: 'bg-indigo-950/80', border: 'border-indigo-500', text: 'text-indigo-200' },
  { name: 'Emerald', hex: '#10b981', bg: 'bg-emerald-950/80', border: 'border-emerald-500', text: 'text-emerald-200' },
  { name: 'Sky', hex: '#0284c7', bg: 'bg-sky-950/80', border: 'border-sky-500', text: 'text-sky-200' },
  { name: 'Amber', hex: '#f59e0b', bg: 'bg-amber-950/80', border: 'border-amber-500', text: 'text-amber-200' },
  { name: 'Rose', hex: '#e11d48', bg: 'bg-rose-950/80', border: 'border-rose-500', text: 'text-rose-200' },
  { name: 'Purple', hex: '#9333ea', bg: 'bg-purple-950/80', border: 'border-purple-500', text: 'text-purple-200' },
  { name: 'Slate', hex: '#475569', bg: 'bg-slate-900/90', border: 'border-slate-600', text: 'text-slate-200' },
];

export const CanvasView: React.FC<CanvasViewProps> = ({ canvases, onRefreshCanvases, onRefreshTasks }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedCanvas, setSelectedCanvas] = useState<CanvasSchema | null>(canvases[0] || null);
  const [boardTitle, setBoardTitle] = useState('OmniFlow Architecture Schema');
  
  // Diagram Objects State
  const [nodes, setNodes] = useState<DiagramNode[]>([]);
  const [connections, setConnections] = useState<DiagramConnection[]>([]);
  
  // Selection & Manipulation State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  
  // AI Vision Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(canvases[0]?.analysis || null);

  // Initialize Board with Template or Loaded Canvas
  useEffect(() => {
    if (selectedCanvas && selectedCanvas.elementsJson) {
      try {
        const parsed = typeof selectedCanvas.elementsJson === 'string' ? JSON.parse(selectedCanvas.elementsJson) : selectedCanvas.elementsJson;
        if (parsed.nodes && Array.isArray(parsed.nodes)) {
          setNodes(parsed.nodes);
          setConnections(parsed.connections || []);
          setBoardTitle(selectedCanvas.title);
          setAnalysisResult(selectedCanvas.analysis || null);
          return;
        }
      } catch (e) {}
    }
    // Default initial template: OmniFlow Multi-Tenant Architecture
    loadTemplate('architecture');
  }, [selectedCanvas]);

  const loadTemplate = (templateType: 'architecture' | 'workflow' | 'brainstorm' | 'blank') => {
    setSelectedNodeId(null);
    setConnectingFromId(null);

    if (templateType === 'blank') {
      setNodes([]);
      setConnections([]);
      setBoardTitle('New Blank Canvas');
      setAnalysisResult(null);
      return;
    }

    if (templateType === 'architecture') {
      setBoardTitle('OmniFlow Multi-Tenant Architecture');
      setNodes([
        { id: 'n1', type: 'card', x: 50, y: 80, width: 200, height: 90, title: 'Audio Ingestion & Diarizer', subtitle: 'Live Multi-Speaker Speech Pipeline', color: '#6366f1' },
        { id: 'n2', type: 'card', x: 340, y: 70, width: 220, height: 110, title: 'Azure OpenAI & Astra Cognitive Core', subtitle: 'Actionable Plans, Rationale & Tasks', color: '#9333ea' },
        { id: 'n3', type: 'diamond', x: 650, y: 70, width: 140, height: 110, title: 'Commitment Ledger', subtitle: 'Human-in-Loop Review', color: '#0284c7' },
        { id: 'n4', type: 'card', x: 630, y: 260, width: 200, height: 90, title: '2-Way Calendar Sync', subtitle: 'Google & Microsoft Graph API', color: '#10b981' },
        { id: 'n5', type: 'cylinder', x: 350, y: 260, width: 200, height: 90, title: 'Azure Cosmos DB', subtitle: 'Zero-Bleed Tenant Partitions', color: '#0284c7' },
        { id: 'n6', type: 'circle', x: 60, y: 260, width: 180, height: 90, title: 'Mobile Geofence Service', subtitle: 'Spatial Proximity Radar', color: '#f59e0b' },
      ]);
      setConnections([
        { id: 'c1', from: 'n1', to: 'n2', label: 'Audio Segments' },
        { id: 'c2', from: 'n2', to: 'n3', label: 'Proposals' },
        { id: 'c3', from: 'n3', to: 'n4', label: 'Approved Events' },
        { id: 'c4', from: 'n2', to: 'n5', label: 'Store State' },
        { id: 'c5', from: 'n6', to: 'n2', label: 'Spatial Triggers' },
      ]);
      return;
    }

    if (templateType === 'workflow') {
      setBoardTitle('Executive Decision & Calendar Workflow');
      setNodes([
        { id: 'w1', type: 'card', x: 60, y: 120, width: 180, height: 80, title: 'Note / Meeting Capture', subtitle: 'Voice or Typed Memo', color: '#6366f1' },
        { id: 'w2', type: 'card', x: 300, y: 120, width: 190, height: 80, title: 'AI Extraction Engine', subtitle: 'Derive Action Items', color: '#9333ea' },
        { id: 'w3', type: 'diamond', x: 550, y: 105, width: 130, height: 110, title: 'Approval Check', subtitle: 'Approved by User?', color: '#f59e0b' },
        { id: 'w4', type: 'card', x: 750, y: 120, width: 180, height: 80, title: 'Booked on Calendar', subtitle: 'Google / Outlook Sync', color: '#10b981' },
      ]);
      setConnections([
        { id: 'wc1', from: 'w1', to: 'w2', label: 'Input' },
        { id: 'wc2', from: 'w2', to: 'w3', label: 'Propose' },
        { id: 'wc3', from: 'w3', to: 'w4', label: 'Yes' },
      ]);
      return;
    }

    if (templateType === 'brainstorm') {
      setBoardTitle('Sprint Planning & Product Brainstorm');
      setNodes([
        { id: 'b1', type: 'sticky', x: 80, y: 80, width: 170, height: 140, title: '💡 Strategic Idea', subtitle: 'Ambient audio companion for all client meetings', color: '#f59e0b' },
        { id: 'b2', type: 'sticky', x: 290, y: 80, width: 170, height: 140, title: '🎯 Q4 Objective', subtitle: '99.99% enterprise SLA guarantee with Byron', color: '#10b981' },
        { id: 'b3', type: 'sticky', x: 500, y: 80, width: 170, height: 140, title: '⚠️ Architecture Risk', subtitle: 'Avoid latency spikes during live diarization', color: '#e11d48' },
        { id: 'b4', type: 'sticky', x: 710, y: 80, width: 170, height: 140, title: '✅ Key Deliverable', subtitle: 'Bi-directional sync connectors verified', color: '#0284c7' },
      ]);
      setConnections([]);
      return;
    }
  };

  // Add new shape to canvas
  const handleAddShape = (type: DiagramNode['type']) => {
    const id = `node-${Date.now()}`;
    const x = 120 + Math.random() * 200;
    const y = 100 + Math.random() * 150;
    const newNode: DiagramNode = {
      id,
      type,
      x,
      y,
      width: type === 'sticky' ? 160 : type === 'diamond' ? 130 : 190,
      height: type === 'sticky' ? 130 : type === 'diamond' ? 110 : 85,
      title: type === 'sticky' ? 'New Note' : type === 'diamond' ? 'Decision Point' : type === 'cylinder' ? 'Database Node' : 'Service Component',
      subtitle: type === 'sticky' ? 'Write idea here...' : 'Description & role',
      color: type === 'sticky' ? '#f59e0b' : '#6366f1',
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(id);
  };

  // Dragging Nodes
  const handleMouseDownNode = (e: React.MouseEvent, node: DiagramNode) => {
    e.stopPropagation();
    if (connectingFromId) {
      if (connectingFromId !== node.id) {
        // Create connection
        setConnections((prev) => [
          ...prev,
          { id: `c-${Date.now()}`, from: connectingFromId, to: node.id, label: 'Flow' },
        ]);
      }
      setConnectingFromId(null);
      return;
    }

    setSelectedNodeId(node.id);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - node.x,
      y: e.clientY - node.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && selectedNodeId) {
      const newX = Math.max(20, Math.min(1200, e.clientX - dragOffset.x));
      const newY = Math.max(20, Math.min(800, e.clientY - dragOffset.y));
      setNodes((prev) =>
        prev.map((n) => (n.id === selectedNodeId ? { ...n, x: newX, y: newY } : n))
      );
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // Node Edits
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const updateSelectedNode = (updates: Partial<DiagramNode>) => {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNodeId ? { ...n, ...updates } : n))
    );
  };

  const handleDeleteSelected = () => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setConnections((prev) => prev.filter((c) => c.from !== selectedNodeId && c.to !== selectedNodeId));
    setSelectedNodeId(null);
  };

  const handleDuplicateSelected = () => {
    if (!selectedNode) return;
    const clone: DiagramNode = {
      ...selectedNode,
      id: `node-${Date.now()}`,
      x: selectedNode.x + 30,
      y: selectedNode.y + 30,
      title: `${selectedNode.title} (Copy)`,
    };
    setNodes((prev) => [...prev, clone]);
    setSelectedNodeId(clone.id);
  };

  // Save Canvas to Database
  const handleSaveCanvas = async () => {
    try {
      const saved = await api.saveCanvas({
        id: selectedCanvas?.id,
        title: boardTitle,
        elementsJson: { nodes, connections },
      });
      setSelectedCanvas(saved);
      onRefreshCanvases();
      alert(`Visual Board "${boardTitle}" saved successfully!`);
    } catch (err: any) {
      alert('Save failed: ' + err.message);
    }
  };

  // Delete Board
  const handleDeleteBoard = async () => {
    if (!selectedCanvas) return;
    if (!confirm(`Delete visual board "${selectedCanvas.title}"?`)) return;
    try {
      await api.deleteCanvas(selectedCanvas.id);
      setSelectedCanvas(null);
      onRefreshCanvases();
      loadTemplate('blank');
    } catch (err: any) {
      alert('Failed to delete canvas: ' + err.message);
    }
  };

  // AI Vision & System Architecture Analysis
  const handleRunAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Save state first
      const saved = await api.saveCanvas({
        id: selectedCanvas?.id,
        title: boardTitle,
        elementsJson: { nodes, connections },
      });

      const res = await api.analyzeCanvas(saved.id);
      setAnalysisResult(res.analysis);
      setSelectedCanvas(res.canvas);
      onRefreshCanvases();
      onRefreshTasks();
      alert('Astra AI Vision Architecture Review complete! System components extracted and action items converted into Tasks.');
    } catch (err: any) {
      alert('AI Analysis error: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper to draw SVG connector paths
  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return {
      x: node.x + node.width / 2,
      y: node.y + node.height / 2,
    };
  };

  return (
    <div className="space-y-6" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      {/* 🎨 Top Miro-Style Action Toolbar */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        {/* Title & Board Selector */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <input
              type="text"
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              className="bg-transparent font-extrabold text-base text-white focus:outline-none border-b border-transparent focus:border-indigo-500 max-w-xs"
              placeholder="Board Title..."
            />
            <p className="text-[11px] text-slate-400">Miro-Style Interactive Diagram & Architecture Builder</p>
          </div>
        </div>

        {/* Templates Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Template:</span>
          <select
            onChange={(e) => loadTemplate(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
            defaultValue="architecture"
          >
            <option value="architecture">OmniFlow Architecture</option>
            <option value="workflow">Decision Workflow</option>
            <option value="brainstorm">Sticky Brainstorm</option>
            <option value="blank">Blank Canvas</option>
          </select>
        </div>

        {/* Shape Palette Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => handleAddShape('card')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
            title="Add Service Box"
          >
            <Square className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Box</span>
          </button>
          <button
            onClick={() => handleAddShape('diamond')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
            title="Add Decision Node"
          >
            <Diamond className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Decision</span>
          </button>
          <button
            onClick={() => handleAddShape('cylinder')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
            title="Add Database"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">DB</span>
          </button>
          <button
            onClick={() => handleAddShape('sticky')}
            className="px-2.5 py-1.5 rounded-xl bg-amber-950/70 border border-amber-800/60 hover:bg-amber-600 text-amber-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
            title="Add Sticky Note"
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sticky</span>
          </button>
          <button
            onClick={() => handleAddShape('circle')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
            title="Add Circle Node"
          >
            <Circle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Circle</span>
          </button>
        </div>

        {/* Action Buttons: Save & AI Analysis */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveCanvas}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950 transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
          <button
            onClick={handleRunAIAnalysis}
            disabled={isAnalyzing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-900/40 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isAnalyzing ? 'Analyzing Schema...' : 'Astra AI Review'}</span>
          </button>
          {selectedCanvas && (
            <button
              onClick={handleDeleteBoard}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition"
              title="Delete Visual Board"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Saved Canvases Bar */}
      {canvases.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-semibold px-1 text-[11px] whitespace-nowrap">Saved Boards:</span>
          {canvases.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCanvas(c)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap border transition ${
                selectedCanvas?.id === c.id
                  ? 'bg-indigo-950 border-indigo-500 text-indigo-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {c.title}
            </button>
          ))}
          <button
            onClick={() => loadTemplate('blank')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> New
          </button>
        </div>
      )}

      {/* Selected Node Quick Format Toolbar */}
      {selectedNode && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-2xl border border-indigo-900/40 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-300">Selected:</span>
            <input
              type="text"
              value={selectedNode.title}
              onChange={(e) => updateSelectedNode({ title: e.target.value })}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
              placeholder="Title..."
            />
            <input
              type="text"
              value={selectedNode.subtitle || ''}
              onChange={(e) => updateSelectedNode({ subtitle: e.target.value })}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              placeholder="Subtitle / Description..."
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Color Presets */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {COLOR_PRESETS.map((col) => (
                <button
                  key={col.hex}
                  onClick={() => updateSelectedNode({ color: col.hex })}
                  className={`w-4 h-4 rounded-full transition ${selectedNode.color === col.hex ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: col.hex }}
                  title={col.name}
                />
              ))}
            </div>

            {/* Connect to Another Node */}
            <button
              onClick={() => setConnectingFromId(connectingFromId ? null : selectedNode.id)}
              className={`px-3 py-1 rounded-lg font-semibold text-xs transition border flex items-center gap-1 ${
                connectingFromId === selectedNode.id
                  ? 'bg-amber-500 text-black border-amber-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>{connectingFromId === selectedNode.id ? 'Click target node...' : 'Connect to'}</span>
            </button>

            {/* Duplicate */}
            <button
              onClick={handleDuplicateSelected}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Duplicate Element"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {/* Delete */}
            <button
              onClick={handleDeleteSelected}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition"
              title="Delete Element"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 📐 Main Interactive Whiteboard Canvas Area */}
      <div
        ref={containerRef}
        onClick={() => setSelectedNodeId(null)}
        className="relative w-full h-[580px] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl select-none cursor-default"
        style={{
          backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* SVG Connectors Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 7 3, 0 6" fill="#818cf8" />
            </marker>
          </defs>
          {connections.map((c) => {
            const start = getNodeCenter(c.from);
            const end = getNodeCenter(c.to);
            if (!start || !end) return null;
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;

            return (
              <g key={c.id}>
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="#818cf8"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  markerEnd="url(#arrowhead)"
                />
                {c.label && (
                  <text
                    x={midX}
                    y={midY - 8}
                    fill="#c7d2fe"
                    fontSize="10"
                    textAnchor="middle"
                    className="font-mono bg-slate-900"
                  >
                    {c.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Diagram Nodes Layer */}
        {nodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const isTargeting = connectingFromId && connectingFromId !== node.id;

          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleMouseDownNode(e, node)}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                height: `${node.height}px`,
                borderColor: isSelected ? '#ffffff' : node.color,
              }}
              className={`absolute z-20 cursor-move rounded-2xl transition-shadow p-3.5 flex flex-col justify-between border-2 shadow-xl backdrop-blur-md ${
                node.type === 'sticky'
                  ? 'bg-amber-950/90 text-amber-100'
                  : node.type === 'diamond'
                  ? 'bg-purple-950/80 text-purple-100 rotate-0'
                  : node.type === 'cylinder'
                  ? 'bg-cyan-950/80 text-cyan-100'
                  : 'bg-slate-900/90 text-slate-100'
              } ${isSelected ? 'ring-4 ring-indigo-500/50 shadow-2xl scale-102' : 'hover:border-slate-400'} ${
                isTargeting ? 'ring-2 ring-amber-400 animate-pulse cursor-pointer' : ''
              }`}
            >
              {/* Node Header */}
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40"
                    style={{ color: node.color }}
                  >
                    {node.type}
                  </span>
                  <Move className="w-3 h-3 text-slate-500 opacity-50" />
                </div>
                <h4 className="font-bold text-xs mt-1.5 leading-snug line-clamp-2">{node.title}</h4>
              </div>

              {/* Node Subtitle */}
              {node.subtitle && (
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed font-sans">
                  {node.subtitle}
                </p>
              )}

              {/* Resize Handle at bottom right */}
              {isSelected && (
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsResizing(true);
                  }}
                  className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-br-lg bg-white/70 cursor-se-resize"
                />
              )}
            </div>
          );
        })}

        {/* Empty Canvas Notice */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
            <Workflow className="w-12 h-12 stroke-1 mb-2 text-slate-600" />
            <p className="text-sm font-semibold text-slate-400">Blank Canvas</p>
            <p className="text-xs text-slate-500 mt-0.5">Click any shape button above or pick a template to start building.</p>
          </div>
        )}
      </div>

      {/* 🧠 Astra AI Vision & Systems Architecture Synthesis Card */}
      {analysisResult && (
        <div className="rounded-3xl bg-slate-900/90 border border-indigo-900/40 p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-indigo-900/40 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-100">Astra AI Architecture & Schema Synthesis</h3>
                <p className="text-[11px] text-slate-400">Real-time structured extraction of diagram components, data flows & action items</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold">
              Cognitive Vision Verified
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
            {analysisResult.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Architectural Modules */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Detected Modules ({analysisResult.architectureComponents?.length || 0})
              </h4>
              <div className="space-y-2">
                {analysisResult.architectureComponents?.map((comp: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                    <p className="font-bold text-slate-200">{comp.name}</p>
                    <p className="text-[11px] text-indigo-300 font-mono">{comp.type}</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{comp.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Synthesized Action Items */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Converted Execution Tasks ({analysisResult.actionItems?.length || 0})
              </h4>
              <div className="space-y-2">
                {analysisResult.actionItems?.map((act: string, idx: number) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300 leading-snug">{act}</span>
                  </div>
                ))}
              </div>

              {/* Suggestions */}
              {analysisResult.suggestions && (
                <div className="pt-2">
                  <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Lightbulb className="w-3.5 h-3.5" /> Architectural Recommendations
                  </h4>
                  <ul className="space-y-1.5 text-[11px] text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                    {analysisResult.suggestions.map((s: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
