export type GemType = 'diamond' | 'sapphire' | 'emerald' | 'ruby' | 'onyx' | 'gold';

export type Gems = Record<GemType, number>;

export interface Card {
  level: 1 | 2 | 3;
  points: number;
  gem: Exclude<GemType, 'gold'>;
  cost: Partial<Record<Exclude<GemType, 'gold'>, number>>;
}

export interface Noble {
  points: number;
  requirements: Partial<Record<Exclude<GemType, 'gold'>, number>>;
}

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