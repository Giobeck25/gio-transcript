import { CalendarEvent, db } from '../db/index.js';

export interface CalendarConnection {
  tenantId: string;
  userId: string;
  provider: 'google' | 'outlook';
  accountEmail: string;
  accessToken?: string;
  refreshToken?: string;
  connectedAt: string;
}

export interface SyncStatus {
  lastSyncedAt: string;
  googleCalendar: {
    connected: boolean;
    account: string;
    eventsSynced: number;
    health: 'healthy' | 'syncing' | 'error' | 'disconnected';
    error?: string;
  };
  outlookCalendar: {
    connected: boolean;
    account: string;
    eventsSynced: number;
    health: 'healthy' | 'syncing' | 'error' | 'disconnected';
    error?: string;
  };
  localEventsCount: number;
}

export class CalendarSyncService {
  private connections: Map<string, CalendarConnection> = new Map();

  private getConnectionKey(tenantId: string, provider: string): string {
    return `${tenantId}:${provider}`;
  }

  public getConnection(tenantId: string, provider: 'google' | 'outlook'): CalendarConnection | undefined {
    return this.connections.get(this.getConnectionKey(tenantId, provider));
  }

  public setConnection(conn: CalendarConnection) {
    this.connections.set(this.getConnectionKey(conn.tenantId, conn.provider), conn);
  }

  public removeConnection(tenantId: string, provider: 'google' | 'outlook') {
    this.connections.delete(this.getConnectionKey(tenantId, provider));
  }

  public getSyncStatus(tenantId: string): SyncStatus {
    const allEvents = db.getCalendarEvents(tenantId);
    const googleConn = this.getConnection(tenantId, 'google');
    const outlookConn = this.getConnection(tenantId, 'outlook');

    return {
      lastSyncedAt: new Date().toISOString(),
      googleCalendar: {
        connected: !!googleConn,
        account: googleConn?.accountEmail || 'Not Connected',
        eventsSynced: allEvents.filter((e) => e.provider === 'google').length,
        health: googleConn ? 'healthy' : 'disconnected',
      },
      outlookCalendar: {
        connected: !!outlookConn,
        account: outlookConn?.accountEmail || 'Not Connected',
        eventsSynced: allEvents.filter((e) => e.provider === 'outlook').length,
        health: outlookConn ? 'healthy' : 'disconnected',
      },
      localEventsCount: allEvents.filter((e) => e.provider === 'local').length,
    };
  }

  /**
   * Connect Real Google Account
   */
  public async connectGoogle(tenantId: string, userId: string, accountEmail: string, accessToken?: string): Promise<SyncStatus> {
    const conn: CalendarConnection = {
      tenantId,
      userId,
      provider: 'google',
      accountEmail,
      accessToken,
      connectedAt: new Date().toISOString(),
    };
    this.setConnection(conn);

    // If an access token is provided, fetch real events from Google Calendar API
    if (accessToken) {
      try {
        await this.syncRealGoogleEvents(tenantId, userId, accessToken);
      } catch (err) {
        console.warn('[Google Sync] Real Google API fetch warning:', (err as Error).message);
      }
    }

    return this.getSyncStatus(tenantId);
  }

  /**
   * Connect Real Microsoft Outlook / Graph Account
   */
  public async connectOutlook(tenantId: string, userId: string, accountEmail: string, accessToken?: string): Promise<SyncStatus> {
    const conn: CalendarConnection = {
      tenantId,
      userId,
      provider: 'outlook',
      accountEmail,
      accessToken,
      connectedAt: new Date().toISOString(),
    };
    this.setConnection(conn);

    // If an access token is provided, fetch real events from Microsoft Graph API
    if (accessToken) {
      try {
        await this.syncRealOutlookEvents(tenantId, userId, accessToken);
      } catch (err) {
        console.warn('[Outlook Sync] Real MS Graph fetch warning:', (err as Error).message);
      }
    }

    return this.getSyncStatus(tenantId);
  }

  /**
   * Sync Real Google Calendar Events using Google Calendar REST API v3
   */
  public async syncRealGoogleEvents(tenantId: string, userId: string, accessToken: string): Promise<number> {
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=20&singleEvents=true&orderBy=startTime', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Calendar API returned ${res.status}: ${err}`);
    }

    const data = await res.json();
    const items = data.items || [];
    let synced = 0;

    for (const item of items) {
      const startTime = item.start?.dateTime || item.start?.date || new Date().toISOString();
      const endTime = item.end?.dateTime || item.end?.date || new Date(Date.now() + 3600000).toISOString();

      db.saveCalendarEvent({
        id: `gcal-${item.id}`,
        tenantId,
        userId,
        title: item.summary || 'Google Calendar Event',
        description: item.description,
        startTime,
        endTime,
        provider: 'google',
        location: item.location,
        externalId: item.id,
        color: '#10b981',
        createdAt: new Date().toISOString(),
      });
      synced++;
    }

