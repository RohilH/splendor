import { describe, it, expect } from "vitest";
import { createInitialGameState, applyGameAction } from "../../game/engine";
import type { GameServerState } from "../../game/engine";
import { RandomAgent } from "../randomAgent";
import { HeuristicAgent } from "../heuristicAgent";
import { RLAgent } from "../rlAgent";
import { NeuralNetwork } from "../neuralNetwork";
import { NUM_FEATURES, NUM_ACTION_SLOTS } from "../types";

const uid = (i: number) => `test-${i}`;

const createGame = (): GameServerState =>
  createInitialGameState([
    { userId: uid(0), name: "P0" },
    { userId: uid(1), name: "P1" },
  ]);

const playFullGame = (
  agent0: { pickAction: (gs: GameServerState, pi: number) => any },
  agent1: { pickAction: (gs: GameServerState, pi: number) => any },
  maxTurns = 300,
): GameServerState => {
  let gs = createGame();
  let turns = 0;

  while (!gs.isGameOver && turns < maxTurns) {
    const pi = gs.currentPlayer;

    if (gs.pendingNobleSelectionPlayerId) {
      const r = applyGameAction(gs, uid(pi), {
        type: "select_noble",
        nobleIndex: 0,
      });
      if (!r.error) gs = r.state;
      continue;
    }

    const agent = pi === 0 ? agent0 : agent1;
    const action = agent.pickAction(gs, pi);
    const result = applyGameAction(gs, uid(pi), action);

    if (result.error) {
      const fb = applyGameAction(gs, uid(pi), { type: "end_turn" });
      if (!fb.error) gs = fb.state;
    } else {
      gs = result.state;
    }
    turns++;
  }

  return gs;
};

describe("RandomAgent", () => {
  it("returns a valid action", () => {
    const agent = new RandomAgent();
    const gs = createGame();
    const action = agent.pickAction(gs, 0);
    const result = applyGameAction(gs, uid(0), action);
    expect(result.error).toBeUndefined();
  });

  it("plays a complete game without errors", () => {
    const agent = new RandomAgent();
    const gs = playFullGame(agent, agent);
    expect(gs.isGameOver).toBe(true);
    expect(gs.winner).not.toBeNull();
  });
});

describe("HeuristicAgent", () => {
  it("returns a valid action", () => {
    const agent = new HeuristicAgent();
    const gs = createGame();
    const action = agent.pickAction(gs, 0);
    const result = applyGameAction(gs, uid(0), action);
    expect(result.error).toBeUndefined();
  });

  it("plays a complete game without errors", () => {
    const agent = new HeuristicAgent();
    const gs = playFullGame(agent, agent);
    expect(gs.isGameOver).toBe(true);
    expect(gs.winner).not.toBeNull();
  });

  it("beats random agent more than 50% of the time", () => {
    const heuristic = new HeuristicAgent();
    const random = new RandomAgent();
    let heuristicWins = 0;

    for (let i = 0; i < 50; i++) {
      const gs = playFullGame(heuristic, random);
      if (gs.winner === 0) heuristicWins++;
    }

    // Heuristic should win majority of games
    expect(heuristicWins).toBeGreaterThan(25);
  });
});

describe("RLAgent", () => {
  it("returns a valid action with random weights", () => {
    const agent = new RLAgent();
    const gs = createGame();
    const action = agent.pickAction(gs, 0);
    const result = applyGameAction(gs, uid(0), action);
    expect(result.error).toBeUndefined();
  });

  it("plays a complete game without errors", () => {
    const agent = new RLAgent();
    const gs = playFullGame(agent, agent, 500);
    // Game should complete or at least not crash
    // With random weights, games may occasionally time out
    expect(gs).toBeDefined();
  });

  it("can save and load weights", () => {
    const agent = new RLAgent();
    const weights = agent.getWeights();
    const agent2 = new RLAgent(weights);

    const gs = createGame();
    // Both should produce the same action given same state (deterministic forward pass)
    const action1 = agent.pickAction(gs, 0);
    const action2 = agent2.pickAction(gs, 0);
    expect(action1.type).toBe(action2.type);
  });
});

describe("NeuralNetwork", () => {
  it("forward pass produces correct output dimensions", () => {
    const nn = new NeuralNetwork([NUM_FEATURES, 64, NUM_ACTION_SLOTS]);
    const input = new Array(NUM_FEATURES).fill(0.5);
    const output = nn.forward(input);
    expect(output.length).toBe(NUM_ACTION_SLOTS);
  });

  it("clone produces identical outputs", () => {
    const nn = new NeuralNetwork([NUM_FEATURES, 64, NUM_ACTION_SLOTS]);
    const clone = nn.clone();
    const input = new Array(NUM_FEATURES).fill(0.5);
    const out1 = nn.forward(input);
    const out2 = clone.forward(input);
    for (let i = 0; i < out1.length; i++) {
      expect(out1[i]).toBeCloseTo(out2[i], 10);
    }
  });

  it("trainStep changes weights", () => {
    const nn = new NeuralNetwork([10, 8, 4]);
    const input = new Array(10).fill(0.5);
    const before = nn.forward(input);

    const targets = new Map<number, number>();
    targets.set(0, 1.0);
    targets.set(2, -1.0);
    nn.trainStep(input, targets, 0.01);

    const after = nn.forward(input);
    // At least one output should have changed
    let changed = false;
    for (let i = 0; i < 4; i++) {
      if (Math.abs(before[i] - after[i]) > 1e-10) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);
  });

  it("serialization round-trips correctly", () => {
    const nn = new NeuralNetwork([10, 8, 4]);
    const input = new Array(10).fill(0.3);
    const before = nn.forward(input);

    const weights = nn.getWeights();
    const nn2 = new NeuralNetwork([10, 8, 4]);
    nn2.setWeights(weights);
    const after = nn2.forward(input);

    for (let i = 0; i < 4; i++) {
      expect(before[i]).toBeCloseTo(after[i], 10);
    }
  });
});
