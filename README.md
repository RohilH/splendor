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

## Recommended Production Setup

Use:

- `Vercel` for the frontend
- `Railway` for the backend

This repo now supports that split deployment model directly.

### Why Railway

The backend uses:

- a long-lived Node server
- raw WebSocket upgrades
- in-memory multiplayer room state
- file-backed player-name persistence

That architecture works well on Railway, Render, or Fly.io, but not as a Vercel serverless backend.

## Railway Backend Deployment

### What the repo provides

- `Dockerfile` for a production backend container
- `railway.json` with a healthcheck path
- `npm run start:server` for a production-style backend start
- `tsconfig.server.json` for backend compilation and typechecking

### What you need to do manually

1. Create or log into a Railway account.
2. Create a new Railway project and connect it to this repository.
3. Add a volume to the backend service.
4. Set Railway environment variables:

```text
JWT_SECRET=<strong-random-secret>
USER_STORE_FILE=/data/users.json
ALLOWED_ORIGINS=https://splendor.rohil.org
REQUEST_LOGGING_ENABLED=true
```

Add any optional timing overrides only if you need them.

5. Deploy the service and confirm the backend healthcheck works:

```text
https://<your-railway-domain>/api/health
```

6. Optionally add a custom backend domain such as `api.splendor.rohil.org`.
7. If you use a custom domain, add the required DNS record in your DNS provider.

### Persistence note

User accounts are currently stored in a JSON file by `server/auth/userStore.ts`. Use a Railway volume so that registrations survive restarts and redeploys. Because room state is still in memory, keep the backend as a single running instance for now.

## Vercel Frontend Deployment

After the Railway backend is live, set these Vercel environment variables for the frontend project:

```text
VITE_API_BASE_URL=https://<your-railway-backend-domain>
VITE_WS_BASE_URL=wss://<your-railway-backend-domain>/ws
```

Then redeploy the frontend.

If you use a custom backend domain like `api.splendor.rohil.org`, the values become:

```text
VITE_API_BASE_URL=https://api.splendor.rohil.org
VITE_WS_BASE_URL=wss://api.splendor.rohil.org/ws
```

## Production Verification Checklist

After Railway and Vercel are configured:

1. Open the live frontend at `https://splendor.rohil.org/`.
2. Confirm browser logs show auth and websocket connection attempts.
3. Confirm `https://<backend-domain>/api/health` returns JSON.
4. Register a new user from the live site.
5. Log in with that user from the live site.
6. Open a second browser session, create and join a room, and verify websocket updates flow between both clients.

## Current Limitations

- user auth is file-backed, not database-backed
- multiplayer room state is in-memory, so horizontal scaling is not supported yet
- the backend should stay single-instance until room state is moved to shared infrastructure such as Redis or a database

## License

MIT
