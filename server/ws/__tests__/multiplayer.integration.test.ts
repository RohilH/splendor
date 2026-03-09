import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { WebSocket } from "ws";
import type { AddressInfo } from "node:net";
import { createMultiplayerServer } from "../../createServer";
import type {
  ClientToServerMessage,
  ServerToClientMessage,
} from "../../../shared/protocol/wsMessages";

type MessagePredicate = (message: ServerToClientMessage) => boolean;

const waitForMessage = (
  socket: WebSocket,
  predicate: MessagePredicate,
  timeoutMs = 15000
): Promise<ServerToClientMessage> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("message", onMessage);
      reject(new Error("Timed out waiting for websocket message."));
    }, timeoutMs);

    const onMessage = (rawMessage: Buffer) => {
      const parsed = JSON.parse(rawMessage.toString()) as ServerToClientMessage;
      if (predicate(parsed)) {
        clearTimeout(timeout);
        socket.off("message", onMessage);
        resolve(parsed);
      }
    };

    socket.on("message", onMessage);
  });

const sendSocketMessage = (socket: WebSocket, message: ClientToServerMessage): void => {
  socket.send(JSON.stringify(message));
};

const listen = (server: ReturnType<typeof createMultiplayerServer>["server"]) =>
  new Promise<number>((resolve, reject) => {
    server.listen(0, () => {
      const address = server.address() as AddressInfo;
      resolve(address.port);
    });
    server.once("error", reject);
  });

const closeServer = (server: ReturnType<typeof createMultiplayerServer>["server"]) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

