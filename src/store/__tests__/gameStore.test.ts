import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore, localUserId } from "../gameStore";
import type { Card, Noble, GemType } from "../../types/game";

const store = () => useGameStore.getState();

function initGame(numPlayers = 2, names?: string[], debug = false) {
  const playerNames =
    names ?? Array.from({ length: numPlayers }, (_, i) => `P${i + 1}`);
  store().initializeGame(numPlayers, playerNames, debug);
}

function gs() {
  return store().gameState!;
}

function dispatch(action: Parameters<ReturnType<typeof useGameStore.getState>["dispatch"]>[0]) {
  return store().dispatch(action);
}

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    level: 1,
    points: 0,
    gem: "diamond",
    cost: { ruby: 2, sapphire: 1 },
    ...overrides,
  };
}

function setGameState(
  patch: Partial<ReturnType<typeof gs>>
) {
  const current = gs();
  useGameStore.setState({
    gameState: { ...current, ...patch },
  });
}

function givePlayerGems(
  playerIndex: number,
  gems: Partial<Record<GemType, number>>
) {
  const state = gs();
  const players = state.players.map((p, i) => {
    if (i !== playerIndex) return p;
    const updated = { ...p, gems: { ...p.gems } };
    for (const [gem, count] of Object.entries(gems)) {
      updated.gems[gem as GemType] = count as number;
    }
    return updated;
  });
  setGameState({ players });
}

function givePlayerCards(playerIndex: number, cards: Card[]) {
  const state = gs();
  const players = state.players.map((p, i) => {
    if (i !== playerIndex) return p;
    return { ...p, purchasedCards: [...p.purchasedCards, ...cards] };
  });
  setGameState({ players });
}

function setVisibleCard(level: 1 | 2 | 3, index: number, card: Card) {
  const state = gs();
  const key = `level${level}` as keyof typeof state.visibleCards;
  const arr = [...state.visibleCards[key]];
  arr[index] = card;
  setGameState({
    visibleCards: { ...state.visibleCards, [key]: arr },
  });
}

function setBankGems(gems: Partial<Record<GemType, number>>) {
  const state = gs();
  const updated = { ...state.gems };
  for (const [gem, count] of Object.entries(gems)) {
    updated[gem as GemType] = count as number;
  }
  setGameState({ gems: updated });
}

function endTurn() {
  dispatch({ type: "end_turn" });
}

describe("Game Initialization", () => {
  beforeEach(() => initGame(2));

  it("creates correct number of players", () => {
    expect(gs().players).toHaveLength(2);
  });

  it("assigns player names", () => {
    initGame(2, ["Alice", "Bob"]);
    expect(gs().players[0].name).toBe("Alice");
    expect(gs().players[1].name).toBe("Bob");
  });

  it("players start with zero gems", () => {
    const gems = gs().players[0].gems;
    for (const count of Object.values(gems)) {
      expect(count).toBe(0);
    }
  });

  it("players start with empty cards and nobles", () => {
    const p = gs().players[0];
    expect(p.purchasedCards).toHaveLength(0);
    expect(p.reservedCards).toHaveLength(0);
    expect(p.nobles).toHaveLength(0);
  });

  it("sets bank gems correctly for 2 players", () => {
    initGame(2);
    expect(gs().gems.diamond).toBe(4);
    expect(gs().gems.sapphire).toBe(4);
    expect(gs().gems.gold).toBe(5);
  });

  it("sets bank gems correctly for 3 players", () => {
    initGame(3);
    expect(gs().gems.diamond).toBe(5);
    expect(gs().gems.emerald).toBe(5);
    expect(gs().gems.gold).toBe(5);
  });

  it("sets bank gems correctly for 4 players", () => {
    initGame(4);
    expect(gs().gems.diamond).toBe(7);
    expect(gs().gems.ruby).toBe(7);
    expect(gs().gems.gold).toBe(5);
  });

  it("deals 4 visible cards per level", () => {
    const v = gs().visibleCards;
    expect(v.level1).toHaveLength(4);
    expect(v.level2).toHaveLength(4);
    expect(v.level3).toHaveLength(4);
  });

  it("nobles count equals numPlayers + 1", () => {
    initGame(2);
    expect(gs().nobles).toHaveLength(3);
    initGame(3);
    expect(gs().nobles).toHaveLength(4);
    initGame(4);
    expect(gs().nobles).toHaveLength(5);
  });

  it("starts on player 0 with game not over", () => {
    expect(gs().currentPlayer).toBe(0);
    expect(gs().isGameOver).toBe(false);
    expect(gs().winner).toBeNull();
  });

  it("sets debug mode when requested", () => {
    initGame(2, ["A", "B"], true);
    expect(gs().debugMode).toBe(true);
  });

  it("deck sizes are total minus 4 visible", () => {
    const c = gs().cards;
    const v = gs().visibleCards;
    expect(c.level1.length + v.level1.length).toBe(40);
    expect(c.level2.length + v.level2.length).toBe(30);
    expect(c.level3.length + v.level3.length).toBe(20);
  });
});

