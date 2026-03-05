import type { Server as HttpServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { AuthService } from "../auth/authService";
import { RoomManager } from "../game/roomManager";
import type { ClientToServerMessage, ServerToClientMessage } from "../../shared/onlineTypes";

interface SocketSession {
  userId: string;
  username: string;
}

const safeSend = (socket: WebSocket, message: ServerToClientMessage): void => {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(message));
  }
};

export const attachWebSocketServer = (
  httpServer: HttpServer,
  authService: AuthService,
  roomManager: RoomManager
): void => {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const socketSessions = new WeakMap<WebSocket, SocketSession>();

  wss.on("connection", (socket) => {
    socket.on("message", async (rawMessage) => {
      let parsedMessage: ClientToServerMessage;

      try {
        parsedMessage = JSON.parse(rawMessage.toString()) as ClientToServerMessage;
      } catch {
        safeSend(socket, { type: "error", message: "Invalid JSON message." });
        return;
      }

      const existingSession = socketSessions.get(socket);

      if (!existingSession) {
        if (parsedMessage.type === "ping") {
          safeSend(socket, { type: "pong", ts: parsedMessage.ts });
          return;
        }

        if (parsedMessage.type !== "auth") {
          safeSend(socket, {
            type: "auth:error",
            message: "Authenticate before sending room/game messages.",
          });
          return;
        }

        const authUser = await authService.getUserFromToken(parsedMessage.token);
        if (!authUser) {
          safeSend(socket, { type: "auth:error", message: "Invalid or expired token." });
          return;
        }

        socketSessions.set(socket, {
          userId: authUser.id,
          username: authUser.username,
        });
        roomManager.addConnection(authUser.id, socket);
        safeSend(socket, {
          type: "auth:ok",
          user: { id: authUser.id, username: authUser.username },
        });
        roomManager.syncUserState(authUser.id);
        return;
      }

      switch (parsedMessage.type) {
        case "auth":
          safeSend(socket, {
            type: "error",
            message: "Socket is already authenticated.",
          });
          break;

        case "ping":
          safeSend(socket, { type: "pong", ts: parsedMessage.ts });
          break;

        case "room:create":
          roomManager.createRoom({
            id: existingSession.userId,
            username: existingSession.username,
          });
          break;

        case "room:join":
          roomManager.joinRoom(
            {
              id: existingSession.userId,
              username: existingSession.username,
            },
            parsedMessage.roomCode
          );
          break;

        case "room:leave":
          roomManager.leaveRoom({
            id: existingSession.userId,
            username: existingSession.username,
          });
          break;

        case "room:start":
          roomManager.startGame({
            id: existingSession.userId,
            username: existingSession.username,
          });
          break;

        case "game:action":
          roomManager.handleGameAction(
            {
              id: existingSession.userId,
              username: existingSession.username,
            },
            parsedMessage.action
          );
          break;

        default:
          safeSend(socket, { type: "error", message: "Unknown message type." });
          break;
      }
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
