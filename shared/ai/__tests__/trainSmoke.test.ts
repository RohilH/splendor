import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createInitialGameState, applyGameAction } from "../../game/engine";
import type { GameServerState } from "../../game/engine";
import { calculatePlayerPoints } from "../../game/selectors";
import { RandomAgent } from "../randomAgent";
import { QLearningAgent } from "../qLearningAgent";
import { QTable } from "../qTable";
import { encodeStateKey } from "../stateAbstraction";
import { enumerateQActions } from "../qActions";
import type { AiAgent } from "../types";

const GAMMA = 0.98;
const MAX_PLIES = 300;

const uid = (i: number) => `smoke-${i}`;

const createGame = (): GameServerState =>
  createInitialGameState([
    { userId: uid(0), name: "P0" },
    { userId: uid(1), name: "P1" },
  ]);

const shaping = (gs: GameServerState, seat: number): number =>
  0.02 * calculatePlayerPoints(gs.players[seat]) +
  0.01 * gs.players[seat].purchasedCards.length +
  0.05 * gs.players[seat].nobles.length;

/** Minimal single-learner version of scripts/trainQ.ts's training game. */
const trainGame = (
  table: QTable,
  opponent: AiAgent,
  learnerSeat: number,
  epsilon: number,
): void => {
  let gs = createGame();
  let plies = 0;
  let pending: { key: number; slot: number; reward: number } | null = null;

  while (!gs.isGameOver && plies < MAX_PLIES) {
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
    if (seat === learnerSeat) {
      const qActions = enumerateQActions(gs, seat);
      const key = encodeStateKey(gs, seat);
      const validSlots = qActions.map((qa) => qa.qSlot);

      if (pending) {
        table.update(pending.key, pending.slot, pending.reward, key, validSlots, false, GAMMA);
      }

      const chosen =
        Math.random() < epsilon
          ? qActions[Math.floor(Math.random() * qActions.length)]
          : qActions.find(
              (qa) => qa.qSlot === table.bestValid(key, validSlots).slot,
            ) ?? qActions[qActions.length - 1];

      const before = shaping(gs, seat);
      const result = applyGameAction(gs, uid(seat), chosen.action);
      if (result.error) break;
      gs = result.state;
      pending = {
        key,
        slot: chosen.qSlot,
        reward: shaping(gs, seat) - before - 0.001,
      };
    } else {
      const result = applyGameAction(gs, uid(seat), opponent.pickAction(gs, seat));
      if (result.error) break;
      gs = result.state;
    }
    plies += 1;
  }

  if (pending) {
    const outcome = !gs.isGameOver ? -0.2 : gs.winner === learnerSeat ? 1 : -1;
    table.update(pending.key, pending.slot, pending.reward + outcome, null, [], true, GAMMA);
  }
  table.games += 1;
};

const playGreedy = (agent0: AiAgent, agent1: AiAgent): number | null => {
  let gs = createGame();
  let plies = 0;
  while (!gs.isGameOver && plies < MAX_PLIES) {
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
    const agent = seat === 0 ? agent0 : agent1;
    const result = applyGameAction(gs, uid(seat), agent.pickAction(gs, seat));
    if (result.error) break;
    gs = result.state;
    plies += 1;
  }
  return gs.isGameOver ? gs.winner : null;
};

describe("Q-learning training smoke test", () => {
  const originalRandom = Math.random;

  beforeEach(() => {
    // The engine shuffles decks with Math.random — seed it so this test is
    // deterministic, then restore it afterwards.
    let seed = 1337;
    Math.random = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  it("a briefly trained table beats a random opponent", () => {
    const table = new QTable();
    const randomAgent = new RandomAgent();

    const games = 1200;
    for (let game = 0; game < games; game += 1) {
      const epsilon = Math.max(0.05, 0.3 - (0.25 * game) / (games * 0.7));
      trainGame(table, randomAgent, game % 2, epsilon);
    }

    expect(table.games).toBe(games);
    expect(table.size).toBeGreaterThan(300); // actually explored the space

    const learner = new QLearningAgent(table);
    let wins = 0;
    const evalGames = 100;
    for (let i = 0; i < evalGames; i += 1) {
      const learnerSeat = i % 2;
      const winner =
        learnerSeat === 0
          ? playGreedy(learner, randomAgent)
          : playGreedy(randomAgent, learner);
      if (winner === learnerSeat) wins += 1;
    }

    expect(wins / evalGames).toBeGreaterThan(0.55);
  }, 60_000);
});
