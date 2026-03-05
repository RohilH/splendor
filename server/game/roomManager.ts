import type WebSocket from "ws";
import { customAlphabet } from "nanoid";
import type { RoomState, ServerToClientMessage, OnlineGameAction } from "../../shared/onlineTypes";
import { applyGameAction, createInitialGameState, toPublicGameState } from "./engine";
import type { GameServerState } from "./engine";

interface SessionUser {
  id: string;
  username: string;
}

interface Room {
  code: string;
  hostUserId: string;
  players: Array<{ userId: string; username: string }>;
  gameState: GameServerState | null;
  createdAt: number;
  updatedAt: number;
  emptySince: number | null;
}

interface RoomManagerOptions {
  cleanupIntervalMs: number;
  reconnectGraceMs: number;
  idleRoomTtlMs: number;
}

const createRoomCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
const defaultOptions: RoomManagerOptions = {
  cleanupIntervalMs: 30000,
  reconnectGraceMs: 15 * 60 * 1000,
  idleRoomTtlMs: 2 * 60 * 1000,
};

const safeSend = (socket: WebSocket, message: ServerToClientMessage): void => {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(message));
  }
};

export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly userRoom = new Map<string, string>();
  private readonly socketsByUser = new Map<string, Set<WebSocket>>();
  private readonly options: RoomManagerOptions;
  private readonly cleanupInterval: NodeJS.Timeout;

  public constructor(options?: Partial<RoomManagerOptions>) {
    this.options = { ...defaultOptions, ...options };
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, this.options.cleanupIntervalMs);
    this.cleanupInterval.unref?.();
  }

  public dispose(): void {
    clearInterval(this.cleanupInterval);
  }

  public addConnection(userId: string, socket: WebSocket): void {
    const socketSet = this.socketsByUser.get(userId) ?? new Set<WebSocket>();
    socketSet.add(socket);
    this.socketsByUser.set(userId, socketSet);
    this.touchUserRoom(userId);
    this.broadcastUserRoom(userId);
  }

  public removeConnection(userId: string, socket: WebSocket): void {
    const socketSet = this.socketsByUser.get(userId);
    if (!socketSet) {
      return;
    }

    socketSet.delete(socket);
    if (socketSet.size === 0) {
      this.socketsByUser.delete(userId);
    }

    this.touchUserRoom(userId);
    this.broadcastUserRoom(userId);
  }

  public createRoom(user: SessionUser): void {
    if (this.userRoom.has(user.id)) {
      this.sendToUser(user.id, { type: "error", message: "You are already in a room." });
      return;
    }

    let roomCode = createRoomCode();
    while (this.rooms.has(roomCode)) {
      roomCode = createRoomCode();
    }

    const now = Date.now();
    const room: Room = {
      code: roomCode,
      hostUserId: user.id,
      players: [{ userId: user.id, username: user.username }],
      gameState: null,
      createdAt: now,
      updatedAt: now,
      emptySince: null,
    };

    this.rooms.set(room.code, room);
    this.userRoom.set(user.id, room.code);
    this.broadcastRoom(room.code);
  }

  public joinRoom(user: SessionUser, requestedRoomCode: string): void {
    const roomCode = requestedRoomCode.trim().toUpperCase();
    const room = this.rooms.get(roomCode);

    if (!room) {
      this.sendToUser(user.id, { type: "error", message: "Room not found." });
      return;
    }

    const existingRoomCode = this.userRoom.get(user.id);
    if (existingRoomCode && existingRoomCode !== roomCode) {
      this.sendToUser(user.id, {
        type: "error",
        message: "Leave your current room before joining another room.",
      });
      return;
    }

    const existingPlayer = room.players.find((player) => player.userId === user.id);
    if (existingPlayer) {
      this.userRoom.set(user.id, room.code);
      this.touchRoom(room);
      this.broadcastRoom(room.code);
      if (room.gameState) {
        this.sendToUser(user.id, {
          type: "game:state",
          gameState: toPublicGameState(room.gameState),
        });
      }
      return;
    }

    if (room.gameState) {
      this.sendToUser(user.id, {
        type: "error",
        message: "This game is already in progress.",
      });
      return;
    }

    if (room.players.length >= 4) {
      this.sendToUser(user.id, { type: "error", message: "Room is full." });
      return;
    }

    room.players.push({ userId: user.id, username: user.username });
    this.userRoom.set(user.id, room.code);
    this.touchRoom(room);
    this.broadcastRoom(room.code);
  }

  public leaveRoom(user: SessionUser): void {
    const roomCode = this.userRoom.get(user.id);
    if (!roomCode) {
      this.sendToUser(user.id, { type: "room:update", room: null });
      return;
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.userRoom.delete(user.id);
      this.sendToUser(user.id, { type: "room:update", room: null });
      return;
    }

    if (room.gameState && !room.gameState.isGameOver) {
      this.sendToUser(user.id, {
        type: "error",
        message: "Cannot leave a live game. Close the tab to disconnect and reconnect later.",
      });
      return;
    }

    room.players = room.players.filter((player) => player.userId !== user.id);
    this.userRoom.delete(user.id);
    this.sendToUser(user.id, { type: "room:update", room: null });

    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      return;
    }

    if (room.hostUserId === user.id) {
      room.hostUserId = room.players[0].userId;
    }

    this.touchRoom(room);
    this.broadcastRoom(room.code);
  }

  public startGame(user: SessionUser): void {
    const room = this.getUserRoom(user.id);
    if (!room) {
      this.sendToUser(user.id, { type: "error", message: "You are not in a room." });
      return;
    }

    if (room.hostUserId !== user.id) {
      this.sendToUser(user.id, { type: "error", message: "Only the host can start the game." });
      return;
    }

    if (room.players.length < 2) {
      this.sendToUser(user.id, {
        type: "error",
        message: "At least 2 players are required to start.",
      });
      return;
    }

    room.gameState = createInitialGameState(
      room.players.map((player) => ({ userId: player.userId, name: player.username }))
    );

    this.touchRoom(room);
    this.broadcastRoom(room.code);
    this.broadcastGame(room);
  }

  public handleGameAction(user: SessionUser, action: OnlineGameAction): void {
    const room = this.getUserRoom(user.id);
    if (!room || !room.gameState) {
      this.sendToUser(user.id, { type: "error", message: "No active game found." });
      return;
    }

    const result = applyGameAction(room.gameState, user.id, action);
    if (result.error) {
      this.sendToUser(user.id, { type: "error", message: result.error });
      return;
    }

    room.gameState = result.state;
    this.touchRoom(room);
    this.broadcastGame(room);
    this.broadcastRoom(room.code);
  }

  public syncUserState(userId: string): void {
    const room = this.getUserRoom(userId);
    if (!room) {
      this.sendToUser(userId, { type: "room:update", room: null });
      return;
    }

    this.sendToUser(userId, {
      type: "room:update",
      room: this.toRoomState(room),
    });

    if (room.gameState) {
      this.sendToUser(userId, {
        type: "game:state",
        gameState: toPublicGameState(room.gameState),
      });
    }
  }

  public runCleanup(now = Date.now()): void {
    for (const room of this.rooms.values()) {
      const hasConnectedPlayers = room.players.some((player) =>
        this.isConnected(player.userId)
      );

      if (hasConnectedPlayers) {
        room.emptySince = null;
        continue;
      }

      room.emptySince ??= now;

      const ttlMs =
        room.gameState && !room.gameState.isGameOver
          ? this.options.reconnectGraceMs
          : this.options.idleRoomTtlMs;

      if (now - room.emptySince >= ttlMs) {
        this.removeRoom(room.code);
      }
    }
  }

  public hasRoom(roomCode: string): boolean {
    return this.rooms.has(roomCode);
  }

  private getUserRoom(userId: string): Room | null {
    const roomCode = this.userRoom.get(userId);
    if (!roomCode) {
      return null;
    }
    return this.rooms.get(roomCode) ?? null;
  }

  private touchRoom(room: Room): void {
    room.updatedAt = Date.now();
    if (room.players.some((player) => this.isConnected(player.userId))) {
      room.emptySince = null;
    }
  }

  private touchUserRoom(userId: string): void {
    const room = this.getUserRoom(userId);
    if (!room) {
      return;
    }
    this.touchRoom(room);
  }

  private removeRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return;
    }
    room.players.forEach((player) => {
      this.userRoom.delete(player.userId);
    });
    this.rooms.delete(roomCode);
  }

  private isConnected(userId: string): boolean {
    const socketSet = this.socketsByUser.get(userId);
    return Boolean(socketSet && socketSet.size > 0);
  }

  private toRoomState(room: Room): RoomState {
    return {
      code: room.code,
      hostUserId: room.hostUserId,
      started: room.gameState !== null,
      players: room.players.map((player) => ({
        userId: player.userId,
        username: player.username,
        connected: this.isConnected(player.userId),
      })),
    };
  }

  private sendToUser(userId: string, message: ServerToClientMessage): void {
    const sockets = this.socketsByUser.get(userId);
    if (!sockets) {
      return;
    }

    sockets.forEach((socket) => safeSend(socket, message));
  }

  private broadcastRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return;
    }

    const payload: ServerToClientMessage = {
      type: "room:update",
      room: this.toRoomState(room),
    };

    room.players.forEach((player) => this.sendToUser(player.userId, payload));
  }

  private broadcastGame(room: Room): void {
    if (!room.gameState) {
      return;
    }

    const payload: ServerToClientMessage = {
      type: "game:state",
      gameState: toPublicGameState(room.gameState),
    };
    room.players.forEach((player) => this.sendToUser(player.userId, payload));
  }

  private broadcastUserRoom(userId: string): void {
    const room = this.getUserRoom(userId);
    if (!room) {
      return;
    }
    this.broadcastRoom(room.code);
  }
}

export type { SessionUser };
