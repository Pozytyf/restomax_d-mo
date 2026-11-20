import type { Server as HttpServer } from 'node:http';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

interface ClientMeta {
  ws: WebSocket;
  room: string;
}

export interface ClusterEnvelope {
  originInstanceId: string;
  room: string;
  event: string;
  payload: unknown;
  timestamp: string;
}

export type ExternalPubSubPublisher = (envelope: ClusterEnvelope) => Promise<void> | void;

export const INSTANCE_ID =
  process.env.INSTANCE_ID?.trim() ||
  `node-${crypto.randomBytes(4).toString('hex')}`;

const clients = new Set<ClientMeta>();
let externalPublisher: ExternalPubSubPublisher | null = null;

export function registerClusterPublisher(fn: ExternalPubSubPublisher | null): void {
  externalPublisher = fn;
}

export function getWebSocketStats() {
  return {
    instanceId: INSTANCE_ID,
    connectedClients: clients.size,
    pubsubMode: externalPublisher ? 'CLUSTER_PUBSUB' : 'SINGLE_NODE',
  };
}

export function deliverLocalRoomEvent(
  room: string,
  event: string,
  payload: unknown,
  timestamp = new Date().toISOString(),
): void {
  const message = JSON.stringify({
    type: event,
    payload,
    timestamp,
    instanceId: INSTANCE_ID,
  });
  for (const client of clients) {
    if (client.room === room && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

export function handleIncomingClusterEnvelope(envelope: ClusterEnvelope): void {
  if (envelope.originInstanceId === INSTANCE_ID) return;
  deliverLocalRoomEvent(
    envelope.room,
    envelope.event,
    envelope.payload,
    envelope.timestamp,
  );
}

export function setupWebSocketServer(server: HttpServer): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '/ws', 'http://localhost');
    const room = url.searchParams.get('room') || 'public';
    const meta: ClientMeta = { ws, room };
    clients.add(meta);

    ws.send(
      JSON.stringify({
        type: 'connection:ready',
        room,
        instanceId: INSTANCE_ID,
        timestamp: new Date().toISOString(),
      }),
    );

    ws.on('close', () => {
      clients.delete(meta);
    });

    ws.on('error', () => {
      clients.delete(meta);
    });
  });
}

export function broadcastToRoom(
  room: string,
  event: string,
  payload: unknown,
): void {
  const timestamp = new Date().toISOString();
  deliverLocalRoomEvent(room, event, payload, timestamp);

  if (externalPublisher) {
    Promise.resolve(
      externalPublisher({
        originInstanceId: INSTANCE_ID,
        room,
        event,
        payload,
        timestamp,
      }),
    ).catch(() => {
      // Non-blocking cluster relay
    });
  }
}

export function broadcastRestaurantEvent(
  restaurantId: string,
  event: string,
  payload: unknown,
): void {
  broadcastToRoom(`restaurant:${restaurantId}`, event, payload);
}

export function broadcastOrderTrackerEvent(
  orderId: string,
  event: string,
  payload: unknown,
): void {
  broadcastToRoom(`order:${orderId}`, event, payload);
}

export function broadcastSuperAdminEvent(
  event: string,
  payload: unknown,
): void {
  broadcastToRoom('superadmin', event, payload);
}