describe("takeGems (via dispatch)", () => {
  beforeEach(() => initGame(2));

  it("takes 3 different gems successfully", () => {
    const error = dispatch({
      type: "take_gems",
      gems: { diamond: 1, sapphire: 1, emerald: 1 },
    });
    expect(error).toBeUndefined();

    const p = gs().players[0];
    expect(p.gems.diamond).toBe(1);
    expect(p.gems.sapphire).toBe(1);
    expect(p.gems.emerald).toBe(1);

    expect(gs().gems.diamond).toBe(3);
    expect(gs().gems.sapphire).toBe(3);
    expect(gs().gems.emerald).toBe(3);
  });

  it("takes 2 of same gem when 4+ available", () => {
    const error = dispatch({ type: "take_gems", gems: { diamond: 2 } });
    expect(error).toBeUndefined();
    expect(gs().players[0].gems.diamond).toBe(2);
    expect(gs().gems.diamond).toBe(2);
  });

  it("rejects 2 of same gem when < 4 available", () => {
    setBankGems({ diamond: 3 });
    const error = dispatch({ type: "take_gems", gems: { diamond: 2 } });
    expect(error).toBeDefined();
    expect(gs().players[0].gems.diamond).toBe(0);
  });

  it("rejects taking more than 3 gems", () => {
    const error = dispatch({
      type: "take_gems",
      gems: { diamond: 1, sapphire: 1, emerald: 1, ruby: 1 },
    });
    expect(error).toBeDefined();
  });

  it("rejects when exceeding 10-gem player limit", () => {
    givePlayerGems(0, { diamond: 3, sapphire: 3, emerald: 2 });
    const error1 = dispatch({
      type: "take_gems",
      gems: { ruby: 1, onyx: 1 },
    });
    expect(error1).toBeUndefined();

    endTurn();

    const error2 = dispatch({ type: "take_gems", gems: { ruby: 1 } });
    expect(error2).toBeDefined();
  });

  it("takes 1 gem (valid subset)", () => {
    const error = dispatch({ type: "take_gems", gems: { diamond: 1 } });
    expect(error).toBeUndefined();
    expect(gs().players[0].gems.diamond).toBe(1);
  });

  it("rejects mixed selections (e.g. 2 of one + 1 of another)", () => {
    const error = dispatch({
      type: "take_gems",
      gems: { diamond: 2, sapphire: 1 },
    });
    expect(error).toBeDefined();
  });

  it("rejects zero-gem selections", () => {
    const error = dispatch({ type: "take_gems", gems: {} });
    expect(error).toBeDefined();
  });

  it("rejects taking gold directly", () => {
    const error = dispatch({ type: "take_gems", gems: { gold: 1 } });
    expect(error).toBeDefined();
  });
});

