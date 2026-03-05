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
