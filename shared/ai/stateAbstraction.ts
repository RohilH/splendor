import type { GameServerState } from "../game/engine";
import type { Card } from "../types/game";
import {
  canAffordCard,
  calculatePlayerPoints,
  countGemBonuses,
} from "../game/selectors";
import { NON_GOLD_GEMS } from "./types";

/**
 * Discretized view of the game from one player's seat. Each field is a small
 * bucket index; together they form the tabular Q-learning state key.
 *
 * Gem colors are deliberately excluded — concrete color choices are resolved
 * by the deterministic policy in qActions.ts, so the table only has to learn
 * strategy (build vs. buy vs. reserve vs. race).
 */
export interface StateFeatures {
  /** min(floor(points / 3), 5) — 6 buckets */
  pointsB: number;
  /** min(floor(purchasedCards / 2), 4) — 5 buckets */
  bonusB: number;
  /** non-gold gem total: 0-2 / 3-5 / 6-8 / 9-10 — 4 buckets */
  gemB: number;
  /** min(gold, 2) — 3 buckets */
  goldB: number;
  /** affordable visible cards: min(count, 3) — 4 buckets */
  affordB: number;
  /** best points among affordable visible+reserved: 0 / 1-2 / 3+ — 3 buckets */
  bestAffordPtsB: number;
  /** reserved cards: 0 / 1 / 2-3 — 3 buckets */
  reservedB: number;
  /** affordable reserved cards: 0 / 1+ — 2 buckets */
  affordReservedB: number;
  /** own points − best opponent points: ≤−5 / −4..−1 / 0 / 1..4 / ≥5 — 5 buckets */
  leadB: number;
  /** min bonus shortfall to any remaining noble: ≤1 / 2 / ≥3 (or none left) — 3 buckets */
  nobleDistB: number;
}

const RADICES = [6, 5, 4, 3, 4, 3, 3, 2, 5, 3] as const;

const FIELD_ORDER: (keyof StateFeatures)[] = [
  "pointsB",
  "bonusB",
  "gemB",
  "goldB",
  "affordB",
  "bestAffordPtsB",
  "reservedB",
  "affordReservedB",
  "leadB",
  "nobleDistB",
];

const bucketGemTotal = (total: number): number => {
  if (total <= 2) return 0;
  if (total <= 5) return 1;
  if (total <= 8) return 2;
  return 3;
};

const bucketLead = (lead: number): number => {
  if (lead <= -5) return 0;
  if (lead <= -1) return 1;
  if (lead === 0) return 2;
  if (lead <= 4) return 3;
  return 4;
};

const bucketNobleDistance = (distance: number): number => {
  if (distance <= 1) return 0;
  if (distance === 2) return 1;
  return 2;
};

const bucketPoints01_2_3plus = (points: number): number => {
  if (points <= 0) return 0;
  if (points <= 2) return 1;
  return 2;
};

export const extractStateFeatures = (
  state: GameServerState,
  playerIndex: number,
): StateFeatures => {
  const player = state.players[playerIndex];
  const points = calculatePlayerPoints(player);
  const bonuses = countGemBonuses(player);

  const nonGoldGems = NON_GOLD_GEMS.reduce(
    (sum, gem) => sum + player.gems[gem],
    0,
  );

  const visibleCards: Card[] = [
    ...state.visibleCards.level1,
    ...state.visibleCards.level2,
    ...state.visibleCards.level3,
  ];
  const affordableVisible = visibleCards.filter((card) =>
    canAffordCard(player, card, state.debugMode),
  );
  const affordableReserved = player.reservedCards.filter((card) =>
    canAffordCard(player, card, state.debugMode),
  );

  const bestAffordablePoints = [...affordableVisible, ...affordableReserved].reduce(
    (best, card) => Math.max(best, card.points),
    0,
  );

  const bestOpponentPoints = state.players.reduce(
    (best, opponent, index) =>
      index === playerIndex
        ? best
        : Math.max(best, calculatePlayerPoints(opponent)),
    0,
  );

  // Fewest total bonuses still missing toward any remaining noble.
  let nobleDistance = Infinity;
  for (const noble of state.nobles) {
    let missing = 0;
    for (const [gem, required] of Object.entries(noble.requirements)) {
      missing += Math.max(
        0,
        (required || 0) - bonuses[gem as keyof typeof bonuses],
      );
    }
    nobleDistance = Math.min(nobleDistance, missing);
  }

  return {
    pointsB: Math.min(Math.floor(points / 3), 5),
    bonusB: Math.min(Math.floor(player.purchasedCards.length / 2), 4),
    gemB: bucketGemTotal(nonGoldGems),
    goldB: Math.min(player.gems.gold, 2),
    affordB: Math.min(affordableVisible.length, 3),
    bestAffordPtsB: bucketPoints01_2_3plus(bestAffordablePoints),
    reservedB: Math.min(player.reservedCards.length, 2),
    affordReservedB: affordableReserved.length > 0 ? 1 : 0,
    leadB: bucketLead(points - bestOpponentPoints),
    nobleDistB: bucketNobleDistance(
      nobleDistance === Infinity ? 3 : nobleDistance,
    ),
  };
};

/** Mixed-radix pack of the feature buckets into a single integer (< 2^19). */
export const encodeFeatures = (features: StateFeatures): number => {
  let key = 0;
  for (let i = 0; i < FIELD_ORDER.length; i += 1) {
    key = key * RADICES[i] + features[FIELD_ORDER[i]];
  }
  return key;
};

export const encodeStateKey = (
  state: GameServerState,
  playerIndex: number,
): number => encodeFeatures(extractStateFeatures(state, playerIndex));

export const decodeStateKey = (key: number): StateFeatures => {
  const features = {} as StateFeatures;
  let remaining = key;
  for (let i = FIELD_ORDER.length - 1; i >= 0; i -= 1) {
    features[FIELD_ORDER[i]] = remaining % RADICES[i];
    remaining = Math.floor(remaining / RADICES[i]);
  }
  return features;
};

/** Total number of representable keys (for tests/documentation). */
export const STATE_KEY_SPACE = RADICES.reduce((a, b) => a * b, 1);
