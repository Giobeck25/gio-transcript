import { Router, Request, Response } from 'express';
import { db, Meeting, TranscriptSegment } from '../db/index.js';
import { aiService } from '../services/ai.js';

export const meetingsRouter = Router();

const getContext = (req: Request) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-enterprise-1';
  const userId = (req.headers['x-user-id'] as string) || 'user-gio';
  return { tenantId, userId };
};

// GET all meetings for tenant
meetingsRouter.get('/', (req: Request, res: Response) => {
  const { tenantId } = getContext(req);
  const meetings = db.getMeetings(tenantId);
  res.json({ success: true, meetings });
});

// GET single meeting
meetingsRouter.get('/:id', (req: Request, res: Response) => {
  const { tenantId } = getContext(req);
  const meeting = db.getMeeting(tenantId, String(req.params.id));
  if (!meeting) {
    res.status(404).json({ success: false, error: 'Meeting not found' });
    return;
  }
  res.json({ success: true, meeting });
});

// POST start new meeting session
meetingsRouter.post('/', (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const { title = 'New Live Meeting Session', speakers = ['Gio Becchetti', 'Speaker 2'] } = req.body;

  const meeting: Meeting = {
    id: `meeting-${Date.now()}`,
    tenantId,
    userId,
    title,
    date: new Date().toISOString(),
    durationMinutes: 0,
    status: 'recording',
    speakers,
    transcriptSegments: [],
    createdAt: new Date().toISOString(),
  };

  db.saveMeeting(meeting);
  db.logAudit(tenantId, userId, 'MEETING_STARTED', { meetingId: meeting.id, title });
  res.status(201).json({ success: true, meeting });
});

// POST append transcript segment (live speech diarization)
meetingsRouter.post('/:id/segments', (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const meeting = db.getMeeting(tenantId, String(req.params.id));
  if (!meeting) {
    res.status(404).json({ success: false, error: 'Meeting not found' });
    return;
  }

  const { speaker, text, timestamp, confidence = 0.95 } = req.body;
  if (!speaker || !text) {
    res.status(400).json({ success: false, error: 'Speaker and text required' });
    return;
  }

  const newSegment: TranscriptSegment = {
    id: `seg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    speaker,
    text,
    timestamp: timestamp || '00:00',
    confidence,
  };

  meeting.transcriptSegments.push(newSegment);
  if (!meeting.speakers.includes(speaker)) {
    meeting.speakers.push(speaker);
  }

  db.saveMeeting(meeting);
  res.json({ success: true, segment: newSegment });
});

// POST finish and summarize meeting with AI
meetingsRouter.post('/:id/summarize', async (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const meeting = db.getMeeting(tenantId, String(req.params.id));
  if (!meeting) {
    res.status(404).json({ success: false, error: 'Meeting not found' });
    return;
  }

  meeting.status = 'completed';

  try {
    const { summary, decisions, actionPlan, proposals } = await aiService.summarizeMeeting(
      meeting.title,
      meeting.transcriptSegments
    );

    meeting.summary = summary;
    meeting.decisions = decisions;
    meeting.actionPlan = actionPlan;
    db.saveMeeting(meeting);

    // Save proposals for human review
    for (const prop of proposals) {
      db.saveProposal({
        id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        tenantId,
        userId,
        sourceId: meeting.id,
        sourceType: 'meeting',
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

    db.logAudit(tenantId, userId, 'MEETING_SUMMARIZED', { meetingId: meeting.id, proposalsGenerated: proposals.length });
    res.json({ success: true, meeting, proposalsCount: proposals.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
