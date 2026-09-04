import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import { useWebSocket } from '@/context/WebSocketContext';
import { tripService } from '@/services/trips';

type UseDriverTripLocationSharingOptions = {
  tripId: number | null;
  enabled: boolean;
};

type SharingStatus = 'idle' | 'requesting_permission' | 'watching' | 'error';

type LocationPayload = {
  latitude: number;
  longitude: number;
  speed?: number;
};

const HTTP_SEND_INTERVAL_MS = 10_000;
const COORDINATE_EPSILON = 0.00001;

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

function coordinatesChanged(a: LocationPayload, b: LocationPayload) {
  return (
    Math.abs(a.latitude - b.latitude) >= COORDINATE_EPSILON ||
    Math.abs(a.longitude - b.longitude) >= COORDINATE_EPSILON
  );
}

export function useDriverTripLocationSharing({ tripId, enabled }: UseDriverTripLocationSharingOptions) {
  const { publishDriverLocation } = useWebSocket();
  const [isSharing, setIsSharing] = useState(false);
  const [sharingStatus, setSharingStatus] = useState<SharingStatus>('idle');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationPayload | null>(null);

  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPositionRef = useRef<LocationPayload | null>(null);
  const lastSentRef = useRef<LocationPayload | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const cleanup = () => {
      watcherRef.current?.remove();
      watcherRef.current = null;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      latestPositionRef.current = null;
      lastSentRef.current = null;
      sendingRef.current = false;
      if (mounted) {
        setIsSharing(false);
        setSharingStatus('idle');
        setCurrentLocation(null);
      }
    };

    if (!enabled || !tripId) {
      cleanup();
      return () => {
        mounted = false;
        cleanup();
      };
    }

    const sendLocationToServer = async (payload: LocationPayload) => {
      if (sendingRef.current) return;
      if (lastSentRef.current && !coordinatesChanged(lastSentRef.current, payload)) return;

      sendingRef.current = true;
      try {
        await tripService.addTripLocation(tripId, {
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed,
        });
        lastSentRef.current = payload;
        if (mounted) {
          setLastSentAt(new Date().toISOString());
        }
      } catch (error) {
        console.error('Failed to send trip location via HTTP:', error);
      } finally {
        sendingRef.current = false;
      }
    };

    const tickHttpSend = () => {
      const latest = latestPositionRef.current;
      if (!latest) return;
      if (lastSentRef.current && !coordinatesChanged(lastSentRef.current, latest)) return;
      void sendLocationToServer(latest);
    };

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
            timeInterval: 5000,
            distanceInterval: 10,
            mayShowUserSettingsDialog: true,
          },
          (position) => {
            const latitude = toNullableNumber(position.coords.latitude);
            const longitude = toNullableNumber(position.coords.longitude);
            if (latitude == null || longitude == null) return;

            const payload: LocationPayload = {
              latitude,
              longitude,
              speed: toSpeedKmH(position.coords.speed),
            };

            latestPositionRef.current = payload;
            // The navigation camera must follow the driver's phone immediately;
            // waiting for the WebSocket echo makes guidance look stuck on the
            // overview map when the connection is slow.
            if (mounted) setCurrentLocation(payload);

            publishDriverLocation({
              tripId,
              latitude,
              longitude,
              speed: payload.speed,
            });
          },
        );

        watcherRef.current = subscription;
        intervalRef.current = setInterval(tickHttpSend, HTTP_SEND_INTERVAL_MS);

        if (!mounted) {
          subscription.remove();
          if (intervalRef.current) clearInterval(intervalRef.current);
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
      cleanup();
    };
  }, [enabled, tripId, publishDriverLocation]);

  return {
    isSharing,
    sharingStatus,
    permissionGranted,
    lastSentAt,
    errorMessage,
    currentLocation,
  };
}
