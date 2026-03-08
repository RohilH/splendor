import { describe, expect, it, vi } from "vitest";
import type { WebSocket } from "ws";
import type { ServerToClientMessage } from "../../../shared/protocol/wsMessages";
import { routeSocketMessage } from "../messageRouter";

type SentMessage = {
  socket: WebSocket;
  message: ServerToClientMessage;
};

const createRoomManagerMock = () => ({
  addConnection: vi.fn(),
  syncUserState: vi.fn(),
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  startGame: vi.fn(),
  handleGameAction: vi.fn(),
});

describe("routeSocketMessage", () => {
  it("responds to unauthenticated ping with pong", async () => {
    const socket = {} as WebSocket;
    const sent: SentMessage[] = [];
    const authService = {
      getUserFromToken: vi.fn(),
    };
    const roomManager = createRoomManagerMock();

    await routeSocketMessage({
      socket,
      parsedMessage: { type: "ping", ts: 123 },
      existingSession: undefined,
      authService: authService as never,
      roomManager: roomManager as never,
      socketSessions: new WeakMap(),
      send: (targetSocket, message) => sent.push({ socket: targetSocket, message }),
    });

    expect(sent).toHaveLength(1);
    expect(sent[0].message).toEqual({ type: "pong", ts: 123 });
  });

  it("authenticates socket and syncs room state", async () => {
    const socket = {} as WebSocket;
    const sent: SentMessage[] = [];
    const authService = {
      getUserFromToken: vi
        .fn()
        .mockResolvedValue({ id: "user-1", username: "UserOne" }),
    };
    const roomManager = createRoomManagerMock();
    const socketSessions = new WeakMap<WebSocket, { userId: string; username: string }>();

    await routeSocketMessage({
      socket,
      parsedMessage: { type: "auth", token: "token" },
      existingSession: undefined,
      authService: authService as never,
      roomManager: roomManager as never,
      socketSessions,
      send: (targetSocket, message) => sent.push({ socket: targetSocket, message }),
    });

    expect(authService.getUserFromToken).toHaveBeenCalledWith("token");
    expect(roomManager.addConnection).toHaveBeenCalledWith("user-1", socket);
    expect(roomManager.syncUserState).toHaveBeenCalledWith("user-1");
    expect(socketSessions.get(socket)).toEqual({
      userId: "user-1",
      username: "UserOne",
    });
    expect(sent[0].message).toEqual({
      type: "auth:ok",
      user: { id: "user-1", username: "UserOne" },
    });
  });

  it("routes game action for authenticated session", async () => {
    const socket = {} as WebSocket;
    const sent: SentMessage[] = [];
    const authService = {
      getUserFromToken: vi.fn(),
    };
    const roomManager = createRoomManagerMock();

    await routeSocketMessage({
      socket,
      parsedMessage: {
        type: "game:action",
        actionId: "action-1",
        action: {
          type: "end_turn",
        },
      },
      existingSession: {
        userId: "user-2",
        username: "UserTwo",
      },
      authService: authService as never,
      roomManager: roomManager as never,
      socketSessions: new WeakMap(),
      send: (targetSocket, message) => sent.push({ socket: targetSocket, message }),
    });

    expect(roomManager.handleGameAction).toHaveBeenCalledWith(
      { id: "user-2", username: "UserTwo" },
      { type: "end_turn" },
      "action-1"
    );
    expect(sent).toHaveLength(0);
  });
});
