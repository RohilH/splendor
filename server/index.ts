import { createMultiplayerServer } from "./createServer";

const port = Number(process.env.PORT ?? 3001);

const { server } = createMultiplayerServer();

server.listen(port, () => {
  console.log(`Multiplayer backend running on http://localhost:${port}`);
});
