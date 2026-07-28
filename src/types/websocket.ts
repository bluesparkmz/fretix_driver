/** Eventos WebSocket do backend CargoLink (/ws) — negociacao, viagens e notificacoes. */

export type WebSocketOutgoingType =
  | 'ping'
  | 'subscribe_trip'
  | 'unsubscribe_trip'
  | 'subscribe_load'
  | 'subscribe_proposal'
  | 'driver_location'
  | 'negotiation_create'
  | 'negotiation_accept'
  | 'negotiation_reject'
  | 'proposal_accept'
  | 'proposal_reject';

export type WebSocketIncomingType =
  | 'websocket.connected'
  | 'pong'
  | 'error'
  | 'subscription_ok'
  | 'subscription_closed'
  | 'trip.location'
  | 'trip.status_changed'
  | 'notification.created'
  | 'negotiation.created'
  | 'negotiation.accepted'
  | 'negotiation.rejected'
  | 'negotiation.sent'
  | 'negotiation.accepted_ack'
  | 'negotiation.rejected_ack'
  | 'proposal.created'
  | 'proposal.accepted'
  | 'proposal.rejected'
  | 'proposal.accepted_ack'
  | 'proposal.rejected_ack'
  | 'rating.created';

export type WebSocketEventType = WebSocketOutgoingType | WebSocketIncomingType | string;

export interface WebSocketEvent {
  type: WebSocketEventType;
  code?: string;
  message?: string;
  trip_id?: number;
  load_id?: number;
  proposal_id?: number;
  negotiation_id?: number;
  message_id?: number;
  user?: { id: number; type: string; name: string };
  active_connections?: number;
  scope?: string;
  status?: string;
  location?: Record<string, unknown>;
  notification?: unknown;
  [key: string]: unknown;
}

export type WebSocketEventHandler = (event: WebSocketEvent) => void;

export type WebSocketConnectionStatus = 'disconnected' | 'connecting' | 'connected';
