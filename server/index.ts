import http from "node:http";
import { createHttpApp } from "./http/createHttpApp";
import { AuthService } from "./auth/authService";
import { RoomManager } from "./game/roomManager";
import { attachWebSocketServer } from "./ws/wsServer";

const port = Number(process.env.PORT ?? 3001);

const authService = new AuthService();
const roomManager = new RoomManager();
const app = createHttpApp(authService);
const server = http.createServer(app);

attachWebSocketServer(server, authService, roomManager);

server.listen(port, () => {
  console.log(`Multiplayer backend running on http://localhost:${port}`);
});
