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
  users: [
    {
      id: 'user-gio',
      tenantId: 'tenant-enterprise-1',
      email: 'g.becchetti@pebbleassistant.com',
      name: 'Gio Becchetti',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    },
    {
      id: 'user-byron',
      tenantId: 'tenant-enterprise-1',
      email: 'byron@enterprise-client.com',
      name: 'Byron Spencer',
      role: 'member',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    },
    {
      id: 'user-maya',
      tenantId: 'tenant-enterprise-1',
      email: 'maya.chen@pebbleassistant.com',
      name: 'Maya Chen',
      role: 'member',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
    },
    {
      id: 'user-external-byron',
      tenantId: 'tenant-byron-corp',
      email: 'byron@byroncorp.com',
      name: 'Byron Spencer (Byron Corp)',
      role: 'admin',
    },
  ],
  notes: [
    {
      id: 'note-1',
      tenantId: 'tenant-enterprise-1',
      userId: 'user-gio',
      title: 'Q4 Product Roadmap & Multi-Tenant Architecture Review',
      content: `# Q4 Product Roadmap & Multi-Tenant Architecture Review

We discussed the transition to unified cognitive workflows.
Key points:
- Every voice note and meeting transcript must automatically distill into an actionable plan.
- Action items should propose calendar blocks rather than dying in text records.
- Google Calendar and Outlook need two-way sync with local conflict detection.
- Byron mentioned needing a revised enterprise SLA proposal by Friday 2:00 PM.
- GPS geofencing will trigger reminders whenever entering office or grocery shop.`,
      type: 'text',
      tags: ['Architecture', 'Enterprise', 'Roadmap'],
      actionablePlan: {
        objective: 'Finalize Q4 Multi-tenant architecture and prepare client SLA proposal',
        summary: 'Strategic planning meeting outlining unified cognitive workflows, two-way calendar sync, and spatial geofencing reminders.',
        actionSteps: [
          {
            id: 'as-1',
            step: 'Draft revised enterprise SLA proposal options for Byron',
            owner: 'Gio Becchetti',
            deadline: '2026-09-28T14:00:00Z',
            priority: 'urgent',
            completed: false,
          },
          {
            id: 'as-2',
            step: 'Configure bidirectional sync connectors for Google Calendar & Outlook Graph API',
            owner: 'Maya Chen',
            deadline: '2026-09-29T17:00:00Z',
            priority: 'high',
            completed: false,
          },
          {
            id: 'as-3',
            step: 'Test geofencing threshold in Android background service',
            owner: 'Gio Becchetti',
            deadline: '2026-09-30T12:00:00Z',
            priority: 'medium',
            completed: true,
          },
        ],
        bulletPoints: [
          'Agreed on zero-bleed tenant partitioning using tenant_id and row-level checks.',
          'Interactive companion agent (Aether) will coordinate cross-workspace tool execution.',
          'Schedule proposals require explicit user review & rationale approval before booking.',
        ],
        smartTips: [
          'Review Byron’s past SLA metrics before Thursday to ensure accurate discount bands.',
          'Reserve 30-minute focus buffer prior to the SLA presentation.',
        ],
        generatedDocument: {
          type: 'executive_brief',
          title: 'Executive Briefing: Q4 Multi-Tenant Rollout',
          markdown: `### Executive Briefing: Q4 Multi-Tenant Rollout

**Lead:** Gio Becchetti  
**Status:** Approved for implementation  

#### Executive Summary
OmniFlow bridges meeting cognition and calendar execution through automated proposal synthesis and strict multi-tenant isolation.

#### Strategic Objectives
1. Eliminate manual task scheduling by introducing the AI Commitment Ledger.
2. Provide seamless 2-way Google/Outlook calendar synchronization.
3. Deliver spatial geofencing reminders for on-the-go professionals.`,
        },
      },
      createdAt: '2026-09-25T09:00:00Z',
      updatedAt: '2026-09-25T10:30:00Z',
    },
    {
      id: 'note-2',
      tenantId: 'tenant-enterprise-1',
      userId: 'user-gio',
      title: 'Dictation: Groceries and Hardware Store Errands',
      content: `Voice memo: Remember to stop by the grocery store on the way back to buy freshly ground organic coffee beans and oat milk. Also visit Bunnings hardware to pick up 20mm drill bits and safety goggles.`,
      type: 'voice',
      tags: ['Personal', 'Errands'],
      actionablePlan: {
        objective: 'Complete household and workshop procurement',
        summary: 'Spoken note capturing immediate shopping needs with location-trigger potential.',
        actionSteps: [
          {
            id: 'as-4',
            step: 'Buy organic ground coffee and oat milk at Grocery Store',
            owner: 'Gio Becchetti',
            priority: 'medium',
            completed: false,
          },
          {
            id: 'as-5',
            step: 'Pick up 20mm drill bits and safety goggles at Hardware Store',
            owner: 'Gio Becchetti',
            priority: 'low',
            completed: false,
          },
        ],
        bulletPoints: ['Ground coffee beans (organic)', 'Oat milk (unsweetened)', '20mm wood drill bits', 'Impact safety goggles'],
        smartTips: ['Setup geofence for Supermarket so reminder pings immediately upon arrival.'],
      },
      createdAt: '2026-09-25T14:15:00Z',
      updatedAt: '2026-09-25T14:16:00Z',
    },
  ],
  meetings: [
    {
      id: 'meeting-1',
      tenantId: 'tenant-enterprise-1',
      userId: 'user-gio',
      title: 'Enterprise Architecture & SLA Alignment with Byron',
      date: '2026-09-26T11:00:00Z',
      durationMinutes: 30,
      status: 'completed',
      speakers: ['Gio Becchetti', 'Byron Spencer', 'Maya Chen'],
      transcriptSegments: [
        {
          id: 'ts-1',
          speaker: 'Gio Becchetti',
          text: 'Thanks everyone for jumping on. Byron, how did your team find the multi-tenant isolation demo yesterday?',
          timestamp: '00:05',
          confidence: 0.98,
        },
        {
          id: 'ts-2',
          speaker: 'Byron Spencer',
          text: 'The isolation was rock-solid, Gio. What we really need now is certainty on the 99.99% uptime guarantee and the enterprise SLA terms. Can you send over a revised SLA breakdown by next Tuesday at 2:00 PM?',
          timestamp: '00:42',
          confidence: 0.96,
        },
        {
          id: 'ts-3',
          speaker: 'Gio Becchetti',
          text: 'Absolutely. Maya and I will review the infrastructure telemetry on Monday morning and schedule a review session with you on Tuesday at 2:00 PM.',
          timestamp: '01:15',
          confidence: 0.97,
        },
        {
          id: 'ts-4',
          speaker: 'Maya Chen',
          text: 'I will also make sure the two-way Google Calendar sync is completely verified by Friday so your team can test the calendar feed directly.',
          timestamp: '01:50',
          confidence: 0.95,
        },
      ],
      summary: 'High-impact sync confirming successful tenant isolation demo and establishing Byron’s request for revised SLA terms by Tuesday at 2:00 PM.',
      decisions: [
        'Proceed with 99.99% SLA tier backed by Azure availability zones.',
        'Deliver finalized SLA documentation to Byron before Tuesday 2:00 PM meeting.',
      ],
      actionPlan: {
        objective: 'Deliver Enterprise SLA proposal and schedule follow-up review with Byron',
        summary: 'Agreement to send revised SLA and conduct a formal 45-minute review next Tuesday.',
        actionSteps: [
          {
            id: 'as-m1',
            step: 'Prepare 99.99% Enterprise SLA document with multi-region guarantees',
            owner: 'Maya Chen',
            deadline: '2026-09-28T18:00:00Z',
            priority: 'urgent',
            completed: false,
          },
          {
            id: 'as-m2',
            step: 'Host SLA Review & Sign-off Demo with Byron Spencer',
            owner: 'Gio Becchetti',
            deadline: '2026-09-29T14:00:00Z',
            priority: 'urgent',
            completed: false,
          },
        ],
        bulletPoints: [
          'Byron praised the multi-tenant security architecture.',
          'Key pending deliverable: revised SLA pricing & uptime annex.',
          'Maya to finalize Google Calendar sync integration testing.',
        ],
        smartTips: [
          'Pre-meeting Radar: Review Byron’s previous company requirements 15 minutes before the Tuesday call.',
        ],
      },
      createdAt: '2026-09-25T11:30:00Z',
    },
  ],
  proposals: [
    {
      id: 'prop-1',
      tenantId: 'tenant-enterprise-1',
      userId: 'user-gio',
      sourceId: 'meeting-1',
      sourceType: 'meeting',
      title: 'Follow-up: SLA Review & Sign-off Demo with Byron Spencer',
      startTime: '2026-09-29T14:00:00Z',
      endTime: '2026-09-29T14:45:00Z',
      durationMinutes: 45,
      location: 'Microsoft Teams / Pebble Room 4',
      attendees: ['g.becchetti@pebbleassistant.com', 'byron@enterprise-client.com', 'maya.chen@pebbleassistant.com'],
      rationale: 'During the meeting at 00:42, Byron requested a revised SLA breakdown by Tuesday at 2:00 PM. Both your calendar and Byron’s shared slot are currently open.',
      tip: 'The assistant recommends this 45-min slot to review the SLA terms with Byron before month-end closing.',
      status: 'pending',
      targetCalendar: 'google',
      createdAt: '2026-09-25T11:35:00Z',
    },
    {
      id: 'prop-2',
      tenantId: 'tenant-enterprise-1',
      userId: 'user-gio',
      sourceId: 'note-1',
      sourceType: 'note',
      title: 'Focus Block: Draft Revised Enterprise SLA Proposal',
      startTime: '2026-09-28T10:00:00Z',
      endTime: '2026-09-28T11:30:00Z',
      durationMinutes: 90,
      location: 'Deep Work Focus',
      attendees: ['g.becchetti@pebbleassistant.com'],
      rationale: 'Extracted from Q4 Roadmap note: You need 90 minutes of uninterrupted focus to draft the pricing matrix before Maya’s review.',
      tip: 'Morning slot chosen to protect high-energy hours ahead of afternoon client discussions.',
      status: 'pending',
      targetCalendar: 'local',
      createdAt: '2026-09-25T11:40:00Z',
    },
  ],
  calendarEvents: [
    {
      id: 'cal-1',
      tenantId: 'tenant-enterprise-1',
      userId: 'user-gio',
      title: '⚡ Today: Executive Architecture Sync with Byron (In 20 Min)',
      description: 'Review multi-tenant data isolation and discuss upcoming enterprise SLA timeline.',
      startTime: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 50 * 60 * 1000).toISOString(),
      provider: 'local',
      location: 'Virtual Conference 1',
      attendees: ['Byron Spencer', 'Gio Becchetti'],
      color: '#3b82f6',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cal-2',
      tenantId: 'tenant-enterprise-1',
      userId: 'user-gio',
      title: '📅 Google Calendar: Product Growth & Metric Review',
      description: 'Synchronized live from Google Calendar account (g.becchetti@pebbleassistant.com)',
      startTime: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
      endTime: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      provider: 'google',
      externalId: 'gcal-evt-99482',
      location: 'Google Meet',
      attendees: ['growth-team@pebbleassistant.com'],
      color: '#10b981',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cal-3',
      tenantId: 'tenant-enterprise-1',
      userId: 'user-gio',
      title: '📫 Outlook: Enterprise Security & Compliance Board',
      description: 'Synchronized from Microsoft 365 Outlook Calendar via Microsoft Graph',
      startTime: new Date(Date.now() + 26 * 3600 * 1000).toISOString(),
      endTime: new Date(Date.now() + 27 * 3600 * 1000).toISOString(),
      provider: 'outlook',
      externalId: 'ms-graph-8831',
      location: 'Microsoft Teams',
      attendees: ['compliance@enterprise.com'],
      color: '#0284c7',
      createdAt: new Date().toISOString(),
    },
  ],
  tasks: [
    {
      id: 'task-1',
      tenantId: 'tenant-enterprise-1',
      userId: 'user-gio',
      title: 'Prepare Byron Pre-Meeting Briefing & Talking Points',
      description: 'Assemble key accomplishments from recent sprint and note Byron’s pain points regarding SLA uptime.',
      dueDate: new Date(Date.now() + 2 * 3600 * 1000).toISOString().split('T')[0],
      priority: 'urgent',
      status: 'in_progress',
      subtasks: [
        { id: 'st-1', title: 'Check Byron note from yesterday', completed: true },
        { id: 'st-2', title: 'Review 99.99% uptime metrics from Azure Foundry', completed: true },
        { id: 'st-3', title: 'Prepare one-page summary sheet', completed: false },
      ],
      linkedMeetingId: 'meeting-1',
      tags: ['Client', 'Byron', 'High Priority'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-2',
      tenantId: 'tenant-enterprise-1',
      userId: 'user-gio',
      title: 'Calibrate GPS Geofencing Radius for Shopping Reminder',
      description: 'Verify phone geolocation triggering with 150m perimeter around Central Supermarket.',
      dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
      priority: 'medium',
      status: 'todo',
      subtasks: [
        { id: 'st-4', title: 'Test Haversine distance calculator', completed: true },
        { id: 'st-5', title: 'Test audio ping on fence entry', completed: false },
      ],
      tags: ['Mobile', 'GPS'],
      createdAt: new Date().toISOString(),
    },
  ],
  canvases: [
    {
      id: 'canvas-1',
      tenantId: 'tenant-enterprise-1',
      userId: 'user-gio',
      title: 'OmniFlow Multi-Tenant Architecture & Data Flow Schema',
      elementsJson: JSON.stringify({
        nodes: [
          { id: 'n1', type: 'service', label: 'Audio Ingestion & Live Diarizer', x: 80, y: 100 },
          { id: 'n2', type: 'ai', label: 'Azure OpenAI & Astra Cognitive Core', x: 340, y: 100 },
          { id: 'n3', type: 'engine', label: 'Commitment Ledger & Approval Engine', x: 620, y: 100 },
          { id: 'n4', type: 'sync', label: 'Two-Way Google & Outlook Sync', x: 620, y: 260 },
          { id: 'n5', type: 'companion', label: 'Aether Omniscient Companion', x: 340, y: 260 },
          { id: 'n6', type: 'mobile', label: 'Mobile Geofence & Spatial Tracker', x: 80, y: 260 },
        ],
        connections: [
          { from: 'n1', to: 'n2', label: 'Diarized Streams' },
          { from: 'n2', to: 'n3', label: 'Proposed Commitments' },
          { from: 'n3', to: 'n4', label: 'Approved Events' },
          { from: 'n5', to: 'n2', label: 'Natural Language Tools' },
          { from: 'n6', to: 'n5', label: 'Spatial Proximity Alerts' },
        ],
      }),
      analysis: {
        summary: 'Architectural diagram illustrating the end-to-end cognitive loop from voice capture to two-way calendar synchronization and proactive spatial alerting.',
        architectureComponents: [
          { name: 'Audio Ingestion & Live Diarizer', type: 'Speech Pipeline', description: 'Splits multi-speaker audio into labeled speaker chunks with timestamped confidence.' },
          { name: 'Azure OpenAI & Astra Cognitive Core', type: 'AI Synthesis', description: 'Extracts actionable plans, executive documents, and scheduling intents with explicit rationale.' },
          { name: 'Commitment Ledger & Approval Engine', type: 'Workflow State Machine', description: 'Prevents automatic calendar pollution by requiring human-in-the-loop review.' },
          { name: 'Two-Way Google & Outlook Sync', type: 'Calendar Connector', description: 'Maintains bidirectional consistency across Microsoft Graph and Google Calendar APIs.' },
          { name: 'Mobile Geofence & Spatial Tracker', type: 'Location Engine', description: 'Monitors real-time coordinates against active reminder targets using Haversine calculation.' },
        ],
        dataFlow: [
          'Audio -> Live Diarizer -> Transcript Segments -> AI Extraction -> Proposals Table -> User Approval -> External Calendar Sync.',
          'GPS Coordinates -> Haversine Evaluator -> Geofence Radius -> Spatial Notification Banner -> Aether Companion Prompt.',
        ],
        actionItems: [
          'Verify tenant_id composite primary keys on all Cosmos DB containers.',
          'Benchmark streaming diarization latency under noisy room audio conditions.',
        ],
        suggestions: [
          'Include dead-letter queue for failed Google/Outlook webhook notifications.',
          'Add confidence thresholds for auto-linking recurring contacts.',
        ],
      },
      createdAt: '2026-09-25T15:00:00Z',
      updatedAt: '2026-09-25T16:00:00Z',
    },
  ],
  geofences: [
    {
      id: 'geo-1',
      tenantId: 'tenant-enterprise-1',
      userId: 'user-gio',
      name: 'Fresh Market / Central Grocery Store',
      address: '42 Market Street, Sydney NSW 2000',
      latitude: -33.8708,
      longitude: 151.2073,
      radiusMeters: 150,
      reminderMessage: '☕ Buy freshly ground organic coffee beans and oat milk!',
      isActive: true,
      triggerCount: 3,
      lastTriggeredAt: '2026-09-24T17:30:00Z',
      createdAt: '2026-09-20T08:00:00Z',
    },
    {
      id: 'geo-2',
      tenantId: 'tenant-enterprise-1',
      userId: 'user-gio',
      name: 'Sydney Office Tech Hub',
      address: '100 Barangaroo Avenue, Barangaroo NSW 2000',
      latitude: -33.8643,
      longitude: 151.2015,
      radiusMeters: 200,
      reminderMessage: '💼 Check in with Byron on enterprise SLA proposal before afternoon standup.',
      isActive: true,
      triggerCount: 5,
      lastTriggeredAt: '2026-09-25T08:45:00Z',
      createdAt: '2026-09-20T08:00:00Z',
    },
    {
      id: 'geo-3',
      tenantId: 'tenant-enterprise-1',
      userId: 'user-gio',
      name: 'Workshop & Hardware Depot',
      address: '15 Industrial Blvd, Alexandria NSW 2015',
      latitude: -33.9100,
      longitude: 151.1900,
      radiusMeters: 250,
      reminderMessage: '🔧 Pick up 20mm drill bits and safety goggles for workshop project.',
      isActive: true,
      triggerCount: 1,
      createdAt: '2026-09-24T12:00:00Z',
    },
  ],
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
