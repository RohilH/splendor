import type { GameServerState } from "../game/engine";
import type { OnlineGameAction } from "../game/actions";
import type { AiAgent } from "./types";
import { enumerateValidActions } from "./actionEnumerator";

export class RandomAgent implements AiAgent {
  pickAction(state: GameServerState, playerIndex: number): OnlineGameAction {
    const validActions = enumerateValidActions(state, playerIndex);

    // Exclude end_turn if there are other options
    const nonPass = validActions.filter((a) => a.action.type !== "end_turn");
    const candidates = nonPass.length > 0 ? nonPass : validActions;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return pick.action;
  }
}
