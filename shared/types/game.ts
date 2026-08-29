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
  /**
   * Stable identity for a noble tile. Game state is deep-cloned (and sent over
   * the wire) between actions, so nobles must be matched by id rather than by
   * object reference when they are claimed and removed from the board.
   */
  id: string;
  points: number;
  requirements: Partial<Record<Exclude<GemType, "gold">, number>>;
}
