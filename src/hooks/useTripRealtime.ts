import { useEffect, useMemo, useState } from 'react';

import { useWebSocket } from '@/context/WebSocketContext';
import type { Trip } from '@/services/trips';
import type { WebSocketEvent } from '@/types/websocket';

type Coordinate = {
  latitude: number;
  longitude: number;
};

interface UseTripRealtimeOptions {
  initialTrip?: Trip | null;
}

interface UseTripRealtimeResult {
  liveTrip: Trip | null;
  liveStatus: string | null;
  liveLocation: Coordinate | null;
  lastLocationUpdateAt: string | null;
  applyTripSnapshot: (trip: Trip | null) => void;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readCoordinate(location: WebSocketEvent['location']): Coordinate | null {
  if (!location || typeof location !== 'object') return null;

  const latitude = toNumber((location as Record<string, unknown>).latitude ?? (location as Record<string, unknown>).lat);
  const longitude = toNumber((location as Record<string, unknown>).longitude ?? (location as Record<string, unknown>).lng);

  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
}

function readLocationTimestamp(location: WebSocketEvent['location']): string | null {
  if (!location || typeof location !== 'object') return null;
  const timestamp = (location as Record<string, unknown>).timestamp;
  return typeof timestamp === 'string' ? timestamp : null;
}

export function useTripRealtime(
  tripId: number | null | undefined,
  options: UseTripRealtimeOptions = {},
): UseTripRealtimeResult {
  const { initialTrip = null } = options;
  const { subscribeTrip, unsubscribeTrip, addListenerForTypes } = useWebSocket();
  const [liveTrip, setLiveTrip] = useState<Trip | null>(initialTrip);
  const [liveLocation, setLiveLocation] = useState<Coordinate | null>(null);
  const [lastLocationUpdateAt, setLastLocationUpdateAt] = useState<string | null>(null);

  useEffect(() => {
    setLiveTrip(initialTrip);
  }, [initialTrip]);

  useEffect(() => {
    if (!tripId) return;

    subscribeTrip(tripId);

    const unsubscribe = addListenerForTypes(['trip.status_changed', 'trip.location'], (event) => {
      if (event.trip_id !== tripId) return;

      if (event.type === 'trip.status_changed' && typeof event.status === 'string') {
        setLiveTrip((current) => (current ? { ...current, status: event.status as string } : current));
      }

      if (event.type === 'trip.location') {
        const coordinate = readCoordinate(event.location);
        if (coordinate) {
          setLiveLocation(coordinate);
          setLastLocationUpdateAt(readLocationTimestamp(event.location) ?? new Date().toISOString());
        }

        if (typeof event.status === 'string') {
          setLiveTrip((current) => (current ? { ...current, status: event.status as string } : current));
        }
      }
    });

    return () => {
      unsubscribe();
      unsubscribeTrip(tripId);
    };
  }, [addListenerForTypes, subscribeTrip, tripId, unsubscribeTrip]);

  const liveStatus = useMemo(() => liveTrip?.status ?? null, [liveTrip]);

  return {
    liveTrip,
    liveStatus,
    liveLocation,
    lastLocationUpdateAt,
    applyTripSnapshot: setLiveTrip,
  };
}
