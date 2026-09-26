import { Router, Request, Response } from 'express';
import { db, CalendarEvent } from '../db/index.js';
import { calendarSyncService } from '../services/calendarSync.js';

export const calendarRouter = Router();

const getContext = (req: Request) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-enterprise-1';
  const userId = (req.headers['x-user-id'] as string) || 'user-gio';
  return { tenantId, userId };
};

// GET all calendar events
calendarRouter.get('/events', (req: Request, res: Response) => {
  const { tenantId } = getContext(req);
  const events = db.getCalendarEvents(tenantId);
  res.json({ success: true, events });
});

// GET sync health and connected accounts
calendarRouter.get('/sync-status', (req: Request, res: Response) => {
  const { tenantId } = getContext(req);
  const status = calendarSyncService.getSyncStatus(tenantId);
  res.json({ success: true, status });
});

// POST Trigger manual 2-way sync
calendarRouter.post('/sync-now', async (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const result = await calendarSyncService.performTwoWaySync(tenantId, userId);
  const events = db.getCalendarEvents(tenantId);
  const status = calendarSyncService.getSyncStatus(tenantId);
  db.logAudit(tenantId, userId, 'CALENDAR_TWO_WAY_SYNC', { syncedEvents: result.syncedEvents });
  res.json({ success: true, ...result, events, status });
});

// POST create custom event
calendarRouter.post('/events', (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const { title, description, startTime, endTime, provider = 'local', location, attendees } = req.body;

  if (!title || !startTime || !endTime) {
    res.status(400).json({ success: false, error: 'Title, startTime, and endTime are required' });
    return;
  }

  const newEvent: CalendarEvent = {
    id: `cal-${Date.now()}`,
    tenantId,
    userId,
    title,
    description,
    startTime,
    endTime,
    provider,
    location,
    attendees: attendees || [],
    color: provider === 'google' ? '#10b981' : provider === 'outlook' ? '#0284c7' : '#6366f1',
    createdAt: new Date().toISOString(),
  };

  db.saveCalendarEvent(newEvent);
  db.logAudit(tenantId, userId, 'CALENDAR_EVENT_CREATED', { eventId: newEvent.id });
  res.status(201).json({ success: true, event: newEvent });
});

// DELETE calendar event
calendarRouter.delete('/events/:id', (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const eventId = String(req.params.id);
  const success = db.deleteCalendarEvent(tenantId, eventId);
  if (!success) {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }
  db.logAudit(tenantId, userId, 'CALENDAR_EVENT_DELETED', { eventId });
  res.json({ success: true });
});
