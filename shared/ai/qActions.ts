import type { GameServerState } from "../game/engine";
import type { OnlineGameAction } from "../game/actions";
import type { Card, GemType } from "../types/game";
import { countGemBonuses } from "../game/selectors";
import { enumerateValidActions } from "./actionEnumerator";
import { TAKE_2_COMBOS, TAKE_3_COMBOS } from "./types";

/**
 * Abstract action classes for tabular Q-learning.
 *
 * The raw 58-slot action encoding pairs badly with a colorless state key
 * (Q(s, take2 ruby) vs Q(s, take2 diamond) is unlearnable when s carries no
 * color information), so legal moves are grouped into 14 strategic classes.
 * Concrete color/card choices within a class are resolved by a fixed
 * deterministic policy oriented toward a "target card" — the table learns
 * strategy, the policy handles tactics.
 */
export const NUM_Q_ACTIONS = 14;

export const Q_SLOT = {
  buyVisibleL1NoPoints: 0,
  buyVisibleL1Points: 1,
  buyVisibleL2: 2,
  buyVisibleL3: 3,
  buyReserved: 4,
  take3Targeted: 5,
  take3Other: 6,
  take2SameNeeded: 7,
  take2SameOther: 8,
  take2DiffFallback: 9,
  take1Fallback: 10,
  reserveHighValue: 11,
  reserveOther: 12,
  endTurn: 13,
} as const;

export interface QAction {
  qSlot: number;
  action: OnlineGameAction;
}

type NonGoldGem = Exclude<GemType, "gold">;

const effectiveCost = (
  card: Card,
  bonuses: Record<NonGoldGem, number>,
): number => {
  let total = 0;
  for (const [gem, required] of Object.entries(card.cost)) {
    total += Math.max(0, (required || 0) - bonuses[gem as NonGoldGem]);
  }
  return total;
};

/** Per-gem shortfall between what the card needs and what the player holds. */
const deficitToward = (
  card: Card,
  bonuses: Record<NonGoldGem, number>,
  gems: Record<GemType, number>,
): Record<NonGoldGem, number> => {
  const deficit = {
    diamond: 0,
    sapphire: 0,
    emerald: 0,
    ruby: 0,
    onyx: 0,
  } as Record<NonGoldGem, number>;
  for (const [gem, required] of Object.entries(card.cost)) {
    const gemType = gem as NonGoldGem;
    deficit[gemType] = Math.max(
      0,
      (required || 0) - bonuses[gemType] - gems[gemType],
    );
  }
  return deficit;
};

/**
 * Cheapest-to-finish card with points among visible + reserved cards, falling
 * back to the cheapest card overall. Drives the deterministic color policy.
 */
const pickTargetCard = (
  state: GameServerState,
  playerIndex: number,
  bonuses: Record<NonGoldGem, number>,
): Card | null => {
  const player = state.players[playerIndex];
  const candidates: Card[] = [
    ...state.visibleCards.level1,
    ...state.visibleCards.level2,
    ...state.visibleCards.level3,
    ...player.reservedCards,
  ];
  if (candidates.length === 0) return null;

  const byCheapest = (pool: Card[]): Card =>
    pool.reduce((best, card) =>
      effectiveCost(card, bonuses) < effectiveCost(best, bonuses) ? card : best,
    );

  const withPoints = candidates.filter((card) => card.points > 0);
  return byCheapest(withPoints.length > 0 ? withPoints : candidates);
};

/** How much remaining noble demand a bonus of this color still serves. */
const nobleRelevance = (
  state: GameServerState,
  bonuses: Record<NonGoldGem, number>,
  gem: NonGoldGem,
): number =>
  state.nobles.reduce(
    (sum, noble) =>
      sum + Math.max(0, (noble.requirements[gem] || 0) - bonuses[gem]),
    0,
  );

const takenGems = (action: OnlineGameAction): NonGoldGem[] => {
  if (action.type !== "take_gems") return [];
  return Object.entries(action.gems)
    .filter(([, count]) => (count || 0) > 0)
    .map(([gem]) => gem as NonGoldGem);
};

