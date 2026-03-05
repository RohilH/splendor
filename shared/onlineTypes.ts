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
  stateVersion: number;
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

export type { OnlineGameAction } from "./game/actions";
