import { describe, it, expect } from "vitest";
import { QTable } from "../qTable";
import { NUM_Q_ACTIONS } from "../qActions";

describe("QTable", () => {
  it("applies the exact update rule with a terminal target", () => {
    const table = new QTable();
    // Fresh cell: α = 0.3, target = r → Q = 0.3 · 1 = 0.3
    table.update(10, 3, 1, null, [], true, 0.98);
    expect(table.getQ(10, 3)).toBeCloseTo(0.3, 12);

    // Second visit: α = 0.3 / (1 + 1/40); Q += α · (1 − 0.3)
    const alpha2 = 0.3 / (1 + 1 / 40);
    table.update(10, 3, 1, null, [], true, 0.98);
    expect(table.getQ(10, 3)).toBeCloseTo(0.3 + alpha2 * 0.7, 12);
  });

  it("bootstraps from the max over valid next slots", () => {
    const table = new QTable();
    table.update(10, 3, 1, null, [], true, 0.98); // Q(10,3) = 0.3

    // Non-terminal update: target = 0.5 + 0.5 · max = 0.5 + 0.5·0.3 = 0.65
    table.update(20, 1, 0.5, 10, [3], false, 0.5);
    expect(table.getQ(20, 1)).toBeCloseTo(0.3 * 0.65, 12);
  });

  it("restricts the bootstrap max to valid slots", () => {
    const table = new QTable();
    table.update(10, 3, 1, null, [], true, 0.98); // Q(10,3) = 0.3, slot 3 not valid below

    // Only slot 0 is valid in the next state; Q(10,0) = 0, so no optimism leaks.
    table.update(30, 0, 0, 10, [0], false, 1);
    expect(table.getQ(30, 0)).toBe(0);
  });

  it("treats a terminal transition as bootstrap-free even with next info", () => {
    const table = new QTable();
    table.update(10, 3, 1, null, [], true, 0.98);
    table.update(40, 2, -1, 10, [3], true, 0.98);
    expect(table.getQ(40, 2)).toBeCloseTo(0.3 * -1, 12);
  });

  it("bestValid picks the argmax among the given slots", () => {
    const table = new QTable();
    table.update(10, 3, 1, null, [], true, 0.98); // 0.3
    table.update(10, 5, 0.5, null, [], true, 0.98); // 0.15

    expect(table.bestValid(10, [3, 5])).toEqual({ slot: 3, q: expect.closeTo(0.3) });
    expect(table.bestValid(10, [5]).slot).toBe(5);
    // Unknown state: everything is 0, first slot wins.
    expect(table.bestValid(999, [7, 8])).toEqual({ slot: 7, q: 0 });
  });

  it("tracks visits and state count", () => {
    const table = new QTable();
    expect(table.size).toBe(0);
    expect(table.visits(10)).toBe(0);
    table.update(10, 3, 1, null, [], true, 0.98);
    table.update(10, 4, 1, null, [], true, 0.98);
    table.update(20, 0, 1, null, [], true, 0.98);
    expect(table.size).toBe(2);
    expect(table.visits(10)).toBe(2);
    expect(table.hasState(10)).toBe(true);
    expect(table.hasState(30)).toBe(false);
  });

  it("serialize prunes by visits and magnitude, rounds, and round-trips", () => {
    const table = new QTable();
    table.games = 1234;

    // Key 10: 3 visits, meaningful values → kept.
    table.update(10, 3, 1, null, [], true, 0.98);
    table.update(10, 3, 1, null, [], true, 0.98);
    table.update(10, 5, -0.5, null, [], true, 0.98);
    // Key 20: only 1 visit → pruned by minVisits.
    table.update(20, 0, 1, null, [], true, 0.98);
    // Key 30: 3 visits but negligible values → pruned by magnitude.
    table.update(30, 0, 0.001, null, [], true, 0.98);
    table.update(30, 0, 0.001, null, [], true, 0.98);
    table.update(30, 1, 0.001, null, [], true, 0.98);

    const serialized = table.serialize({ minVisits: 3, round: 3 });
    expect(serialized.v).toBe(1);
    expect(serialized.numActions).toBe(NUM_Q_ACTIONS);
    expect(serialized.games).toBe(1234);
    expect(Object.keys(serialized.entries)).toEqual(["10"]);

    const row = serialized.entries["10"];
    expect(row).toHaveLength(NUM_Q_ACTIONS);
    for (const q of row) {
      expect(q).toBe(Math.round(q * 1000) / 1000);
    }
    expect(row[3]).toBeCloseTo(table.getQ(10, 3), 3);

    const restored = QTable.deserialize(serialized);
    expect(restored.games).toBe(1234);
    expect(restored.size).toBe(1);
    expect(restored.getQ(10, 3)).toBe(row[3]);
    expect(restored.getQ(10, 5)).toBe(row[5]);
    expect(restored.getQ(20, 0)).toBe(0);
  });

  it("deserialize survives a JSON round-trip of the payload", () => {
    const table = new QTable();
    for (let i = 0; i < 5; i += 1) table.update(7, i, 0.5, null, [], true, 0.98);
    const json = JSON.stringify(table.serialize({ minVisits: 3, round: 3 }));
    const restored = QTable.deserialize(JSON.parse(json));
    expect(restored.getQ(7, 0)).toBeCloseTo(0.15, 3);
  });
});
