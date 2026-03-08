import { describe, expect, it } from "vitest";
import { applyGameAction, createInitialGameState } from "../engine";

const createPlayers = () => [
  { userId: "u1", name: "Alice" },
  { userId: "u2", name: "Bob" },
];

describe("online game engine", () => {
  it("initializes a valid 2-player game", () => {
    const state = createInitialGameState(createPlayers());
    expect(state.players).toHaveLength(2);
    expect(state.currentPlayer).toBe(0);
    expect(state.visibleCards.level1).toHaveLength(4);
    expect(state.visibleCards.level2).toHaveLength(4);
    expect(state.visibleCards.level3).toHaveLength(4);
  });

  it("enforces turn ownership for actions", () => {
    const state = createInitialGameState(createPlayers());
    const result = applyGameAction(state, "u2", {
      type: "take_gems",
      gems: { diamond: 1 },
    });

    expect(result.error).toContain("not your turn");
    expect(result.state).toEqual(state);
  });

  it("applies a legal gem-taking action and advances turn", () => {
    const state = createInitialGameState(createPlayers());
    const result = applyGameAction(state, "u1", {
      type: "take_gems",
      gems: { diamond: 1, sapphire: 1, emerald: 1 },
    });

    expect(result.error).toBeUndefined();
    expect(result.state.players[0].gems.diamond).toBe(1);
    expect(result.state.players[0].gems.sapphire).toBe(1);
    expect(result.state.players[0].gems.emerald).toBe(1);
    expect(result.state.currentPlayer).toBe(1);
  });
});
