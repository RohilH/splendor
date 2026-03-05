import type { Card, GemType, Gems, Noble } from "./types/game";

export type { Card, GemType, Gems, Noble };

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
