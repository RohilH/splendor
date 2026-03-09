import { describe, expect, it } from "vitest";
import { applyGameAction, createInitialGameState } from "../engine";
import type { GameServerState } from "../engine";
import type { Card, Noble, GemType, Gems } from "../../../shared/types/game";

const createPlayers = () => [
  { userId: "u1", name: "Alice" },
  { userId: "u2", name: "Bob" },
];

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    level: 1,
    points: 0,
    gem: "diamond",
    cost: { ruby: 2, sapphire: 1 },
    ...overrides,
  };
}

function withPlayerGems(
  state: GameServerState,
  playerIndex: number,
  gems: Partial<Record<GemType, number>>
): GameServerState {
  const clone = JSON.parse(JSON.stringify(state)) as GameServerState;
  for (const [gem, count] of Object.entries(gems)) {
    clone.players[playerIndex].gems[gem as GemType] = count as number;
  }
  return clone;
}

function withPlayerCards(
  state: GameServerState,
  playerIndex: number,
  cards: Card[]
): GameServerState {
  const clone = JSON.parse(JSON.stringify(state)) as GameServerState;
  clone.players[playerIndex].purchasedCards.push(...cards);
  return clone;
}

function withVisibleCard(
  state: GameServerState,
  level: 1 | 2 | 3,
  index: number,
  card: Card
): GameServerState {
  const clone = JSON.parse(JSON.stringify(state)) as GameServerState;
  const key = `level${level}` as keyof typeof clone.visibleCards;
  clone.cards[key] = [...clone.cards[key], clone.visibleCards[key][index]];
  clone.visibleCards[key][index] = card;
  return clone;
}

function withNobles(state: GameServerState, nobles: Noble[]): GameServerState {
  const clone = JSON.parse(JSON.stringify(state)) as GameServerState;
  clone.nobles = nobles;
  return clone;
}

function withBankGems(
  state: GameServerState,
  gems: Partial<Record<GemType, number>>
): GameServerState {
  const clone = JSON.parse(JSON.stringify(state)) as GameServerState;
  for (const [gem, count] of Object.entries(gems)) {
    clone.gems[gem as GemType] = count as number;
  }
  return clone;
}

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

describe("gem-taking parity rules", () => {
  it("rejects zero-gem selections", () => {
    const state = createInitialGameState(createPlayers());
    const result = applyGameAction(state, "u1", {
      type: "take_gems",
      gems: {},
    });
    expect(result.error).toBeDefined();
    expect(result.state).toEqual(state);
  });

  it("rejects taking gold directly", () => {
    const state = createInitialGameState(createPlayers());
    const result = applyGameAction(state, "u1", {
      type: "take_gems",
      gems: { gold: 1 },
    });
    expect(result.error).toBeDefined();
    expect(result.state).toEqual(state);
  });

  it("fails atomically when a selected gem is unavailable", () => {
    let state = createInitialGameState(createPlayers());
    state = withBankGems(state, { diamond: 0 });
    const gemsBefore = { ...state.players[0].gems };

    const result = applyGameAction(state, "u1", {
      type: "take_gems",
      gems: { diamond: 1, sapphire: 1 },
    });

    expect(result.error).toBeDefined();
    expect(result.state.players[0].gems).toEqual(gemsBefore);
  });

  it("takes 2 of same gem when 4+ available", () => {
    const state = createInitialGameState(createPlayers());
    const result = applyGameAction(state, "u1", {
      type: "take_gems",
      gems: { diamond: 2 },
    });
    expect(result.error).toBeUndefined();
    expect(result.state.players[0].gems.diamond).toBe(2);
  });

  it("rejects 2 of same gem when < 4 available", () => {
    let state = createInitialGameState(createPlayers());
    state = withBankGems(state, { diamond: 3 });
    const result = applyGameAction(state, "u1", {
      type: "take_gems",
      gems: { diamond: 2 },
    });
    expect(result.error).toBeDefined();
  });

  it("rejects mixed 2+1 selections", () => {
    const state = createInitialGameState(createPlayers());
    const result = applyGameAction(state, "u1", {
      type: "take_gems",
      gems: { diamond: 2, sapphire: 1 },
    });
    expect(result.error).toBeDefined();
  });

  it("rejects taking more than 3 gems", () => {
    const state = createInitialGameState(createPlayers());
    const result = applyGameAction(state, "u1", {
      type: "take_gems",
      gems: { diamond: 1, sapphire: 1, emerald: 1, ruby: 1 },
    });
    expect(result.error).toBeDefined();
  });

  it("rejects when exceeding 10-gem player limit", () => {
    let state = createInitialGameState(createPlayers());
    state = withPlayerGems(state, 0, {
      diamond: 3,
      sapphire: 3,
      emerald: 2,
      ruby: 1,
      onyx: 1,
    });
    const result = applyGameAction(state, "u1", {
      type: "take_gems",
      gems: { ruby: 1 },
    });
    expect(result.error).toBeDefined();
  });
});

