import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool,
  Square,
  Circle,
  Diamond,
  ArrowRight,
  Type,
  Eraser,
  RotateCcw,
  Sparkles,
  Download,
  Save,
  Layers,
  CheckCircle2,
  Cpu,
  Workflow,
  Lightbulb,
} from 'lucide-react';
import { CanvasSchema } from '../types/index.js';
import { api } from '../services/api.js';

interface CanvasViewProps {
  canvases: CanvasSchema[];
  onRefreshCanvases: () => void;
  onRefreshTasks: () => void;
}

export const CanvasView: React.FC<CanvasViewProps> = ({ canvases, onRefreshCanvases, onRefreshTasks }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTool, setActiveTool] = useState<'pen' | 'rect' | 'circle' | 'diamond' | 'arrow' | 'text' | 'eraser'>('pen');
  const [strokeColor, setStrokeColor] = useState('#818cf8');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasTitle, setCanvasTitle] = useState('OmniFlow Architecture Schema');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(canvases[0]?.analysis || null);
  const [selectedCanvas, setSelectedCanvas] = useState<CanvasSchema | null>(canvases[0] || null);

  useEffect(() => {
    initCanvas();
  }, []);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark grid background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw subtle grid dots
    ctx.fillStyle = '#1e293b';
    for (let x = 20; x < canvas.width; x += 30) {
      for (let y = 20; y < canvas.height; y += 30) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Draw initial sample architecture boxes for demo
    drawArchitectureTemplate(ctx);
  };

  const drawArchitectureTemplate = (ctx: CanvasRenderingContext2D) => {
    // Service Box 1
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(50, 60, 180, 70);
    ctx.strokeRect(50, 60, 180, 70);

    ctx.fillStyle = '#e0e7ff';
    ctx.font = '12px sans-serif';
    ctx.fillText('Audio Ingestion Engine', 65, 95);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText('Live Multi-Speaker Diarizer', 65, 112);

    // Arrow to Cognitive Core
    ctx.strokeStyle = '#a855f7';
    ctx.beginPath();
    ctx.moveTo(230, 95);
    ctx.lineTo(310, 95);
    ctx.stroke();

    // Box 2: Azure AI Cognitive Core
    ctx.fillStyle = '#3b0764';
    ctx.fillRect(310, 50, 200, 90);
    ctx.strokeStyle = '#c084fc';
    ctx.strokeRect(310, 50, 200, 90);

    ctx.fillStyle = '#f3e8ff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('Azure OpenAI Cognitive Core', 325, 85);
    ctx.fillStyle = '#d8b4fe';
    ctx.font = '10px sans-serif';
    ctx.fillText('Actionable Plans & Rationale', 325, 105);
    ctx.fillText('Vision Analysis & Summaries', 325, 120);

    // Arrow to Commitment Ledger
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(510, 95);
    ctx.lineTo(590, 95);
    ctx.stroke();

    // Box 3: Commitment Ledger & Approval
    ctx.fillStyle = '#082f49';
    ctx.fillRect(590, 60, 190, 70);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(590, 60, 190, 70);

    ctx.fillStyle = '#e0f2fe';
    ctx.font = '12px sans-serif';
    ctx.fillText('Commitment Ledger', 605, 95);
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '10px sans-serif';
    ctx.fillText('Human-in-the-Loop Review', 605, 112);

    // Arrow down to Two-Way Sync
    ctx.strokeStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(685, 130);
    ctx.lineTo(685, 200);
    ctx.stroke();

    // Box 4: Calendar Sync Connector
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(590, 200, 190, 70);
    ctx.strokeStyle = '#34d399';
    ctx.strokeRect(590, 200, 190, 70);

    ctx.fillStyle = '#ecfdf5';
    ctx.font = '12px sans-serif';
    ctx.fillText('2-Way Sync Engine', 615, 235);
    ctx.fillStyle = '#a7f3d0';
    ctx.font = '10px sans-serif';
    ctx.fillText('Google Cal & MS Outlook', 615, 252);
  };

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = activeTool === 'eraser' ? '#0f172a' : strokeColor;
    ctx.lineWidth = activeTool === 'eraser' ? 24 : lineWidth;
    ctx.lineCap = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    initCanvas();
  };

  // AI Vision Analysis Trigger
  const handleAnalyzeCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const snapshotBase64 = canvas.toDataURL('image/png');

    setIsAnalyzing(true);
    try {
      // Save canvas first
      const saved = await api.saveCanvas({
        id: selectedCanvas?.id,
        title: canvasTitle,
        elementsJson: { nodesCount: 4, type: 'System Architecture Schema' },
        snapshotBase64,
      });

      // Run AI Vision
      const res = await api.analyzeCanvas(saved.id, snapshotBase64);
      setAnalysisResult(res.analysis);
      onRefreshCanvases();
      onRefreshTasks();
      alert('AI Vision analysis complete! Components extracted and actionable engineering tasks created.');
    } catch (err: any) {
      alert('Analysis error: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Toolbar */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Title Input */}
        <div className="flex items-center gap-2">
          <Workflow className="w-5 h-5 text-indigo-400" />
          <input
            type="text"
            value={canvasTitle}
            onChange={(e) => setCanvasTitle(e.target.value)}
            className="bg-transparent font-bold text-base text-white focus:outline-none border-b border-transparent focus:border-indigo-500"
          />
        </div>

        {/* Tools Palette */}
        <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTool('pen')}
            className={`p-2 rounded-lg transition ${activeTool === 'pen' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            title="Pen"
          >
            <PenTool className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('rect')}
            className={`p-2 rounded-lg transition ${activeTool === 'rect' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            title="Service Box"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('circle')}
            className={`p-2 rounded-lg transition ${activeTool === 'circle' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            title="Database Node"
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('diamond')}
            className={`p-2 rounded-lg transition ${activeTool === 'diamond' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            title="Decision Point"
          >
            <Diamond className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('eraser')}
            className={`p-2 rounded-lg transition ${activeTool === 'eraser' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            title="Eraser"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <button
            onClick={clearCanvas}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 transition"
            title="Reset Canvas"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Color Palette */}
        <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1.5 rounded-xl border border-slate-800">
          {['#818cf8', '#34d399', '#f59e0b', '#f43f5e', '#38bdf8', '#e2e8f0'].map((color) => (
            <button
              key={color}
              onClick={() => setStrokeColor(color)}
              className={`w-5 h-5 rounded-full transition ${strokeColor === color ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* AI Vision Analysis Button */}
        <button
          onClick={handleAnalyzeCanvas}
          disabled={isAnalyzing}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{isAnalyzing ? 'Vision Analyzing...' : 'Analyze with AI Vision'}</span>
        </button>
      </div>

      {/* Main Drawing Canvas Area */}
      <div className="rounded-2xl bg-slate-950 border border-slate-800 p-2 shadow-2xl overflow-hidden flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={900}
          height={420}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="rounded-xl cursor-crosshair max-w-full h-auto shadow-inner"
        />
      </div>

      {/* AI Vision Structured Breakdown & Output */}
      {analysisResult && (
        <div className="rounded-2xl bg-slate-900/80 border border-indigo-900/40 p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-indigo-900/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">AI Vision Architecture Extraction</h3>
                <p className="text-[11px] text-slate-400">Structured interpretation extracted directly from your visual sketch</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono">
              GPT-4o Vision Verified
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            {analysisResult.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Architectural Modules */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Detected Modules ({analysisResult.architectureComponents?.length || 0})
              </h4>
              <div className="space-y-2">
                {analysisResult.architectureComponents?.map((comp: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-0.5">
                    <p className="font-semibold text-slate-200">{comp.name}</p>
                    <p className="text-[11px] text-indigo-300 font-mono">{comp.type}</p>
                    <p className="text-[11px] text-slate-400 leading-snug">{comp.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Items Created */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Synthesized Action Items
              </h4>
              <div className="space-y-2">
                {analysisResult.actionItems?.map((act: string, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">{act}</span>
                  </div>
                ))}
              </div>

              {/* Suggestions */}
              {analysisResult.suggestions && (
                <div className="pt-2">
                  <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Lightbulb className="w-3.5 h-3.5" /> Architecture Suggestions
                  </h4>
                  <ul className="space-y-1 text-[11px] text-slate-400">
                    {analysisResult.suggestions.map((s: string, idx: number) => (
                      <li key={idx}>• {s}</li>
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
