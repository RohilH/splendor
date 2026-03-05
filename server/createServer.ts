import http from "node:http";
import { createHttpApp } from "./http/createHttpApp";
import { AuthService } from "./auth/authService";
import { RoomManager } from "./game/roomManager";
import { attachWebSocketServer } from "./ws/wsServer";
import { getEnvConfig } from "./config/env";

export const createMultiplayerServer = () => {
  const env = getEnvConfig();
  const authService = new AuthService();
  const roomManager = new RoomManager({
    cleanupIntervalMs: env.staleRoomCleanupIntervalMs,
    reconnectGraceMs: env.reconnectGraceMs,
    idleRoomTtlMs: env.idleRoomTtlMs,
  });
  const app = createHttpApp(authService);
  const server = http.createServer(app);

  attachWebSocketServer(server, authService, roomManager);
  server.on("close", () => {
    roomManager.dispose();
  });

  return {
    app,
    server,
    authService,
    roomManager,
  };
};
