import {
  Tenant,
  User,
  Note,
  Meeting,
  Proposal,
  CalendarEvent,
  Task,
  CanvasSchema,
  Geofence,
  SyncStatus,
} from '../types/index.js';

class ApiClient {
  private tenantId: string = 'tenant-enterprise-1';
  private userId: string = 'user-gio';

  public setSession(tenantId: string, userId: string) {
    this.tenantId = tenantId;
    this.userId = userId;
  }

  public getSession() {
    return { tenantId: this.tenantId, userId: this.userId };
  }

  private getHeaders(extraHeaders: Record<string, string> = {}) {
    return {
      'Content-Type': 'application/json',
      'x-tenant-id': this.tenantId,
      'x-user-id': this.userId,
      ...extraHeaders,
    };
  }

  // Auth / Tenants
  public async getTenants(): Promise<Tenant[]> {
    const res = await fetch('/api/auth/tenants', { headers: this.getHeaders() });
    const data = await res.json();
    return data.tenants || [];
  }

  public async getUsers(tenantId: string): Promise<User[]> {
    const res = await fetch(`/api/auth/users?tenantId=${tenantId}`, { headers: this.getHeaders() });
    const data = await res.json();
    return data.users || [];
  }

  // Dashboard
  public async getBrief(): Promise<any> {
    const res = await fetch('/api/dashboard/brief', { headers: this.getHeaders() });
    return await res.json();
  }

  public async generatePreMeetingBrief(meetingTitle: string, attendees: string[]): Promise<string> {
    const res = await fetch('/api/dashboard/pre-meeting-brief', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ meetingTitle, attendees }),
    });
    const data = await res.json();
    return data.briefMarkdown || '';
  }

  // Notes
  public async getNotes(): Promise<Note[]> {
    const res = await fetch('/api/notes', { headers: this.getHeaders() });
    const data = await res.json();
    return data.notes || [];
  }

  public async createNote(payload: { title: string; content: string; type?: string; tags?: string[] }): Promise<Note> {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.note;
  }

  public async regeneratePlan(noteId: string): Promise<Note> {
    const res = await fetch(`/api/notes/${noteId}/generate-plan`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    return data.note;
  }

  public async deleteNote(noteId: string): Promise<boolean> {
    const res = await fetch(`/api/notes/${noteId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    return data.success;
  }

  // Meetings
  public async getMeetings(): Promise<Meeting[]> {
    const res = await fetch('/api/meetings', { headers: this.getHeaders() });
    const data = await res.json();
    return data.meetings || [];
  }

  public async startMeeting(title: string, speakers: string[]): Promise<Meeting> {
    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ title, speakers }),
    });
    const data = await res.json();
    return data.meeting;
  }

  public async appendSegment(meetingId: string, segment: { speaker: string; text: string; timestamp: string }): Promise<void> {
    await fetch(`/api/meetings/${meetingId}/segments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(segment),
    });
  }

  public async summarizeMeeting(meetingId: string): Promise<Meeting> {
    const res = await fetch(`/api/meetings/${meetingId}/summarize`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    return data.meeting;
  }

  // Proposals
  public async getProposals(): Promise<Proposal[]> {
    const res = await fetch('/api/proposals', { headers: this.getHeaders() });
    const data = await res.json();
    return data.proposals || [];
  }

  public async approveProposal(proposalId: string): Promise<{ proposal: Proposal; calendarEvent: CalendarEvent }> {
    const res = await fetch(`/api/proposals/${proposalId}/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return await res.json();
  }

  public async declineProposal(proposalId: string): Promise<Proposal> {
    const res = await fetch(`/api/proposals/${proposalId}/decline`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    return data.proposal;
  }

  public async editProposal(proposalId: string, updates: Partial<Proposal>): Promise<Proposal> {
    const res = await fetch(`/api/proposals/${proposalId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    return data.proposal;
  }

  // Calendar
  public async getCalendarEvents(): Promise<CalendarEvent[]> {
    const res = await fetch('/api/calendar/events', { headers: this.getHeaders() });
    const data = await res.json();
    return data.events || [];
  }

  public async getSyncStatus(): Promise<SyncStatus> {
    const res = await fetch('/api/calendar/sync-status', { headers: this.getHeaders() });
    const data = await res.json();
    return data.status;
  }

  public async triggerSync(): Promise<{ status: SyncStatus; events: CalendarEvent[] }> {
    const res = await fetch('/api/calendar/sync-now', {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return await res.json();
  }

  public async connectGoogle(accountEmail: string, accessToken?: string): Promise<{ status: SyncStatus }> {
    const res = await fetch('/api/calendar/connect-google', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ accountEmail, accessToken }),
    });
    return await res.json();
  }

  public async connectOutlook(accountEmail: string, accessToken?: string): Promise<{ status: SyncStatus }> {
    const res = await fetch('/api/calendar/connect-outlook', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ accountEmail, accessToken }),
    });
    return await res.json();
  }

  public async disconnectCalendar(provider: 'google' | 'outlook'): Promise<{ status: SyncStatus }> {
    const res = await fetch('/api/calendar/disconnect', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ provider }),
    });
    return await res.json();
  }

  public async createCalendarEvent(payload: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const res = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.event;
  }

  // Tasks
  public async getTasks(): Promise<Task[]> {
    const res = await fetch('/api/tasks', { headers: this.getHeaders() });
    const data = await res.json();
    return data.tasks || [];
  }

  public async createTask(payload: Partial<Task>): Promise<Task> {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.task;
  }

  public async updateTask(taskId: string, payload: Partial<Task>): Promise<Task> {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.task;
  }

  // Canvases
  public async getCanvases(): Promise<CanvasSchema[]> {
    const res = await fetch('/api/canvas', { headers: this.getHeaders() });
    const data = await res.json();
    return data.canvases || [];
  }

  public async saveCanvas(payload: { id?: string; title: string; elementsJson: any; snapshotBase64?: string }): Promise<CanvasSchema> {
    const res = await fetch('/api/canvas', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.canvas;
  }

  public async analyzeCanvas(canvasId: string, snapshotBase64?: string): Promise<{ canvas: CanvasSchema; analysis: any }> {
    const res = await fetch(`/api/canvas/${canvasId}/analyze`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ snapshotBase64 }),
    });
    return await res.json();
  }

  // Geofences
  public async getGeofences(): Promise<Geofence[]> {
    const res = await fetch('/api/geofences', { headers: this.getHeaders() });
    const data = await res.json();
    return data.geofences || [];
  }

  public async createGeofence(payload: Partial<Geofence>): Promise<Geofence> {
    const res = await fetch('/api/geofences', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.geofence;
  }

  public async checkLocation(latitude: number, longitude: number): Promise<any> {
    const res = await fetch('/api/geofences/check-location', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ latitude, longitude }),
    });
    return await res.json();
  }

  // Companion
  public async companionChat(messages: Array<{ role: string; content: string }>): Promise<{ message: string }> {
    const res = await fetch('/api/companion/chat', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ messages }),
    });
    return await res.json();
  }

  public async executeCompanionAction(toolName: string, payload: any): Promise<any> {
    const res = await fetch('/api/companion/execute-action', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ toolName, payload }),
    });
    return await res.json();
  }
}

export const api = new ApiClient();
