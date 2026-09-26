import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { aiService } from '../services/ai.js';
import { calendarSyncService } from '../services/calendarSync.js';

export const companionRouter = Router();

const getContext = (req: Request) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-enterprise-1';
  const userId = (req.headers['x-user-id'] as string) || 'user-gio';
  return { tenantId, userId };
};

// POST chat with Aether
companionRouter.post('/chat', async (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ success: false, error: 'Messages array is required' });
    return;
  }

  // Gather current tenant context
  const notes = db.getNotes(tenantId);
  const meetings = db.getMeetings(tenantId);
  const proposals = db.getProposals(tenantId);
  const events = db.getCalendarEvents(tenantId);
  const tasks = db.getTasks(tenantId);
  const geofences = db.getGeofences(tenantId);

  const workspaceSummary = {
    notesCount: notes.length,
    meetingsCount: meetings.length,
    pendingProposalsCount: proposals.filter((p) => p.status === 'pending').length,
    upcomingEvents: events.map((e) => `${e.title} (${e.startTime})`),
    tasks: tasks.filter((t) => t.status !== 'completed').map((t) => `${t.title} [Priority: ${t.priority}]`),
    recentNotes: notes.slice(0, 3).map((n) => `"${n.title}": ${n.content.slice(0, 80)}`),
    activeGeofences: geofences.filter((g) => g.isActive).map((g) => `${g.name} (${g.reminderMessage})`),
  };

  try {
    const aiResponse = await aiService.companionChat(messages, workspaceSummary);
    res.json({ success: true, ...aiResponse });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Aether Tool Execution (e.g. Schedule Event or Create Note on user command)
companionRouter.post('/execute-action', async (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const { toolName, payload } = req.body;

  try {
    if (toolName === 'create_note') {
      const note = db.saveNote({
        id: `note-${Date.now()}`,
        tenantId,
        userId,
        title: payload.title || 'Aether Quick Note',
        content: payload.content || '',
        type: 'text',
        tags: payload.tags || ['Aether'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      res.json({ success: true, result: note, message: `Created note: "${note.title}"` });
      return;
    }

    if (toolName === 'schedule_event') {
      const event = await calendarSyncService.pushApprovedEvent(tenantId, userId, {
        title: payload.title || 'Aether Scheduled Meeting',
        description: payload.description || 'Scheduled via Aether Companion',
        startTime: payload.startTime || new Date(Date.now() + 3600000).toISOString(),
        endTime: payload.endTime || new Date(Date.now() + 7200000).toISOString(),
        location: payload.location,
        attendees: payload.attendees || [],
        targetCalendar: payload.targetCalendar || 'local',
      });
      res.json({ success: true, result: event, message: `Scheduled event: "${event.title}"` });
      return;
    }

    if (toolName === 'create_task') {
      const task = db.saveTask({
        id: `task-${Date.now()}`,
        tenantId,
        userId,
        title: payload.title || 'New Task',
        description: payload.description,
        dueDate: payload.dueDate,
        priority: payload.priority || 'medium',
        status: 'todo',
        subtasks: [],
        tags: ['Aether'],
        createdAt: new Date().toISOString(),
      });
      res.json({ success: true, result: task, message: `Created task: "${task.title}"` });
      return;
    }

    res.status(400).json({ success: false, error: `Unknown tool: ${toolName}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
