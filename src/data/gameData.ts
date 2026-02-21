import { Card, Noble, GemType } from '../types/game';

type Gem = Exclude<GemType, 'gold'>;

function card(level: 1 | 2 | 3, gem: Gem, points: number, onyx: number, sapphire: number, emerald: number, ruby: number, diamond: number): Card {
  const cost: Partial<Record<Gem, number>> = {};
  if (onyx) cost.onyx = onyx;
  if (sapphire) cost.sapphire = sapphire;
  if (emerald) cost.emerald = emerald;
  if (ruby) cost.ruby = ruby;
  if (diamond) cost.diamond = diamond;
  return { level, gem, points, cost };
}

// Official Splendor card data
// Source: https://github.com/bouk/splendimax/blob/master/Splendor%20Cards.csv
// CSV columns: Level, Color, PV, Black, Blue, Green, Red, White

export const level1Cards: Card[] = [
  // Onyx (Black)
  card(1, 'onyx', 0, 0, 1, 1, 1, 1),
  card(1, 'onyx', 0, 0, 2, 1, 1, 1),
  card(1, 'onyx', 0, 0, 2, 0, 1, 2),
  card(1, 'onyx', 0, 1, 0, 1, 3, 0),
  card(1, 'onyx', 0, 0, 0, 2, 1, 0),
  card(1, 'onyx', 0, 0, 0, 2, 0, 2),
  card(1, 'onyx', 0, 0, 0, 3, 0, 0),
  card(1, 'onyx', 1, 0, 4, 0, 0, 0),
  // Sapphire (Blue)
  card(1, 'sapphire', 0, 1, 0, 1, 1, 1),
  card(1, 'sapphire', 0, 1, 0, 1, 2, 1),
  card(1, 'sapphire', 0, 0, 0, 2, 2, 1),
  card(1, 'sapphire', 0, 0, 1, 3, 1, 0),
  card(1, 'sapphire', 0, 2, 0, 0, 0, 1),
  card(1, 'sapphire', 0, 2, 0, 2, 0, 0),
  card(1, 'sapphire', 0, 3, 0, 0, 0, 0),
  card(1, 'sapphire', 1, 0, 0, 0, 4, 0),
  // Diamond (White)
  card(1, 'diamond', 0, 1, 1, 1, 1, 0),
  card(1, 'diamond', 0, 1, 1, 2, 1, 0),
  card(1, 'diamond', 0, 1, 2, 2, 0, 0),
  card(1, 'diamond', 0, 1, 1, 0, 0, 3),
  card(1, 'diamond', 0, 1, 0, 0, 2, 0),
  card(1, 'diamond', 0, 2, 2, 0, 0, 0),
  card(1, 'diamond', 0, 0, 3, 0, 0, 0),
  card(1, 'diamond', 1, 0, 0, 4, 0, 0),
  // Emerald (Green)
  card(1, 'emerald', 0, 1, 1, 0, 1, 1),
  card(1, 'emerald', 0, 2, 1, 0, 1, 1),
  card(1, 'emerald', 0, 2, 1, 0, 2, 0),
  card(1, 'emerald', 0, 0, 3, 1, 0, 1),
  card(1, 'emerald', 0, 0, 1, 0, 0, 2),
  card(1, 'emerald', 0, 0, 2, 0, 2, 0),
  card(1, 'emerald', 0, 0, 0, 0, 3, 0),
  card(1, 'emerald', 1, 4, 0, 0, 0, 0),
  // Ruby (Red)
  card(1, 'ruby', 0, 1, 1, 1, 0, 1),
  card(1, 'ruby', 0, 1, 1, 1, 0, 2),
  card(1, 'ruby', 0, 2, 0, 1, 0, 2),
  card(1, 'ruby', 0, 3, 0, 0, 1, 1),
  card(1, 'ruby', 0, 0, 2, 1, 0, 0),
  card(1, 'ruby', 0, 0, 0, 0, 2, 2),
  card(1, 'ruby', 0, 0, 0, 0, 0, 3),
  card(1, 'ruby', 1, 0, 0, 0, 0, 4),
];