describe("card purchase parity rules", () => {
  it("purchases a card with exact gems", () => {
    let state = createInitialGameState(createPlayers());
    const card = makeCard({
      cost: { ruby: 2, sapphire: 1 },
      gem: "diamond",
      points: 1,
    });
    state = withVisibleCard(state, 1, 0, card);
    state = withPlayerGems(state, 0, { ruby: 2, sapphire: 1 });

    const result = applyGameAction(state, "u1", {
      type: "purchase_card",
      level: 1,
      cardIndex: 0,
    });

    expect(result.error).toBeUndefined();
    expect(result.state.players[0].purchasedCards).toContainEqual(card);
    expect(result.state.players[0].gems.ruby).toBe(0);
    expect(result.state.players[0].gems.sapphire).toBe(0);
  });

  it("fails when player cannot afford card", () => {
    let state = createInitialGameState(createPlayers());
    const card = makeCard({ cost: { ruby: 5 } });
    state = withVisibleCard(state, 1, 0, card);
    state = withPlayerGems(state, 0, { ruby: 1 });

    const result = applyGameAction(state, "u1", {
      type: "purchase_card",
      level: 1,
      cardIndex: 0,
    });

    expect(result.error).toBeDefined();
    expect(result.state.players[0].purchasedCards).toHaveLength(0);
  });

  it("applies card bonuses to reduce cost", () => {
    let state = createInitialGameState(createPlayers());
    const card = makeCard({ cost: { ruby: 3 }, gem: "emerald", points: 1 });
    state = withVisibleCard(state, 1, 0, card);
    state = withPlayerGems(state, 0, { ruby: 1 });
    state = withPlayerCards(state, 0, [
      makeCard({ gem: "ruby" }),
      makeCard({ gem: "ruby" }),
    ]);

    const result = applyGameAction(state, "u1", {
      type: "purchase_card",
      level: 1,
      cardIndex: 0,
    });

    expect(result.error).toBeUndefined();
    expect(result.state.players[0].gems.ruby).toBe(0);
  });

  it("uses gold as wildcard for shortfalls", () => {
    let state = createInitialGameState(createPlayers());
    const card = makeCard({ cost: { ruby: 3 }, gem: "emerald", points: 2 });
    state = withVisibleCard(state, 1, 0, card);
    state = withPlayerGems(state, 0, { ruby: 1, gold: 2 });

    const result = applyGameAction(state, "u1", {
      type: "purchase_card",
      level: 1,
      cardIndex: 0,
    });

    expect(result.error).toBeUndefined();
    expect(result.state.players[0].gems.ruby).toBe(0);
    expect(result.state.players[0].gems.gold).toBe(0);
  });

  it("rejects purchase at invalid card index", () => {
    const state = createInitialGameState(createPlayers());
    const result = applyGameAction(state, "u1", {
      type: "purchase_card",
      level: 1,
      cardIndex: 99,
    });
    expect(result.error).toBeDefined();
  });

  it("debug mode bypasses cost validation", () => {
    let state = createInitialGameState(createPlayers(), true);
    const card = makeCard({ cost: { ruby: 10 }, gem: "diamond", points: 5 });
    state = withVisibleCard(state, 1, 0, card);

    const result = applyGameAction(state, "u1", {
      type: "purchase_card",
      level: 1,
      cardIndex: 0,
    });

    expect(result.error).toBeUndefined();
    expect(result.state.players[0].purchasedCards).toContainEqual(card);
  });
});

