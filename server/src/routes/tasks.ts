import { Router, Request, Response } from 'express';
import { db, Task } from '../db/index.js';

export const tasksRouter = Router();

const getContext = (req: Request) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-enterprise-1';
  const userId = (req.headers['x-user-id'] as string) || 'user-gio';
  return { tenantId, userId };
};

// GET tasks
tasksRouter.get('/', (req: Request, res: Response) => {
  const { tenantId } = getContext(req);
  const tasks = db.getTasks(tenantId);
  res.json({ success: true, tasks });
});

// POST create task
tasksRouter.post('/', (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const { title, description, dueDate, priority = 'medium', subtasks = [], linkedNoteId, linkedMeetingId, tags = [] } = req.body;

  if (!title) {
    res.status(400).json({ success: false, error: 'Task title is required' });
    return;
  }

  const newTask: Task = {
    id: `task-${Date.now()}`,
    tenantId,
    userId,
    title,
    description,
    dueDate,
    priority,
    status: 'todo',
    subtasks: subtasks.map((st: any, i: number) => ({
      id: `st-${Date.now()}-${i}`,
      title: typeof st === 'string' ? st : st.title,
      completed: !!st.completed,
    })),
    linkedNoteId,
    linkedMeetingId,
    tags,
    createdAt: new Date().toISOString(),
  };

  db.saveTask(newTask);
  db.logAudit(tenantId, userId, 'TASK_CREATED', { taskId: newTask.id });
  res.status(201).json({ success: true, task: newTask });
});

// PUT update task / toggle subtask
tasksRouter.put('/:id', (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const tasks = db.getTasks(tenantId);
  const existing = tasks.find((t) => t.id === req.params.id);

  if (!existing) {
    res.status(404).json({ success: false, error: 'Task not found' });
    return;
  }

  const { title, description, dueDate, priority, status, subtasks, tags } = req.body;
  const updated: Task = {
    ...existing,
    title: title !== undefined ? title : existing.title,
    description: description !== undefined ? description : existing.description,
    dueDate: dueDate !== undefined ? dueDate : existing.dueDate,
    priority: priority !== undefined ? priority : existing.priority,
    status: status !== undefined ? status : existing.status,
    subtasks: subtasks !== undefined ? subtasks : existing.subtasks,
    tags: tags !== undefined ? tags : existing.tags,
  };

  db.saveTask(updated);
  res.json({ success: true, task: updated });
});

// POST AI Execute Task - AI processes all subtasks and generates result document
tasksRouter.post('/:id/ai-execute', async (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const tasks = db.getTasks(tenantId);
  const existing = tasks.find((t) => t.id === req.params.id);

  if (!existing) {
    res.status(404).json({ success: false, error: 'Task not found' });
    return;
  }

  try {
    const { aiService } = await import('../services/ai.js');
    
    const updatedSubtasks = existing.subtasks.map((st) => ({ ...st, completed: true }));
    
    // Generate comprehensive AI result for the entire task
    const aiPrompt = `You are an AI task execution assistant. The user has a task: "${existing.title}"
Description: ${existing.description || 'No description provided'}

Subtasks to complete:
${existing.subtasks.map((st, i) => `${i + 1}. ${st.title}`).join('\n')}

For each subtask, provide a detailed completion report with:
- What was done
- Key findings or deliverables
- Any recommendations

Then provide an overall Executive Summary document in markdown format with:
- Task Overview
- Completed Actions (bullet points for each subtask)
- Key Deliverables
- Recommendations & Next Steps
- Completion timestamp: ${new Date().toISOString()}

Be thorough and professional.`;

    const aiResult = await aiService.companionChat(
      [{ role: 'user', content: aiPrompt }],
      { notesCount: 0, meetingsCount: 0, pendingProposalsCount: 0, upcomingEvents: [], tasks: [existing.title], recentNotes: [], activeGeofences: [] }
    );
    
    // Update the task with completed subtasks and AI result
    const updated: any = {
      ...existing,
      status: 'completed',
      subtasks: updatedSubtasks,
      aiExecutionResult: {
        completedAt: new Date().toISOString(),
        executedBy: 'AI Assistant',
        resultDocument: aiResult.message,
      },
    };
    
    db.saveTask(updated);
    res.json({ success: true, task: updated });
  } catch (err: any) {
    console.error('[AI Execute Error]', err);
    res.status(500).json({ success: false, error: 'AI execution failed: ' + err.message });
  }
});

// DELETE task
tasksRouter.delete('/:id', (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const taskId = String(req.params.id);
  const success = db.deleteTask(tenantId, taskId);
  if (!success) {
    res.status(404).json({ success: false, error: 'Task not found' });
    return;
  }
  res.json({ success: true });
});
