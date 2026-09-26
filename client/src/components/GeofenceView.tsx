import React, { useState, useEffect, useRef } from 'react';
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
  Trash2,
  CheckSquare,
  Crosshair,
  Footprints,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import L from 'leaflet';
import { Geofence } from '../types/index.js';
import { api } from '../services/api.js';

interface GeofenceViewProps {
  geofences: Geofence[];
  onRefreshGeofences: () => void;
  onRefreshTasks?: () => void;
}

// Haversine distance calculator in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export const GeofenceView: React.FC<GeofenceViewProps> = ({
  geofences,
  onRefreshGeofences,
  onRefreshTasks,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const geofenceLayersRef = useRef<L.LayerGroup | null>(null);

  // Current real-time user GPS position
  const [currentPos, setCurrentPos] = useState<{ lat: number; lon: number }>({
    lat: -33.8715,
    lon: 151.208,
  });

  const [activeArrivals, setActiveArrivals] = useState<
    Array<{ geofence: Geofence; distanceMeters: number }>
  >([]);

  // Pinned location modal state
  const [selectedCoord, setSelectedCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [shopName, setShopName] = useState('');
  const [reminderRequest, setReminderRequest] = useState('');
  const [radiusMeters, setRadiusMeters] = useState(15);
  const [addToTasks, setAddToTasks] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sound chime
  const playArrivalChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880.0, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);

      // Phone vibration if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }
    } catch {}
  };

  // 1. Initialize Interactive Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [currentPos.lat, currentPos.lon],
      zoom: 16,
      zoomControl: true,
    });

    // Dark styled OpenStreetMap tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    geofenceLayersRef.current = layerGroup;

    // User GPS location pulsing marker
    const userIcon = L.divIcon({
      className: 'user-gps-marker',
      html: `<div style="position:relative;width:20px;height:20px;">
        <div style="position:absolute;width:20px;height:20px;background:#3b82f6;border-radius:50%;opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:absolute;top:3px;left:3px;width:14px;height:14px;background:#2563eb;border:2.5px solid white;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.5);"></div>
      </div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    userMarkerRef.current = L.marker([currentPos.lat, currentPos.lon], { icon: userIcon })
      .addTo(map)
      .bindPopup('<b>📍 Your Live Phone GPS</b>');

    // Click anywhere on map to Drop a Pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setSelectedCoord({ lat, lon: lng });
      setShopName('');
      setReminderRequest('');
      setRadiusMeters(15);
      setAddToTasks(true);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Real-time GPS Watch from Smartphone
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setCurrentPos({ lat, lon });
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([lat, lon], 17);
          }
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([lat, lon]);
          }
          checkArrivals(lat, lon);
        },
        () => {},
        { enableHighAccuracy: true }
      );

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setCurrentPos({ lat, lon });
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([lat, lon]);
          }
          checkArrivals(lat, lon);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [geofences]);

  // 3. Render Pinned Shops on the Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = geofenceLayersRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    geofences.forEach((gf) => {
      const isTriggered = activeArrivals.some((a) => a.geofence.id === gf.id);

      // Shop Pin Marker
      const shopIcon = L.divIcon({
        className: 'shop-pin-marker',
        html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:${
          isTriggered ? '#ef4444' : '#10b981'
        };color:white;border-radius:12px;border:2.5px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.4);font-size:16px;">
          🛒
        </div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([gf.latitude, gf.longitude], { icon: shopIcon }).addTo(layers);
      marker.bindPopup(`
        <div style="font-family:sans-serif;padding:4px;">
          <h4 style="font-weight:bold;margin:0 0 4px 0;font-size:14px;color:#0f172a;">${gf.name}</h4>
          <p style="margin:0 0 6px 0;font-size:12px;color:#475569;">${gf.reminderMessage}</p>
          <span style="font-size:10px;background:#e2e8f0;padding:2px 6px;border-radius:6px;color:#334155;">Trigger Radius: ${gf.radiusMeters}m</span>
        </div>
      `);

      // Trigger Radius Circle
      L.circle([gf.latitude, gf.longitude], {
        radius: gf.radiusMeters,
        color: isTriggered ? '#ef4444' : '#10b981',
        fillColor: isTriggered ? '#fca5a5' : '#6ee7b7',
        fillOpacity: 0.25,
        weight: 2,
      }).addTo(layers);
    });
  }, [geofences, activeArrivals]);

  // 4. Proximity Check
  const checkArrivals = (userLat: number, userLon: number) => {
    const arrivals: Array<{ geofence: Geofence; distanceMeters: number }> = [];

    geofences.forEach((gf) => {
      if (!gf.isActive) return;
      const dist = getDistanceMeters(userLat, userLon, gf.latitude, gf.longitude);
      // Trigger if within radius (e.g. 5m to 20m)
      if (dist <= gf.radiusMeters) {
        arrivals.push({ geofence: gf, distanceMeters: dist });
      }
    });

    if (arrivals.length > 0 && activeArrivals.length === 0) {
      playArrivalChime();
    }
    setActiveArrivals(arrivals);
  };

  // Re-center on user GPS
  const handleCenterOnUser = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setCurrentPos({ lat, lon });
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([lat, lon], 17);
          }
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([lat, lon]);
          }
          checkArrivals(lat, lon);
        },
        () => alert('Please enable GPS / Location permissions on your device.')
      );
    }
  };

  // Simulate walking directly to a pinned shop (e.g. 3m away)
  const handleSimulateWalkToShop = (gf: Geofence) => {
    // 3 meters offset
    const simLat = gf.latitude + 0.00003;
    const simLon = gf.longitude + 0.00003;
    setCurrentPos({ lat: simLat, lon: simLon });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([simLat, simLon], 18);
    }
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([simLat, simLon]);
    }
    checkArrivals(simLat, simLon);
  };

  const handleSimulateStepAway = () => {
    const awayLat = currentPos.lat + 0.005;
    const awayLon = currentPos.lon + 0.005;
    setCurrentPos({ lat: awayLat, lon: awayLon });
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([awayLat, awayLon]);
    }
    checkArrivals(awayLat, awayLon);
  };

  // Create Pinned Shop Geofence & Task
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoord || !shopName.trim() || !reminderRequest.trim()) return;

    setIsSubmitting(true);
    try {
      // 1. Create Geofence pin
      const newFence = await api.createGeofence({
        name: shopName.trim(),
        address: `Pinned Location (${selectedCoord.lat.toFixed(5)}, ${selectedCoord.lon.toFixed(5)})`,
        latitude: selectedCoord.lat,
        longitude: selectedCoord.lon,
        radiusMeters,
        reminderMessage: reminderRequest.trim(),
      });

      // 2. Add to Tasks list if checked
      if (addToTasks) {
        await api.createTask({
          title: `[${shopName.trim()}] ${reminderRequest.trim()}`,
          description: `Location-triggered errand. Triggers when within ${radiusMeters}m of ${shopName.trim()}.`,
          priority: 'high',
          status: 'todo',
          tags: ['GPS_Errand', 'Shopping', shopName.trim().replace(/\s+/g, '')],
        });
        if (onRefreshTasks) onRefreshTasks();
      }

      onRefreshGeofences();
      setSelectedCoord(null);
      setShopName('');
      setReminderRequest('');
      alert(`📍 Pinned "${shopName}"! ${addToTasks ? 'Also added directly to your Tasks list.' : ''}`);
    } catch (err: any) {
      alert('Failed to save pin: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete a pinned shop
  const handleDeletePin = async (id: string, name: string) => {
    if (!confirm(`Delete pinned location "${name}"?`)) return;
    try {
      await api.deleteGeofence(id);
      onRefreshGeofences();
      setActiveArrivals((prev) => prev.filter((a) => a.geofence.id !== id));
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 🚨 Full Arrival Alert Banner when within 5-15 meters */}
      {activeArrivals.length > 0 && (
        <div className="rounded-3xl bg-gradient-to-r from-rose-950 via-amber-950 to-indigo-950 border-2 border-amber-400 p-6 shadow-2xl space-y-3 animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold text-xl shadow-lg">
                📍
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider">
                  Arrived At Location ({activeArrivals[0].distanceMeters}m away)
                </span>
                <h3 className="font-extrabold text-lg text-white mt-1">
                  {activeArrivals[0].geofence.name}
                </h3>
                <p className="text-xs text-amber-200 mt-0.5 font-medium leading-relaxed">
                  Reminder: <strong>{activeArrivals[0].geofence.reminderMessage}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playArrivalChime();
                  setActiveArrivals([]);
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition"
              >
                Dismiss Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Quick Action Bar */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            Live Map & GPS Shop Reminders
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Tap anywhere on the Google/OpenStreetMap window below to pin shops and errands. When your phone GPS arrives within 5-15 meters, OmniFlow notifies you with your exact shopping request.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleCenterOnUser}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-blue-900/40 transition"
          >
            <Crosshair className="w-4 h-4" />
            <span>Center on My GPS</span>
          </button>
          {geofences.length > 0 && (
            <button
              onClick={() => handleSimulateWalkToShop(geofences[0])}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-900/40 transition"
              title="Test the proximity notification without walking to the shop"
            >
              <Footprints className="w-4 h-4" />
              <span>Simulate Arriving at Shop (3m)</span>
            </button>
          )}
          <button
            onClick={handleSimulateStepAway}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
          >
            <span>Step Away</span>
          </button>
        </div>
      </div>

      {/* 🗺️ Interactive Live GPS Map Window (like Google Maps) */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
        <div
          ref={mapContainerRef}
          className="w-full h-[460px] bg-slate-950 z-0"
        />

        {/* Map Instructions Badge Overlay */}
        <div className="absolute top-3 left-3 z-10 bg-slate-950/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-800 text-xs text-slate-300 shadow-lg flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Tap/Click anywhere on the map to drop a shop pin</span>
        </div>

        {/* Real GPS Live Monitor Float */}
        <div className="absolute bottom-3 right-3 z-10 bg-slate-950/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-xs shadow-lg space-y-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <Compass className="w-3 h-3 text-indigo-400" /> Phone GPS Coordinates:
          </p>
          <p className="font-mono text-white text-[11px]">
            {currentPos.lat.toFixed(5)}, {currentPos.lon.toFixed(5)}
          </p>
        </div>
      </div>

      {/* 📍 Pinned Locations & Active Errands Grid */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            Pinned Shops & Proximity Errands ({geofences.length})
          </h3>
          <span className="text-[11px] text-slate-400">Triggers when phone GPS is within 5-15m</span>
        </div>

        {geofences.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
            <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No Shops Pinned Yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Click anywhere on the map above to drop a pin on your favorite supermarket, hardware store, or pharmacy.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {geofences.map((gf) => {
              const distance = getDistanceMeters(
                currentPos.lat,
                currentPos.lon,
                gf.latitude,
                gf.longitude
              );
              const isTriggered = distance <= gf.radiusMeters;

              return (
                <div
                  key={gf.id}
                  className={`rounded-2xl p-4 space-y-3 transition border ${
                    isTriggered
                      ? 'bg-rose-950/40 border-amber-400 shadow-xl shadow-rose-950/30'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">🛒</span>
                        <h4 className="font-bold text-sm text-white">{gf.name}</h4>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full inline-block mt-1 font-semibold ${
                          isTriggered
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {isTriggered ? `📍 ${distance}m away (ARRIVED!)` : `🚶 ${distance}m away`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSimulateWalkToShop(gf)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-950 text-slate-400 hover:text-emerald-400 transition"
                        title="Simulate entering this store"
                      >
                        <Footprints className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePin(gf.id, gf.name)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition"
                        title="Delete pin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Reminder Request Box */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                      Shopping Request:
                    </p>
                    <p className="leading-relaxed">{gf.reminderMessage}</p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>Trigger: Within {gf.radiusMeters}m</span>
                    <span>Coordinates: {gf.latitude.toFixed(3)}, {gf.longitude.toFixed(3)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 📌 Drop Pin Modal (Opens when clicking on Map) */}
      {selectedCoord && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Pin a Shop or Errands Point</h3>
                  <p className="text-[11px] text-slate-400">
                    GPS Coordinates: {selectedCoord.lat.toFixed(5)}, {selectedCoord.lon.toFixed(5)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCoord(null)}
                className="text-slate-500 hover:text-slate-300 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePin} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Shop or Location Name
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Coles Supermarket, Bunnings Hardware, Chemist..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Reminder Request / Items to buy
                </label>
                <textarea
                  value={reminderRequest}
                  onChange={(e) => setReminderRequest(e.target.value)}
                  rows={3}
                  placeholder="e.g. Buy almond milk, organic eggs, sourdough, and coffee beans..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Proximity Trigger Radius Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Trigger Distance: <span className="text-emerald-400 font-bold">{radiusMeters} meters</span>
                </label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[5, 10, 15, 25].map((dist) => (
                    <button
                      key={dist}
                      type="button"
                      onClick={() => setRadiusMeters(dist)}
                      className={`py-1.5 rounded-lg font-semibold border transition ${
                        radiusMeters === dist
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {dist}m
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Notifies automatically when your phone GPS is within this distance of the pin.
                </p>
              </div>

              {/* Add to Tasks Checkbox */}
              <div className="pt-2 border-t border-slate-800/80">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={addToTasks}
                    onChange={(e) => setAddToTasks(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                  <span>
                    <strong>Add this request directly to my Tasks list</strong>
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCoord(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 transition disabled:opacity-50"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Pinning...' : 'Save Pin & Errand'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
