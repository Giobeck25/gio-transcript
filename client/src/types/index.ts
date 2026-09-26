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
}

export interface ActionStep {
  id: string;
  step: string;
  owner: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  completed: boolean;
}

export interface ActionablePlan {
  objective: string;
  summary: string;
  actionSteps: ActionStep[];
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
  speaker: string;
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
  elementsJson: string;
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

export interface SyncStatus {
  lastSyncedAt: string;
  googleCalendar: {
    connected: boolean;
    account: string;
    eventsSynced: number;
    health: 'healthy' | 'syncing' | 'error';
  };
  outlookCalendar: {
    connected: boolean;
    account: string;
    eventsSynced: number;
    health: 'healthy' | 'syncing' | 'error';
  };
  localEventsCount: number;
}
