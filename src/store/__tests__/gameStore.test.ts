import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../gameStore';
import { Card, Noble, GemType } from '../../types/game';

const store = () => useGameStore.getState();

function initGame(numPlayers = 2, names?: string[], debug = false) {
  const playerNames = names ?? Array.from({ length: numPlayers }, (_, i) => `P${i + 1}`);
  store().initializeGame(numPlayers, playerNames, debug);
}

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    level: 1,
    points: 0,
    gem: 'diamond',
    cost: { ruby: 2, sapphire: 1 },
    ...overrides,
  };
}

function givePlayerGems(playerIndex: number, gems: Partial<Record<GemType, number>>) {
  const state = store();
  const players = [...state.players];
  const player = { ...players[playerIndex], gems: { ...players[playerIndex].gems } };
  for (const [gem, count] of Object.entries(gems)) {
    player.gems[gem as GemType] = count as number;
  }
  players[playerIndex] = player;
  useGameStore.setState({ players });
}

function givePlayerCards(playerIndex: number, cards: Card[]) {
  const state = store();
  const players = [...state.players];
  players[playerIndex] = {
    ...players[playerIndex],
    purchasedCards: [...players[playerIndex].purchasedCards, ...cards],
  };
  useGameStore.setState({ players });
}

function setVisibleCard(level: 1 | 2 | 3, index: number, card: Card) {
  const state = store();
  const visibleCards = { ...state.visibleCards };
  const key = `level${level}` as keyof typeof visibleCards;
  const arr = [...visibleCards[key]];
  arr[index] = card;
  visibleCards[key] = arr;
  useGameStore.setState({ visibleCards });
}

function setBankGems(gems: Partial<Record<GemType, number>>) {
  const state = store();
  const updated = { ...state.gems };
  for (const [gem, count] of Object.entries(gems)) {
    updated[gem as GemType] = count as number;
  }
  useGameStore.setState({ gems: updated });
}

// ===== INITIALIZATION =====

describe('Game Initialization', () => {
  beforeEach(() => initGame(2));

  it('creates correct number of players', () => {
    expect(store().players).toHaveLength(2);
  });

  it('assigns player names', () => {
    initGame(2, ['Alice', 'Bob']);
    expect(store().players[0].name).toBe('Alice');
    expect(store().players[1].name).toBe('Bob');
  });

  it('players start with zero gems', () => {
    const gems = store().players[0].gems;
    for (const count of Object.values(gems)) {
      expect(count).toBe(0);
    }
  });

  it('players start with empty cards and nobles', () => {
    const p = store().players[0];
    expect(p.purchasedCards).toHaveLength(0);
    expect(p.reservedCards).toHaveLength(0);
    expect(p.nobles).toHaveLength(0);
  });

  it('sets bank gems correctly for 2 players', () => {
    initGame(2);
    const gems = store().gems;
    expect(gems.diamond).toBe(4);
    expect(gems.sapphire).toBe(4);
    expect(gems.gold).toBe(5);
  });

  it('sets bank gems correctly for 3 players', () => {
    initGame(3);
    const gems = store().gems;
    expect(gems.diamond).toBe(5);
    expect(gems.emerald).toBe(5);
    expect(gems.gold).toBe(5);
  });

  it('sets bank gems correctly for 4 players', () => {
    initGame(4);
    const gems = store().gems;
    expect(gems.diamond).toBe(7);
    expect(gems.ruby).toBe(7);
    expect(gems.gold).toBe(5);
  });

  it('deals 4 visible cards per level', () => {
    const v = store().visibleCards;
    expect(v.level1).toHaveLength(4);
    expect(v.level2).toHaveLength(4);
    expect(v.level3).toHaveLength(4);
  });

  it('nobles count equals numPlayers + 1', () => {
    initGame(2);
    expect(store().nobles).toHaveLength(3);
    initGame(3);
    expect(store().nobles).toHaveLength(4);
    initGame(4);
    expect(store().nobles).toHaveLength(5);
  });

  it('starts on player 0 with game not over', () => {
    expect(store().currentPlayer).toBe(0);
    expect(store().isGameOver).toBe(false);
    expect(store().winner).toBeNull();
  });

  it('sets debug mode when requested', () => {
    initGame(2, ['A', 'B'], true);
    expect(store().debugMode).toBe(true);
  });

  it('deck sizes are total minus 4 visible', () => {
    const c = store().cards;
    const v = store().visibleCards;
    expect(c.level1.length + v.level1.length).toBe(40);
    expect(c.level2.length + v.level2.length).toBe(30);
    expect(c.level3.length + v.level3.length).toBe(20);
  });
});

