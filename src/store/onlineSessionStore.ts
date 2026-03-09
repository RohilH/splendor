import { create } from "zustand";
import type {
  GamePublicState,
  OnlineGameAction,
  PublicRoomState,
  RoomState,
} from "../../shared/onlineTypes";
import type {
  ClientToServerMessage,
  ServerToClientMessage,
} from "../../shared/protocol/wsMessages";
import { postJson } from "../network/httpClient";
import { getSocketUrl } from "../network/runtimeConfig";
import { WsClient } from "../network/wsClient";

type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "authenticated";

interface AuthUser {
  id: string;
  username: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

interface OnlineSessionStore {
  user: AuthUser | null;
  token: string | null;
  publicRooms: PublicRoomState[];
  room: RoomState | null;
  gameState: GamePublicState | null;
  status: ConnectionStatus;
  error: string | null;
  info: string | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  claimName: (username: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  createRoom: () => void;
  joinRoom: (roomCode: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  sendGameAction: (action: OnlineGameAction) => void;
}

let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let actionCounter = 0;
const wsClient = new WsClient();

const STORAGE_KEY = "splendor-online-session";
const HEARTBEAT_INTERVAL_MS = 15000;

const persistSession = (token: string | null, user: AuthUser | null): void => {
  if (!token || !user) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
};

const sendOverSocket = (message: ClientToServerMessage): void => {
  wsClient.send(message);
};

const createActionId = (): string => {
  actionCounter += 1;
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `action-${Date.now()}-${actionCounter}`;
};

const stopHeartbeat = (): void => {
  if (!heartbeatTimer) {
    return;
  }
  clearInterval(heartbeatTimer);
  heartbeatTimer = null;
};

const startHeartbeat = (): void => {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    sendOverSocket({ type: "ping", ts: Date.now() });
  }, HEARTBEAT_INTERVAL_MS);
};

type StoreSetter = (
  partial:
    | Partial<OnlineSessionStore>
    | ((state: OnlineSessionStore) => Partial<OnlineSessionStore>)
) => void;

const connectSocket = (set: StoreSetter, get: () => OnlineSessionStore): void => {
  const token = get().token;
  if (!token) {
    return;
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  set({ status: "connecting", error: null });
  const socketUrl = getSocketUrl();
  console.info(`[online] connecting websocket ${socketUrl}`);
  wsClient.setHandlers({
    onOpen: () => {
      console.info("[online] websocket connected");
      set({ status: "connected" });
      sendOverSocket({ type: "auth", token });
    },
    onMessage: (message: ServerToClientMessage) => {
      switch (message.type) {
        case "auth:ok":
          set({
            status: "authenticated",
            user: message.user,
            error: null,
          });
          persistSession(get().token, message.user);
          startHeartbeat();
          break;

        case "auth:error":
          set({
            status: "disconnected",
            error: message.message,
            room: null,
            gameState: null,
          });
          stopHeartbeat();
          wsClient.disconnect();
          break;

        case "room:update":
          set({
            room: message.room,
            gameState: message.room?.started ? get().gameState : null,
          });
          break;

        case "rooms:update":
          set({
            publicRooms: message.rooms,
          });
          break;

        case "game:state":
          set((state) => {
            if (
              state.gameState &&
              message.gameState.stateVersion < state.gameState.stateVersion
            ) {
              return {};
            }

            return {
              gameState: message.gameState,
            };
          });
          break;

        case "info":
          set({ info: message.message });
          break;

        case "error":
          set({ error: message.message });
          break;

        case "pong":
          break;

        default:
          break;
      }
    },
    onError: () => {
      console.warn("[online] websocket connection error");
      set({
        error: "Unable to reach the multiplayer server. Check the backend deployment and websocket URL.",
      });
    },
    onClose: (event) => {
      const shouldReconnect = Boolean(get().token);
      stopHeartbeat();
      console.info(`[online] websocket closed (code ${event.code})`);
      set({
        status: "disconnected",
        error:
          shouldReconnect && event.code !== 1000
            ? "Connection to the multiplayer server was lost. Retrying..."
            : get().error,
      });

      if (shouldReconnect) {
        reconnectTimer = setTimeout(() => {
          connectSocket(set, get);
        }, 1500);
      }
    },
  });

  wsClient.connect(getSocketUrl());
};

const initialState: Omit<
  OnlineSessionStore,
  | "initialize"
  | "claimName"
  | "logout"
  | "clearError"
  | "createRoom"
  | "joinRoom"
  | "leaveRoom"
  | "startGame"
  | "sendGameAction"
> = {
  user: null,
  token: null,
  publicRooms: [],
  room: null,
  gameState: null,
  status: "disconnected",
  error: null,
  info: null,
  initialized: false,
};

export const useOnlineSessionStore = create<OnlineSessionStore>((set, get) => ({
  ...initialState,

  initialize: async () => {
    if (get().initialized) {
      return;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        set({ initialized: true });
        return;
      }

      const parsed = JSON.parse(raw) as { token: string; user: AuthUser };
      set({
        token: parsed.token,
        user: parsed.user,
        initialized: true,
      });
      connectSocket(set, get);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      set({ initialized: true });
    }
  },

  claimName: async (username) => {
    try {
      console.info("[online] creating session");
      const auth = await postJson<AuthResponse>("/api/auth/session", {
        username,
      });
      set({
        token: auth.token,
        user: auth.user,
        room: null,
        gameState: null,
        error: null,
      });
      persistSession(auth.token, auth.user);
      connectSocket(set, get);
      return true;
    } catch (error) {
      console.warn("[online] session creation failed", error);
      set({
        error: error instanceof Error ? error.message : "Unable to claim that name.",
      });
      return false;
    }
  },

  logout: () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    wsClient.disconnect();
    stopHeartbeat();

    persistSession(null, null);
    set({
      ...initialState,
      initialized: true,
    });
  },

  clearError: () => set({ error: null }),

  createRoom: () => sendOverSocket({ type: "room:create" }),

  joinRoom: (roomCode) => sendOverSocket({ type: "room:join", roomCode }),

  leaveRoom: () => sendOverSocket({ type: "room:leave" }),

  startGame: () => sendOverSocket({ type: "room:start" }),

  sendGameAction: (action) =>
    sendOverSocket({
      type: "game:action",
      actionId: createActionId(),
      action,
    }),
}));
