import { NUM_Q_ACTIONS } from "./qActions";

/**
 * JSON-serializable snapshot of a trained Q-table. Committed to the repo as
 * shared/ai/qtable.json and loaded by the Hard CPU difficulty.
 */
export interface SerializedQTable {
  v: 1;
  numActions: number;
  games: number;
  entries: Record<string, number[]>;
}

const ALPHA_0 = 0.3;
const ALPHA_VISIT_SCALE = 40;

/**
 * Tabular Q-table over abstracted state keys (stateAbstraction.ts) and
 * abstract action slots (qActions.ts), with the standard update
 * Q(s,a) += α · (r + γ · max_{a' ∈ valid(s')} Q(s',a') − Q(s,a)).
 */
export class QTable {
  private values = new Map<number, Float64Array>();
  private visitCounts = new Map<number, Uint32Array>();
  games = 0;

  get size(): number {
    return this.values.size;
  }

  private row(key: number): Float64Array {
    let row = this.values.get(key);
    if (!row) {
      row = new Float64Array(NUM_Q_ACTIONS);
      this.values.set(key, row);
      this.visitCounts.set(key, new Uint32Array(NUM_Q_ACTIONS));
    }
    return row;
  }

  getQ(key: number, slot: number): number {
    return this.values.get(key)?.[slot] ?? 0;
  }

  visits(key: number): number {
    const counts = this.visitCounts.get(key);
    if (!counts) return 0;
    let total = 0;
    for (const count of counts) total += count;
    return total;
  }

  hasState(key: number): boolean {
    return this.values.has(key);
  }

  /**
   * Best Q value over the given valid slots. Restricting the max to valid
   * slots is essential: unvisited slots default to 0 and would otherwise
   * leak optimism into the bootstrap target.
   */
  bestValid(key: number, validSlots: number[]): { slot: number; q: number } {
    const row = this.values.get(key);
    let bestSlot = validSlots[0];
    let bestQ = -Infinity;
    for (const slot of validSlots) {
      const q = row?.[slot] ?? 0;
      if (q > bestQ) {
        bestQ = q;
        bestSlot = slot;
      }
    }
    return { slot: bestSlot, q: bestQ === -Infinity ? 0 : bestQ };
  }

  update(
    key: number,
    slot: number,
    reward: number,
    nextKey: number | null,
    nextValidSlots: number[],
    done: boolean,
    gamma: number,
  ): void {
    const row = this.row(key);
    const counts = this.visitCounts.get(key)!;
    const alpha = ALPHA_0 / (1 + counts[slot] / ALPHA_VISIT_SCALE);

    const bootstrap =
      done || nextKey === null || nextValidSlots.length === 0
        ? 0
        : this.bestValid(nextKey, nextValidSlots).q;

    const target = reward + gamma * bootstrap;
    row[slot] += alpha * (target - row[slot]);
    counts[slot] += 1;
  }

  serialize(opts: { minVisits: number; round: number }): SerializedQTable {
    const factor = 10 ** opts.round;
    const entries: Record<string, number[]> = {};

    for (const [key, row] of this.values) {
      if (this.visits(key) < opts.minVisits) continue;

      const rounded = Array.from(row, (q) => Math.round(q * factor) / factor);
      if (!rounded.some((q) => Math.abs(q) >= 0.005)) continue;

      entries[String(key)] = rounded;
    }

    return {
      v: 1,
      numActions: NUM_Q_ACTIONS,
      games: this.games,
      entries,
    };
  }

  static deserialize(data: SerializedQTable): QTable {
    const table = new QTable();
    table.games = data.games;
    for (const [key, values] of Object.entries(data.entries)) {
      const row = table.row(Number(key));
      for (let slot = 0; slot < Math.min(values.length, NUM_Q_ACTIONS); slot += 1) {
        row[slot] = values[slot];
      }
    }
    return table;
  }
}
