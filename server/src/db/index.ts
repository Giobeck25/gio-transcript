import fs from 'fs';
import path from 'path';
import { CosmosClient } from '@azure/cosmos';
import { config } from '../config.js';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: 'admin' | 'member' | 'guest';
  avatar?: string;
  preferences?: Record<string, any>;
  passwordHash?: string;
  salt?: string;
}

export interface ActionablePlan {
  objective: string;
  summary: string;
  actionSteps: Array<{
    id: string;
    step: string;
    owner: string;
    deadline?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    completed: boolean;
  }>;
  bulletPoints: string[];
  smartTips: string[];
  generatedDocument?: {
    type: 'executive_brief' | 'prd' | 'client_followup' | 'meeting_minutes';
    title: string;
    markdown: string;
  };
}

export interface Note {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  content: string;
  type: 'text' | 'voice' | 'transcript' | 'sketch';
  audioUrl?: string;
  tags: string[];
  actionablePlan?: ActionablePlan;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptSegment {
  id: string;
  speaker: string; // e.g. "Speaker 1 (Gio)", "Speaker 2 (Byron)"
  text: string;
  timestamp: string;
  confidence?: number;
}

export interface Meeting {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  date: string;
  durationMinutes: number;
  status: 'scheduled' | 'recording' | 'completed';
  speakers: string[];
  transcriptSegments: TranscriptSegment[];
  summary?: string;
  decisions?: string[];
  actionPlan?: ActionablePlan;
  createdAt: string;
}

export interface Proposal {
  id: string;
  tenantId: string;
  userId: string;
  sourceId: string;
  sourceType: 'note' | 'meeting' | 'transcript' | 'chat';
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  location?: string;
  attendees: string[];
  rationale: string;
  tip: string;
  status: 'pending' | 'approved' | 'declined' | 'edited';
  targetCalendar: 'local' | 'google' | 'outlook';
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  provider: 'local' | 'google' | 'outlook';
  externalId?: string;
  location?: string;
  attendees?: string[];
  color?: string;
  sourceProposalId?: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed';
  subtasks: Subtask[];
  linkedNoteId?: string;
  linkedMeetingId?: string;
  tags: string[];
  createdAt: string;
}

export interface CanvasSchema {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  elementsJson: string; // serialized canvas elements & connectors
  snapshotBase64?: string;
  analysis?: {
    summary: string;
    architectureComponents: Array<{ name: string; type: string; description: string }>;
    dataFlow: string[];
    actionItems: string[];
    suggestions: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface Geofence {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  reminderMessage: string;
  isActive: boolean;
  triggerCount: number;
  lastTriggeredAt?: string;
  createdAt: string;
}

export interface DatabaseSchema {
  tenants: Tenant[];
  users: User[];
  notes: Note[];
  meetings: Meeting[];
  proposals: Proposal[];
  calendarEvents: CalendarEvent[];
  tasks: Task[];
  canvases: CanvasSchema[];
  geofences: Geofence[];
  auditLogs: Array<{
    id: string;
    tenantId: string;
    userId: string;
    action: string;
    details: any;
    timestamp: string;
  }>;
}

// Local JSON DB file path for resilient zero-latency persistence
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Initial seed data with multi-tenancy demonstrated out of the box
const initialSeedData: DatabaseSchema = {
  tenants: [
    {
      id: 'tenant-enterprise-1',
      name: 'Pebble Global Enterprise',
      slug: 'pebble-enterprise',
      plan: 'Enterprise Tier',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tenant-byron-corp',
      name: 'Byron Logistics & Supply Co.',
      slug: 'byron-corp',
      plan: 'Professional Tier',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tenant-personal',
      name: 'Gio Personal Workspace',
      slug: 'gio-personal',
      plan: 'Individual Pro',
      createdAt: new Date().toISOString(),
    },
  ],
  users: [],
  notes: [],
  meetings: [],
  proposals: [],
  calendarEvents: [],
  tasks: [],
  canvases: [],
  geofences: [],
  auditLogs: [],
};

class DatabaseService {
  private data: DatabaseSchema;
  private cosmosClient: CosmosClient | null = null;
  private isCosmosConnected = false;

  constructor() {
    this.ensureDataDir();
    this.data = this.loadLocalData();
    this.initCosmos();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadLocalData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[DB] Failed reading db.json, using seed data:', err);
    }
    this.saveLocalData(initialSeedData);
    return JSON.parse(JSON.stringify(initialSeedData));
  }

  public saveLocalData(dataToSave?: DatabaseSchema) {
    try {
      this.ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave || this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed writing to db.json:', err);
    }
  }

  private async initCosmos() {
    try {
      if (config.azure.cosmos.endpoint && config.azure.cosmos.key) {
        this.cosmosClient = new CosmosClient({
          endpoint: config.azure.cosmos.endpoint,
          key: config.azure.cosmos.key,
        });
        // Test connectivity
        const { database } = await this.cosmosClient.databases.createIfNotExists({
          id: config.azure.cosmos.databaseId,
        });
        console.log(`[CosmosDB] Connected to Azure Cosmos DB: ${database.id}`);
        this.isCosmosConnected = true;
      }
    } catch (err) {
      console.warn('[CosmosDB] Azure Cosmos DB connection check warning (falling back to resilient local JSON store):', (err as Error).message);
    }
  }

  // Multi-Tenant Isolation Helpers
  public getTenants(): Tenant[] {
    return this.data.tenants;
  }

  public getTenant(tenantId: string): Tenant | undefined {
    return this.data.tenants.find((t) => t.id === tenantId);
  }

  public getUsers(tenantId: string): User[] {
    return this.data.users.filter((u) => u.tenantId === tenantId);
  }

  public getUser(userId: string): User | undefined {
    return this.data.users.find((u) => u.id === userId);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public getNotes(tenantId: string): Note[] {
    return this.data.notes.filter((n) => n.tenantId === tenantId);
  }

  public getNote(tenantId: string, noteId: string): Note | undefined {
    return this.data.notes.find((n) => n.tenantId === tenantId && n.id === noteId);
  }

  public saveNote(note: Note): Note {
    const idx = this.data.notes.findIndex((n) => n.tenantId === note.tenantId && n.id === note.id);
    if (idx >= 0) {
      this.data.notes[idx] = note;
    } else {
      this.data.notes.unshift(note);
    }
    this.saveLocalData();
    return note;
  }

  public deleteNote(tenantId: string, noteId: string): boolean {
    const initialLen = this.data.notes.length;
    this.data.notes = this.data.notes.filter((n) => !(n.tenantId === tenantId && n.id === noteId));
    if (this.data.notes.length !== initialLen) {
      this.saveLocalData();
      return true;
    }
    return false;
  }

  public getMeetings(tenantId: string): Meeting[] {
    return this.data.meetings.filter((m) => m.tenantId === tenantId);
  }

  public getMeeting(tenantId: string, meetingId: string): Meeting | undefined {
    return this.data.meetings.find((m) => m.tenantId === tenantId && m.id === meetingId);
  }

  public saveMeeting(meeting: Meeting): Meeting {
    const idx = this.data.meetings.findIndex((m) => m.tenantId === meeting.tenantId && m.id === meeting.id);
    if (idx >= 0) {
      this.data.meetings[idx] = meeting;
    } else {
      this.data.meetings.unshift(meeting);
    }
    this.saveLocalData();
    return meeting;
  }

  public getProposals(tenantId: string): Proposal[] {
    return this.data.proposals.filter((p) => p.tenantId === tenantId);
  }

  public getProposal(tenantId: string, proposalId: string): Proposal | undefined {
    return this.data.proposals.find((p) => p.tenantId === tenantId && p.id === proposalId);
  }

  public saveProposal(proposal: Proposal): Proposal {
    const idx = this.data.proposals.findIndex((p) => p.tenantId === proposal.tenantId && p.id === proposal.id);
    if (idx >= 0) {
      this.data.proposals[idx] = proposal;
    } else {
      this.data.proposals.unshift(proposal);
    }
    this.saveLocalData();
    return proposal;
  }

  public deleteProposal(tenantId: string, proposalId: string): boolean {
    const initialLen = this.data.proposals.length;
    this.data.proposals = this.data.proposals.filter((p) => !(p.tenantId === tenantId && p.id === proposalId));
    if (this.data.proposals.length !== initialLen) {
      this.saveLocalData();
      return true;
    }
    return false;
  }

  public getCalendarEvents(tenantId: string): CalendarEvent[] {
    return this.data.calendarEvents.filter((c) => c.tenantId === tenantId);
  }

  public saveCalendarEvent(event: CalendarEvent): CalendarEvent {
    const idx = this.data.calendarEvents.findIndex((c) => c.tenantId === event.tenantId && c.id === event.id);
    if (idx >= 0) {
      this.data.calendarEvents[idx] = event;
    } else {
      this.data.calendarEvents.unshift(event);
    }
    this.saveLocalData();
    return event;
  }

  public deleteCalendarEvent(tenantId: string, eventId: string): boolean {
    const initialLen = this.data.calendarEvents.length;
    this.data.calendarEvents = this.data.calendarEvents.filter((c) => !(c.tenantId === tenantId && c.id === eventId));
    if (this.data.calendarEvents.length !== initialLen) {
      this.saveLocalData();
      return true;
    }
    return false;
  }

  public getTasks(tenantId: string): Task[] {
    return this.data.tasks.filter((t) => t.tenantId === tenantId);
  }

  public saveTask(task: Task): Task {
    const idx = this.data.tasks.findIndex((t) => t.tenantId === task.tenantId && t.id === task.id);
    if (idx >= 0) {
      this.data.tasks[idx] = task;
    } else {
      this.data.tasks.unshift(task);
    }
    this.saveLocalData();
    return task;
  }

  public deleteTask(tenantId: string, taskId: string): boolean {
    const initialLen = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter((t) => !(t.tenantId === tenantId && t.id === taskId));
    if (this.data.tasks.length !== initialLen) {
      this.saveLocalData();
      return true;
    }
    return false;
  }

  public getCanvases(tenantId: string): CanvasSchema[] {
    return this.data.canvases.filter((c) => c.tenantId === tenantId);
  }

  public getCanvas(tenantId: string, id: string): CanvasSchema | undefined {
    return this.data.canvases.find((c) => c.tenantId === tenantId && c.id === id);
  }

  public saveCanvas(canvas: CanvasSchema): CanvasSchema {
    const idx = this.data.canvases.findIndex((c) => c.tenantId === canvas.tenantId && c.id === canvas.id);
    if (idx >= 0) {
      this.data.canvases[idx] = canvas;
    } else {
      this.data.canvases.unshift(canvas);
    }
    this.saveLocalData();
    return canvas;
  }

  public deleteCanvas(tenantId: string, canvasId: string): boolean {
    const initialLen = this.data.canvases.length;
    this.data.canvases = this.data.canvases.filter((c) => !(c.tenantId === tenantId && c.id === canvasId));
    if (this.data.canvases.length !== initialLen) {
      this.saveLocalData();
      return true;
    }
    return false;
  }

  public getGeofences(tenantId: string): Geofence[] {
    return this.data.geofences.filter((g) => g.tenantId === tenantId);
  }

  public saveGeofence(geofence: Geofence): Geofence {
    const idx = this.data.geofences.findIndex((g) => g.tenantId === geofence.tenantId && g.id === geofence.id);
    if (idx >= 0) {
      this.data.geofences[idx] = geofence;
    } else {
      this.data.geofences.unshift(geofence);
    }
    this.saveLocalData();
    return geofence;
  }

  public deleteGeofence(tenantId: string, geofenceId: string): boolean {
    const initialLen = this.data.geofences.length;
    this.data.geofences = this.data.geofences.filter((g) => !(g.tenantId === tenantId && g.id === geofenceId));
    if (this.data.geofences.length !== initialLen) {
      this.saveLocalData();
      return true;
    }
    return false;
  }

  public logAudit(tenantId: string, userId: string, action: string, details: any) {
    this.data.auditLogs.unshift({
      id: 'audit-' + Date.now(),
      tenantId,
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
    // keep max 500 audit logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.saveLocalData();
  }
}

export const db = new DatabaseService();