// ===== TAKE GEMS =====

describe('takeGems', () => {
  beforeEach(() => initGame(2));

  it('takes 3 different gems successfully', () => {
    const result = store().takeGems({ diamond: 1, sapphire: 1, emerald: 1 });
    expect(result).toBe(true);

    const p = store().players[0];
    expect(p.gems.diamond).toBe(1);
    expect(p.gems.sapphire).toBe(1);
    expect(p.gems.emerald).toBe(1);

    const bank = store().gems;
    expect(bank.diamond).toBe(3);
    expect(bank.sapphire).toBe(3);
    expect(bank.emerald).toBe(3);
  });

  it('takes 2 of same gem when 4+ available', () => {
    const result = store().takeGems({ diamond: 2 });
    expect(result).toBe(true);
    expect(store().players[0].gems.diamond).toBe(2);
    expect(store().gems.diamond).toBe(2);
  });

  it('rejects 2 of same gem when < 4 available', () => {
    setBankGems({ diamond: 3 });
    const result = store().takeGems({ diamond: 2 });
    expect(result).toBe(false);
    expect(store().players[0].gems.diamond).toBe(0);
  });

  it('rejects taking more than 3 gems', () => {
    const result = store().takeGems({ diamond: 1, sapphire: 1, emerald: 1, ruby: 1 });
    expect(result).toBe(false);
  });

  it('rejects when exceeding 10-gem player limit', () => {
    givePlayerGems(0, { diamond: 3, sapphire: 3, emerald: 2 });
    // 8 gems + 2 = 10, should succeed
    const result = store().takeGems({ ruby: 1, onyx: 1 });
    expect(result).toBe(true);

    // now at 10, taking 1 more should fail
    const result2 = store().takeGems({ ruby: 1 });
    expect(result2).toBe(false);
  });

  it('takes 1 or 2 gems (valid subsets)', () => {
    expect(store().takeGems({ diamond: 1 })).toBe(true);
    expect(store().players[0].gems.diamond).toBe(1);
  });

  it('rejects mixed selections (e.g. 2 of one + 1 of another)', () => {
    const result = store().takeGems({ diamond: 2, sapphire: 1 });
    expect(result).toBe(false);
  });
});

// ===== PURCHASE CARD =====

