import { createMultiplayerServer } from "./createServer";
import { getEnvConfig } from "./config/env";

const port = getEnvConfig().port;

const { server } = createMultiplayerServer();

server.listen(port, () => {
  console.log(`Multiplayer backend running on http://localhost:${port}`);
});
