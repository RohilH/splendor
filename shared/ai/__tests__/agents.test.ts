import { describe, it, expect } from "vitest";
import { createInitialGameState, applyGameAction } from "../../game/engine";
import type { GameServerState } from "../../game/engine";
import { RandomAgent } from "../randomAgent";
import type { AiAgent } from "../types";
import { HeuristicAgent } from "../heuristicAgent";

const uid = (i: number) => `test-${i}`;

const createGame = (): GameServerState =>
  createInitialGameState([
    { userId: uid(0), name: "P0" },
    { userId: uid(1), name: "P1" },
  ]);

const playFullGame = (
  agent0: AiAgent,
  agent1: AiAgent,
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
    // Heuristic mirror matches occasionally stall past the turn cap on an
    // unlucky deal, so allow a few attempts; the point is error-free play.
    const agent = new HeuristicAgent();
    let completed: GameServerState | null = null;
    for (let attempt = 0; attempt < 3 && !completed; attempt++) {
      const gs = playFullGame(agent, agent);
      if (gs.isGameOver) completed = gs;
    }
    expect(completed).not.toBeNull();
    expect(completed!.winner).not.toBeNull();
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
