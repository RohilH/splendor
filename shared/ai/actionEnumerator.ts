import type { GameServerState } from "../game/engine";
import type { OnlineGameAction } from "../game/actions";
import type { GemType } from "../types/game";
import { canAffordCard } from "../game/selectors";
import {
  NON_GOLD_GEMS,
  TAKE_3_COMBOS,
  TAKE_2_COMBOS,
  MAX_GEMS_PER_PLAYER,
} from "./types";

export interface ValidAction {
  action: OnlineGameAction;
  slotIndex: number;
}

const playerGemTotal = (gems: Record<GemType, number>): number =>
  Object.values(gems).reduce((sum, count) => sum + count, 0);

/**
 * Enumerate all valid actions for the given player in the current game state.
 * Returns actions paired with their fixed slot index (0-57).
 */
export const enumerateValidActions = (
  state: GameServerState,
  playerIndex: number,
): ValidAction[] => {
  const player = state.players[playerIndex];
  const actions: ValidAction[] = [];
  const totalGems = playerGemTotal(player.gems);
  const room = MAX_GEMS_PER_PLAYER - totalGems;

  // --- Slots 0-4: Take 2 of the same gem ---
  for (let i = 0; i < 5; i++) {
    const gem = NON_GOLD_GEMS[i];
    if (state.gems[gem] >= 4 && room >= 2) {
      actions.push({
        slotIndex: i,
        action: { type: "take_gems", gems: { [gem]: 2 } },
      });
    }
  }

  // --- Slots 5-14: Take 3 different gems ---
  for (let i = 0; i < TAKE_3_COMBOS.length; i++) {
    const combo = TAKE_3_COMBOS[i];
    const g0 = NON_GOLD_GEMS[combo[0]];
    const g1 = NON_GOLD_GEMS[combo[1]];
    const g2 = NON_GOLD_GEMS[combo[2]];
    if (
      room >= 3 &&
      state.gems[g0] > 0 &&
      state.gems[g1] > 0 &&
      state.gems[g2] > 0
    ) {
      actions.push({
        slotIndex: 5 + i,
        action: { type: "take_gems", gems: { [g0]: 1, [g1]: 1, [g2]: 1 } },
      });
    }
  }

  // --- Slots 15-24: Take 2 different gems ---
  for (let i = 0; i < TAKE_2_COMBOS.length; i++) {
    const combo = TAKE_2_COMBOS[i];
    const g0 = NON_GOLD_GEMS[combo[0]];
    const g1 = NON_GOLD_GEMS[combo[1]];
    if (room >= 2 && state.gems[g0] > 0 && state.gems[g1] > 0) {
      actions.push({
        slotIndex: 15 + i,
        action: { type: "take_gems", gems: { [g0]: 1, [g1]: 1 } },
      });
    }
  }

  // --- Slots 25-29: Take 1 gem ---
  for (let i = 0; i < 5; i++) {
    const gem = NON_GOLD_GEMS[i];
    if (room >= 1 && state.gems[gem] > 0) {
      actions.push({
        slotIndex: 25 + i,
        action: { type: "take_gems", gems: { [gem]: 1 } },
      });
    }
  }

  // --- Slots 30-41: Purchase visible card ---
  const levels: (1 | 2 | 3)[] = [1, 2, 3];
  for (let li = 0; li < 3; li++) {
    const level = levels[li];
    const key = `level${level}` as "level1" | "level2" | "level3";
    const cards = state.visibleCards[key];
    for (let ci = 0; ci < 4; ci++) {
      if (ci < cards.length && cards[ci]) {
        if (canAffordCard(player, cards[ci], state.debugMode)) {
          actions.push({
            slotIndex: 30 + li * 4 + ci,
            action: { type: "purchase_card", level, cardIndex: ci },
          });
        }
      }
    }
  }

  // --- Slots 42-53: Reserve visible card ---
  if (player.reservedCards.length < 3) {
    for (let li = 0; li < 3; li++) {
      const level = levels[li];
      const key = `level${level}` as "level1" | "level2" | "level3";
      const cards = state.visibleCards[key];
      for (let ci = 0; ci < 4; ci++) {
        if (ci < cards.length && cards[ci]) {
          actions.push({
            slotIndex: 42 + li * 4 + ci,
            action: { type: "reserve_card", level, cardIndex: ci },
          });
        }
      }
    }
  }

  // --- Slots 54-56: Purchase reserved card ---
  for (let ci = 0; ci < player.reservedCards.length; ci++) {
    if (canAffordCard(player, player.reservedCards[ci], state.debugMode)) {
      actions.push({
        slotIndex: 54 + ci,
        action: { type: "purchase_reserved_card", cardIndex: ci },
      });
    }
  }

  // --- Slot 57: End turn ---
  actions.push({
    slotIndex: 57,
    action: { type: "end_turn" },
  });

  return actions;
};