export const level2Cards: Card[] = [
  // Onyx (Black)
  card(2, 'onyx', 1, 0, 2, 2, 0, 3),
  card(2, 'onyx', 1, 2, 0, 3, 0, 3),
  card(2, 'onyx', 2, 0, 1, 4, 2, 0),
  card(2, 'onyx', 2, 0, 0, 5, 3, 0),
  card(2, 'onyx', 2, 0, 0, 0, 0, 5),
  card(2, 'onyx', 3, 6, 0, 0, 0, 0),
  // Sapphire (Blue)
  card(2, 'sapphire', 1, 0, 2, 2, 3, 0),
  card(2, 'sapphire', 1, 3, 2, 3, 0, 0),
  card(2, 'sapphire', 2, 0, 3, 0, 0, 5),
  card(2, 'sapphire', 2, 4, 0, 0, 1, 2),
  card(2, 'sapphire', 2, 0, 5, 0, 0, 0),
  card(2, 'sapphire', 3, 0, 6, 0, 0, 0),
  // Diamond (White)
  card(2, 'diamond', 1, 2, 0, 3, 2, 0),
  card(2, 'diamond', 1, 0, 3, 0, 3, 2),
  card(2, 'diamond', 2, 2, 0, 1, 4, 0),
  card(2, 'diamond', 2, 3, 0, 0, 5, 0),
  card(2, 'diamond', 2, 0, 0, 0, 5, 0),
  card(2, 'diamond', 3, 0, 0, 0, 0, 6),
  // Emerald (Green)
  card(2, 'emerald', 1, 0, 0, 2, 3, 3),
  card(2, 'emerald', 1, 2, 3, 0, 0, 2),
  card(2, 'emerald', 2, 1, 2, 0, 0, 4),
  card(2, 'emerald', 2, 0, 5, 3, 0, 0),
  card(2, 'emerald', 2, 0, 0, 5, 0, 0),
  card(2, 'emerald', 3, 0, 0, 6, 0, 0),
  // Ruby (Red)
  card(2, 'ruby', 1, 3, 0, 0, 2, 2),
  card(2, 'ruby', 1, 3, 3, 0, 2, 0),
  card(2, 'ruby', 2, 0, 4, 2, 0, 1),
  card(2, 'ruby', 2, 5, 0, 0, 0, 3),
  card(2, 'ruby', 2, 5, 0, 0, 0, 0),
  card(2, 'ruby', 3, 0, 0, 0, 6, 0),
];

export const level3Cards: Card[] = [
  // Onyx (Black)
  card(3, 'onyx', 3, 0, 3, 5, 3, 3),
  card(3, 'onyx', 4, 0, 0, 0, 7, 0),
  card(3, 'onyx', 4, 3, 0, 3, 6, 0),
  card(3, 'onyx', 5, 3, 0, 0, 7, 0),
  // Sapphire (Blue)
  card(3, 'sapphire', 3, 5, 0, 3, 3, 3),
  card(3, 'sapphire', 4, 0, 0, 0, 0, 7),
  card(3, 'sapphire', 4, 3, 3, 0, 0, 6),
  card(3, 'sapphire', 5, 0, 3, 0, 0, 7),
  // Diamond (White)
  card(3, 'diamond', 3, 3, 3, 3, 5, 0),
  card(3, 'diamond', 4, 7, 0, 0, 0, 0),
  card(3, 'diamond', 4, 6, 0, 0, 3, 3),
  card(3, 'diamond', 5, 7, 0, 0, 0, 3),
  // Emerald (Green)
  card(3, 'emerald', 3, 3, 3, 0, 3, 5),
  card(3, 'emerald', 4, 0, 7, 0, 0, 0),
  card(3, 'emerald', 4, 0, 6, 3, 0, 3),
  card(3, 'emerald', 5, 0, 7, 3, 0, 0),
  // Ruby (Red)
  card(3, 'ruby', 3, 3, 5, 3, 0, 3),
  card(3, 'ruby', 4, 0, 0, 7, 0, 0),
  card(3, 'ruby', 4, 0, 3, 6, 3, 0),
  card(3, 'ruby', 5, 0, 0, 7, 3, 0),
];

// Official Splendor nobles (10 total)
export const nobles: Noble[] = [
  { points: 3, requirements: { onyx: 3, sapphire: 3, diamond: 3 } },
  { points: 3, requirements: { emerald: 3, sapphire: 3, ruby: 3 } },
  { points: 3, requirements: { emerald: 3, sapphire: 3, diamond: 3 } },
  { points: 3, requirements: { onyx: 3, ruby: 3, diamond: 3 } },
  { points: 3, requirements: { onyx: 3, emerald: 3, ruby: 3 } },
  { points: 3, requirements: { diamond: 4, sapphire: 4 } },
  { points: 3, requirements: { onyx: 4, diamond: 4 } },
  { points: 3, requirements: { sapphire: 4, emerald: 4 } },
  { points: 3, requirements: { onyx: 4, ruby: 4 } },
  { points: 3, requirements: { emerald: 4, ruby: 4 } },
];
