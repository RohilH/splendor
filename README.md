# Splendor Web Game

A web-based implementation of Splendor with:

- local pass-and-play mode
- online multiplayer mode for 2-4 players
- name-based drop-in sessions
- real-time gameplay over WebSockets

Built with React, TypeScript, Chakra UI, Zustand, Express, and `ws`.

## Local Development

Install dependencies:

```bash
npm install
```

Run the frontend and multiplayer backend together:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

Then choose **Play Online Multiplayer**, pick two unique player names in separate browser windows, create or join a public room, and start the game.

### Running services separately

Backend in watch mode:

```bash
npm run dev:server
```

Frontend only:

```bash
npm run dev:client
```

Production-style backend start:

```bash
npm run start:server
```

Typecheck the backend:

```bash
npm run typecheck:server
```

## Testing

Run unit tests:

```bash
npm test
```

Run unit tests in watch mode:

```bash
npm run test:watch
```

Run browser E2E:

```bash
npm run dev &
node e2e.test.mjs
```

Run online multiplayer E2E:

```bash
npm run dev &
npm run test:online:e2e
```

Generate the multiplayer demo video:

```bash
npm run dev &
npm run demo:online:video
```

## Online Architecture

HTTP endpoints:

- `POST /api/auth/session`
- `GET /api/auth/me`
- `GET /api/health`

WebSocket endpoint:

- `WS /ws`

The server is authoritative for room state, move validation, and turn progression. That means the backend must run as a long-lived Node process. The current implementation keeps room state in memory and stores users in a file, so it is not a good fit for a serverless backend.

## Environment Variables

Backend variables:

- `PORT` default `3001`
- `JWT_SECRET` required in production
- `USER_STORE_FILE` file path for persisted users
- `ALLOWED_ORIGINS` comma-separated frontend origin allowlist
- `REQUEST_LOGGING_ENABLED` enable HTTP request logging, default `true`
- `WS_HEARTBEAT_INTERVAL_MS` default `15000`
- `STALE_ROOM_CLEANUP_INTERVAL_MS` default `30000`
- `RECONNECT_GRACE_MS` default `900000`
- `IDLE_ROOM_TTL_MS` default `120000`

Frontend variables:

- `VITE_API_BASE_URL` optional external API base URL, e.g. `https://api.splendor.rohil.org`
- `VITE_WS_BASE_URL` optional external websocket URL, e.g. `wss://api.splendor.rohil.org/ws`

If the frontend variables are unset, local development continues to use same-origin `/api` and `/ws` through the Vite proxy.

## Recommended Production Setup: Single Service

Deploy the whole game (frontend + multiplayer backend) as one service on a host that supports long-lived Node processes, such as Railway, Render, or Fly.io.

The `Dockerfile` builds the frontend into `dist/` and the server serves it alongside the API and websocket endpoint on the same origin, so no `VITE_API_BASE_URL`, `VITE_WS_BASE_URL`, or CORS configuration is needed.

The backend cannot run on Vercel serverless because it uses:

- a long-lived Node server
- raw WebSocket upgrades
- in-memory multiplayer room state
- file-backed player-name persistence

### Railway deployment steps

1. Create or log into a Railway account.
2. Create a new Railway project and connect it to this repository.
3. Add a volume to the service mounted at `/data`.
4. Set Railway environment variables:

```text
JWT_SECRET=<strong-random-secret>
USER_STORE_FILE=/data/users.json
REQUEST_LOGGING_ENABLED=true
```

Add any optional timing overrides only if you need them. `ALLOWED_ORIGINS` is unnecessary in the single-service setup because the frontend and backend share an origin.

5. Deploy the service and confirm the healthcheck works:

```text
https://<your-railway-domain>/api/health
```

6. Point your game domain (e.g. `splendor.rohil.org`) at the Railway service as a custom domain, and add the required DNS record in your DNS provider.

### Persistence note

User accounts are currently stored in a JSON file by `server/auth/userStore.ts`. Use a Railway volume so that registrations survive restarts and redeploys. Because room state is still in memory, keep the backend as a single running instance for now.

## Alternative: Split Frontend/Backend Deployment

You can still host the frontend separately (e.g. on Vercel) with the backend on Railway. In that case, set these frontend build-time environment variables and redeploy the frontend whenever the backend URL changes:

```text
VITE_API_BASE_URL=https://<your-railway-backend-domain>
VITE_WS_BASE_URL=wss://<your-railway-backend-domain>/ws
```

Also set `ALLOWED_ORIGINS=<your-frontend-origin>` on the backend so CORS and websocket origin checks pass.

Note that if the backend is ever deleted or its domain changes, the deployed frontend keeps pointing at the dead URL until it is rebuilt, and users see connection errors. The single-service setup avoids this failure mode.

## Production Verification Checklist

After deploying:

1. Open the live frontend.
2. Confirm `https://<your-domain>/api/health` returns JSON.
3. Confirm browser logs show auth and websocket connection attempts.
4. Claim a player name from the live site.
5. Open a second browser session, create and join a room, and verify websocket updates flow between both clients.

## Current Limitations

- user auth is file-backed, not database-backed
- multiplayer room state is in-memory, so horizontal scaling is not supported yet
- the backend should stay single-instance until room state is moved to shared infrastructure such as Redis or a database

## License

MIT
