import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  RefreshCw,
  Plus,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { CalendarEvent, SyncStatus } from '../types/index.js';
import { api } from '../services/api.js';

interface CalendarViewProps {
  events: CalendarEvent[];
  syncStatus: SyncStatus | null;
  onRefreshEvents: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ events, syncStatus, onRefreshEvents }) => {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week');
  const [providerFilter, setProviderFilter] = useState<'all' | 'local' | 'google' | 'outlook'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  // New Event Form State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventProvider, setNewEventProvider] = useState<'local' | 'google' | 'outlook'>('local');
  const [newEventDate, setNewEventDate] = useState('2026-09-28');
  const [newEventStartTime, setNewEventStartTime] = useState('14:00');
  const [newEventDuration, setNewEventDuration] = useState(45);
  const [newEventLocation, setNewEventLocation] = useState('Virtual Conference 1');

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await api.triggerSync();
      onRefreshEvents();
      alert('2-Way Sync completed! Google Calendar and Microsoft Outlook feeds are up to date.');
    } catch (err: any) {
      alert('Sync error: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const startDateTime = new Date(`${newEventDate}T${newEventStartTime}:00Z`).toISOString();
    const endDateTime = new Date(new Date(startDateTime).getTime() + newEventDuration * 60000).toISOString();

    await api.createCalendarEvent({
      title: newEventTitle.trim(),
      provider: newEventProvider,
      startTime: startDateTime,
      endTime: endDateTime,
      location: newEventLocation,
    });

    setIsAddingEvent(false);
    setNewEventTitle('');
    onRefreshEvents();
  };

  const filteredEvents = events.filter((e) => {
    if (providerFilter === 'all') return true;
    return e.provider === providerFilter;
  });

  return (
    <div className="space-y-6">
      {/* 2-Way Sync Integration Status Bar */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-200">Google Calendar:</span>
            <span className="text-xs text-slate-400 font-mono">Connected</span>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-200">Microsoft Outlook:</span>
            <span className="text-xs text-slate-400 font-mono">Connected</span>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="text-[11px] text-slate-400">
            Last synced: <span className="text-slate-300">{syncStatus?.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString() : 'Just now'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing Feeds...' : 'Sync Now'}</span>
          </button>
          <button
            onClick={() => setIsAddingEvent(true)}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Filter and View Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        {/* Provider Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-slate-400 font-medium px-2 text-[11px] flex items-center gap-1">
            <Filter className="w-3 h-3" /> Source:
          </span>
          <button
            onClick={() => setProviderFilter('all')}
            className={`px-3 py-1 rounded-lg transition font-medium ${
              providerFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Feeds ({events.length})
          </button>
          <button
            onClick={() => setProviderFilter('google')}
            className={`px-3 py-1 rounded-lg transition font-medium flex items-center gap-1.5 ${
              providerFilter === 'google' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Google Calendar
          </button>
          <button
            onClick={() => setProviderFilter('outlook')}
            className={`px-3 py-1 rounded-lg transition font-medium flex items-center gap-1.5 ${
              providerFilter === 'outlook' ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            Outlook
          </button>
          <button
            onClick={() => setProviderFilter('local')}
            className={`px-3 py-1 rounded-lg transition font-medium flex items-center gap-1.5 ${
              providerFilter === 'local' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            Local Workspace
          </button>
        </div>

        {/* View Modes */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs self-start sm:self-auto">
          {(['month', 'week', 'day'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded capitalize font-medium transition ${
                viewMode === mode ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Event Schedule List */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-indigo-400" />
          Synchronized Schedule View ({filteredEvents.length} events)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-3 hover:border-slate-700 transition relative overflow-hidden group shadow-lg"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: evt.color || '#3b82f6' }}
              />

              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                      evt.provider === 'google'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : evt.provider === 'outlook'
                        ? 'bg-sky-950 text-sky-400 border-sky-800'
                        : 'bg-indigo-950 text-indigo-400 border-indigo-800'
                    }`}
                  >
                    {evt.provider}
                  </span>
                  <h4 className="font-bold text-sm text-slate-100 mt-2">{evt.title}</h4>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400">
                <p className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {new Date(evt.startTime).toLocaleDateString()} •{' '}
                    {new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {new Date(evt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
                {evt.location && (
                  <p className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{evt.location}</span>
                  </p>
                )}
                {evt.attendees && evt.attendees.length > 0 && (
                  <p className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{evt.attendees.join(', ')}</span>
                  </p>
                )}
              </div>

              {evt.description && (
                <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-900 leading-relaxed">
                  {evt.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Custom Event Modal */}
      {isAddingEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">Create Calendar Event</h3>
            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Event Title</label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="e.g. Technical Review with Engineering"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Date</label>
                  <input
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newEventStartTime}
                    onChange={(e) => setNewEventStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Target Provider</label>
                  <select
                    value={newEventProvider}
                    onChange={(e) => setNewEventProvider(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="local">Local Workspace</option>
                    <option value="google">Google Calendar</option>
                    <option value="outlook">Microsoft Outlook</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Duration (Min)</label>
                  <input
                    type="number"
                    value={newEventDuration}
                    onChange={(e) => setNewEventDuration(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Location</label>
                <input
                  type="text"
                  value={newEventLocation}
                  onChange={(e) => setNewEventLocation(e.target.value)}
                  placeholder="Google Meet / Teams / Office"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingEvent(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Save & Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
