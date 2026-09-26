import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { calendarSyncService } from '../services/calendarSync.js';

export const proposalsRouter = Router();

const getContext = (req: Request) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-enterprise-1';
  const userId = (req.headers['x-user-id'] as string) || 'user-gio';
  return { tenantId, userId };
};

// GET all proposals
proposalsRouter.get('/', (req: Request, res: Response) => {
  const { tenantId } = getContext(req);
  const proposals = db.getProposals(tenantId);
  res.json({ success: true, proposals });
});

// POST Approve proposal -> pushes to target calendar!
proposalsRouter.post('/:id/approve', async (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const proposalId = String(req.params.id);
  const proposal = db.getProposal(tenantId, proposalId);

  if (!proposal) {
    res.status(404).json({ success: false, error: 'Proposal not found' });
    return;
  }

  // Update proposal status
  proposal.status = 'approved';
  db.saveProposal(proposal);

  // Push to local or Google or Outlook calendar
  const calendarEvent = await calendarSyncService.pushApprovedEvent(tenantId, userId, {
    title: proposal.title,
    description: `Approved from ${proposal.sourceType}: ${proposal.rationale}`,
    startTime: proposal.startTime,
    endTime: proposal.endTime,
    location: proposal.location,
    attendees: proposal.attendees,
    targetCalendar: proposal.targetCalendar,
    sourceProposalId: proposal.id,
  });

  db.logAudit(tenantId, userId, 'PROPOSAL_APPROVED', {
    proposalId: proposal.id,
    targetCalendar: proposal.targetCalendar,
    calendarEventId: calendarEvent.id,
  });

  res.json({
    success: true,
    message: `Proposal approved and successfully booked to ${proposal.targetCalendar.toUpperCase()} calendar!`,
    proposal,
    calendarEvent,
  });
});

// POST Decline / Refuse proposal
proposalsRouter.post('/:id/decline', (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const proposalId = String(req.params.id);
  const proposal = db.getProposal(tenantId, proposalId);

  if (!proposal) {
    res.status(404).json({ success: false, error: 'Proposal not found' });
    return;
  }

  proposal.status = 'declined';
  db.saveProposal(proposal);
  db.logAudit(tenantId, userId, 'PROPOSAL_DECLINED', { proposalId: proposal.id });

  res.json({ success: true, message: 'Proposal declined.', proposal });
});

// PUT Edit proposal
proposalsRouter.put('/:id', (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const proposalId = String(req.params.id);
  const proposal = db.getProposal(tenantId, proposalId);

  if (!proposal) {
    res.status(404).json({ success: false, error: 'Proposal not found' });
    return;
  }

  const { title, startTime, endTime, durationMinutes, location, attendees, targetCalendar } = req.body;
  if (title !== undefined) proposal.title = title;
  if (startTime !== undefined) proposal.startTime = startTime;
  if (endTime !== undefined) proposal.endTime = endTime;
  if (durationMinutes !== undefined) proposal.durationMinutes = durationMinutes;
  if (location !== undefined) proposal.location = location;
  if (attendees !== undefined) proposal.attendees = attendees;
  if (targetCalendar !== undefined) proposal.targetCalendar = targetCalendar;
  proposal.status = 'edited';

  db.saveProposal(proposal);
  db.logAudit(tenantId, userId, 'PROPOSAL_EDITED', { proposalId: proposal.id });

  res.json({ success: true, proposal });
});

// DELETE proposal
proposalsRouter.delete('/:id', (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const proposalId = String(req.params.id);
  const success = db.deleteProposal(tenantId, proposalId);
  if (!success) {
    res.status(404).json({ success: false, error: 'Proposal not found' });
    return;
  }
  db.logAudit(tenantId, userId, 'PROPOSAL_DELETED', { proposalId: proposalId });
  res.json({ success: true });
});
