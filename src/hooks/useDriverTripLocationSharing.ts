import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import { useWebSocket } from '@/context/WebSocketContext';
import { tripService } from '@/services/trips';

type UseDriverTripLocationSharingOptions = {
  tripId: number | null;
  enabled: boolean;
};

type SharingStatus = 'idle' | 'requesting_permission' | 'watching' | 'error';

type LastSentPayload = {
  latitude: number;
  longitude: number;
  speed?: number;
};

const MIN_HTTP_SEND_INTERVAL_MS = 10_000;
const MIN_DISTANCE_METERS = 40;

function toNullableNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function toSpeedKmH(speedMetersPerSecond: number | null | undefined) {
  if (typeof speedMetersPerSecond !== 'number' || !Number.isFinite(speedMetersPerSecond) || speedMetersPerSecond < 0) {
    return undefined;
  }
  return Math.round(speedMetersPerSecond * 3.6);
}

function getDistanceMeters(a: LastSentPayload, b: LastSentPayload) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function useDriverTripLocationSharing({ tripId, enabled }: UseDriverTripLocationSharingOptions) {
  const { publishDriverLocation } = useWebSocket();
  const [isSharing, setIsSharing] = useState(false);
  const [sharingStatus, setSharingStatus] = useState<SharingStatus>('idle');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const lastSentRef = useRef<{ timestamp: number; payload: LastSentPayload } | null>(null);

  useEffect(() => {
    let mounted = true;

    const cleanup = () => {
      watcherRef.current?.remove();
      watcherRef.current = null;
      if (mounted) {
        setIsSharing(false);
        setSharingStatus('idle');
      }
    };

    if (!enabled || !tripId) {
      cleanup();
      return () => {
        mounted = false;
        cleanup();
      };
    }

    const startSharing = async () => {
      try {
        setErrorMessage(null);
        setSharingStatus('requesting_permission');

        const permission = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;

        const granted = permission.status === 'granted';
        setPermissionGranted(granted);

        if (!granted) {
          setSharingStatus('error');
          setErrorMessage('Permissão de localização negada.');
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!mounted) return;

        if (!servicesEnabled) {
          setSharingStatus('error');
          setErrorMessage('Os serviços de localização estão desligados.');
          return;
        }

        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 8000,
            distanceInterval: 25,
            mayShowUserSettingsDialog: true,
          },
          async (position) => {
            const latitude = toNullableNumber(position.coords.latitude);
            const longitude = toNullableNumber(position.coords.longitude);

            if (latitude == null || longitude == null) return;

            const payload: LastSentPayload = {
              latitude,
              longitude,
              speed: toSpeedKmH(position.coords.speed),
            };

            publishDriverLocation({
              tripId,
              latitude,
              longitude,
              speed: payload.speed,
            });

            const now = Date.now();
            const previous = lastSentRef.current;
            const shouldSendHttp =
              !previous ||
              now - previous.timestamp >= MIN_HTTP_SEND_INTERVAL_MS ||
              getDistanceMeters(previous.payload, payload) >= MIN_DISTANCE_METERS;

            if (!shouldSendHttp) return;

            try {
              await tripService.addTripLocation(tripId, {
                latitude,
                longitude,
                speed: payload.speed,
              });
              lastSentRef.current = { timestamp: now, payload };
              if (mounted) {
                setLastSentAt(new Date(now).toISOString());
              }
            } catch (error) {
              console.error('Failed to send trip location via HTTP:', error);
            }
          },
        );

        watcherRef.current = subscription;
        if (!mounted) {
          subscription.remove();
          return;
        }

        setIsSharing(true);
        setSharingStatus('watching');
      } catch (error) {
        console.error('Failed to start driver location sharing:', error);
        if (!mounted) return;
        setSharingStatus('error');
        setErrorMessage('Não foi possível iniciar a partilha de localização.');
      }
    };

    void startSharing();

    return () => {
      mounted = false;
      watcherRef.current?.remove();
      watcherRef.current = null;
      setIsSharing(false);
      setSharingStatus('idle');
    };
  }, [enabled, tripId, publishDriverLocation]);

  return {
    isSharing,
    sharingStatus,
    permissionGranted,
    lastSentAt,
    errorMessage,
  };
}
