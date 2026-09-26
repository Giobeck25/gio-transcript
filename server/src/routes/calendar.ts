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

// POST Connect Google Calendar
calendarRouter.post('/connect-google', async (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const { accountEmail, accessToken } = req.body;

  if (!accountEmail) {
    res.status(400).json({ success: false, error: 'accountEmail is required' });
    return;
  }

  const status = await calendarSyncService.connectGoogle(tenantId, userId, accountEmail, accessToken);
  db.logAudit(tenantId, userId, 'GOOGLE_CALENDAR_CONNECTED', { accountEmail });

  res.json({
    success: true,
    message: `Google Calendar successfully connected for ${accountEmail}`,
    status,
  });
});

// POST Connect Microsoft Outlook Calendar
calendarRouter.post('/connect-outlook', async (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const { accountEmail, accessToken } = req.body;

  if (!accountEmail) {
    res.status(400).json({ success: false, error: 'accountEmail is required' });
    return;
  }

  const status = await calendarSyncService.connectOutlook(tenantId, userId, accountEmail, accessToken);
  db.logAudit(tenantId, userId, 'OUTLOOK_CALENDAR_CONNECTED', { accountEmail });

  res.json({
    success: true,
    message: `Microsoft Outlook Calendar successfully connected for ${accountEmail}`,
    status,
  });
});

// POST Disconnect Calendar Provider
calendarRouter.post('/disconnect', (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const { provider } = req.body;

  if (provider === 'google' || provider === 'outlook') {
    calendarSyncService.removeConnection(tenantId, provider);
    db.logAudit(tenantId, userId, 'CALENDAR_DISCONNECTED', { provider });
  }

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

// ==========================================
// REAL OAUTH 2.0 FLOW: MICROSOFT OUTLOOK
// ==========================================
const MS_CLIENT_ID = process.env.AZURE_OUTLOOK_CLIENT_ID || '9af0ce8d-dab1-4fbc-af87-00800796c9f8';
const MS_CLIENT_SECRET = process.env.AZURE_OUTLOOK_CLIENT_SECRET || '';

calendarRouter.get('/auth/outlook', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3001';
  const protocol = req.protocol === 'https' || host.includes('azurewebsites.net') ? 'https' : 'http';
  const redirectUri = `${protocol}://${host}/api/calendar/callback/outlook`;
  const tenantId = (req.query.tenantId as string) || 'tenant-enterprise-1';
  const userId = (req.query.userId as string) || 'user-gio';
  const state = Buffer.from(JSON.stringify({ tenantId, userId, redirectUri })).toString('base64');

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
    new URLSearchParams({
      client_id: MS_CLIENT_ID,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: 'Calendars.ReadWrite User.Read offline_access',
      state,
      prompt: 'select_account',
    }).toString();

  res.redirect(authUrl);
});

calendarRouter.get('/callback/outlook', async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  if (error || !code) {
    console.error('[Outlook OAuth Error]', error, error_description);
    return res.redirect(`/?calendar_error=${encodeURIComponent(String(error_description || error || 'OAuth cancelled'))}`);
  }

  try {
    let stateData = { tenantId: 'tenant-enterprise-1', userId: 'user-gio', redirectUri: '' };
    if (state) {
      try {
        stateData = JSON.parse(Buffer.from(String(state), 'base64').toString('utf-8'));
      } catch {}
    }

    const host = req.get('host') || 'localhost:3001';
    const protocol = req.protocol === 'https' || host.includes('azurewebsites.net') ? 'https' : 'http';
    const redirectUri = stateData.redirectUri || `${protocol}://${host}/api/calendar/callback/outlook`;

    // Exchange auth code for access token
    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: MS_CLIENT_ID,
        client_secret: MS_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: redirectUri,
        scope: 'Calendars.ReadWrite User.Read offline_access',
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to obtain Outlook access token');
    }

    // Fetch user profile from Microsoft Graph
    let userEmail = 'user@outlook.com';
    try {
      const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userRes.ok) {
        const u = await userRes.json();
        userEmail = u.mail || u.userPrincipalName || userEmail;
      }
    } catch {}

    // Connect & Sync Real Events
    await calendarSyncService.connectOutlook(
      stateData.tenantId,
      stateData.userId,
      userEmail,
      tokenData.access_token
    );

    res.redirect(`/?calendar_connected=outlook&email=${encodeURIComponent(userEmail)}`);
  } catch (err: any) {
    console.error('[Outlook OAuth Callback Error]', err);
    res.redirect(`/?calendar_error=${encodeURIComponent(err.message || 'Outlook connection failed')}`);
  }
});

// ==========================================
// REAL OAUTH 2.0 FLOW: GOOGLE CALENDAR
// ==========================================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '265497653190-eubv09qm65c95g0g42a59k0u9vj10214.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

calendarRouter.get('/auth/google', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3001';
  const protocol = req.protocol === 'https' || host.includes('azurewebsites.net') ? 'https' : 'http';
  const redirectUri = `${protocol}://${host}/api/calendar/callback/google`;
  const tenantId = (req.query.tenantId as string) || 'tenant-enterprise-1';
  const userId = (req.query.userId as string) || 'user-gio';
  const clientId = (req.query.clientId as string) || GOOGLE_CLIENT_ID;
  const state = Buffer.from(JSON.stringify({ tenantId, userId, redirectUri, clientId })).toString('base64');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state,
    }).toString();

  res.redirect(authUrl);
});

calendarRouter.get('/callback/google', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error || !code) {
    return res.redirect(`/?calendar_error=${encodeURIComponent(String(error || 'Google authorization cancelled'))}`);
  }

  try {
    let stateData = { tenantId: 'tenant-enterprise-1', userId: 'user-gio', redirectUri: '', clientId: GOOGLE_CLIENT_ID };
    if (state) {
      try {
        stateData = JSON.parse(Buffer.from(String(state), 'base64').toString('utf-8'));
      } catch {}
    }

    const host = req.get('host') || 'localhost:3001';
    const protocol = req.protocol === 'https' || host.includes('azurewebsites.net') ? 'https' : 'http';
    const redirectUri = stateData.redirectUri || `${protocol}://${host}/api/calendar/callback/google`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: stateData.clientId,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange Google OAuth code');
    }

    // Retrieve user email
    let userEmail = 'user@gmail.com';
    try {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userinfoRes.ok) {
        const u = await userinfoRes.json();
        userEmail = u.email || userEmail;
      }
    } catch {}

    // Connect & Sync Real Google Events
    await calendarSyncService.connectGoogle(
      stateData.tenantId,
      stateData.userId,
      userEmail,
      tokenData.access_token
    );

    res.redirect(`/?calendar_connected=google&email=${encodeURIComponent(userEmail)}`);
  } catch (err: any) {
    console.error('[Google OAuth Callback Error]', err);
    res.redirect(`/?calendar_error=${encodeURIComponent(err.message || 'Google Calendar connection failed')}`);
  }
});
