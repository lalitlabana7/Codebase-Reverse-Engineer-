"use client";

import { useEffect, useRef, useCallback } from "react";

type WSEventHandler = (payload: Record<string, unknown>) => void;

/**
 * WebSocket hook for real-time updates.
 * NOTE: WebSocket connections are not supported on Vercel serverless.
 * This hook gracefully degrades (logs a warning) in serverless environments
 * and falls back to polling-based updates via React Query.
 */
export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, WSEventHandler[]>>(new Map());
  const isServerless =
    typeof window !== "undefined" &&
    window.location.hostname.includes("vercel.app");

  const connect = useCallback(() => {
    // WebSockets are not supported on Vercel serverless
    if (isServerless) {
      if (typeof console !== "undefined") {
        console.log("[WS] WebSocket unavailable on serverless — using polling");
      }
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/api/ws`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const handlers = handlersRef.current.get(message.type);
        if (handlers) {
          handlers.forEach((handler) => handler(message.payload));
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      // Don't auto-reconnect on Vercel
      if (!isServerless) {
        setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [isServerless]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback(
    (event: string, handler: WSEventHandler) => {
      const handlers = handlersRef.current.get(event) || [];
      handlers.push(handler);
      handlersRef.current.set(event, handlers);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "subscribe", payload: { event } })
        );
      }

      return () => {
        const currentHandlers = handlersRef.current.get(event) || [];
        handlersRef.current.set(
          event,
          currentHandlers.filter((h) => h !== handler)
        );
      };
    },
    []
  );

  return { subscribe, isConnected: wsRef.current?.readyState === WebSocket.OPEN };
}