describe('purchaseCard', () => {
  beforeEach(() => initGame(2));

  it('purchases a card with exact gems', () => {
    const card = makeCard({ cost: { ruby: 2, sapphire: 1 }, gem: 'diamond', points: 1 });
    setVisibleCard(1, 0, card);
    givePlayerGems(0, { ruby: 2, sapphire: 1 });

    const result = store().purchaseCard(card, 1);
    expect(result).toBe(true);
    expect(store().players[0].purchasedCards).toContain(card);
    expect(store().players[0].gems.ruby).toBe(0);
    expect(store().players[0].gems.sapphire).toBe(0);
    expect(store().gems.ruby).toBe(6); // 4 initial + 2 returned
    expect(store().gems.sapphire).toBe(5); // 4 initial + 1 returned
  });

  it('fails when player cannot afford card', () => {
    const card = makeCard({ cost: { ruby: 5 } });
    setVisibleCard(1, 0, card);
    givePlayerGems(0, { ruby: 1 });

    const result = store().purchaseCard(card, 1);
    expect(result).toBe(false);
    expect(store().players[0].purchasedCards).toHaveLength(0);
  });

  it('applies card bonuses to reduce cost', () => {
    const card = makeCard({ cost: { ruby: 3 }, gem: 'emerald', points: 1 });
    setVisibleCard(1, 0, card);
    givePlayerGems(0, { ruby: 1 });
    givePlayerCards(0, [
      makeCard({ gem: 'ruby' }),
      makeCard({ gem: 'ruby' }),
    ]);

    const result = store().purchaseCard(card, 1);
    expect(result).toBe(true);
    expect(store().players[0].gems.ruby).toBe(0);
  });

  it('uses gold as wildcard for shortfalls', () => {
    const card = makeCard({ cost: { ruby: 3 }, gem: 'emerald', points: 2 });
    setVisibleCard(1, 0, card);
    givePlayerGems(0, { ruby: 1, gold: 2 });

    const result = store().purchaseCard(card, 1);
    expect(result).toBe(true);
    expect(store().players[0].gems.ruby).toBe(0);
    expect(store().players[0].gems.gold).toBe(0);
  });

  it('fails when not enough gold to cover shortfall', () => {
    const card = makeCard({ cost: { ruby: 4 }, gem: 'emerald' });
    setVisibleCard(1, 0, card);
    givePlayerGems(0, { ruby: 1, gold: 1 });

    const result = store().purchaseCard(card, 1);
    expect(result).toBe(false);
  });

  it('replaces visible card from deck after purchase', () => {
    const card = makeCard({ cost: { ruby: 1 }, gem: 'diamond', points: 0 });
    setVisibleCard(1, 0, card);
    givePlayerGems(0, { ruby: 1 });

    const deckSizeBefore = store().cards.level1.length;
    store().purchaseCard(card, 1);
    const deckSizeAfter = store().cards.level1.length;

    expect(deckSizeAfter).toBe(deckSizeBefore - 1);
    expect(store().visibleCards.level1).toHaveLength(4);
  });

  it('debug mode bypasses cost validation', () => {
    initGame(2, ['A', 'B'], true);
    const card = makeCard({ cost: { ruby: 10 }, gem: 'diamond', points: 5 });
    setVisibleCard(1, 0, card);

    const result = store().purchaseCard(card, 1);
    expect(result).toBe(true);
    expect(store().players[0].purchasedCards).toContain(card);
  });
});

// ===== RESERVE CARD =====

describe('reserveCard', () => {
  beforeEach(() => initGame(2));

  it('reserves a card and grants gold token', () => {
    const card = store().visibleCards.level1[0];
    const result = store().reserveCard(card, 1);

    expect(result).toBe(true);
    expect(store().players[0].reservedCards).toContain(card);
    expect(store().players[0].gems.gold).toBe(1);
    expect(store().gems.gold).toBe(4);
  });

  it('fails when player already has 3 reserved cards', () => {
    const cards = store().visibleCards.level1;
    store().reserveCard(cards[0], 1);
    store().reserveCard(cards[0], 1); // new card fills slot after first is removed
    // Need to re-read visible cards each time since they refresh
    store().reserveCard(store().visibleCards.level1[0], 1);

    const result = store().reserveCard(store().visibleCards.level1[0], 1);
    expect(result).toBe(false);
    expect(store().players[0].reservedCards).toHaveLength(3);
  });

  it('does not grant gold if player has 10 gems', () => {
    givePlayerGems(0, { diamond: 3, sapphire: 3, emerald: 2, ruby: 1, onyx: 1 });
    const card = store().visibleCards.level1[0];
    store().reserveCard(card, 1);

    expect(store().players[0].gems.gold).toBe(0);
    expect(store().gems.gold).toBe(5);
  });

  it('does not grant gold if bank has 0 gold', () => {
    setBankGems({ gold: 0 });
    const card = store().visibleCards.level1[0];
    store().reserveCard(card, 1);

    expect(store().players[0].gems.gold).toBe(0);
  });

  it('replaces visible card from deck', () => {
    const deckBefore = store().cards.level1.length;
    const card = store().visibleCards.level1[0];
    store().reserveCard(card, 1);

    expect(store().visibleCards.level1).toHaveLength(4);
    expect(store().cards.level1.length).toBe(deckBefore - 1);
  });
});