describe("purchaseCard (via dispatch)", () => {
  beforeEach(() => initGame(2));

  it("purchases a card with exact gems", () => {
    const card = makeCard({
      cost: { ruby: 2, sapphire: 1 },
      gem: "diamond",
      points: 1,
    });
    setVisibleCard(1, 0, card);
    givePlayerGems(0, { ruby: 2, sapphire: 1 });

    const error = dispatch({ type: "purchase_card", level: 1, cardIndex: 0 });
    expect(error).toBeUndefined();
    expect(gs().players[0].purchasedCards).toContainEqual(card);
    expect(gs().players[0].gems.ruby).toBe(0);
    expect(gs().players[0].gems.sapphire).toBe(0);
  });

  it("fails when player cannot afford card", () => {
    const card = makeCard({ cost: { ruby: 5 } });
    setVisibleCard(1, 0, card);
    givePlayerGems(0, { ruby: 1 });

    const error = dispatch({ type: "purchase_card", level: 1, cardIndex: 0 });
    expect(error).toBeDefined();
    expect(gs().players[0].purchasedCards).toHaveLength(0);
  });

  it("applies card bonuses to reduce cost", () => {
    const card = makeCard({ cost: { ruby: 3 }, gem: "emerald", points: 1 });
    setVisibleCard(1, 0, card);
    givePlayerGems(0, { ruby: 1 });
    givePlayerCards(0, [makeCard({ gem: "ruby" }), makeCard({ gem: "ruby" })]);

    const error = dispatch({ type: "purchase_card", level: 1, cardIndex: 0 });
    expect(error).toBeUndefined();
    expect(gs().players[0].gems.ruby).toBe(0);
  });

  it("uses gold as wildcard for shortfalls", () => {
    const card = makeCard({ cost: { ruby: 3 }, gem: "emerald", points: 2 });
    setVisibleCard(1, 0, card);
    givePlayerGems(0, { ruby: 1, gold: 2 });

    const error = dispatch({ type: "purchase_card", level: 1, cardIndex: 0 });
    expect(error).toBeUndefined();
    expect(gs().players[0].gems.ruby).toBe(0);
    expect(gs().players[0].gems.gold).toBe(0);
  });

  it("fails when not enough gold to cover shortfall", () => {
    const card = makeCard({ cost: { ruby: 4 }, gem: "emerald" });
    setVisibleCard(1, 0, card);
    givePlayerGems(0, { ruby: 1, gold: 1 });

    const error = dispatch({ type: "purchase_card", level: 1, cardIndex: 0 });
    expect(error).toBeDefined();
  });

  it("replaces visible card from deck after purchase", () => {
    const card = makeCard({ cost: { ruby: 1 }, gem: "diamond", points: 0 });
    setVisibleCard(1, 0, card);
    givePlayerGems(0, { ruby: 1 });

    const deckSizeBefore = gs().cards.level1.length;
    dispatch({ type: "purchase_card", level: 1, cardIndex: 0 });
    const deckSizeAfter = gs().cards.level1.length;

    expect(deckSizeAfter).toBe(deckSizeBefore - 1);
    expect(gs().visibleCards.level1).toHaveLength(4);
  });

  it("debug mode bypasses cost validation", () => {
    initGame(2, ["A", "B"], true);
    const card = makeCard({ cost: { ruby: 10 }, gem: "diamond", points: 5 });
    setVisibleCard(1, 0, card);

    const error = dispatch({ type: "purchase_card", level: 1, cardIndex: 0 });
    expect(error).toBeUndefined();
    expect(gs().players[0].purchasedCards).toContainEqual(card);
  });

  it("rejects purchase at invalid card index", () => {
    const error = dispatch({ type: "purchase_card", level: 1, cardIndex: 99 });
    expect(error).toBeDefined();
  });
});

describe("reserveCard (via dispatch)", () => {
  beforeEach(() => initGame(2));

  it("reserves a card and grants gold token", () => {
    const error = dispatch({ type: "reserve_card", level: 1, cardIndex: 0 });
    expect(error).toBeUndefined();
    expect(gs().players[0].reservedCards).toHaveLength(1);
    expect(gs().players[0].gems.gold).toBe(1);
    expect(gs().gems.gold).toBe(4);
  });

  it("fails when player already has 3 reserved cards", () => {
    for (let i = 0; i < 3; i++) {
      dispatch({ type: "reserve_card", level: 1, cardIndex: 0 });
      endTurn();
    }

    expect(gs().players[0].reservedCards).toHaveLength(3);
    const error = dispatch({ type: "reserve_card", level: 1, cardIndex: 0 });
    expect(error).toBeDefined();
  });

  it("does not grant gold if player has 10 gems", () => {
    givePlayerGems(0, {
      diamond: 3,
      sapphire: 3,
      emerald: 2,
      ruby: 1,
      onyx: 1,
    });
    dispatch({ type: "reserve_card", level: 1, cardIndex: 0 });

    expect(gs().players[0].gems.gold).toBe(0);
    expect(gs().gems.gold).toBe(5);
  });

  it("does not grant gold if bank has 0 gold", () => {
    setBankGems({ gold: 0 });
    dispatch({ type: "reserve_card", level: 1, cardIndex: 0 });
    expect(gs().players[0].gems.gold).toBe(0);
  });

  it("replaces visible card from deck", () => {
    const deckBefore = gs().cards.level1.length;
    dispatch({ type: "reserve_card", level: 1, cardIndex: 0 });

    expect(gs().visibleCards.level1).toHaveLength(4);
    expect(gs().cards.level1.length).toBe(deckBefore - 1);
  });
});

describe("purchaseReservedCard (via dispatch)", () => {
  beforeEach(() => {
    initGame(2);
    dispatch({ type: "reserve_card", level: 1, cardIndex: 0 });
    endTurn();
  });

  it("purchases a reserved card successfully", () => {
    const reserved = gs().players[0].reservedCards[0];
    const totalCost: Partial<Record<GemType, number>> = {};
    for (const [gem, count] of Object.entries(reserved.cost)) {
      totalCost[gem as GemType] = count as number;
    }
    givePlayerGems(0, totalCost);

    const error = dispatch({ type: "purchase_reserved_card", cardIndex: 0 });
    expect(error).toBeUndefined();
    expect(gs().players[0].reservedCards).toHaveLength(0);
    expect(gs().players[0].purchasedCards).toContainEqual(reserved);
  });

  it("returns error for invalid index", () => {
    const error = dispatch({ type: "purchase_reserved_card", cardIndex: 5 });
    expect(error).toBeDefined();
  });

  it("fails when player cannot afford reserved card", () => {
    const reserved = gs().players[0].reservedCards[0];
    const totalCost = Object.values(reserved.cost).reduce(
      (sum, c) => sum + (c || 0),
      0
    );
    if (totalCost > 1) {
      const error = dispatch({
        type: "purchase_reserved_card",
        cardIndex: 0,
      });
      expect(error).toBeDefined();
      expect(gs().players[0].reservedCards).toHaveLength(1);
    }
  });
});

