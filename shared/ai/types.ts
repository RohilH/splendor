import type { GameServerState } from "../game/engine";
import type { OnlineGameAction } from "../game/actions";
import type { GemType } from "../types/game";

export type AiDifficulty = "easy" | "medium" | "hard";

export interface AiAgent {
  pickAction(state: GameServerState, playerIndex: number): OnlineGameAction;
}

export const NON_GOLD_GEMS: Exclude<GemType, "gold">[] = [
  "diamond",
  "sapphire",
  "emerald",
  "ruby",
  "onyx",
];

/** All C(5,3) = 10 combinations of 3 distinct gem indices */
export const TAKE_3_COMBOS: [number, number, number][] = [
  [0, 1, 2], [0, 1, 3], [0, 1, 4], [0, 2, 3], [0, 2, 4],
  [0, 3, 4], [1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4],
];

/** All C(5,2) = 10 combinations of 2 distinct gem indices */
export const TAKE_2_COMBOS: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [1, 2],
  [1, 3], [1, 4], [2, 3], [2, 4], [3, 4],
];

/**
 * Fixed action slot layout (58 total):
 *  [0-4]   Take 2 same gem (diamond, sapphire, emerald, ruby, onyx)
 *  [5-14]  Take 3 different gems (10 combos)
 *  [15-24] Take 2 different gems (10 combos)
 *  [25-29] Take 1 gem (diamond, sapphire, emerald, ruby, onyx)
 *  [30-33] Purchase visible card level 1, indices 0-3
 *  [34-37] Purchase visible card level 2, indices 0-3
 *  [38-41] Purchase visible card level 3, indices 0-3
 *  [42-45] Reserve visible card level 1, indices 0-3
 *  [46-49] Reserve visible card level 2, indices 0-3
 *  [50-53] Reserve visible card level 3, indices 0-3
 *  [54-56] Purchase reserved card indices 0-2
 *  [57]    End turn / pass
 */
export const NUM_ACTION_SLOTS = 58;

export const NUM_FEATURES = 138;

export const MAX_GEMS_PER_PLAYER = 10;
