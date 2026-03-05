import type { Card, GemType } from "../types/game";

type PlayerResourceView = {
  gems: Record<GemType, number>;
  purchasedCards: Array<{
    gem: Exclude<GemType, "gold">;
    points: number;
  }>;
};

type PlayerPointView = {
  purchasedCards: Array<{ points: number }>;
  nobles: Array<{ points: number }>;
};

export const countGemBonuses = (
  player: Pick<PlayerResourceView, "purchasedCards">
): Record<Exclude<GemType, "gold">, number> =>
  (["diamond", "sapphire", "emerald", "ruby", "onyx"] as const).reduce(
    (accumulator, gemType) => ({
      ...accumulator,
      [gemType]: player.purchasedCards.filter((card) => card.gem === gemType).length,
    }),
    {
      diamond: 0,
      sapphire: 0,
      emerald: 0,
      ruby: 0,
      onyx: 0,
    }
  );

export const canAffordCard = (
  player: PlayerResourceView,
  card: Card,
  debugMode = false
): boolean => {
  if (debugMode) {
    return true;
  }

  const bonuses = countGemBonuses(player);
  let goldNeeded = 0;

  for (const [gem, requiredCost] of Object.entries(card.cost)) {
    const gemType = gem as Exclude<GemType, "gold">;
    const required = Math.max(0, (requiredCost || 0) - bonuses[gemType]);
    const available = player.gems[gemType] || 0;

    if (available < required) {
      goldNeeded += required - available;
    }
  }

  return goldNeeded <= player.gems.gold;
};

export const calculatePlayerPoints = (player: PlayerPointView): number =>
  player.purchasedCards.reduce((sum, card) => sum + (card.points || 0), 0) +
  player.nobles.reduce((sum, noble) => sum + noble.points, 0);
