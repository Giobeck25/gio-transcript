import { Router, Request, Response } from 'express';
import { db, Geofence } from '../db/index.js';
import { geofenceService } from '../services/geofence.js';

export const geofenceRouter = Router();

const getContext = (req: Request) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-enterprise-1';
  const userId = (req.headers['x-user-id'] as string) || 'user-gio';
  return { tenantId, userId };
};

// GET geofences
geofenceRouter.get('/', (req: Request, res: Response) => {
  const { tenantId } = getContext(req);
  const geofences = db.getGeofences(tenantId);
  res.json({ success: true, geofences });
});

// POST create geofence
geofenceRouter.post('/', (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const { name, address, latitude, longitude, radiusMeters = 150, reminderMessage } = req.body;

  if (!name || latitude === undefined || longitude === undefined || !reminderMessage) {
    res.status(400).json({ success: false, error: 'Name, latitude, longitude, and reminderMessage are required' });
    return;
  }

  const newFence: Geofence = {
    id: `geo-${Date.now()}`,
    tenantId,
    userId,
    name,
    address: address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    latitude: Number(latitude),
    longitude: Number(longitude),
    radiusMeters: Number(radiusMeters),
    reminderMessage,
    isActive: true,
    triggerCount: 0,
    createdAt: new Date().toISOString(),
  };

  db.saveGeofence(newFence);
  db.logAudit(tenantId, userId, 'GEOFENCE_CREATED', { geofenceId: newFence.id, name });
  res.status(201).json({ success: true, geofence: newFence });
});

// POST Check current GPS coordinates
geofenceRouter.post('/check-location', (req: Request, res: Response) => {
  const { tenantId } = getContext(req);
  const { latitude, longitude } = req.body;

  if (latitude === undefined || longitude === undefined) {
    res.status(400).json({ success: false, error: 'Latitude and longitude required' });
    return;
  }

  const result = geofenceService.evaluatePosition(tenantId, Number(latitude), Number(longitude));
  res.json({ success: true, ...result });
});

// GET nearby places using Google Places API
geofenceRouter.get('/nearby-places', async (req: Request, res: Response) => {
  const { lat, lng, radius = '500', type = 'store' } = req.query;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
  
  if (!apiKey) {
    res.json({ success: false, error: 'Google Places API key not configured', places: [] });
    return;
  }
  
  if (!lat || !lng) {
    res.status(400).json({ success: false, error: 'lat and lng are required' });
    return;
  }
  
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.location,places.formattedAddress,places.types,places.primaryType',
      },
      body: JSON.stringify({
        includedTypes: [String(type)],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: Number(lat), longitude: Number(lng) },
            radius: Number(radius),
          },
        },
      }),
    });
    
    const data = await response.json();
    const places = (data.places || []).map((p: any) => ({
      name: p.displayName?.text || 'Unknown',
      lat: p.location?.latitude,
      lng: p.location?.longitude,
      address: p.formattedAddress || '',
      type: p.primaryType || p.types?.[0] || 'place',
    }));
    
    res.json({ success: true, places });
  } catch (err: any) {
    console.error('[Places API Error]', err);
    res.json({ success: true, places: [], error: err.message });
  }
});

// PUT Toggle geofence active status
geofenceRouter.put('/:id/toggle', (req: Request, res: Response) => {
  const { tenantId } = getContext(req);
  const fences = db.getGeofences(tenantId);
  const fence = fences.find((f) => f.id === req.params.id);

  if (!fence) {
    res.status(404).json({ success: false, error: 'Geofence not found' });
    return;
  }

  fence.isActive = !fence.isActive;
  db.saveGeofence(fence);
  res.json({ success: true, geofence: fence });
});

// DELETE geofence
geofenceRouter.delete('/:id', (req: Request, res: Response) => {
  const { tenantId, userId } = getContext(req);
  const geofenceId = String(req.params.id);
  const success = db.deleteGeofence(tenantId, geofenceId);
  if (!success) {
    res.status(404).json({ success: false, error: 'Geofence not found' });
    return;
  }
  db.logAudit(tenantId, userId, 'GEOFENCE_DELETED', { geofenceId });
  res.json({ success: true });
});
