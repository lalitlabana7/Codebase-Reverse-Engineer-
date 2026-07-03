import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

let wss: WebSocketServer | null = null;

interface WSMessage {
  type: string;
  payload: Record<string, unknown>;
}

export function initializeWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    ws.on("message", (data) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        console.error("Invalid WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });

    // Send initial connection confirmation
    ws.send(
      JSON.stringify({
        type: "connected",
        payload: { timestamp: new Date().toISOString() },
      })
    );
  });

  return wss;
}

function handleMessage(ws: WebSocket, message: WSMessage) {
  switch (message.type) {
    case "subscribe":
      // Subscribe to repository updates
      ws.send(
        JSON.stringify({
          type: "subscribed",
          payload: message.payload,
        })
      );
      break;
    default:
      break;
  }
}

export function broadcast(event: string, payload: Record<string, unknown>) {
  if (!wss) return;

  const message = JSON.stringify({ type: event, payload });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function getWSS() {
  return wss;
}
