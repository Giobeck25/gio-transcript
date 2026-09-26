import { Router, Request, Response } from 'express';
import { db, Note } from '../db/index.js';
import { aiService } from '../services/ai.js';

export const notesRouter = Router();

// Middleware to extract tenant context
const getContext = (req: Request) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-enterprise-1';
  const userId = (req.headers['x-user-id'] as string) || 'user-gio';
  return { tenantId, userId };
};

// GET all notes for tenant
notesRouter.get('/', (req: Request, res: Response) => {
  const { tenantId } = getContext(req);
  const notes = db.getNotes(tenantId);
  res.json({ success: true, notes });
});

// GET single note
notesRouter.get('/:id', (req: Request, res: Response) => {
  const { tenantId } = getContext(req);
  const note = db.getNote(tenantId, String(req.params.id));
  if (!note) {
    res.status(404).json({ success: false, error: 'Note not found' });
    return;
  }
  res.json({ success: true, note });
});

// POST create new note (with automatic AI actionable plan & schedule extraction)
notesRouter.post('/', async (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const { title, content, type = 'text', tags = [] } = req.body;

  if (!title || !content) {
    res.status(400).json({ success: false, error: 'Title and content are required' });
    return;
  }

  const noteId = `note-${Date.now()}`;
  
  // Create base note first
  let note: Note = {
    id: noteId,
    tenantId,
    userId,
    title,
    content,
    type,
    tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.saveNote(note);

  // Trigger AI Actionable Plan generation
  try {
    const { plan, proposals } = await aiService.generateActionablePlan(title, content, type);
    note.actionablePlan = plan;
    db.saveNote(note);

    // Save extracted proposals for human-in-the-loop review
    for (const prop of proposals) {
      db.saveProposal({
        id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        tenantId,
        userId,
        sourceId: note.id,
        sourceType: 'note',
        title: prop.title,
        startTime: prop.startTime,
        endTime: prop.endTime,
        durationMinutes: prop.durationMinutes,
        location: prop.location,
        attendees: prop.attendees,
        rationale: prop.rationale,
        tip: prop.tip,
        status: 'pending',
        targetCalendar: prop.targetCalendar,
        createdAt: new Date().toISOString(),
      });
    }

    db.logAudit(tenantId, userId, 'NOTE_CREATED_WITH_AI_PLAN', { noteId: note.id, proposalsCount: proposals.length });
  } catch (err) {
    console.warn('[Notes] AI processing error:', err);
  }

  res.status(201).json({ success: true, note });
});

// PUT update note
notesRouter.put('/:id', (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const noteId = String(req.params.id);
  const existing = db.getNote(tenantId, noteId);
  if (!existing) {
    res.status(404).json({ success: false, error: 'Note not found' });
    return;
  }

  const { title, content, tags, type, actionablePlan } = req.body;
  const updated: Note = {
    ...existing,
    title: title !== undefined ? title : existing.title,
    content: content !== undefined ? content : existing.content,
    tags: tags !== undefined ? tags : existing.tags,
    type: type !== undefined ? type : existing.type,
    actionablePlan: actionablePlan !== undefined ? actionablePlan : existing.actionablePlan,
    updatedAt: new Date().toISOString(),
  };

  db.saveNote(updated);
  db.logAudit(tenantId, userId, 'NOTE_UPDATED', { noteId: updated.id });
  res.json({ success: true, note: updated });
});

// POST re-generate AI actionable plan for an existing note
notesRouter.post('/:id/generate-plan', async (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const noteId = String(req.params.id);
  const note = db.getNote(tenantId, noteId);
  if (!note) {
    res.status(404).json({ success: false, error: 'Note not found' });
    return;
  }

  try {
    const { plan, proposals } = await aiService.generateActionablePlan(note.title, note.content, note.type);
    note.actionablePlan = plan;
    note.updatedAt = new Date().toISOString();
    db.saveNote(note);

    for (const prop of proposals) {
      db.saveProposal({
        id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        tenantId,
        userId,
        sourceId: note.id,
        sourceType: 'note',
        title: prop.title,
        startTime: prop.startTime,
        endTime: prop.endTime,
        durationMinutes: prop.durationMinutes,
        location: prop.location,
        attendees: prop.attendees,
        rationale: prop.rationale,
        tip: prop.tip,
        status: 'pending',
        targetCalendar: prop.targetCalendar,
        createdAt: new Date().toISOString(),
      });
    }

    res.json({ success: true, note, proposalsCount: proposals.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE note
notesRouter.delete('/:id', (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const noteId = String(req.params.id);
  const success = db.deleteNote(tenantId, noteId);
  if (!success) {
    res.status(404).json({ success: false, error: 'Note not found' });
    return;
  }
  db.logAudit(tenantId, userId, 'NOTE_DELETED', { noteId });
  res.json({ success: true });
});
