import { describe, it, expect, afterEach } from "vitest";
import { createInitialGameState, applyGameAction } from "../../game/engine";
import type { GameServerState } from "../../game/engine";
import { RandomAgent } from "../randomAgent";
import { enumerateQActions, NUM_Q_ACTIONS, Q_SLOT } from "../qActions";

const uid = (i: number) => `qa-${i}`;

const createGame = (): GameServerState =>
  createInitialGameState([
    { userId: uid(0), name: "P0" },
    { userId: uid(1), name: "P1" },
  ]);

const clone = (state: GameServerState): GameServerState =>
  JSON.parse(JSON.stringify(state));

const originalRandom = Math.random;

afterEach(() => {
  Math.random = originalRandom;
});

describe("enumerateQActions", () => {
  it("offers targeted take-3 and end turn on a fresh state, but no buys", () => {
    const gs = createGame();
    const slots = enumerateQActions(gs, 0).map((qa) => qa.qSlot);

    expect(slots).toContain(Q_SLOT.take3Targeted);
    expect(slots).toContain(Q_SLOT.take3Other);
    expect(slots).toContain(Q_SLOT.endTurn);
    expect(slots).not.toContain(Q_SLOT.buyVisibleL1NoPoints);
    expect(slots).not.toContain(Q_SLOT.buyVisibleL1Points);
    expect(slots).not.toContain(Q_SLOT.buyVisibleL2);
    expect(slots).not.toContain(Q_SLOT.buyVisibleL3);
    expect(slots).not.toContain(Q_SLOT.buyReserved);
    // Fallback takes only appear when take-3 is impossible.
    expect(slots).not.toContain(Q_SLOT.take2DiffFallback);
    expect(slots).not.toContain(Q_SLOT.take1Fallback);
  });

  it("returns at most one action per slot, sorted by slot", () => {
    const gs = createGame();
    const qActions = enumerateQActions(gs, 0);

    expect(qActions.length).toBeLessThanOrEqual(NUM_Q_ACTIONS);
    const slots = qActions.map((qa) => qa.qSlot);
    expect(new Set(slots).size).toBe(slots.length);
    expect(slots).toEqual([...slots].sort((a, b) => a - b));
    for (const slot of slots) {
      expect(slot).toBeGreaterThanOrEqual(0);
      expect(slot).toBeLessThan(NUM_Q_ACTIONS);
    }
  });

  it("falls back to take-2-different, then take-1, as the bank empties", () => {
    let gs = clone(createGame());
    // Only two gem colors left in the bank, one chip each → no take-3.
    gs.gems = { diamond: 1, sapphire: 1, emerald: 0, ruby: 0, onyx: 0, gold: 5 };
    let slots = enumerateQActions(gs, 0).map((qa) => qa.qSlot);
    expect(slots).not.toContain(Q_SLOT.take3Targeted);
    expect(slots).toContain(Q_SLOT.take2DiffFallback);
    expect(slots).not.toContain(Q_SLOT.take1Fallback);

    // A single color left → only take-1 remains.
    gs = clone(gs);
    gs.gems = { diamond: 1, sapphire: 0, emerald: 0, ruby: 0, onyx: 0, gold: 5 };
    slots = enumerateQActions(gs, 0).map((qa) => qa.qSlot);
    expect(slots).not.toContain(Q_SLOT.take3Targeted);
    expect(slots).not.toContain(Q_SLOT.take2DiffFallback);
    expect(slots).toContain(Q_SLOT.take1Fallback);
  });

  it("classifies reserves into high-value and other", () => {
    const gs = createGame();
    const qActions = enumerateQActions(gs, 0);

    const highValue = qActions.find((qa) => qa.qSlot === Q_SLOT.reserveHighValue);
    expect(highValue).toBeDefined();
    expect(highValue!.action.type).toBe("reserve_card");
    if (highValue!.action.type === "reserve_card") {
      const key = `level${highValue!.action.level}` as const;
      const card = gs.visibleCards[key][highValue!.action.cardIndex];
      expect(card.level === 3 || card.points >= 3).toBe(true);
    }

    const other = qActions.find((qa) => qa.qSlot === Q_SLOT.reserveOther);
    expect(other).toBeDefined();
    expect(other!.action.type).toBe("reserve_card");
  });

  it("only emits actions the engine accepts, across random playouts", () => {
    // Deterministic playouts: seed Math.random (engine shuffles with it).
    let seed = 0x9e3779b9;
    Math.random = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const random = new RandomAgent();
    let statesChecked = 0;

    for (let playout = 0; playout < 10 && statesChecked < 200; playout += 1) {
      let gs = createGame();
      for (let ply = 0; ply < 120 && statesChecked < 200; ply += 1) {
        if (gs.isGameOver) break;
        if (gs.pendingNobleSelectionPlayerId) {
          const result = applyGameAction(gs, gs.pendingNobleSelectionPlayerId, {
            type: "select_noble",
            nobleIndex: 0,
          });
          if (result.error) break;
          gs = result.state;
          continue;
        }

        const seat = gs.currentPlayer;
        for (const qa of enumerateQActions(gs, seat)) {
          const result = applyGameAction(gs, uid(seat), qa.action);
          expect(
            result.error,
            `slot ${qa.qSlot} (${qa.action.type}) rejected: ${result.error}`,
          ).toBeUndefined();
        }
        statesChecked += 1;

        const step = applyGameAction(gs, uid(seat), random.pickAction(gs, seat));
        if (step.error) break;
        gs = step.state;
      }
    }

    expect(statesChecked).toBeGreaterThanOrEqual(200);
  });
});
