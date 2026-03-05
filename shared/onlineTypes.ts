export type GemType =
  | "diamond"
  | "sapphire"
  | "emerald"
  | "ruby"
  | "onyx"
  | "gold";

export type Gems = Record<GemType, number>;

export interface Card {
  level: 1 | 2 | 3;
  points: number;
  gem: Exclude<GemType, "gold">;
  cost: Partial<Record<Exclude<GemType, "gold">, number>>;
}

export interface Noble {
  points: number;
  requirements: Partial<Record<Exclude<GemType, "gold">, number>>;
}

export interface OnlinePlayer {
  id: number;
  userId: string;
  name: string;
  gems: Gems;
  reservedCards: Card[];
  purchasedCards: Card[];
  nobles: Noble[];
}

export interface GamePublicState {
  players: OnlinePlayer[];
  currentPlayer: number;
  gems: Gems;
  nobles: Noble[];
  visibleCards: {
    level1: Card[];
    level2: Card[];
    level3: Card[];
  };
  deckCounts: {
    level1: number;
    level2: number;
    level3: number;
  };
  isGameOver: boolean;
  winner: number | null;
  availableNobles: Noble[];
  showNobleSelection: boolean;
  pendingNobleSelectionPlayerId: string | null;
}

export interface RoomPlayer {
  userId: string;
  username: string;
  connected: boolean;
}

export interface RoomState {
  code: string;
  hostUserId: string;
  players: RoomPlayer[];
  started: boolean;
}

export type OnlineGameAction =
  | {
      type: "take_gems";
      gems: Partial<Record<GemType, number>>;
    }
  | {
      type: "purchase_card";
      level: 1 | 2 | 3;
      cardIndex: number;
    }
  | {
      type: "reserve_card";
      level: 1 | 2 | 3;
      cardIndex: number;
    }
  | {
      type: "purchase_reserved_card";
      cardIndex: number;
    }
  | {
      type: "end_turn";
    }
  | {
      type: "select_noble";
      nobleIndex: number;
    };

export type ClientToServerMessage =
  | { type: "auth"; token: string }
  | { type: "room:create" }
  | { type: "room:join"; roomCode: string }
  | { type: "room:leave" }
  | { type: "room:start" }
  | { type: "game:action"; action: OnlineGameAction };

export type ServerToClientMessage =
  | {
      type: "auth:ok";
      user: { id: string; username: string };
    }
  | {
      type: "auth:error";
      message: string;
    }
  | {
      type: "room:update";
      room: RoomState | null;
    }
  | {
      type: "game:state";
      gameState: GamePublicState;
    }
  | {
      type: "info";
      message: string;
    }
  | {
      type: "error";
      message: string;
    };