// ===== PURCHASE RESERVED CARD =====

describe('purchaseReservedCard', () => {
  beforeEach(() => {
    initGame(2);
    const card = store().visibleCards.level1[0];
    store().reserveCard(card, 1);
  });

  it('purchases a reserved card successfully', () => {
    const reserved = store().players[0].reservedCards[0];
    // Give enough gems to buy
    const totalCost: Record<string, number> = {};
    for (const [gem, count] of Object.entries(reserved.cost)) {
      totalCost[gem] = count as number;
    }
    givePlayerGems(0, totalCost);

    const result = store().purchaseReservedCard(0);
    expect(result).toBe(true);
    expect(store().players[0].reservedCards).toHaveLength(0);
    expect(store().players[0].purchasedCards).toContainEqual(reserved);
  });

  it('returns false for invalid index', () => {
    const result = store().purchaseReservedCard(5);
    expect(result).toBe(false);
  });

  it('fails when player cannot afford reserved card', () => {
    const result = store().purchaseReservedCard(0);
    // Player has 1 gold from reserve but card likely costs more
    const reserved = store().players[0].reservedCards[0];
    const totalCost = Object.values(reserved.cost).reduce((sum, c) => sum + (c || 0), 0);
    if (totalCost > 1) {
      expect(result).toBe(false);
      expect(store().players[0].reservedCards).toHaveLength(1);
    }
  });
});

// ===== NOBLE LOGIC =====

describe('Noble Logic', () => {
  beforeEach(() => initGame(2));

  it('checkNobles returns qualifying nobles', () => {
    const noble: Noble = { points: 3, requirements: { diamond: 3, ruby: 2 } };
    useGameStore.setState({ nobles: [noble] });
    givePlayerCards(0, [
      makeCard({ gem: 'diamond' }),
      makeCard({ gem: 'diamond' }),
      makeCard({ gem: 'diamond' }),
      makeCard({ gem: 'ruby' }),
      makeCard({ gem: 'ruby' }),
    ]);

    const available = store().checkNobles();
    expect(available).toHaveLength(1);
    expect(available[0]).toBe(noble);
  });

  it('checkNobles returns empty when requirements not met', () => {
    const noble: Noble = { points: 3, requirements: { diamond: 4 } };
    useGameStore.setState({ nobles: [noble] });
    givePlayerCards(0, [makeCard({ gem: 'diamond' })]);

    const available = store().checkNobles();
    expect(available).toHaveLength(0);
  });

  it('selectNoble assigns noble to player and removes from pool', () => {
    const noble: Noble = { points: 3, requirements: { diamond: 3 } };
    useGameStore.setState({ nobles: [noble], availableNobles: [noble], showNobleSelection: true });
    givePlayerCards(0, [
      makeCard({ gem: 'diamond' }),
      makeCard({ gem: 'diamond' }),
      makeCard({ gem: 'diamond' }),
    ]);

    store().selectNoble(noble);

    expect(store().players[0].nobles).toContain(noble);
    expect(store().nobles).not.toContain(noble);
    expect(store().showNobleSelection).toBe(false);
  });

  it('assignNoblesAndEndTurn auto-assigns single qualifying noble', () => {
    const noble: Noble = { points: 3, requirements: { diamond: 3 } };
    useGameStore.setState({ nobles: [noble] });
    givePlayerCards(0, [
      makeCard({ gem: 'diamond' }),
      makeCard({ gem: 'diamond' }),
      makeCard({ gem: 'diamond' }),
    ]);

    store().assignNoblesAndEndTurn();

    expect(store().players[0].nobles).toContain(noble);
    expect(store().nobles).toHaveLength(0);
  });

  it('assignNoblesAndEndTurn shows selection for multiple qualifying nobles', () => {
    const noble1: Noble = { points: 3, requirements: { diamond: 3 } };
    const noble2: Noble = { points: 3, requirements: { ruby: 2 } };
    useGameStore.setState({ nobles: [noble1, noble2] });
    givePlayerCards(0, [
      makeCard({ gem: 'diamond' }),
      makeCard({ gem: 'diamond' }),
      makeCard({ gem: 'diamond' }),
      makeCard({ gem: 'ruby' }),
      makeCard({ gem: 'ruby' }),
    ]);

    store().assignNoblesAndEndTurn();

    expect(store().showNobleSelection).toBe(true);
    expect(store().availableNobles).toHaveLength(2);
  });

  it('noble points are included in calculatePoints', () => {
    const noble: Noble = { points: 3, requirements: {} };
    const player = { ...store().players[0], nobles: [noble], purchasedCards: [makeCard({ points: 2 })] };

    const points = store().calculatePoints(player);
    expect(points).toBe(5); // 2 card points + 3 noble points
  });
});

