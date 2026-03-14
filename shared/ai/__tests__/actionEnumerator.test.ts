import { describe, it, expect, beforeEach } from "vitest";
import { createInitialGameState, applyGameAction } from "../../game/engine";
import type { GameServerState } from "../../game/engine";
import { enumerateValidActions } from "../actionEnumerator";
import type { GemType } from "../../types/game";

const uid = (i: number) => `test-${i}`;

const createGame = (numPlayers = 2): GameServerState =>
  createInitialGameState(
    Array.from({ length: numPlayers }, (_, i) => ({
      userId: uid(i),
      name: `P${i}`,
    })),
  );

const setPlayerGems = (
  state: GameServerState,
  playerIndex: number,
  gems: Partial<Record<GemType, number>>,
): GameServerState => {
  const clone = JSON.parse(JSON.stringify(state)) as GameServerState;
  for (const [gem, count] of Object.entries(gems)) {
    clone.players[playerIndex].gems[gem as GemType] = count as number;
  }
  return clone;
};

const setBankGems = (
  state: GameServerState,
  gems: Partial<Record<GemType, number>>,
): GameServerState => {
  const clone = JSON.parse(JSON.stringify(state)) as GameServerState;
  for (const [gem, count] of Object.entries(gems)) {
    clone.gems[gem as GemType] = count as number;
  }
  return clone;
};

describe("Action Enumerator", () => {
  let game: GameServerState;

  beforeEach(() => {
    game = createGame();
  });

  it("enumerates actions for initial game state", () => {
    const actions = enumerateValidActions(game, 0);
    expect(actions.length).toBeGreaterThan(0);
  });

  it("always includes end_turn", () => {
    const actions = enumerateValidActions(game, 0);
    const endTurn = actions.find((a) => a.action.type === "end_turn");
    expect(endTurn).toBeDefined();
    expect(endTurn!.slotIndex).toBe(57);
  });

  it("all enumerated actions are valid when applied", () => {
    const actions = enumerateValidActions(game, 0);
    for (const { action } of actions) {
      const result = applyGameAction(game, uid(0), action);
      expect(result.error).toBeUndefined();
    }
  });

  it("includes take-3-different-gems when available", () => {
    const actions = enumerateValidActions(game, 0);
    const take3 = actions.filter(
      (a) =>
        a.action.type === "take_gems" &&
        Object.values(a.action.gems).filter((v) => (v || 0) > 0).length === 3,
    );
    // In a 2-player game, bank has 4 of each non-gold gem, so all C(5,3)=10 combos should work
    expect(take3.length).toBe(10);
  });

  it("includes take-2-same when bank has ≥4", () => {
    const actions = enumerateValidActions(game, 0);
    const take2same = actions.filter(
      (a) =>
        a.action.type === "take_gems" &&
        Object.values(a.action.gems).some((v) => v === 2),
    );
    // 2-player game: bank has exactly 4 of each, so all 5 types qualify
    expect(take2same.length).toBe(5);
  });

  it("excludes take-2-same when bank has <4", () => {
    let gs = setBankGems(game, { diamond: 3, sapphire: 3, emerald: 3, ruby: 3, onyx: 3 });
    const actions = enumerateValidActions(gs, 0);
    const take2same = actions.filter(
      (a) =>
        a.action.type === "take_gems" &&
        Object.values(a.action.gems).some((v) => v === 2),
    );
    expect(take2same.length).toBe(0);
  });

  it("respects 10-gem limit on gem taking", () => {
    let gs = setPlayerGems(game, 0, {
      diamond: 2, sapphire: 2, emerald: 2, ruby: 2, onyx: 1, gold: 1,
    }); // 10 gems total
    const actions = enumerateValidActions(gs, 0);
    const gemActions = actions.filter((a) => a.action.type === "take_gems");
    expect(gemActions.length).toBe(0);
  });

  it("includes reserve cards when player has <3 reserved", () => {
    const actions = enumerateValidActions(game, 0);
    const reserves = actions.filter((a) => a.action.type === "reserve_card");
    // 12 visible cards (4 per level)
    expect(reserves.length).toBe(12);
  });

  it("excludes reserve when player has 3 reserved cards", () => {
    const gs = JSON.parse(JSON.stringify(game)) as GameServerState;
    gs.players[0].reservedCards = [
      { level: 1, points: 0, gem: "diamond", cost: { ruby: 1 } },
      { level: 1, points: 0, gem: "sapphire", cost: { ruby: 1 } },
      { level: 1, points: 0, gem: "emerald", cost: { ruby: 1 } },
    ];
    const actions = enumerateValidActions(gs, 0);
    const reserves = actions.filter((a) => a.action.type === "reserve_card");
    expect(reserves.length).toBe(0);
  });

  it("includes purchase actions only for affordable cards", () => {
    const actions = enumerateValidActions(game, 0);
    const purchases = actions.filter((a) => a.action.type === "purchase_card");
    // Player starts with 0 gems, so only free cards (if any) are purchasable
    // Most cards cost something, so few (if any) purchases should be available
    for (const { action } of purchases) {
      const result = applyGameAction(game, uid(0), action);
      expect(result.error).toBeUndefined();
    }
  });

  it("works with 3-player games", () => {
    const gs = createGame(3);
    const actions = enumerateValidActions(gs, 0);
    expect(actions.length).toBeGreaterThan(0);
    // All should be valid
    for (const { action } of actions) {
      const result = applyGameAction(gs, uid(0), action);
      expect(result.error).toBeUndefined();
    }
  });

  it("slot indices are within valid range", () => {
    const actions = enumerateValidActions(game, 0);
    for (const { slotIndex } of actions) {
      expect(slotIndex).toBeGreaterThanOrEqual(0);
      expect(slotIndex).toBeLessThan(58);
    }
  });
});
