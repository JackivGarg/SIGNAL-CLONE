"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getWebSocketUrl, type RealtimeEvent } from "@/lib/api";

export function useRealtime(onEvent: (event: RealtimeEvent) => void) {
  const socketRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let isActive = true;
    let reconnectTimer: number | undefined;
    let heartbeatTimer: number | undefined;
    let attempt = 0;

    function connect() {
      const socket = new WebSocket(getWebSocketUrl());
      socketRef.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setIsConnected(true);
        heartbeatTimer = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }));
          }
        }, 25_000);
      };
      socket.onmessage = (message) => {
        try {
          onEventRef.current(JSON.parse(message.data) as RealtimeEvent);
        } catch {
          // Ignore malformed server events; REST remains the source of truth.
        }
      };
      socket.onclose = (event) => {
        if (heartbeatTimer) window.clearInterval(heartbeatTimer);
        setIsConnected(false);
        if (!isActive || event.code === 1008) return;
        const delay = Math.min(1_000 * 2 ** attempt, 10_000);
        attempt += 1;
        reconnectTimer = window.setTimeout(connect, delay);
      };
      socket.onerror = () => socket.close();
    }

    connect();
    return () => {
      isActive = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
      socketRef.current?.close();
    };
  }, []);

  const sendEvent = useCallback((event: Record<string, string>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(event));
    }
  }, []);

  return { isConnected, sendEvent };
}
