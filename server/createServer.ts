import http from "node:http";
import { createHttpApp } from "./http/createHttpApp";
import { AuthService } from "./auth/authService";
import { RoomManager } from "./game/roomManager";
import { attachWebSocketServer } from "./ws/wsServer";

export const createMultiplayerServer = () => {
  const authService = new AuthService();
  const roomManager = new RoomManager();
  const app = createHttpApp(authService);
  const server = http.createServer(app);

  attachWebSocketServer(server, authService, roomManager);

  return {
    app,
    server,
    authService,
    roomManager,
  };
};
