import { afterEach, describe, expect, it } from "vitest";
import type WebSocket from "ws";
import type { ServerToClientMessage } from "../../../shared/onlineTypes";
import { RoomManager } from "../roomManager";

const createMockSocket = (messages: ServerToClientMessage[]): WebSocket =>
  ({
    readyState: 1,
    send: (payload: string) => {
      messages.push(JSON.parse(payload) as ServerToClientMessage);
    },
  }) as unknown as WebSocket;

describe("room manager cleanup", () => {
  const managers: RoomManager[] = [];

  afterEach(() => {
    managers.forEach((manager) => manager.dispose());
    managers.splice(0, managers.length);
  });

  it("deletes idle empty rooms after TTL", () => {
    const manager = new RoomManager({
      cleanupIntervalMs: 60_000,
      idleRoomTtlMs: 1_000,
      reconnectGraceMs: 5_000,
    });
    managers.push(manager);

    const outboundMessages: ServerToClientMessage[] = [];
    const socket = createMockSocket(outboundMessages);
    const user = { id: "user-1", username: "PlayerOne" };

    manager.addConnection(user.id, socket);
    manager.createRoom(user);

    const roomMessage = outboundMessages.find(
      (message) => message.type === "room:update" && Boolean(message.room)
    ) as Extract<ServerToClientMessage, { type: "room:update" }> | undefined;
    expect(roomMessage?.room).toBeTruthy();
    const roomCode = roomMessage!.room!.code;

    manager.removeConnection(user.id, socket);
    manager.runCleanup(1_000);
    expect(manager.hasRoom(roomCode)).toBe(true);

    manager.runCleanup(2_001);
    expect(manager.hasRoom(roomCode)).toBe(false);
  });
});
