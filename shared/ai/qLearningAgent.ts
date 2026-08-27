import type { GameServerState } from "../game/engine";
import type { OnlineGameAction } from "../game/actions";
import type { AiAgent } from "./types";
import { HeuristicAgent } from "./heuristicAgent";
import { encodeStateKey } from "./stateAbstraction";
import { enumerateQActions } from "./qActions";
import { QTable, type SerializedQTable } from "./qTable";

/**
 * Greedy policy over a trained tabular Q-table. States the table has never
 * seen (or where every valid slot is still 0) delegate to a fallback agent,
 * so play stays strong off the learned distribution.
 */
export class QLearningAgent implements AiAgent {
  private readonly table: QTable | null;
  private readonly fallback: AiAgent;

  constructor(
    table: QTable | SerializedQTable | null,
    fallback: AiAgent = new HeuristicAgent(),
  ) {
    if (table instanceof QTable) {
      this.table = table;
    } else if (table) {
      this.table = QTable.deserialize(table);
    } else {
      this.table = null;
    }
    this.fallback = fallback;
  }

  pickAction(
    state: GameServerState,
    playerIndex: number,
  ): OnlineGameAction {
    const qActions = enumerateQActions(state, playerIndex);

    if (this.table && qActions.length > 0) {
      const key = encodeStateKey(state, playerIndex);
      if (this.table.hasState(key)) {
        const validSlots = qActions.map((qa) => qa.qSlot);
        const hasSignal = validSlots.some(
          (slot) => this.table!.getQ(key, slot) !== 0,
        );
        if (hasSignal) {
          const best = this.table.bestValid(key, validSlots);
          const chosen = qActions.find((qa) => qa.qSlot === best.slot);
          if (chosen) return chosen.action;
        }
      }
    }

    return this.fallback.pickAction(state, playerIndex);
  }
}
