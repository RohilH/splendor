import type { GameServerState } from "../game/engine";
import type { OnlineGameAction } from "../game/actions";
import type { Card, GemType } from "../types/game";
import { canAffordCard, countGemBonuses, calculatePlayerPoints } from "../game/selectors";
import type { AiAgent } from "./types";
import { NON_GOLD_GEMS } from "./types";
import { enumerateValidActions, type ValidAction } from "./actionEnumerator";

type Bonuses = Record<Exclude<GemType, "gold">, number>;

const effectiveCostPerGem = (
  card: Card,
  bonuses: Bonuses,
): Record<Exclude<GemType, "gold">, number> => {
  const result = { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0 };
  for (const [gem, required] of Object.entries(card.cost)) {
    const g = gem as Exclude<GemType, "gold">;
    result[g] = Math.max(0, (required || 0) - (bonuses[g] || 0));
  }
  return result;
};

const totalEffectiveCost = (card: Card, bonuses: Bonuses): number =>
  Object.values(effectiveCostPerGem(card, bonuses)).reduce((s, v) => s + v, 0);

/**
 * How much purchasing a card with the given gem bonus helps reach any noble.
 * Returns 0-1 scaled progress gain.
 */
const nobleProgressGain = (
  gemType: Exclude<GemType, "gold">,
  bonuses: Bonuses,
  nobles: Array<{ requirements: Partial<Record<Exclude<GemType, "gold">, number>> }>,
): number => {
  let bestGain = 0;
  for (const noble of nobles) {
    const req = noble.requirements[gemType] || 0;
    if (req > 0 && bonuses[gemType] < req) {
      // This gem bonus brings us 1 step closer
      const totalReq = Object.values(noble.requirements).reduce(
        (s, v) => s + (v || 0),
        0,
      );
      bestGain = Math.max(bestGain, totalReq > 0 ? 1 / totalReq : 0);
    }
  }
  return bestGain;
};

/**
 * How useful a bonus gem type is for buying other visible/reserved cards.
 */
const bonusUtility = (
  gemType: Exclude<GemType, "gold">,
  bonuses: Bonuses,
  visibleCards: Card[],
  reservedCards: Card[],
): number => {
  let utility = 0;
  for (const card of [...visibleCards, ...reservedCards]) {
    const cost = card.cost[gemType] || 0;
    if (cost > bonuses[gemType]) {
      // Additional bonus would reduce effective cost
      utility += Math.min(1, cost - bonuses[gemType]) * (1 + card.points * 0.5);
    }
  }
  return utility;
};

const getAllVisibleCards = (state: GameServerState): Card[] => [
  ...state.visibleCards.level1,
  ...state.visibleCards.level2,
  ...state.visibleCards.level3,
];

const scoreCardPurchase = (
  card: Card,
  bonuses: Bonuses,
  state: GameServerState,
  player: GameServerState["players"][number],
): number => {
  let score = 0;

  // Points are highly valuable
  score += card.points * 12;

  // Noble progress from the card's gem bonus
  score += nobleProgressGain(card.gem, bonuses, state.nobles) * 8;

  // Bonus utility for future purchases
  const allVisible = getAllVisibleCards(state);
  score += bonusUtility(card.gem, bonuses, allVisible, player.reservedCards) * 2;

  // Slight preference for cheaper cards (already affordable = good)
  const cost = totalEffectiveCost(card, bonuses);
  score += Math.max(0, 5 - cost);

  // Extra incentive to buy when we're close to winning
  const pts = calculatePlayerPoints(player);
  if (pts + card.points >= 15) {
    score += 50;
  }

  return score;
};

const scoreGemTaking = (
  gems: Partial<Record<GemType, number>>,
  state: GameServerState,
  player: GameServerState["players"][number],
  bonuses: Bonuses,
): number => {
  let score = 0;

  // Find the "target card" — best card we're working toward buying
  const allCards = [
    ...getAllVisibleCards(state),
    ...player.reservedCards,
  ];

  // Score by how much these gems help us buy good cards
  for (const card of allCards) {
    const ecost = effectiveCostPerGem(card, bonuses);
    let gemsHelping = 0;
    for (const [gem, count] of Object.entries(gems)) {
      const g = gem as Exclude<GemType, "gold">;
      if (g !== "gold" && (count || 0) > 0 && ecost[g] > 0) {
        gemsHelping += Math.min(count || 0, ecost[g] - player.gems[g]);
      }
    }
    if (gemsHelping > 0) {
      const cardValue = card.points * 3 + 2;
      score += gemsHelping * cardValue;
    }
  }

  // Prefer taking 3 gems over 2 over 1
  const numGems = Object.values(gems).reduce((s, v) => s + (v || 0), 0);
  score += numGems * 0.5;

  // Small bonus for taking 2 of the same (efficient)
  for (const count of Object.values(gems)) {
    if ((count || 0) === 2) score += 1;
  }

  return score;
};

const scoreReserve = (
  card: Card,
  bonuses: Bonuses,
  state: GameServerState,
  player: GameServerState["players"][number],
): number => {
  let score = 0;

  // Reserve high-point cards we can't yet afford
  if (!canAffordCard(player, card, state.debugMode)) {
    score += card.points * 4;
    // Closer to affording = better reserve
    const cost = totalEffectiveCost(card, bonuses);
    score += Math.max(0, 8 - cost) * 2;
  }

  // Gold gem bonus if available
  const totalGems = Object.values(player.gems).reduce((s, v) => s + v, 0);
  if (totalGems < 10 && state.gems.gold > 0) {
    score += 2;
  }

  // Noble progress from the card's gem
  score += nobleProgressGain(card.gem, bonuses, state.nobles) * 3;

  return score;
};

export class HeuristicAgent implements AiAgent {
  pickAction(state: GameServerState, playerIndex: number): OnlineGameAction {
    const validActions = enumerateValidActions(state, playerIndex);
    const player = state.players[playerIndex];
    const bonuses = countGemBonuses(player);

    let bestScore = -Infinity;
    let bestActions: ValidAction[] = [];

    for (const va of validActions) {
      let score = 0;
      const { action } = va;

      switch (action.type) {
        case "purchase_card": {
          const key = `level${action.level}` as "level1" | "level2" | "level3";
          const card = state.visibleCards[key][action.cardIndex];
          if (card) {
            score = scoreCardPurchase(card, bonuses, state, player);
          }
          break;
        }
        case "purchase_reserved_card": {
          const card = player.reservedCards[action.cardIndex];
          if (card) {
            score = scoreCardPurchase(card, bonuses, state, player);
            score += 2; // small bonus for freeing a reserve slot
          }
          break;
        }
        case "take_gems": {
          score = scoreGemTaking(action.gems, state, player, bonuses);
          break;
        }
        case "reserve_card": {
          const key = `level${action.level}` as "level1" | "level2" | "level3";
          const card = state.visibleCards[key][action.cardIndex];
          if (card) {
            score = scoreReserve(card, bonuses, state, player);
          }
          break;
        }
        case "end_turn": {
          score = -100;
          break;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestActions = [va];
      } else if (score === bestScore) {
        bestActions.push(va);
      }
    }

    // Break ties randomly
    const pick = bestActions[Math.floor(Math.random() * bestActions.length)];
    return pick.action;
  }
}
