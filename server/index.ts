import { createMultiplayerServer } from "./createServer";
import { getEnvConfig } from "./config/env";

const env = getEnvConfig();
const port = env.port;

const { server } = createMultiplayerServer();

server.listen(port, () => {
  const allowedOrigins =
    env.allowedOrigins.length > 0 ? env.allowedOrigins.join(", ") : "all origins";
  console.info(`[server] multiplayer backend listening on port ${port}`);
  console.info(`[server] allowed origins: ${allowedOrigins}`);
  console.info(
    `[server] user store file: ${process.env.USER_STORE_FILE ?? "server/data/users.json"}`
  );
});