const deficitCovered = (
  action: OnlineGameAction,
  deficit: Record<NonGoldGem, number>,
): number => {
  if (action.type !== "take_gems") return 0;
  let covered = 0;
  for (const [gem, count] of Object.entries(action.gems)) {
    covered += Math.min(count || 0, deficit[gem as NonGoldGem] || 0);
  }
  return covered;
};

export const enumerateQActions = (
  state: GameServerState,
  playerIndex: number,
): QAction[] => {
  const player = state.players[playerIndex];
  const bonuses = countGemBonuses(player);
  const valid = enumerateValidActions(state, playerIndex);
  const target = pickTargetCard(state, playerIndex, bonuses);
  const deficit = target
    ? deficitToward(target, bonuses, player.gems)
    : ({
        diamond: 0,
        sapphire: 0,
        emerald: 0,
        ruby: 0,
        onyx: 0,
      } as Record<NonGoldGem, number>);

  const result = new Map<number, OnlineGameAction>();

  // --- Buys, bucketed by level (and points for level 1) ---
  const buyCandidates = valid.filter(
    (v) => v.action.type === "purchase_card",
  ) as Array<{
    action: Extract<OnlineGameAction, { type: "purchase_card" }>;
    slotIndex: number;
  }>;

  const pickBuy = (
    pool: typeof buyCandidates,
  ): OnlineGameAction | undefined => {
    let best: (typeof buyCandidates)[number] | undefined;
    let bestCost = Infinity;
    let bestRelevance = -1;
    for (const candidate of pool) {
      const key = `level${candidate.action.level}` as const;
      const card = state.visibleCards[key][candidate.action.cardIndex];
      if (!card) continue;
      const cost = effectiveCost(card, bonuses);
      const relevance = nobleRelevance(state, bonuses, card.gem);
      if (
        cost < bestCost ||
        (cost === bestCost && relevance > bestRelevance)
      ) {
        best = candidate;
        bestCost = cost;
        bestRelevance = relevance;
      }
    }
    return best?.action;
  };

  const cardAt = (level: 1 | 2 | 3, cardIndex: number): Card | undefined =>
    state.visibleCards[`level${level}` as const][cardIndex];

  const l1Buys = buyCandidates.filter((v) => v.action.level === 1);
  const l1NoPoints = pickBuy(
    l1Buys.filter((v) => (cardAt(1, v.action.cardIndex)?.points ?? 0) === 0),
  );
  const l1Points = pickBuy(
    l1Buys.filter((v) => (cardAt(1, v.action.cardIndex)?.points ?? 0) > 0),
  );
  const l2Buy = pickBuy(buyCandidates.filter((v) => v.action.level === 2));
  const l3Buy = pickBuy(buyCandidates.filter((v) => v.action.level === 3));

  if (l1NoPoints) result.set(Q_SLOT.buyVisibleL1NoPoints, l1NoPoints);
  if (l1Points) result.set(Q_SLOT.buyVisibleL1Points, l1Points);
  if (l2Buy) result.set(Q_SLOT.buyVisibleL2, l2Buy);
  if (l3Buy) result.set(Q_SLOT.buyVisibleL3, l3Buy);

  // --- Buy reserved: cheapest to finish ---
  const reservedBuys = valid.filter(
    (v) => v.action.type === "purchase_reserved_card",
  ) as Array<{
    action: Extract<OnlineGameAction, { type: "purchase_reserved_card" }>;
    slotIndex: number;
  }>;
  if (reservedBuys.length > 0) {
    const best = reservedBuys.reduce((champion, candidate) => {
      const championCard = player.reservedCards[champion.action.cardIndex];
      const candidateCard = player.reservedCards[candidate.action.cardIndex];
      return effectiveCost(candidateCard, bonuses) <
        effectiveCost(championCard, bonuses)
        ? candidate
        : champion;
    });
    result.set(Q_SLOT.buyReserved, best.action);
  }

  // --- Take 3 different: targeted (max deficit coverage) + one alternative ---
  const take3s = valid.filter(
    (v) => v.slotIndex >= 5 && v.slotIndex < 5 + TAKE_3_COMBOS.length,
  );
  if (take3s.length > 0) {
    const ranked = [...take3s].sort(
      (a, b) =>
        deficitCovered(b.action, deficit) - deficitCovered(a.action, deficit) ||
        a.slotIndex - b.slotIndex,
    );
    result.set(Q_SLOT.take3Targeted, ranked[0].action);
    if (ranked.length > 1) {
      result.set(Q_SLOT.take3Other, ranked[1].action);
    }
  }

  // --- Take 2 same: needed (covers a deficit ≥ 2) + one alternative ---
  const take2Sames = valid.filter((v) => v.slotIndex >= 0 && v.slotIndex < 5);
  if (take2Sames.length > 0) {
    const needed = [...take2Sames]
      .filter((v) => {
        const gem = takenGems(v.action)[0];
        return gem !== undefined && deficit[gem] >= 2;
      })
      .sort((a, b) => {
        const gemA = takenGems(a.action)[0];
        const gemB = takenGems(b.action)[0];
        return deficit[gemB] - deficit[gemA] || a.slotIndex - b.slotIndex;
      })[0];
    if (needed) {
      result.set(Q_SLOT.take2SameNeeded, needed.action);
    }
    const other = take2Sames.find((v) => v !== needed);
    if (other) {
      result.set(Q_SLOT.take2SameOther, other.action);
    }
  }

  // --- Take 2 different / take 1: fallbacks when better takes are impossible ---
  if (take3s.length === 0) {
    const take2Diffs = valid.filter(
      (v) => v.slotIndex >= 15 && v.slotIndex < 15 + TAKE_2_COMBOS.length,
    );
    if (take2Diffs.length > 0) {
      const best = [...take2Diffs].sort(
        (a, b) =>
          deficitCovered(b.action, deficit) -
            deficitCovered(a.action, deficit) || a.slotIndex - b.slotIndex,
      )[0];
      result.set(Q_SLOT.take2DiffFallback, best.action);
    } else if (take2Sames.length === 0) {
      const take1s = valid.filter(
        (v) => v.slotIndex >= 25 && v.slotIndex < 30,
      );
      if (take1s.length > 0) {
        const best = [...take1s].sort((a, b) => {
          const gemA = takenGems(a.action)[0];
          const gemB = takenGems(b.action)[0];
          return deficit[gemB] - deficit[gemA] || a.slotIndex - b.slotIndex;
        })[0];
        result.set(Q_SLOT.take1Fallback, best.action);
      }
    }
  }

  // --- Reserves: high-value (level 3 or 3+ points) + one alternative ---
  const reserves = valid.filter(
    (v) => v.action.type === "reserve_card",
  ) as Array<{
    action: Extract<OnlineGameAction, { type: "reserve_card" }>;
    slotIndex: number;
  }>;
  if (reserves.length > 0) {
    const describe = (v: (typeof reserves)[number]) =>
      cardAt(v.action.level, v.action.cardIndex);

    const highValue = [...reserves]
      .filter((v) => {
        const card = describe(v);
        return card !== undefined && (card.level === 3 || card.points >= 3);
      })
      .sort((a, b) => {
        const cardA = describe(a)!;
        const cardB = describe(b)!;
        return (
          cardB.points - cardA.points ||
          effectiveCost(cardA, bonuses) - effectiveCost(cardB, bonuses) ||
          a.slotIndex - b.slotIndex
        );
      })[0];
    if (highValue) {
      result.set(Q_SLOT.reserveHighValue, highValue.action);
    }

    const other = [...reserves]
      .filter((v) => v !== highValue)
      .sort((a, b) => {
        const cardA = describe(a);
        const cardB = describe(b);
        const costA = cardA ? effectiveCost(cardA, bonuses) : Infinity;
        const costB = cardB ? effectiveCost(cardB, bonuses) : Infinity;
        return costA - costB || a.slotIndex - b.slotIndex;
      })[0];
    if (other) {
      result.set(Q_SLOT.reserveOther, other.action);
    }
  }

  // --- End turn: always legal ---
  result.set(Q_SLOT.endTurn, { type: "end_turn" });

  return [...result.entries()]
    .sort(([a], [b]) => a - b)
    .map(([qSlot, action]) => ({ qSlot, action }));
};
