import type { Server as HttpServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { AuthService } from "../auth/authService";
import { RoomManager } from "../game/roomManager";
import type { ClientToServerMessage, ServerToClientMessage } from "../../shared/protocol/wsMessages";
import { routeSocketMessage, type SocketSession } from "./messageRouter";
import { isOriginAllowed } from "../http/originPolicy";

const safeSend = (socket: WebSocket, message: ServerToClientMessage): void => {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(message));
  }
};

export const attachWebSocketServer = (
  httpServer: HttpServer,
  authService: AuthService,
  roomManager: RoomManager,
  options: {
    allowedOrigins: string[];
  }
): void => {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const socketSessions = new WeakMap<WebSocket, SocketSession>();

  wss.on("connection", (socket, request) => {
    const origin = request.headers.origin;
    if (!isOriginAllowed(origin, options.allowedOrigins)) {
      console.warn(`[ws] rejected websocket origin: ${origin ?? "unknown"}`);
      socket.close(1008, "Origin not allowed.");
      return;
    }

    socket.on("message", async (rawMessage) => {
      let parsedMessage: ClientToServerMessage;

      try {
        parsedMessage = JSON.parse(rawMessage.toString()) as ClientToServerMessage;
      } catch {
        safeSend(socket, { type: "error", message: "Invalid JSON message." });
        return;
      }

      const existingSession = socketSessions.get(socket);
      await routeSocketMessage({
        socket,
        parsedMessage,
        existingSession,
        authService,
        roomManager,
        socketSessions,
        send: safeSend,
      });
    });

    socket.on("close", () => {
      const session = socketSessions.get(socket);
      if (!session) {
        return;
      }
      roomManager.removeConnection(session.userId, socket);
    });
  });
};