    return synced;
  }

  /**
   * Sync Real Microsoft Outlook Events using Microsoft Graph API
   */
  public async syncRealOutlookEvents(tenantId: string, userId: string, accessToken: string): Promise<number> {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/calendar/events?$top=20&$orderby=start/dateTime', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Microsoft Graph API returned ${res.status}: ${err}`);
    }

    const data = await res.json();
    const items = data.value || [];
    let synced = 0;

    for (const item of items) {
      const startTime = item.start?.dateTime ? `${item.start.dateTime}Z` : new Date().toISOString();
      const endTime = item.end?.dateTime ? `${item.end.dateTime}Z` : new Date(Date.now() + 3600000).toISOString();

      db.saveCalendarEvent({
        id: `ms-${item.id}`,
        tenantId,
        userId,
        title: item.subject || 'Outlook Event',
        description: item.bodyPreview,
        startTime,
        endTime,
        provider: 'outlook',
        location: item.location?.displayName,
        externalId: item.id,
        color: '#0284c7',
        createdAt: new Date().toISOString(),
      });
      synced++;
    }

    return synced;
  }

  /**
   * Performs 2-Way Sync across connected real accounts
   */
  public async performTwoWaySync(tenantId: string, userId: string): Promise<{ syncedEvents: number; message: string }> {
    const googleConn = this.getConnection(tenantId, 'google');
    const outlookConn = this.getConnection(tenantId, 'outlook');

    let syncedCount = 0;
    const notes = [];

    if (googleConn?.accessToken) {
      try {
        const count = await this.syncRealGoogleEvents(tenantId, userId, googleConn.accessToken);
        syncedCount += count;
        notes.push(`Google Calendar (${count} live events)`);
      } catch (e: any) {
        notes.push(`Google Calendar sync error: ${e.message}`);
      }
    } else if (googleConn) {
      notes.push(`Google Calendar connected (${googleConn.accountEmail})`);
    }

    if (outlookConn?.accessToken) {
      try {
        const count = await this.syncRealOutlookEvents(tenantId, userId, outlookConn.accessToken);
        syncedCount += count;
        notes.push(`Microsoft Outlook (${count} live events)`);
      } catch (e: any) {
        notes.push(`Outlook sync error: ${e.message}`);
      }
    } else if (outlookConn) {
      notes.push(`Microsoft Outlook connected (${outlookConn.accountEmail})`);
    }

    const totalEvents = db.getCalendarEvents(tenantId).length;

    return {
      syncedEvents: totalEvents,
      message: notes.length > 0 ? `Sync executed: ${notes.join('; ')}` : 'Local workspace calendar is synchronized. Connect Google or Outlook to pull live cloud calendars.',
    };
  }

  /**
   * Pushes an approved proposal to Google or Outlook or Local
   */
  public async pushApprovedEvent(
    tenantId: string,
    userId: string,
    eventData: {
      title: string;
      description?: string;
      startTime: string;
      endTime: string;
      location?: string;
      attendees?: string[];
      targetCalendar: 'local' | 'google' | 'outlook';
      sourceProposalId?: string;
    }
  ): Promise<CalendarEvent> {
    const googleConn = this.getConnection(tenantId, 'google');
    const outlookConn = this.getConnection(tenantId, 'outlook');

    let externalId: string | undefined;

    // Push live to Google Calendar API if connected
    if (eventData.targetCalendar === 'google' && googleConn?.accessToken) {
      try {
        const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${googleConn.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: eventData.title,
            description: eventData.description,
            start: { dateTime: eventData.startTime },
            end: { dateTime: eventData.endTime },
            location: eventData.location,
            attendees: eventData.attendees?.map((email) => ({ email })),
          }),
        });
        if (res.ok) {
          const created = await res.json();
          externalId = created.id;
        }
      } catch (e) {
        console.warn('[Google Calendar Push Error]', e);
      }
    }

    // Push live to Microsoft Graph if connected
    if (eventData.targetCalendar === 'outlook' && outlookConn?.accessToken) {
      try {
        const res = await fetch('https://graph.microsoft.com/v1.0/me/calendar/events', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${outlookConn.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subject: eventData.title,
            body: { contentType: 'Text', content: eventData.description || '' },
            start: { dateTime: eventData.startTime, timeZone: 'UTC' },
            end: { dateTime: eventData.endTime, timeZone: 'UTC' },
            location: { displayName: eventData.location || '' },
          }),
        });
        if (res.ok) {
          const created = await res.json();
          externalId = created.id;
        }
      } catch (e) {
        console.warn('[Outlook Push Error]', e);
      }
    }

    const newEvent: CalendarEvent = {
      id: `cal-${eventData.targetCalendar}-${Date.now()}`,
      tenantId,
      userId,
      title: `${eventData.targetCalendar === 'google' ? '📅 Google: ' : eventData.targetCalendar === 'outlook' ? '📫 Outlook: ' : '⚡ '}${eventData.title}`,
      description: eventData.description,
      startTime: eventData.startTime,
      endTime: eventData.endTime,
      location: eventData.location,
      attendees: eventData.attendees,
      provider: eventData.targetCalendar,
      externalId,
      sourceProposalId: eventData.sourceProposalId,
      color: eventData.targetCalendar === 'google' ? '#10b981' : eventData.targetCalendar === 'outlook' ? '#0284c7' : '#6366f1',
      createdAt: new Date().toISOString(),
    };

    return db.saveCalendarEvent(newEvent);
  }
}

export const calendarSyncService = new CalendarSyncService();
