import { db, Geofence } from '../db/index.js';

export interface GeofenceTriggerResult {
  triggeredGeofences: Array<{
    geofence: Geofence;
    distanceMeters: number;
    message: string;
  }>;
  nearestGeofence?: {
    geofence: Geofence;
    distanceMeters: number;
  };
}

export class GeofenceService {
  /**
   * Calculates distance in meters between two lat/lon points using the Haversine formula
   */
  public calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

  /**
   * Evaluates user's live position against active tenant geofences
   */
  public evaluatePosition(tenantId: string, latitude: number, longitude: number): GeofenceTriggerResult {
    const activeFences = db.getGeofences(tenantId).filter((g) => g.isActive);
    const triggered: Array<{ geofence: Geofence; distanceMeters: number; message: string }> = [];

    let nearest: { geofence: Geofence; distanceMeters: number } | undefined;
    let minDistance = Infinity;

    for (const fence of activeFences) {
      const dist = this.calculateDistance(latitude, longitude, fence.latitude, fence.longitude);

      if (dist < minDistance) {
        minDistance = dist;
        nearest = { geofence: fence, distanceMeters: dist };
      }

      if (dist <= fence.radiusMeters) {
        // Trigger condition met!
        fence.triggerCount += 1;
        fence.lastTriggeredAt = new Date().toISOString();
        db.saveGeofence(fence);

        triggered.push({
          geofence: fence,
          distanceMeters: dist,
          message: fence.reminderMessage,
        });
      }
    }

    return {
      triggeredGeofences: triggered,
      nearestGeofence: nearest,
    };
  }
}

export const geofenceService = new GeofenceService();
