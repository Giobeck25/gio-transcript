import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Bell,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Smartphone,
  Compass,
} from 'lucide-react';
import { Geofence } from '../types/index.js';
import { api } from '../services/api.js';

interface GeofenceViewProps {
  geofences: Geofence[];
  onRefreshGeofences: () => void;
}

export const GeofenceView: React.FC<GeofenceViewProps> = ({ geofences, onRefreshGeofences }) => {
  // Current user position (defaulted to Sydney coordinates)
  const [currentPos, setCurrentPos] = useState<{ lat: number; lon: number }>({
    lat: -33.8715,
    lon: 151.208,
  });

  const [nearestResult, setNearestResult] = useState<any>(null);
  const [activeAlerts, setActiveAlerts] = useState<Array<{ message: string; geofence: Geofence }>>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLat, setNewLat] = useState(-33.8708);
  const [newLon, setNewLon] = useState(151.2073);
  const [newRadius, setNewRadius] = useState(150);
  const [newReminder, setNewReminder] = useState('');

  // Real-time location tracking check
  const evaluateLocation = async (lat: number, lon: number) => {
    try {
      const res = await api.checkLocation(lat, lon);
      if (res.nearestGeofence) {
        setNearestResult(res.nearestGeofence);
      }
      if (res.triggeredGeofences && res.triggeredGeofences.length > 0) {
        setActiveAlerts(res.triggeredGeofences);
        // Play gentle audio beep
        playBeep();
      } else {
        setActiveAlerts([]);
      }
    } catch (err) {
      console.warn('Geofence check error:', err);
    }
  };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {}
  };

  useEffect(() => {
    // Initial evaluation
    evaluateLocation(currentPos.lat, currentPos.lon);

    // Watch position if supported by browser/smartphone
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setCurrentPos({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          evaluateLocation(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn('Native GPS watch not active, using accurate simulator:', err.message);
        },
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const handleSimulateInsideStore = () => {
    // Exact location of Grocery Store geofence (-33.8708, 151.2073)
    const target = geofences[0] || { latitude: -33.8708, longitude: 151.2073 };
    setCurrentPos({ lat: target.latitude, lon: target.longitude });
    evaluateLocation(target.latitude, target.longitude);
  };

  const handleSimulateOutside = () => {
    // 500 meters away
    setCurrentPos({ lat: -33.875, lon: 151.215 });
    evaluateLocation(-33.875, 151.215);
  };

  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newReminder) return;

    await api.createGeofence({
      name: newName,
      address: newAddress,
      latitude: newLat,
      longitude: newLon,
      radiusMeters: newRadius,
      reminderMessage: newReminder,
    });

    setIsAdding(false);
    setNewName('');
    setNewReminder('');
    onRefreshGeofences();
  };

  return (
    <div className="space-y-6">
      {/* Active Trigger Alert Toast / Banner */}
      {activeAlerts.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-rose-950 via-amber-950/80 to-purple-950 border-2 border-amber-400 p-5 shadow-2xl flex items-center justify-between gap-4 animate-bounce">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider">
                📍 GEOFENCE PERIMETER TRIGGERED
              </span>
              <h3 className="font-extrabold text-base text-white mt-1">
                {activeAlerts[0].geofence.name}
              </h3>
              <p className="text-xs text-amber-200 mt-0.5 font-medium">
                {activeAlerts[0].message}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveAlerts([])}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Geofencing Status & Live GPS Bar */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            Smartphone GPS Geofence Reminders
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Location-triggered notifications. Reminds you of grocery shopping, hardware procurement, or office errands the moment your phone enters the store perimeter.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSimulateInsideStore}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition"
          >
            <MapPin className="w-4 h-4 text-amber-300" />
            <span>Simulate Entering Store</span>
          </button>
          <button
            onClick={handleSimulateOutside}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
          >
            <span>Step Outside Perimeter</span>
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Geofence</span>
          </button>
        </div>
      </div>

      {/* Live GPS Coordinates Monitor Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-indigo-400" /> Current Coordinates
          </p>
          <p className="text-sm font-mono text-white font-bold">
            {currentPos.lat.toFixed(5)}, {currentPos.lon.toFixed(5)}
          </p>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            GPS Service Active (Haversine Evaluator)
          </p>
        </div>

        <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" /> Nearest Geofence
          </p>
          <p className="text-sm font-bold text-slate-200">
            {nearestResult?.geofence?.name || 'Fresh Market Grocery Store'}
          </p>
          <p className="text-[11px] text-cyan-300 font-mono">
            Distance: <strong>{nearestResult?.distanceMeters ?? 75} meters</strong> (Radius: {nearestResult?.geofence?.radiusMeters ?? 150}m)
          </p>
        </div>

        <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-purple-400" /> Audio Ping Alerts
          </p>
          <p className="text-sm font-bold text-slate-200">Synthesized 880Hz Chime</p>
          <p className="text-[11px] text-slate-400">Plays automatically on boundary ingress</p>
        </div>
      </div>

      {/* Geofences List */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-400" />
          Active Spatial Reminders ({geofences.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {geofences.map((gf) => (
            <div
              key={gf.id}
              className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-3 hover:border-emerald-800/60 transition group shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Radius: {gf.radiusMeters}m
                  </span>
                  <h4 className="font-bold text-sm text-slate-100 mt-1.5">{gf.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{gf.address}</p>
                </div>
              </div>

              {/* Reminder Message */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-amber-200 font-medium leading-relaxed">
                {gf.reminderMessage}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-900">
                <span>Triggered: {gf.triggerCount} times</span>
                <span className="text-emerald-400">● Active</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Geofence Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">Create Geofenced Reminder</h3>
            <form onSubmit={handleCreateGeofence} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Place Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Bunnings Hardware Depot"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Address / Description</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="15 Industrial Blvd, Alexandria NSW"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newLat}
                    onChange={(e) => setNewLat(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newLon}
                    onChange={(e) => setNewLon(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Geofence Radius (Meters)</label>
                <input
                  type="number"
                  value={newRadius}
                  onChange={(e) => setNewRadius(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Reminder Alert Message</label>
                <textarea
                  value={newReminder}
                  onChange={(e) => setNewReminder(e.target.value)}
                  rows={2}
                  placeholder="e.g. ☕ Remember to buy freshly ground organic coffee beans and oat milk!"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Save Geofence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
