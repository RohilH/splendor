import type { GameServerState } from "../game/engine";
import type { Card, GemType } from "../types/game";
import { canAffordCard, countGemBonuses, calculatePlayerPoints } from "../game/selectors";
import { NON_GOLD_GEMS, NUM_FEATURES } from "./types";

const effectiveCost = (
  card: Card,
  bonuses: Record<Exclude<GemType, "gold">, number>,
): number => {
  let total = 0;
  for (const [gem, required] of Object.entries(card.cost)) {
    const g = gem as Exclude<GemType, "gold">;
    total += Math.max(0, (required || 0) - (bonuses[g] || 0));
  }
  return total;
};

/**
 * Extract a fixed-size feature vector from the game state for a given player.
 * All values are normalized roughly to [0, 1].
 *
 * Layout (138 features):
 *   [0-5]     My gems (6)
 *   [6-10]    My bonuses (5)
 *   [11]      My points
 *   [12]      My reserved count
 *   [13-18]   Bank gems (6)
 *   [19-114]  Visible cards: 12 slots × 8 features (96)
 *   [115-119] Noble progress (5 slots)
 *   [120-128] Opponent summary: 3 slots × 3 features (9)
 *   [129-137] Reserved card info: 3 slots × 3 features (9)
 */
export const extractFeatures = (
  state: GameServerState,
  playerIndex: number,
): number[] => {
  const features: number[] = new Array(NUM_FEATURES).fill(0);
  const player = state.players[playerIndex];
  const bonuses = countGemBonuses(player);
  let idx = 0;

  // --- My gems (6) ---
  const allGems: GemType[] = [...NON_GOLD_GEMS, "gold"];
  for (const gem of allGems) {
    features[idx++] = player.gems[gem] / 10;
  }

  // --- My bonuses (5) ---
  for (const gem of NON_GOLD_GEMS) {
    features[idx++] = bonuses[gem] / 7;
  }

  // --- My points (1) ---
  features[idx++] = calculatePlayerPoints(player) / 15;

  // --- My reserved count (1) ---
  features[idx++] = player.reservedCards.length / 3;

  // --- Bank gems (6) ---
  for (const gem of allGems) {
    features[idx++] = state.gems[gem] / 7;
  }

  // --- Visible cards: 12 slots × 8 features = 96 ---
  const levelKeys: ("level1" | "level2" | "level3")[] = ["level1", "level2", "level3"];
  for (const key of levelKeys) {
    const cards = state.visibleCards[key];
    for (let ci = 0; ci < 4; ci++) {
      if (ci < cards.length && cards[ci]) {
        const card = cards[ci];
        features[idx++] = card.points / 5;
        for (const gem of NON_GOLD_GEMS) {
          features[idx++] = card.gem === gem ? 1 : 0;
        }
        features[idx++] = effectiveCost(card, bonuses) / 15;
        features[idx++] = canAffordCard(player, card, state.debugMode) ? 1 : 0;
      } else {
        idx += 8; // leave as zeros
      }
    }
  }

  // --- Noble progress: 5 slots ---
  for (let ni = 0; ni < 5; ni++) {
    if (ni < state.nobles.length) {
      const noble = state.nobles[ni];
      const reqs = Object.entries(noble.requirements);
      if (reqs.length === 0) {
        features[idx++] = 1;
      } else {
        let met = 0;
        let total = 0;
        for (const [gem, required] of reqs) {
          const g = gem as Exclude<GemType, "gold">;
          const have = bonuses[g] || 0;
          const req = required || 0;
          met += Math.min(have, req);
          total += req;
        }
        features[idx++] = total > 0 ? met / total : 1;
      }
    } else {
      idx++; // leave as 0
    }
  }

  // --- Opponent summary: 3 slots × 3 features = 9 ---
  const opponents = state.players
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => i !== playerIndex);

  for (let oi = 0; oi < 3; oi++) {
    if (oi < opponents.length) {
      const opp = opponents[oi].p;
      const oppBonuses = countGemBonuses(opp);
      const totalBonuses = Object.values(oppBonuses).reduce((s, v) => s + v, 0);
      const totalGems = Object.values(opp.gems).reduce((s, v) => s + v, 0);
      features[idx++] = calculatePlayerPoints(opp) / 15;
      features[idx++] = totalBonuses / 25;
      features[idx++] = totalGems / 10;
    } else {
      idx += 3;
    }
  }

  // --- Reserved card info: 3 slots × 3 features = 9 ---
  for (let ri = 0; ri < 3; ri++) {
    if (ri < player.reservedCards.length) {
      const card = player.reservedCards[ri];
      features[idx++] = card.points / 5;
      features[idx++] = effectiveCost(card, bonuses) / 15;
      features[idx++] = canAffordCard(player, card, state.debugMode) ? 1 : 0;
    } else {
      idx += 3;
    }
  }

  return features;
};