// ===== TURN AND WIN CONDITIONS =====

describe('Turn Management', () => {
  beforeEach(() => initGame(2));

  it('completeEndTurn advances to next player', () => {
    expect(store().currentPlayer).toBe(0);
    store().completeEndTurn();
    expect(store().currentPlayer).toBe(1);
  });

  it('wraps around to player 0', () => {
    store().completeEndTurn(); // 0 -> 1
    store().completeEndTurn(); // 1 -> 0
    expect(store().currentPlayer).toBe(0);
  });

  it('works with 3+ players', () => {
    initGame(3);
    store().completeEndTurn(); // 0 -> 1
    store().completeEndTurn(); // 1 -> 2
    expect(store().currentPlayer).toBe(2);
    store().completeEndTurn(); // 2 -> 0
    expect(store().currentPlayer).toBe(0);
  });
});

describe('Win Conditions', () => {
  beforeEach(() => initGame(2));

  it('game ends when a player has >= 15 points at end of round', () => {
    givePlayerCards(0, Array.from({ length: 5 }, () => makeCard({ points: 3 })));

    store().completeEndTurn(); // player 0 -> 1
    store().completeEndTurn(); // player 1 -> 0, triggers round-end check

    expect(store().isGameOver).toBe(true);
    expect(store().winner).toBe(0);
  });

  it('game does NOT end mid-round', () => {
    givePlayerCards(0, Array.from({ length: 5 }, () => makeCard({ points: 3 })));

    store().completeEndTurn(); // player 0 -> 1, not end of round yet
    expect(store().isGameOver).toBe(false);
  });

  it('winner is the player with most points', () => {
    givePlayerCards(0, Array.from({ length: 5 }, () => makeCard({ points: 3 }))); // 15
    givePlayerCards(1, Array.from({ length: 6 }, () => makeCard({ points: 3 }))); // 18

    store().completeEndTurn(); // 0 -> 1
    store().completeEndTurn(); // 1 -> 0 round end

    expect(store().isGameOver).toBe(true);
    expect(store().winner).toBe(1); // player 1 has more points
  });

  it('does not end if no one has 15 points at round end', () => {
    givePlayerCards(0, [makeCard({ points: 4 }), makeCard({ points: 4 })]);

    store().completeEndTurn();
    store().completeEndTurn();

    expect(store().isGameOver).toBe(false);
  });
});

// ===== RETURN GEMS =====

describe('returnGems', () => {
  beforeEach(() => initGame(2));

  it('returns gems from player to bank', () => {
    givePlayerGems(0, { ruby: 3, sapphire: 2 });

    store().returnGems({ ruby: 2, sapphire: 1 });

    expect(store().players[0].gems.ruby).toBe(1);
    expect(store().players[0].gems.sapphire).toBe(1);
    expect(store().gems.ruby).toBe(6); // 4 initial + 2 returned
    expect(store().gems.sapphire).toBe(5); // 4 initial + 1 returned
  });

  it('does not return more gems than player has', () => {
    givePlayerGems(0, { ruby: 1 });

    store().returnGems({ ruby: 5 });

    expect(store().players[0].gems.ruby).toBe(1); // unchanged
  });
});
