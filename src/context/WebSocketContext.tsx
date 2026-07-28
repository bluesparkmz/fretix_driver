import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';

import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/services/api';
import type {
  WebSocketConnectionStatus,
  WebSocketEvent,
  WebSocketEventHandler,
} from '@/types/websocket';

function buildWebSocketUrl(token: string): string {
  const wsBase = API_BASE_URL.replace(/^http/i, 'ws').replace(/\/$/, '');
  return `${wsBase}/ws?token=${encodeURIComponent(token)}`;
}

const PING_INTERVAL_MS = 25_000;
const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;

type SubscriptionScope = 'trip' | 'load' | 'proposal';

function subscriptionKey(scope: SubscriptionScope, id: number) {
  return `${scope}:${id}`;
}

function outgoingSubscribe(scope: SubscriptionScope, id: number): WebSocketEvent {
  return { type: `subscribe_${scope}`, [`${scope}_id`]: id };
}

interface WebSocketContextValue {
  status: WebSocketConnectionStatus;
  isConnected: boolean;
  activeConnections: number | null;
  send: (payload: WebSocketEvent) => void;
  subscribeTrip: (tripId: number) => void;
  unsubscribeTrip: (tripId: number) => void;
  subscribeLoad: (loadId: number) => void;
  subscribeProposal: (proposalId: number) => void;
  publishDriverLocation: (payload: {
    tripId: number;
    latitude: number;
    longitude: number;
    speed?: number;
    traveledDistanceKm?: number;
  }) => void;
  addListener: (handler: WebSocketEventHandler) => () => void;
  addListenerForTypes: (
    types: string | string[],
    handler: WebSocketEventHandler,
  ) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user, isPending } = useAuth();
  const [status, setStatus] = useState<WebSocketConnectionStatus>('disconnected');
  const [activeConnections, setActiveConnections] = useState<number | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef(new Set<WebSocketEventHandler>());
  const subscriptionsRef = useRef(new Set<string>());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldConnectRef = useRef(false);

  const emit = useCallback((event: WebSocketEvent) => {
    for (const listener of listenersRef.current) {
      try {
        listener(event);
      } catch (error) {
        console.error('WebSocket listener error:', error);
      }
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  const send = useCallback((payload: WebSocketEvent) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
  }, []);

  const resubscribeAll = useCallback(() => {
    for (const key of subscriptionsRef.current) {
      const [scope, rawId] = key.split(':');
      const id = Number(rawId);
      if (!scope || Number.isNaN(id)) continue;
      send(outgoingSubscribe(scope as SubscriptionScope, id));
    }
  }, [send]);

  const scheduleReconnect = useCallback(() => {
    if (!shouldConnectRef.current) return;
    const attempt = reconnectAttemptRef.current;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
    reconnectAttemptRef.current += 1;
    reconnectTimerRef.current = setTimeout(() => {
      connectRef.current?.();
    }, delay);
  }, []);

  const connectRef = useRef<(() => Promise<void>) | null>(null);

  const disconnect = useCallback(() => {
    clearTimers();
    socketRef.current?.close();
    socketRef.current = null;
    setStatus('disconnected');
    setActiveConnections(null);
  }, [clearTimers]);

  connectRef.current = async () => {
    if (!shouldConnectRef.current) return;

    const token = await SecureStore.getItemAsync('authToken');
    if (!token) {
      disconnect();
      return;
    }

    clearTimers();
    socketRef.current?.close();
    setStatus('connecting');

    const socket = new WebSocket(buildWebSocketUrl(token));
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptRef.current = 0;
      setStatus('connected');
      resubscribeAll();
      pingTimerRef.current = setInterval(() => {
        send({ type: 'ping' });
      }, PING_INTERVAL_MS);
    };

    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(String(message.data)) as WebSocketEvent;
        if (event.type === 'websocket.connected') {
          if (typeof event.active_connections === 'number') {
            setActiveConnections(event.active_connections);
          }
        }
        if (event.type === 'pong') return;
        emit(event);
      } catch (error) {
        console.error('Failed to parse websocket event:', error);
      }
    };

    socket.onerror = () => {
      console.error('WebSocket connection error');
    };

    socket.onclose = () => {
      clearTimers();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      setStatus('disconnected');
      setActiveConnections(null);
      scheduleReconnect();
    };
  };

  const subscribe = useCallback(
    (scope: SubscriptionScope, id: number) => {
      subscriptionsRef.current.add(subscriptionKey(scope, id));
      send(outgoingSubscribe(scope, id));
    },
    [send],
  );

  const unsubscribeTrip = useCallback(
    (tripId: number) => {
      subscriptionsRef.current.delete(subscriptionKey('trip', tripId));
      send({ type: 'unsubscribe_trip', trip_id: tripId });
    },
    [send],
  );

  const subscribeTrip = useCallback((tripId: number) => subscribe('trip', tripId), [subscribe]);
  const subscribeLoad = useCallback((loadId: number) => subscribe('load', loadId), [subscribe]);
  const subscribeProposal = useCallback(
    (proposalId: number) => subscribe('proposal', proposalId),
    [subscribe],
  );

  const publishDriverLocation = useCallback(
    (payload: {
      tripId: number;
      latitude: number;
      longitude: number;
      speed?: number;
      traveledDistanceKm?: number;
    }) => {
      send({
        type: 'driver_location',
        trip_id: payload.tripId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        speed: payload.speed,
        traveled_distance_km: payload.traveledDistanceKm,
      });
    },
    [send],
  );

  const addListener = useCallback((handler: WebSocketEventHandler) => {
    listenersRef.current.add(handler);
    return () => listenersRef.current.delete(handler);
  }, []);

  const addListenerForTypes = useCallback(
    (types: string | string[], handler: WebSocketEventHandler) => {
      const allowed = new Set(Array.isArray(types) ? types : [types]);
      return addListener((event) => {
        if (allowed.has(event.type)) {
          handler(event);
        }
      });
    },
    [addListener],
  );

  useEffect(() => {
    shouldConnectRef.current = Boolean(user && !isPending);

    if (!shouldConnectRef.current) {
      reconnectAttemptRef.current = 0;
      subscriptionsRef.current.clear();
      disconnect();
      return;
    }

    connectRef.current?.();

    return () => {
      shouldConnectRef.current = false;
      reconnectAttemptRef.current = 0;
      disconnect();
    };
  }, [user?.id, isPending, disconnect]);

  const value = useMemo<WebSocketContextValue>(
    () => ({
      status,
      isConnected: status === 'connected',
      activeConnections,
      send,
      subscribeTrip,
      unsubscribeTrip,
      subscribeLoad,
      subscribeProposal,
      publishDriverLocation,
      addListener,
      addListenerForTypes,
    }),
    [
      status,
      activeConnections,
      send,
      subscribeTrip,
      unsubscribeTrip,
      subscribeLoad,
      subscribeProposal,
      publishDriverLocation,
      addListener,
      addListenerForTypes,
    ],
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}
