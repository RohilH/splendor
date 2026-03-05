interface EnvConfig {
  port: number;
  jwtSecret: string;
  wsHeartbeatIntervalMs: number;
  staleRoomCleanupIntervalMs: number;
  reconnectGraceMs: number;
  idleRoomTtlMs: number;
}

const parseNumber = (
  input: string | undefined,
  fallback: number,
  min: number
): number => {
  if (!input) {
    return fallback;
  }

  const parsed = Number(input);
  if (Number.isNaN(parsed) || parsed < min) {
    return fallback;
  }

  return parsed;
};

const loadEnvConfig = (): EnvConfig => ({
  port: parseNumber(process.env.PORT, 3001, 1),
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me",
  wsHeartbeatIntervalMs: parseNumber(process.env.WS_HEARTBEAT_INTERVAL_MS, 15000, 1000),
  staleRoomCleanupIntervalMs: parseNumber(
    process.env.STALE_ROOM_CLEANUP_INTERVAL_MS,
    30000,
    5000
  ),
  reconnectGraceMs: parseNumber(process.env.RECONNECT_GRACE_MS, 15 * 60 * 1000, 10000),
  idleRoomTtlMs: parseNumber(process.env.IDLE_ROOM_TTL_MS, 2 * 60 * 1000, 10000),
});

const cachedConfig = loadEnvConfig();

export const getEnvConfig = (): EnvConfig => cachedConfig;
