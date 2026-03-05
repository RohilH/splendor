import type { Card, GemType, Gems, Noble } from "../../shared/types/game";

export type { Card, GemType, Gems, Noble };

export interface Player {
  id: number;
  name: string;
  gems: Gems;
  reservedCards: Card[];
  purchasedCards: Card[];
  nobles: Noble[];
}

export interface GameState {
  players: Player[];
  currentPlayer: number;
  gems: Gems;
  nobles: Noble[];
  cards: {
    level1: Card[];
    level2: Card[];
    level3: Card[];
  };
  visibleCards: {
    level1: Card[];
    level2: Card[];
    level3: Card[];
  };
  debugMode: boolean;
} 