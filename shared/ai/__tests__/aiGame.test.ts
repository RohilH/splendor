import { describe, it, expect } from "vitest";
import { createInitialGameState, applyGameAction } from "../../game/engine";
import type { GameServerState } from "../../game/engine";
import { calculatePlayerPoints } from "../../game/selectors";
import { RandomAgent } from "../randomAgent";
import { HeuristicAgent } from "../heuristicAgent";
import { createAgent } from "../index";
import type { AiAgent } from "../types";

const uid = (i: number) => `ai-${i}`;

const playGame = (
  agents: AiAgent[],
  maxTurns = 300,
): GameServerState => {
  const players = agents.map((_, i) => ({ userId: uid(i), name: `P${i}` }));
  let gs = createInitialGameState(players);
  let turns = 0;

  while (!gs.isGameOver && turns < maxTurns) {
    const pi = gs.currentPlayer;

    if (gs.pendingNobleSelectionPlayerId) {
      const pendingIdx = gs.players.findIndex(
        (p) => p.userId === gs.pendingNobleSelectionPlayerId,
      );
      const r = applyGameAction(gs, uid(pendingIdx >= 0 ? pendingIdx : pi), {
        type: "select_noble",
        nobleIndex: 0,
      });
      if (!r.error) gs = r.state;
      continue;
    }

    const action = agents[pi].pickAction(gs, pi);
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

describe("AI Full Game Integration", () => {
  it("2 random agents complete games without infinite loops", () => {
    const agents = [new RandomAgent(), new RandomAgent()];
    let completed = 0;
    for (let i = 0; i < 20; i++) {
      const gs = playGame(agents, 500);
      if (gs.isGameOver) completed++;
    }
    // Random play should mostly complete within 500 turns
    expect(completed).toBeGreaterThanOrEqual(15);
  });

  it("2 heuristic agents complete games efficiently", () => {
    const agents = [new HeuristicAgent(), new HeuristicAgent()];
    let completed = 0;
    for (let i = 0; i < 20; i++) {
      const gs = playGame(agents, 500);
      if (gs.isGameOver) completed++;
    }
    expect(completed).toBeGreaterThanOrEqual(15);
  });

  it("3 mixed agents complete games", () => {
    const agents = [
      new RandomAgent(),
      new HeuristicAgent(),
      createAgent("easy"),
    ];
    let completed = 0;
    for (let i = 0; i < 10; i++) {
      const gs = playGame(agents, 500);
      if (gs.isGameOver) completed++;
    }
    // Most games should complete
    expect(completed).toBeGreaterThanOrEqual(7);
  });

  it("4 agents complete games", () => {
    const agents = [
      new HeuristicAgent(),
      new RandomAgent(),
      new HeuristicAgent(),
      new RandomAgent(),
    ];
    let completed = 0;
    for (let i = 0; i < 10; i++) {
      const gs = playGame(agents, 500);
      if (gs.isGameOver) completed++;
    }
    expect(completed).toBeGreaterThanOrEqual(7);
  });

  it("winner always has >= 15 points when game completes", () => {
    const agents = [new HeuristicAgent(), new HeuristicAgent()];
    let testedCount = 0;
    for (let i = 0; i < 30; i++) {
      const gs = playGame(agents);
      if (gs.isGameOver && gs.winner !== null) {
        const winnerPoints = calculatePlayerPoints(gs.players[gs.winner]);
        expect(winnerPoints).toBeGreaterThanOrEqual(15);
        testedCount++;
      }
    }
    // At least some games should have completed
    expect(testedCount).toBeGreaterThan(10);
  });

  it("createAgent factory produces valid agents for all difficulties", () => {
    const difficulties = ["easy", "medium", "hard"] as const;
    for (const diff of difficulties) {
      const agent = createAgent(diff);
      const players = [agent, new RandomAgent()];
      const gs = playGame(players);
      expect(gs.isGameOver).toBe(true);
    }
  });
});
