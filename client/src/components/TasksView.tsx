import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Clock,
  Tag,
  Trash2,
  ListTodo,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Download,
  FileText,
  Bot,
} from 'lucide-react';
import { Task } from '../types/index.js';
import { api } from '../services/api.js';

interface TasksViewProps {
  tasks: Task[];
  onRefreshTasks: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ tasks, onRefreshTasks }) => {
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [subtasksInput, setSubtasksInput] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);
  const [viewingResultId, setViewingResultId] = useState<string | null>(null);

  const handleToggleSubtask = async (task: Task, subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.completed);

    await api.updateTask(task.id, {
      subtasks: updatedSubtasks,
      status: allCompleted ? 'completed' : task.status,
    });
    onRefreshTasks();
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'in_progress' : 'completed';
    await api.updateTask(task.id, { status: newStatus });
    onRefreshTasks();
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const subtasks = subtasksInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((title, idx) => ({ id: `st-${Date.now()}-${idx}`, title, completed: false }));

    await api.createTask({
      title: newTitle.trim(),
      description: newDesc.trim(),
      priority: newPriority,
      dueDate: newDueDate || undefined,
      subtasks,
    });

    setIsAdding(false);
    setNewTitle('');
    setNewDesc('');
    setSubtasksInput('');
    onRefreshTasks();
  };

  const handleAddSubtask = async (task: Task) => {
    if (!newSubtaskTitle.trim()) return;
    const updatedSubtasks = [
      ...task.subtasks,
      { id: `st-${Date.now()}`, title: newSubtaskTitle.trim(), completed: false },
    ];
    await api.updateTask(task.id, { subtasks: updatedSubtasks });
    setNewSubtaskTitle('');
    onRefreshTasks();
  };

  const handleDeleteSubtask = async (task: Task, subtaskId: string) => {
    const updatedSubtasks = task.subtasks.filter((st) => st.id !== subtaskId);
    await api.updateTask(task.id, { subtasks: updatedSubtasks });
    onRefreshTasks();
  };

  const handleAIExecute = async (task: Task) => {
    if (!confirm('Let AI execute all subtasks and generate a result document?')) return;
    setExecutingTaskId(task.id);
    try {
      await api.aiExecuteTask(task.id);
      onRefreshTasks();
    } catch (err: any) {
      alert('AI execution error: ' + err.message);
    } finally {
      setExecutingTaskId(null);
    }
  };

  const handleDownloadResult = (task: any) => {
    const result = task.aiExecutionResult?.resultDocument || 'No result available.';
    const blob = new Blob([result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${task.title.replace(/[^a-zA-Z0-9]/g, '_')}_AI_Result.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-amber-400" />
            Execution Tasks & Commitments
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Action items synthesized from notes, diarized meetings, and visual schemas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['all', 'in_progress', 'todo', 'completed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition ${
                  filter === st ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.map((t) => {
          const isDone = t.status === 'completed';
          const completedCount = t.subtasks.filter((s) => s.completed).length;

          return (
            <div
              key={t.id}
              className={`rounded-2xl border p-5 transition shadow-lg space-y-3 ${
                isDone
                  ? 'bg-slate-950/40 border-slate-800/80 opacity-60'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <button
                    onClick={() => handleToggleTaskStatus(t)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-400 transition"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500" />
                    )}
                  </button>
                  <div>
                    <h3 className={`font-semibold text-sm ${isDone ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                      {t.title}
                    </h3>
                    {t.description && (
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.description}</p>
                    )}
                  </div>
                </div>

                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                    t.priority === 'urgent'
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : t.priority === 'high'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {t.priority}
                </span>
              </div>

              {/* Subtasks Checklist */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <button
                    onClick={() => setExpandedTaskId(expandedTaskId === t.id ? null : t.id)}
                    className="flex items-center gap-1 hover:text-slate-200 transition"
                  >
                    {expandedTaskId === t.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <span>Subtasks</span>
                  </button>
                  <div className="flex items-center gap-2">
                    {t.subtasks.length > 0 && !isDone && (
                      <button
                        onClick={() => handleAIExecute(t)}
                        disabled={executingTaskId === t.id}
                        className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded transition disabled:opacity-50"
                      >
                        {executingTaskId === t.id ? (
                          <span className="animate-pulse">Executing...</span>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            AI Execute All
                          </>
                        )}
                      </button>
                    )}
                    <span>
                      {completedCount} / {t.subtasks.length} completed
                    </span>
                  </div>
                </div>
                {t.subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 hover:bg-slate-950 text-xs transition group"
                  >
                    <button onClick={() => handleToggleSubtask(t, st.id)} className="flex-shrink-0">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          st.completed ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      />
                    </button>
                    <span className={`flex-1 ${st.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                      {st.title}
                    </span>
                    <button
                      onClick={() => handleDeleteSubtask(t, st.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {/* Inline add subtask */}
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={expandedTaskId === t.id ? newSubtaskTitle : ''}
                    onChange={(e) => {
                      setExpandedTaskId(t.id);
                      setNewSubtaskTitle(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask(t);
                      }
                    }}
                    placeholder="+ Add subtask..."
                    className="flex-1 bg-slate-950/40 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => handleAddSubtask(t)}
                    className="p-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* AI Execution Result */}
              {(t as any).aiExecutionResult && (
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-medium">
                        <Bot className="w-4 h-4" />
                        AI Execution Complete
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewingResultId(viewingResultId === t.id ? null : t.id)}
                          className="p-1 rounded hover:bg-indigo-900/50 text-indigo-300 hover:text-indigo-100 transition"
                          title="View Result"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownloadResult(t)}
                          className="p-1 rounded hover:bg-indigo-900/50 text-indigo-300 hover:text-indigo-100 transition"
                          title="Download Result"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {viewingResultId === t.id && (
                      <div className="text-[10px] text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono p-2 bg-slate-950/50 rounded border border-slate-800/50">
                        {(t as any).aiExecutionResult.resultDocument}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer Meta */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Due: {t.dueDate || 'No date set'}
                </span>
                <div className="flex gap-1">
                  {t.tags.map((tag, idx) => (
                    <span key={idx} className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px]">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Task Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Task Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Deliver SLA Pricing Annex"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Description / Notes</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  placeholder="Context and details..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Subtasks (1 per line)</label>
                <textarea
                  value={subtasksInput}
                  onChange={(e) => setSubtasksInput(e.target.value)}
                  rows={3}
                  placeholder="Draft SLA table&#10;Maya review&#10;Send to Byron"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
