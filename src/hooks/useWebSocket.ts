import { useEffect, useRef, useState } from 'react';
import {
  getSupabaseBrowserClient,
  isSupabaseRealtimeEnabled,
} from '../lib/supabaseClient';

export interface WsEventMessage {
  type: string;
  payload?: unknown;
  timestamp?: string;
}

export function useWebSocketRoom(
  room: string | null,
  onEvent: (msg: WsEventMessage) => void,
) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!room) {
      setConnected(false);
      return;
    }

    // Mode Supabase Realtime (idéal pour déploiement serverless Vercel)
    if (isSupabaseRealtimeEnabled()) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const restaurantMatch = room.startsWith('restaurant:')
          ? room.slice('restaurant:'.length)
          : null;
        const orderMatch = room.startsWith('order:')
          ? room.slice('order:'.length)
          : null;

        const channel = supabase.channel(`restomax:${room}`);

        if (restaurantMatch) {
          channel
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `restaurant_id=eq.${restaurantMatch}`,
              },
              (payload) => {
                const evtType =
                  payload.eventType === 'INSERT'
                    ? 'order:created'
                    : 'order:updated';
                callbackRef.current({
                  type: evtType,
                  payload: payload.new,
                  timestamp: new Date().toISOString(),
                });
              },
            )
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'stocks',
                filter: `restaurant_id=eq.${restaurantMatch}`,
              },
              (payload) => {
                callbackRef.current({
                  type: 'stock:updated',
                  payload: payload.new,
                  timestamp: new Date().toISOString(),
                });
              },
            )
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'dining_tables',
                filter: `restaurant_id=eq.${restaurantMatch}`,
              },
              (payload) => {
                callbackRef.current({
                  type: 'table:updated',
                  payload: payload.new,
                  timestamp: new Date().toISOString(),
                });
              },
            )
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `restaurant_id=eq.${restaurantMatch}`,
              },
              (payload) => {
                callbackRef.current({
                  type: 'stock:alert',
                  payload: payload.new,
                  timestamp: new Date().toISOString(),
                });
              },
            );
        } else if (orderMatch) {
          channel.on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'orders',
              filter: `id=eq.${orderMatch}`,
            },
            (payload) => {
              callbackRef.current({
                type: 'order:updated',
                payload: payload.new,
                timestamp: new Date().toISOString(),
              });
            },
          );
        }

        channel.subscribe((status) => {
          setConnected(status === 'SUBSCRIBED');
        });

        return () => {
          setConnected(false);
          void supabase.removeChannel(channel);
        };
      }
    }

    // Mode WebSocket natif (serveur Node / dev local / multi-instances)
    let active = true;
    let ws: WebSocket | null = null;
    let retryTimer: number | undefined;
    let failCount = 0;

    const connect = () => {
      if (!active) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws?room=${encodeURIComponent(room)}`;
      ws = new WebSocket(url);

      ws.onopen = () => {
        failCount = 0;
        if (active) setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(String(event.data)) as WsEventMessage;
          callbackRef.current(parsed);
        } catch {
          // Ignore malformed ws messages
        }
      };

      ws.onclose = () => {
        if (active) {
          setConnected(false);
          failCount += 1;
          // Back off cleanly when running behind serverless hosts without persistent WS
          const delay = Math.min(30000, 3000 * failCount);
          retryTimer = window.setTimeout(connect, delay);
        }
      };
    };

    connect();

    return () => {
      active = false;
      setConnected(false);
      if (retryTimer) window.clearTimeout(retryTimer);
      if (ws) ws.close();
    };
  }, [room]);

  return { connected };
}
