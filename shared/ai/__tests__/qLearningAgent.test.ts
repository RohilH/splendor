import { describe, it, expect } from "vitest";
import { createInitialGameState } from "../../game/engine";
import type { GameServerState } from "../../game/engine";
import type { OnlineGameAction } from "../../game/actions";
import type { AiAgent } from "../types";
import { QLearningAgent } from "../qLearningAgent";
import { QTable, type SerializedQTable } from "../qTable";
import { encodeStateKey } from "../stateAbstraction";
import { enumerateQActions, Q_SLOT, NUM_Q_ACTIONS } from "../qActions";

const createGame = (): GameServerState =>
  createInitialGameState([
    { userId: "ql-0", name: "P0" },
    { userId: "ql-1", name: "P1" },
  ]);

/** Fallback that records whether it was consulted. */
class TracingFallback implements AiAgent {
  used = false;
  pickAction(): OnlineGameAction {
    this.used = true;
    return { type: "end_turn" };
  }
}

describe("QLearningAgent", () => {
  it("plays the argmax action for a state the table knows", () => {
    const gs = createGame();
    const key = encodeStateKey(gs, 0);
    const qActions = enumerateQActions(gs, 0);
    // Pick a known-valid non-endTurn slot to make the argmax meaningful.
    const targetSlot = qActions.find((qa) => qa.qSlot !== Q_SLOT.endTurn)!.qSlot;

    const table = new QTable();
    table.update(key, targetSlot, 1, null, [], true, 0.98); // Q = 0.3
    table.update(key, Q_SLOT.endTurn, 0.1, null, [], true, 0.98); // Q = 0.03

    const fallback = new TracingFallback();
    const agent = new QLearningAgent(table, fallback);
    const action = agent.pickAction(gs, 0);

    expect(fallback.used).toBe(false);
    expect(action).toEqual(
      qActions.find((qa) => qa.qSlot === targetSlot)!.action,
    );
  });

  it("delegates to the fallback when the table is null", () => {
    const fallback = new TracingFallback();
    const agent = new QLearningAgent(null, fallback);
    const action = agent.pickAction(createGame(), 0);
    expect(fallback.used).toBe(true);
    expect(action).toEqual({ type: "end_turn" });
  });

  it("delegates to the fallback on a state the table has never seen", () => {
    const table = new QTable();
    table.update(123, 0, 1, null, [], true, 0.98); // some unrelated state

    const fallback = new TracingFallback();
    const agent = new QLearningAgent(table, fallback);
    agent.pickAction(createGame(), 0);
    expect(fallback.used).toBe(true);
  });

  it("delegates to the fallback when every valid slot is still zero", () => {
    const gs = createGame();
    const key = encodeStateKey(gs, 0);
    const table = new QTable();
    // Known state, but the only signal sits on a slot that is not valid here
    // (fresh states offer no buys).
    table.update(key, Q_SLOT.buyVisibleL3, 1, null, [], true, 0.98);

    const fallback = new TracingFallback();
    const agent = new QLearningAgent(table, fallback);
    agent.pickAction(gs, 0);
    expect(fallback.used).toBe(true);
  });

  it("accepts a serialized table and plays from it", () => {
    const gs = createGame();
    const key = encodeStateKey(gs, 0);
    const qActions = enumerateQActions(gs, 0);
    const targetSlot = qActions.find((qa) => qa.qSlot !== Q_SLOT.endTurn)!.qSlot;

    const row = new Array(NUM_Q_ACTIONS).fill(0);
    row[targetSlot] = 0.5;
    const serialized: SerializedQTable = {
      v: 1,
      numActions: NUM_Q_ACTIONS,
      games: 42,
      entries: { [String(key)]: row },
    };

    const fallback = new TracingFallback();
    const agent = new QLearningAgent(serialized, fallback);
    const action = agent.pickAction(gs, 0);

    expect(fallback.used).toBe(false);
    expect(action).toEqual(
      qActions.find((qa) => qa.qSlot === targetSlot)!.action,
    );
  });
});