describe("reserve card parity rules", () => {
  it("reserves a card and grants gold token", () => {
    const state = createInitialGameState(createPlayers());
    const result = applyGameAction(state, "u1", {
      type: "reserve_card",
      level: 1,
      cardIndex: 0,
    });

    expect(result.error).toBeUndefined();
    expect(result.state.players[0].reservedCards).toHaveLength(1);
    expect(result.state.players[0].gems.gold).toBe(1);
    expect(result.state.gems.gold).toBe(4);
  });

  it("fails when player already has 3 reserved cards", () => {
    let state = createInitialGameState(createPlayers());
    for (let i = 0; i < 3; i++) {
      const r = applyGameAction(state, "u1", {
        type: "reserve_card",
        level: 1,
        cardIndex: 0,
      });
      state = r.state;
      const advance = applyGameAction(state, "u2", { type: "end_turn" });
      state = advance.state;
    }

    expect(state.players[0].reservedCards).toHaveLength(3);
    const result = applyGameAction(state, "u1", {
      type: "reserve_card",
      level: 1,
      cardIndex: 0,
    });
    expect(result.error).toBeDefined();
  });

  it("does not grant gold if player has 10 gems", () => {
    let state = createInitialGameState(createPlayers());
    state = withPlayerGems(state, 0, {
      diamond: 3,
      sapphire: 3,
      emerald: 2,
      ruby: 1,
      onyx: 1,
    });

    const result = applyGameAction(state, "u1", {
      type: "reserve_card",
      level: 1,
      cardIndex: 0,
    });

    expect(result.error).toBeUndefined();
    expect(result.state.players[0].gems.gold).toBe(0);
    expect(result.state.gems.gold).toBe(5);
  });

  it("rejects reserve at invalid card index", () => {
    const state = createInitialGameState(createPlayers());
    const result = applyGameAction(state, "u1", {
      type: "reserve_card",
      level: 1,
      cardIndex: 99,
    });
    expect(result.error).toBeDefined();
  });
});

describe("noble resolution parity rules", () => {
  it("single qualifying noble advances exactly one turn", () => {
    let state = createInitialGameState(createPlayers());
    const noble: Noble = { points: 3, requirements: { diamond: 3 } };
    state = withNobles(state, [noble]);
    state = withPlayerCards(state, 0, [
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "diamond" }),
    ]);

    const card = makeCard({
      cost: {},
      gem: "ruby",
      points: 0,
    });
    state = withVisibleCard(state, 1, 0, card);

    expect(state.currentPlayer).toBe(0);
    const result = applyGameAction(state, "u1", { type: "end_turn" });

    expect(result.error).toBeUndefined();
    expect(result.state.players[0].nobles).toHaveLength(1);
    expect(result.state.nobles).toHaveLength(0);
    expect(result.state.currentPlayer).toBe(1);
  });

  it("multiple qualifying nobles pause for selection", () => {
    let state = createInitialGameState(createPlayers());
    const noble1: Noble = { points: 3, requirements: { diamond: 3 } };
    const noble2: Noble = { points: 3, requirements: { ruby: 2 } };
    state = withNobles(state, [noble1, noble2]);
    state = withPlayerCards(state, 0, [
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "ruby" }),
      makeCard({ gem: "ruby" }),
    ]);

    const result = applyGameAction(state, "u1", { type: "end_turn" });

    expect(result.error).toBeUndefined();
    expect(result.state.showNobleSelection).toBe(true);
    expect(result.state.availableNobles).toHaveLength(2);
    expect(result.state.pendingNobleSelectionPlayerId).toBe("u1");
    expect(result.state.currentPlayer).toBe(0);
  });

  it("noble selection completes the paused turn", () => {
    let state = createInitialGameState(createPlayers());
    const noble1: Noble = { points: 3, requirements: { diamond: 3 } };
    const noble2: Noble = { points: 3, requirements: { ruby: 2 } };
    state = withNobles(state, [noble1, noble2]);
    state = withPlayerCards(state, 0, [
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "ruby" }),
      makeCard({ gem: "ruby" }),
    ]);

    const pausedResult = applyGameAction(state, "u1", { type: "end_turn" });
    expect(pausedResult.state.showNobleSelection).toBe(true);

    const selectResult = applyGameAction(pausedResult.state, "u1", {
      type: "select_noble",
      nobleIndex: 0,
    });

    expect(selectResult.error).toBeUndefined();
    expect(selectResult.state.showNobleSelection).toBe(false);
    expect(selectResult.state.players[0].nobles).toHaveLength(1);
    expect(selectResult.state.currentPlayer).toBe(1);
  });

  it("noble selection is rejected when not pending", () => {
    const state = createInitialGameState(createPlayers());
    const result = applyGameAction(state, "u1", {
      type: "select_noble",
      nobleIndex: 0,
    });
    expect(result.error).toBeDefined();
  });

  it("noble selection rejects invalid index", () => {
    let state = createInitialGameState(createPlayers());
    const noble1: Noble = { points: 3, requirements: { diamond: 3 } };
    const noble2: Noble = { points: 3, requirements: { ruby: 2 } };
    state = withNobles(state, [noble1, noble2]);
    state = withPlayerCards(state, 0, [
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "ruby" }),
      makeCard({ gem: "ruby" }),
    ]);

    const pausedResult = applyGameAction(state, "u1", { type: "end_turn" });
    const badResult = applyGameAction(pausedResult.state, "u1", {
      type: "select_noble",
      nobleIndex: 99,
    });
    expect(badResult.error).toBeDefined();
  });

  it("non-active player cannot select a noble", () => {
    let state = createInitialGameState(createPlayers());
    const noble1: Noble = { points: 3, requirements: { diamond: 3 } };
    const noble2: Noble = { points: 3, requirements: { ruby: 2 } };
    state = withNobles(state, [noble1, noble2]);
    state = withPlayerCards(state, 0, [
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "ruby" }),
      makeCard({ gem: "ruby" }),
    ]);

    const pausedResult = applyGameAction(state, "u1", { type: "end_turn" });
    const wrongPlayer = applyGameAction(pausedResult.state, "u2", {
      type: "select_noble",
      nobleIndex: 0,
    });
    expect(wrongPlayer.error).toBeDefined();
  });
});

