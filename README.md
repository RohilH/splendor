# Splendor Web Game

A web-based implementation of Splendor with:

- **Local pass-and-play mode**
- **Online multiplayer mode (2-4 players)**
- **Account-based authentication**
- **Real-time gameplay over WebSockets**

Built with React, TypeScript, Chakra UI, Zustand, Express, and `ws`.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Start client + multiplayer backend together:

```bash
npm run dev
```

3. Open the app:

```text
http://localhost:5173
```

4. Choose **Play Online Multiplayer**, register two different accounts in two browser windows, create/join room, and start game.

## Running services separately

Backend only:

```bash
npm run dev:server
```

Frontend only:

```bash
npm run dev:client
```

Typecheck backend code:

```bash
npm run typecheck:server
```

## Game Rules

Splendor is a game of Renaissance merchants racing to build the most prestigious jewelry business. Players compete to build the most profitable and prestigious business by:

- Collecting gems (tokens)
- Purchasing development cards
- Attracting noble patrons

### Basic Gameplay

On your turn, you can perform one of these actions:

1. Take up to three gems of different colors
2. Take two gems of the same color (if there are at least 4 available)
3. Purchase a development card using your gems
4. Reserve a development card and take a gold token (joker)

### Development Cards

- Cards provide permanent gem bonuses for future purchases
- Cards are worth prestige points
- There are three levels of cards (1, 2, and 3)

### Nobles

- Nobles are worth 3 prestige points
- They automatically visit a player who meets their requirements
- Requirements are based on owned development cards

### Winning

The game ends when a player reaches 15 prestige points. Complete the current round so all players have the same number of turns.

## Testing

Run unit tests (Vitest):

```bash
npm test
```

Run unit tests in watch mode:
```bash
npm run test:watch
```

Run E2E tests (Puppeteer — requires the dev server to be running):
```bash
npm run dev &
node e2e.test.mjs
```

## Authentication + Multiplayer Architecture

- `POST /api/auth/register` — create account
- `POST /api/auth/login` — login
- `GET /api/auth/me` — fetch current user
- `WS /ws` — authenticated websocket channel for:
  - room creation/join/leave/start
  - gameplay action submissions
  - real-time room/game state broadcasts

The server is authoritative for move validation and turn progression. Clients submit actions and receive canonical game snapshots.

## Environment variables

Optional (recommended in production):

- `PORT` (default: `3001`)
- `JWT_SECRET` (default fallback exists for local dev only)
- `WS_HEARTBEAT_INTERVAL_MS` (default: `15000`)
- `STALE_ROOM_CLEANUP_INTERVAL_MS` (default: `30000`)
- `RECONNECT_GRACE_MS` (default: `900000`, 15 minutes)
- `IDLE_ROOM_TTL_MS` (default: `120000`, 2 minutes)

You can copy `.env.example` and customize values for your deployment.

Example:

```bash
JWT_SECRET="replace-with-strong-secret" npm run start:server
```

## Production hosting notes (personal site)

For deployment behind your personal site/domain:

1. Serve the frontend over HTTPS.
2. Run backend on a private port (e.g., 3001).
3. Configure reverse proxy routes:
   - `/api/*` -> backend HTTP
   - `/ws` -> backend WebSocket upgrade
4. Ensure secure secret management for `JWT_SECRET`.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