describe("multiplayer websocket integration", () => {
  const trackedSockets: WebSocket[] = [];
  let serverInstance: ReturnType<typeof createMultiplayerServer> | null = null;
  let userStoreFilePath: string | null = null;

  const useIsolatedUserStore = (): void => {
    userStoreFilePath = `/tmp/splendor-users-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.json`;
    process.env.USER_STORE_FILE = userStoreFilePath;
  };

  afterEach(async () => {
    trackedSockets.forEach((socket) => {
      if (socket.readyState === 0 || socket.readyState === 1) {
        socket.close();
      }
    });
    trackedSockets.splice(0, trackedSockets.length);

    if (serverInstance) {
      await closeServer(serverInstance.server);
      serverInstance = null;
    }

    if (userStoreFilePath) {
      await fs.rm(userStoreFilePath, { force: true });
      userStoreFilePath = null;
    }
    delete process.env.USER_STORE_FILE;
  });

  it("authenticates two users and synchronizes game actions in real-time", async () => {
    useIsolatedUserStore();
    serverInstance = createMultiplayerServer();
    const port = await listen(serverInstance.server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const userSuffix = Date.now();
    const createSession = async (username: string) => {
      const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      expect(sessionResponse.status).toBe(201);
      return (await sessionResponse.json()) as {
        token: string;
        user: { id: string; username: string };
      };
    };

    const userA = await createSession(`ws_alice_${userSuffix}`);
    const userB = await createSession(`ws_bob_${userSuffix}`);

    const socketA = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const socketB = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    trackedSockets.push(socketA, socketB);

    await Promise.all([
      new Promise((resolve) => socketA.once("open", resolve)),
      new Promise((resolve) => socketB.once("open", resolve)),
    ]);

    sendSocketMessage(socketA, { type: "auth", token: userA.token });
    sendSocketMessage(socketB, { type: "auth", token: userB.token });

    await Promise.all([
      waitForMessage(socketA, (message) => message.type === "auth:ok"),
      waitForMessage(socketB, (message) => message.type === "auth:ok"),
    ]);

    sendSocketMessage(socketA, { type: "ping", ts: Date.now() });
    const pong = (await waitForMessage(
      socketA,
      (message) => message.type === "pong"
    )) as Extract<ServerToClientMessage, { type: "pong" }>;
    expect(pong.ts).toBeTypeOf("number");

    sendSocketMessage(socketA, { type: "room:create" });
    const roomUpdateA = (await waitForMessage(
      socketA,
      (message) => message.type === "room:update" && Boolean(message.room)
    )) as Extract<ServerToClientMessage, { type: "room:update" }>;
    const publicRoomsForUserB = (await waitForMessage(
      socketB,
      (message) =>
        message.type === "rooms:update" &&
        message.rooms.some((room) => room.players.length === 1 && !room.started)
    )) as Extract<ServerToClientMessage, { type: "rooms:update" }>;

    const roomCode = roomUpdateA.room?.code;
    expect(roomCode).toBeTruthy();
    expect(publicRoomsForUserB.rooms.some((room) => room.code === roomCode)).toBe(true);

    sendSocketMessage(socketB, { type: "room:join", roomCode: roomCode! });

    await Promise.all([
      waitForMessage(
        socketA,
        (message) =>
          message.type === "room:update" &&
          Boolean(message.room) &&
          message.room.players.length === 2
      ),
      waitForMessage(
        socketB,
        (message) =>
          message.type === "room:update" &&
          Boolean(message.room) &&
          message.room.players.length === 2
      ),
    ]);

    sendSocketMessage(socketA, { type: "room:start" });
    const [initialGameStateA] = (await Promise.all([
      waitForMessage(socketA, (message) => message.type === "game:state"),
      waitForMessage(socketB, (message) => message.type === "game:state"),
    ])) as [Extract<ServerToClientMessage, { type: "game:state" }>, ServerToClientMessage];
    expect(initialGameStateA.gameState.stateVersion).toBe(0);

    sendSocketMessage(socketA, {
      type: "game:action",
      actionId: "initial-action-1",
      action: {
        type: "take_gems",
        gems: { diamond: 1 },
      },
    });

    const postMoveStateB = (await waitForMessage(
      socketB,
      (message) =>
        message.type === "game:state" &&
        message.gameState.currentPlayer === 1 &&
        message.gameState.players[0].gems.diamond === 1
    )) as Extract<ServerToClientMessage, { type: "game:state" }>;

    expect(postMoveStateB.gameState.currentPlayer).toBe(1);
    expect(postMoveStateB.gameState.players[0].gems.diamond).toBe(1);
    expect(postMoveStateB.gameState.stateVersion).toBe(1);

    sendSocketMessage(socketB, {
      type: "game:action",
      actionId: "initial-action-2",
      action: {
        type: "end_turn",
      },
    });

    const postTurnStateA = (await waitForMessage(
      socketA,
      (message) =>
        message.type === "game:state" && message.gameState.currentPlayer === 0
    )) as Extract<ServerToClientMessage, { type: "game:state" }>;

    expect(postTurnStateA.gameState.currentPlayer).toBe(0);
    expect(postTurnStateA.gameState.stateVersion).toBe(2);
  });

  it("rejects unauthenticated socket room actions", async () => {
    useIsolatedUserStore();
    serverInstance = createMultiplayerServer();
    const port = await listen(serverInstance.server);
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    trackedSockets.push(socket);

    await new Promise((resolve) => socket.once("open", resolve));
    sendSocketMessage(socket, { type: "room:create" });

    const authError = (await waitForMessage(
      socket,
      (message) => message.type === "auth:error"
    )) as Extract<ServerToClientMessage, { type: "auth:error" }>;

    expect(authError.message).toContain("Authenticate");
  });

  it("resynchronizes room and game state after reconnect", async () => {
    useIsolatedUserStore();
    serverInstance = createMultiplayerServer();
    const port = await listen(serverInstance.server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const userSuffix = Date.now();
    const createSession = async (username: string) => {
      const response = await fetch(`${baseUrl}/api/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      expect(response.status).toBe(201);
      return (await response.json()) as {
        token: string;
        user: { id: string; username: string };
      };
    };

    const userA = await createSession(`reconnect_alice_${userSuffix}`);
    const userB = await createSession(`reconnect_bob_${userSuffix}`);

    const socketA = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const socketB = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    trackedSockets.push(socketA, socketB);

    await Promise.all([
      new Promise((resolve) => socketA.once("open", resolve)),
      new Promise((resolve) => socketB.once("open", resolve)),
    ]);

    sendSocketMessage(socketA, { type: "auth", token: userA.token });
    sendSocketMessage(socketB, { type: "auth", token: userB.token });
    await Promise.all([
      waitForMessage(socketA, (message) => message.type === "auth:ok"),
      waitForMessage(socketB, (message) => message.type === "auth:ok"),
    ]);

    sendSocketMessage(socketA, { type: "room:create" });
    const roomUpdateA = (await waitForMessage(
      socketA,
      (message) => message.type === "room:update" && Boolean(message.room)
    )) as Extract<ServerToClientMessage, { type: "room:update" }>;
    const roomCode = roomUpdateA.room!.code;

    sendSocketMessage(socketB, { type: "room:join", roomCode });
    await Promise.all([
      waitForMessage(
        socketA,
        (message) =>
          message.type === "room:update" &&
          Boolean(message.room) &&
          message.room.players.length === 2
      ),
      waitForMessage(
        socketB,
        (message) =>
          message.type === "room:update" &&
          Boolean(message.room) &&
          message.room.players.length === 2
      ),
    ]);

    sendSocketMessage(socketA, { type: "room:start" });
    await Promise.all([
      waitForMessage(socketA, (message) => message.type === "game:state"),
      waitForMessage(socketB, (message) => message.type === "game:state"),
    ]);

    sendSocketMessage(socketA, {
      type: "game:action",
      actionId: "reconnect-action-1",
      action: {
        type: "take_gems",
        gems: { diamond: 1 },
      },
    });
    await waitForMessage(
      socketA,
      (message) =>
        message.type === "game:state" &&
        message.gameState.currentPlayer === 1 &&
        message.gameState.players[0].gems.diamond === 1
    );

    const disconnectedUpdatePromise = waitForMessage(
      socketA,
      (message) =>
        message.type === "room:update" &&
        Boolean(message.room) &&
        message.room.players.some((player) => player.userId === userB.user.id && !player.connected)
    );
    const socketBClose = new Promise((resolve) => socketB.once("close", resolve));
    socketB.close();
    await socketBClose;
    await disconnectedUpdatePromise;

    const reconnectedSocketB = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    trackedSockets.push(reconnectedSocketB);
    await new Promise((resolve) => reconnectedSocketB.once("open", resolve));

    const roomAfterReconnectPromise = waitForMessage(
      reconnectedSocketB,
      (message) =>
        message.type === "room:update" &&
        Boolean(message.room) &&
        message.room.code === roomCode
    );
    const gameAfterReconnectPromise = waitForMessage(
      reconnectedSocketB,
      (message) =>
        message.type === "game:state" &&
        message.gameState.players[0].gems.diamond === 1 &&
        message.gameState.currentPlayer === 1
    );
    sendSocketMessage(reconnectedSocketB, { type: "auth", token: userB.token });

    await waitForMessage(
      reconnectedSocketB,
      (message) => message.type === "auth:ok"
    );

    const roomAfterReconnect = (await roomAfterReconnectPromise) as Extract<
      ServerToClientMessage,
      { type: "room:update" }
    >;
    expect(roomAfterReconnect.room?.players.length).toBe(2);

    const gameAfterReconnect = (await gameAfterReconnectPromise) as Extract<
      ServerToClientMessage,
      { type: "game:state" }
    >;

    expect(gameAfterReconnect.gameState.currentPlayer).toBe(1);
    expect(gameAfterReconnect.gameState.stateVersion).toBe(1);
  }, 20000);

  it("deduplicates repeated actionId submissions", async () => {
    useIsolatedUserStore();
    serverInstance = createMultiplayerServer();
    const port = await listen(serverInstance.server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const userSuffix = Date.now();
    const createSession = async (username: string) => {
      const response = await fetch(`${baseUrl}/api/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      expect(response.status).toBe(201);
      return (await response.json()) as {
        token: string;
        user: { id: string; username: string };
      };
    };

    const userA = await createSession(`dedupe_alice_${userSuffix}`);
    const userB = await createSession(`dedupe_bob_${userSuffix}`);

    const socketA = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const socketB = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    trackedSockets.push(socketA, socketB);

    await Promise.all([
      new Promise((resolve) => socketA.once("open", resolve)),
      new Promise((resolve) => socketB.once("open", resolve)),
    ]);

    sendSocketMessage(socketA, { type: "auth", token: userA.token });
    sendSocketMessage(socketB, { type: "auth", token: userB.token });
    await Promise.all([
      waitForMessage(socketA, (message) => message.type === "auth:ok"),
      waitForMessage(socketB, (message) => message.type === "auth:ok"),
    ]);

    sendSocketMessage(socketA, { type: "room:create" });
    const roomUpdateA = (await waitForMessage(
      socketA,
      (message) => message.type === "room:update" && Boolean(message.room)
    )) as Extract<ServerToClientMessage, { type: "room:update" }>;
    const roomCode = roomUpdateA.room!.code;

    sendSocketMessage(socketB, { type: "room:join", roomCode });
    await Promise.all([
      waitForMessage(
        socketA,
        (message) =>
          message.type === "room:update" &&
          Boolean(message.room) &&
          message.room.players.length === 2
      ),
      waitForMessage(
        socketB,
        (message) =>
          message.type === "room:update" &&
          Boolean(message.room) &&
          message.room.players.length === 2
      ),
    ]);

    sendSocketMessage(socketA, { type: "room:start" });
    await Promise.all([
      waitForMessage(socketA, (message) => message.type === "game:state"),
      waitForMessage(socketB, (message) => message.type === "game:state"),
    ]);

    sendSocketMessage(socketA, {
      type: "game:action",
      actionId: "duplicate-action-id",
      action: {
        type: "take_gems",
        gems: { diamond: 1 },
      },
    });
    await waitForMessage(
      socketA,
      (message) =>
        message.type === "game:state" &&
        message.gameState.currentPlayer === 1 &&
        message.gameState.players[0].gems.diamond === 1
    );

    sendSocketMessage(socketA, {
      type: "game:action",
      actionId: "duplicate-action-id",
      action: {
        type: "take_gems",
        gems: { diamond: 1 },
      },
    });

    const dedupeState = (await waitForMessage(
      socketA,
      (message) =>
        message.type === "game:state" &&
        message.gameState.currentPlayer === 1 &&
        message.gameState.players[0].gems.diamond === 1
    )) as Extract<ServerToClientMessage, { type: "game:state" }>;

    expect(dedupeState.gameState.currentPlayer).toBe(1);
    expect(dedupeState.gameState.players[0].gems.diamond).toBe(1);
    expect(dedupeState.gameState.stateVersion).toBe(1);
  });

  it("rejects the fifth player joining a room", async () => {
    useIsolatedUserStore();
    serverInstance = createMultiplayerServer();
    const port = await listen(serverInstance.server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const createSession = async (username: string) => {
      const response = await fetch(`${baseUrl}/api/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      expect(response.status).toBe(201);
      return (await response.json()) as {
        token: string;
        user: { id: string; username: string };
      };
    };

    const suffix = Date.now();
    const users = await Promise.all([
      createSession(`capacity_host_${suffix}`),
      createSession(`capacity_p2_${suffix}`),
      createSession(`capacity_p3_${suffix}`),
      createSession(`capacity_p4_${suffix}`),
      createSession(`capacity_p5_${suffix}`),
    ]);

    const sockets = users.map(
      () => new WebSocket(`ws://127.0.0.1:${port}/ws`)
    );
    trackedSockets.push(...sockets);

    await Promise.all(
      sockets.map((socket) => new Promise((resolve) => socket.once("open", resolve)))
    );

    await Promise.all(
      sockets.map((socket, index) => {
        sendSocketMessage(socket, { type: "auth", token: users[index].token });
        return waitForMessage(socket, (message) => message.type === "auth:ok");
      })
    );

    sendSocketMessage(sockets[0], { type: "room:create" });
    const roomUpdate = (await waitForMessage(
      sockets[0],
      (message) => message.type === "room:update" && Boolean(message.room)
    )) as Extract<ServerToClientMessage, { type: "room:update" }>;
    const roomCode = roomUpdate.room!.code;

    for (let i = 1; i <= 3; i += 1) {
      sendSocketMessage(sockets[i], { type: "room:join", roomCode });
      await waitForMessage(
        sockets[0],
        (message) =>
          message.type === "room:update" &&
          Boolean(message.room) &&
          message.room.players.length === i + 1
      );
    }

    sendSocketMessage(sockets[4], { type: "room:join", roomCode });
    const roomFullError = (await waitForMessage(
      sockets[4],
      (message) => message.type === "error"
    )) as Extract<ServerToClientMessage, { type: "error" }>;

    expect(roomFullError.message).toContain("Room is full");
  });
});