describe("win condition parity rules", () => {
  it("game ends when a player has >= 15 points at end of round", () => {
    let state = createInitialGameState(createPlayers());
    state = withPlayerCards(
      state,
      0,
      Array.from({ length: 5 }, () => makeCard({ points: 3 }))
    );

    const r1 = applyGameAction(state, "u1", { type: "end_turn" });
    expect(r1.state.isGameOver).toBe(false);

    const r2 = applyGameAction(r1.state, "u2", { type: "end_turn" });
    expect(r2.state.isGameOver).toBe(true);
    expect(r2.state.winner).toBe(0);
  });

  it("game does NOT end mid-round", () => {
    let state = createInitialGameState(createPlayers());
    state = withPlayerCards(
      state,
      0,
      Array.from({ length: 5 }, () => makeCard({ points: 3 }))
    );

    const r1 = applyGameAction(state, "u1", { type: "end_turn" });
    expect(r1.state.isGameOver).toBe(false);
  });

  it("winner is the player with most points at round end", () => {
    let state = createInitialGameState(createPlayers());
    state = withPlayerCards(
      state,
      0,
      Array.from({ length: 5 }, () => makeCard({ points: 3 }))
    );
    state = withPlayerCards(
      state,
      1,
      Array.from({ length: 6 }, () => makeCard({ points: 3 }))
    );

    const r1 = applyGameAction(state, "u1", { type: "end_turn" });
    const r2 = applyGameAction(r1.state, "u2", { type: "end_turn" });

    expect(r2.state.isGameOver).toBe(true);
    expect(r2.state.winner).toBe(1);
  });
});

describe("purchase reserved card parity rules", () => {
  it("purchases a reserved card successfully", () => {
    let state = createInitialGameState(createPlayers());
    const reserveResult = applyGameAction(state, "u1", {
      type: "reserve_card",
      level: 1,
      cardIndex: 0,
    });
    state = reserveResult.state;

    const advanceResult = applyGameAction(state, "u2", { type: "end_turn" });
    state = advanceResult.state;

    const reserved = state.players[0].reservedCards[0];
    const totalCost: Partial<Record<GemType, number>> = {};
    for (const [gem, count] of Object.entries(reserved.cost)) {
      totalCost[gem as GemType] = count as number;
    }
    state = withPlayerGems(state, 0, totalCost);

    const result = applyGameAction(state, "u1", {
      type: "purchase_reserved_card",
      cardIndex: 0,
    });
    expect(result.error).toBeUndefined();
    expect(result.state.players[0].reservedCards).toHaveLength(0);
  });

  it("returns error for invalid reserved card index", () => {
    const state = createInitialGameState(createPlayers());
    const result = applyGameAction(state, "u1", {
      type: "purchase_reserved_card",
      cardIndex: 5,
    });
    expect(result.error).toBeDefined();
  });
});

describe("game over blocks further actions", () => {
  it("rejects actions after game is over", () => {
    let state = createInitialGameState(createPlayers());
    state = withPlayerCards(
      state,
      0,
      Array.from({ length: 5 }, () => makeCard({ points: 3 }))
    );

    const r1 = applyGameAction(state, "u1", { type: "end_turn" });
    const r2 = applyGameAction(r1.state, "u2", { type: "end_turn" });
    expect(r2.state.isGameOver).toBe(true);

    const r3 = applyGameAction(r2.state, "u1", {
      type: "take_gems",
      gems: { diamond: 1 },
    });
    expect(r3.error).toBeDefined();
  });
});
