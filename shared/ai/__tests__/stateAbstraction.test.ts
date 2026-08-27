import { describe, it, expect } from "vitest";
import { createInitialGameState } from "../../game/engine";
import type { GameServerState } from "../../game/engine";
import type { Card, Noble } from "../../types/game";
import {
  extractStateFeatures,
  encodeFeatures,
  encodeStateKey,
  decodeStateKey,
  STATE_KEY_SPACE,
  type StateFeatures,
} from "../stateAbstraction";

const uid = (i: number) => `abs-${i}`;

const createGame = (): GameServerState =>
  createInitialGameState([
    { userId: uid(0), name: "P0" },
    { userId: uid(1), name: "P1" },
  ]);

const clone = (state: GameServerState): GameServerState =>
  JSON.parse(JSON.stringify(state));

const card = (
  gem: Card["gem"],
  points: number,
  cost: Card["cost"] = {},
  level: Card["level"] = 1,
): Card => ({ level, points, gem, cost });

describe("stateAbstraction", () => {
  it("buckets points at the 3-point edges and caps at 5", () => {
    const base = createGame();

    const withPoints = (points: number): GameServerState => {
      const gs = clone(base);
      gs.players[0].purchasedCards = [card("ruby", points)];
      return gs;
    };

    expect(extractStateFeatures(base, 0).pointsB).toBe(0);
    expect(extractStateFeatures(withPoints(2), 0).pointsB).toBe(0);
    expect(extractStateFeatures(withPoints(3), 0).pointsB).toBe(1);
    expect(extractStateFeatures(withPoints(15), 0).pointsB).toBe(5);
    expect(extractStateFeatures(withPoints(20), 0).pointsB).toBe(5);
  });

  it("buckets gem totals at the 2/5/8 edges (9 and 10 share the top bucket)", () => {
    const base = createGame();

    const withGems = (total: number): GameServerState => {
      const gs = clone(base);
      gs.players[0].gems.ruby = Math.min(total, 5);
      gs.players[0].gems.emerald = Math.max(0, total - 5);
      return gs;
    };

    expect(extractStateFeatures(withGems(0), 0).gemB).toBe(0);
    expect(extractStateFeatures(withGems(2), 0).gemB).toBe(0);
    expect(extractStateFeatures(withGems(3), 0).gemB).toBe(1);
    expect(extractStateFeatures(withGems(5), 0).gemB).toBe(1);
    expect(extractStateFeatures(withGems(6), 0).gemB).toBe(2);
    expect(extractStateFeatures(withGems(8), 0).gemB).toBe(2);
    expect(extractStateFeatures(withGems(9), 0).gemB).toBe(3);
    expect(extractStateFeatures(withGems(10), 0).gemB).toBe(3);
  });

  it("caps gold at 2", () => {
    const gs = clone(createGame());
    gs.players[0].gems.gold = 4;
    expect(extractStateFeatures(gs, 0).goldB).toBe(2);
  });

  it("buckets point lead at the ±5 edges", () => {
    const base = createGame();

    const withLead = (mine: number, theirs: number): StateFeatures => {
      const gs = clone(base);
      gs.players[0].purchasedCards = mine > 0 ? [card("ruby", mine)] : [];
      gs.players[1].purchasedCards = theirs > 0 ? [card("onyx", theirs)] : [];
      return extractStateFeatures(gs, 0);
    };

    expect(withLead(0, 5).leadB).toBe(0); // −5
    expect(withLead(0, 6).leadB).toBe(0);
    expect(withLead(0, 4).leadB).toBe(1); // −4
    expect(withLead(0, 1).leadB).toBe(1);
    expect(withLead(0, 0).leadB).toBe(2);
    expect(withLead(1, 0).leadB).toBe(3);
    expect(withLead(4, 0).leadB).toBe(3);
    expect(withLead(5, 0).leadB).toBe(4);
  });

  it("computes noble distance as the smallest bonus shortfall", () => {
    const gs = clone(createGame());
    const noble: Noble = {
      id: "ruby-emerald-noble",
      points: 3,
      requirements: { ruby: 3, emerald: 3 },
    };
    gs.nobles = [noble];
    // 4 ruby bonuses (surplus ignored) + 1 emerald bonus → missing 2 emeralds.
    gs.players[0].purchasedCards = [
      card("ruby", 0),
      card("ruby", 0),
      card("ruby", 0),
      card("ruby", 0),
      card("emerald", 0),
    ];
    expect(extractStateFeatures(gs, 0).nobleDistB).toBe(1); // distance 2

    gs.players[0].purchasedCards.push(card("emerald", 0));
    expect(extractStateFeatures(gs, 0).nobleDistB).toBe(0); // distance 1

    gs.players[0].purchasedCards = [];
    expect(extractStateFeatures(gs, 0).nobleDistB).toBe(2); // distance 6
  });

  it("treats an empty noble row as maximum distance", () => {
    const gs = clone(createGame());
    gs.nobles = [];
    expect(extractStateFeatures(gs, 0).nobleDistB).toBe(2);
  });

  it("counts affordable visible and reserved cards", () => {
    const gs = clone(createGame());
    const free = card("ruby", 1);
    gs.visibleCards.level1 = [free, card("onyx", 0, { diamond: 7 })];
    gs.visibleCards.level2 = [];
    gs.visibleCards.level3 = [];
    gs.players[0].reservedCards = [card("sapphire", 4, { ruby: 7 })];

    let f = extractStateFeatures(gs, 0);
    expect(f.affordB).toBe(1);
    expect(f.affordReservedB).toBe(0);
    expect(f.bestAffordPtsB).toBe(1); // best affordable = 1 point
    expect(f.reservedB).toBe(1);

    gs.players[0].gems.ruby = 7;
    f = extractStateFeatures(gs, 0);
    expect(f.affordReservedB).toBe(1);
    expect(f.bestAffordPtsB).toBe(2); // reserved 4-pointer now affordable
  });

  it("round-trips every feature vector through encode/decode", () => {
    const radices = [6, 5, 4, 3, 4, 3, 3, 2, 5, 3];
    const fields: (keyof StateFeatures)[] = [
      "pointsB",
      "bonusB",
      "gemB",
      "goldB",
      "affordB",
      "bestAffordPtsB",
      "reservedB",
      "affordReservedB",
      "leadB",
      "nobleDistB",
    ];

    // Deterministic sample across the space, plus the two corners.
    for (let sample = 0; sample < 500; sample += 1) {
      const features = {} as StateFeatures;
      fields.forEach((field, i) => {
        features[field] = (sample * 7 + i * 13) % radices[i];
      });
      const key = encodeFeatures(features);
      expect(key).toBeGreaterThanOrEqual(0);
      expect(key).toBeLessThan(STATE_KEY_SPACE);
      expect(decodeStateKey(key)).toEqual(features);
    }

    const zero = Object.fromEntries(fields.map((f) => [f, 0])) as unknown as StateFeatures;
    const max = Object.fromEntries(
      fields.map((f, i) => [f, radices[i] - 1]),
    ) as unknown as StateFeatures;
    expect(decodeStateKey(encodeFeatures(zero))).toEqual(zero);
    expect(decodeStateKey(encodeFeatures(max))).toEqual(max);
    expect(encodeFeatures(max)).toBe(STATE_KEY_SPACE - 1);
  });

  it("produces a stable key for the same state and fits in 2^19", () => {
    const gs = createGame();
    const key = encodeStateKey(gs, 0);
    expect(encodeStateKey(clone(gs), 0)).toBe(key);
    expect(STATE_KEY_SPACE).toBe(388_800);
    expect(STATE_KEY_SPACE).toBeLessThan(2 ** 19);
  });
});
