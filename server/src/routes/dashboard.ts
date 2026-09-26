import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { aiService } from '../services/ai.js';

export const dashboardRouter = Router();

const getContext = (req: Request) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-enterprise-1';
  const userId = (req.headers['x-user-id'] as string) || 'user-gio';
  return { tenantId, userId };
};

// GET Daily Briefing & Overview
dashboardRouter.get('/brief', async (req: Request, res: Response) => {
  const { tenantId } = getContext(req);
  const { lat, lon, city } = req.query;

  const notes = db.getNotes(tenantId);
  const meetings = db.getMeetings(tenantId);
  const proposals = db.getProposals(tenantId);
  const calendarEvents = db.getCalendarEvents(tenantId);
  const tasks = db.getTasks(tenantId);

  // Weather data simulation or fetch
  const weather = {
    location: (city as string) || 'Sydney, NSW',
    temperature: 22,
    condition: 'Sunny & Crisp',
    icon: 'Sun',
    humidity: '58%',
    wind: '12 km/h E',
  };

  // Pre-meeting Radar: Look for upcoming meetings in the next 1-2 hours
  const nowMs = Date.now();
  const upcomingMeetings = calendarEvents.filter((e) => {
    const eventTime = new Date(e.startTime).getTime();
    // Meeting starts within the next 3 hours
    return eventTime >= nowMs - 10 * 60000 && eventTime <= nowMs + 3 * 3600000;
  });

  const nextMeeting = upcomingMeetings[0];
  let preMeetingRadar = null;

  if (nextMeeting) {
    const isByron = nextMeeting.title.toLowerCase().includes('byron');
    const relevantNotes = notes.filter((n) =>
      n.title.toLowerCase().includes('byron') || n.content.toLowerCase().includes('byron') || n.title.toLowerCase().includes('sla')
    );
    const relevantTasks = tasks.filter((t) => t.title.toLowerCase().includes('byron') || t.tags.includes('Byron'));

    preMeetingRadar = {
      meetingId: nextMeeting.id,
      meetingTitle: nextMeeting.title,
      startTime: nextMeeting.startTime,
      minutesUntil: Math.max(0, Math.round((new Date(nextMeeting.startTime).getTime() - nowMs) / 60000)),
      attendees: nextMeeting.attendees || ['Byron Spencer'],
      hasContext: relevantNotes.length > 0 || relevantTasks.length > 0,
      contextSnippet: isByron
        ? 'Byron praised yesterday’s multi-tenant isolation demo. Key focus today: 99.99% Enterprise SLA terms & Google Calendar sync.'
        : 'Prior notes captured discussion regarding project roadmap and next deliverables.',
      relevantNotesCount: relevantNotes.length,
      relevantTasksCount: relevantTasks.length,
      proactiveOffer: 'Generate an executive 1-page pre-meeting brief on Byron and SLA requirements?',
    };
  }

  // Pending proposals requiring user review
  const pendingProposals = proposals.filter((p) => p.status === 'pending');

  res.json({
    success: true,
    weather,
    brief: {
      greeting: getGreeting(),
      dateFormatted: new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).format(new Date()),
      totalNotes: notes.length,
      activeTasks: tasks.filter((t) => t.status !== 'completed').length,
      todayEvents: calendarEvents.length,
      pendingProposalsCount: pendingProposals.length,
      pendingProposals,
      preMeetingRadar,
    },
  });
});

// POST Generate 1-Click Pre-Meeting Brief
dashboardRouter.post('/pre-meeting-brief', async (req: Request, res: Response) => {
  const { tenantId } = getContext(req);
  const { meetingTitle, attendees = [] } = req.body;

  const notes = db.getNotes(tenantId);
  const tasks = db.getTasks(tenantId);

  const contextNotes = notes.map((n) => `${n.title}: ${n.content.slice(0, 300)}`);
  const contextTasks = tasks.map((t) => `${t.title} [Status: ${t.status}]`);

  try {
    const briefMarkdown = await aiService.generatePrepBrief(
      meetingTitle || 'Upcoming Meeting',
      attendees,
      contextNotes,
      contextTasks
    );

    res.json({ success: true, briefMarkdown });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
