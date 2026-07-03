"use client";

import { useEffect, useRef, useCallback } from "react";

type WSEventHandler = (payload: Record<string, unknown>) => void;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, WSEventHandler[]>>(new Map());

  const connect = useCallback(() => {
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
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected, reconnecting...");
      setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      ws.close();
    };
  }, []);

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

      // Send subscription to server
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