describe("Noble Logic (via dispatch)", () => {
  beforeEach(() => initGame(2));

  it("single qualifying noble is auto-assigned and advances exactly one turn", () => {
    const noble: Noble = { points: 3, requirements: { diamond: 3 } };
    setGameState({ nobles: [noble] });
    givePlayerCards(0, [
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "diamond" }),
    ]);

    expect(gs().currentPlayer).toBe(0);
    endTurn();

    expect(gs().players[0].nobles).toContainEqual(noble);
    expect(gs().nobles).toHaveLength(0);
    expect(gs().currentPlayer).toBe(1);
  });

  it("multiple qualifying nobles show selection modal", () => {
    const noble1: Noble = { points: 3, requirements: { diamond: 3 } };
    const noble2: Noble = { points: 3, requirements: { ruby: 2 } };
    setGameState({ nobles: [noble1, noble2] });
    givePlayerCards(0, [
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "ruby" }),
      makeCard({ gem: "ruby" }),
    ]);

    endTurn();

    expect(gs().showNobleSelection).toBe(true);
    expect(gs().availableNobles).toHaveLength(2);
    expect(gs().pendingNobleSelectionPlayerId).toBe(localUserId(0));
  });

  it("selecting a noble completes the paused turn", () => {
    const noble1: Noble = { points: 3, requirements: { diamond: 3 } };
    const noble2: Noble = { points: 3, requirements: { ruby: 2 } };
    setGameState({ nobles: [noble1, noble2] });
    givePlayerCards(0, [
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "diamond" }),
      makeCard({ gem: "ruby" }),
      makeCard({ gem: "ruby" }),
    ]);

    endTurn();
    expect(gs().showNobleSelection).toBe(true);

    dispatch({ type: "select_noble", nobleIndex: 0 });

    expect(gs().showNobleSelection).toBe(false);
    expect(gs().players[0].nobles).toHaveLength(1);
    expect(gs().currentPlayer).toBe(1);
  });

  it("noble selection is rejected when not pending", () => {
    const error = dispatch({ type: "select_noble", nobleIndex: 0 });
    expect(error).toBeDefined();
  });
});

describe("Turn Management", () => {
  beforeEach(() => initGame(2));

  it("end_turn advances to next player", () => {
    expect(gs().currentPlayer).toBe(0);
    endTurn();
    expect(gs().currentPlayer).toBe(1);
  });

  it("wraps around to player 0", () => {
    endTurn();
    endTurn();
    expect(gs().currentPlayer).toBe(0);
  });

  it("works with 3+ players", () => {
    initGame(3);
    endTurn();
    endTurn();
    expect(gs().currentPlayer).toBe(2);
    endTurn();
    expect(gs().currentPlayer).toBe(0);
  });
});

describe("Win Conditions", () => {
  beforeEach(() => initGame(2));

  it("game ends when a player has >= 15 points at end of round", () => {
    givePlayerCards(
      0,
      Array.from({ length: 5 }, () => makeCard({ points: 3 }))
    );
    endTurn();
    expect(gs().isGameOver).toBe(false);
    endTurn();
    expect(gs().isGameOver).toBe(true);
    expect(gs().winner).toBe(0);
  });

  it("game does NOT end mid-round", () => {
    givePlayerCards(
      0,
      Array.from({ length: 5 }, () => makeCard({ points: 3 }))
    );
    endTurn();
    expect(gs().isGameOver).toBe(false);
  });

  it("winner is the player with most points", () => {
    givePlayerCards(
      0,
      Array.from({ length: 5 }, () => makeCard({ points: 3 }))
    );
    givePlayerCards(
      1,
      Array.from({ length: 6 }, () => makeCard({ points: 3 }))
    );
    endTurn();
    endTurn();
    expect(gs().isGameOver).toBe(true);
    expect(gs().winner).toBe(1);
  });

  it("does not end if no one has 15 points at round end", () => {
    givePlayerCards(0, [makeCard({ points: 4 }), makeCard({ points: 4 })]);
    endTurn();
    endTurn();
    expect(gs().isGameOver).toBe(false);
  });
});
