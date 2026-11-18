import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

interface ClientMeta {
  ws: WebSocket;
  room: string;
}

const clients = new Set<ClientMeta>();

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
  const message = JSON.stringify({
    type: event,
    payload,
    timestamp: new Date().toISOString(),
  });
  for (const client of clients) {
    if (
      client.room === room &&
      client.ws.readyState === WebSocket.OPEN
    ) {
      client.ws.send(message);
    }
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
