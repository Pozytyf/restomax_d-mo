import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    if (!room) return;
    let active = true;
    let ws: WebSocket | null = null;
    let retryTimer: number | undefined;

    const connect = () => {
      if (!active) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws?room=${encodeURIComponent(room)}`;
      ws = new WebSocket(url);

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
          retryTimer = window.setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      active = false;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (ws) ws.close();
    };
  }, [room]);
}
