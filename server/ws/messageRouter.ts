import type { WebSocket } from "ws";
import type { ClientToServerMessage, ServerToClientMessage } from "../../shared/protocol/wsMessages";
import type { AuthService } from "../auth/authService";
import type { RoomManager } from "../game/roomManager";

interface SocketSession {
  userId: string;
  username: string;
}

interface RouteMessageArgs {
  socket: WebSocket;
  parsedMessage: ClientToServerMessage;
  existingSession: SocketSession | undefined;
  authService: AuthService;
  roomManager: RoomManager;
  socketSessions: WeakMap<WebSocket, SocketSession>;
  send: (socket: WebSocket, message: ServerToClientMessage) => void;
}

const toSessionUser = (session: SocketSession) => ({
  id: session.userId,
  username: session.username,
});

export const routeSocketMessage = async ({
  socket,
  parsedMessage,
  existingSession,
  authService,
  roomManager,
  socketSessions,
  send,
}: RouteMessageArgs): Promise<void> => {
  if (!existingSession) {
    if (parsedMessage.type === "ping") {
      send(socket, { type: "pong", ts: parsedMessage.ts });
      return;
    }

    if (parsedMessage.type !== "auth") {
      send(socket, {
        type: "auth:error",
        message: "Authenticate before sending room/game messages.",
      });
      return;
    }

    const authUser = await authService.getUserFromToken(parsedMessage.token);
    if (!authUser) {
      send(socket, { type: "auth:error", message: "Invalid or expired token." });
      return;
    }

    socketSessions.set(socket, {
      userId: authUser.id,
      username: authUser.username,
    });
    roomManager.addConnection(authUser.id, socket);
    send(socket, {
      type: "auth:ok",
      user: { id: authUser.id, username: authUser.username },
    });
    roomManager.syncUserState(authUser.id);
    return;
  }

  switch (parsedMessage.type) {
    case "auth":
      send(socket, {
        type: "error",
        message: "Socket is already authenticated.",
      });
      break;

    case "ping":
      send(socket, { type: "pong", ts: parsedMessage.ts });
      break;

    case "room:create":
      roomManager.createRoom(toSessionUser(existingSession));
      break;

    case "room:join":
      roomManager.joinRoom(toSessionUser(existingSession), parsedMessage.roomCode);
      break;

    case "room:leave":
      roomManager.leaveRoom(toSessionUser(existingSession));
      break;

    case "room:start":
      roomManager.startGame(toSessionUser(existingSession));
      break;

    case "game:action":
      roomManager.handleGameAction(
        toSessionUser(existingSession),
        parsedMessage.action,
        parsedMessage.actionId
      );
      break;

    default:
      send(socket, { type: "error", message: "Unknown message type." });
      break;
  }
};

export type { SocketSession };
