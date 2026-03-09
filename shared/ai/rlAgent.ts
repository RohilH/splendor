import type { GameServerState } from "../game/engine";
import type { OnlineGameAction } from "../game/actions";
import type { AiAgent } from "./types";
import { NUM_ACTION_SLOTS, NUM_FEATURES } from "./types";
import { enumerateValidActions } from "./actionEnumerator";
import { extractFeatures } from "./features";
import { NeuralNetwork, type SerializedWeights } from "./neuralNetwork";

export class RLAgent implements AiAgent {
  private network: NeuralNetwork;

  constructor(weights?: SerializedWeights) {
    this.network = new NeuralNetwork([NUM_FEATURES, 128, 64, NUM_ACTION_SLOTS]);
    if (weights) {
      this.network.setWeights(weights);
    }
  }

  pickAction(state: GameServerState, playerIndex: number): OnlineGameAction {
    const features = extractFeatures(state, playerIndex);
    const qValues = this.network.forward(features);
    const validActions = enumerateValidActions(state, playerIndex);

    // Find valid action with the highest Q-value
    let bestQ = -Infinity;
    let bestAction: OnlineGameAction | null = null;

    for (const { action, slotIndex } of validActions) {
      if (qValues[slotIndex] > bestQ) {
        bestQ = qValues[slotIndex];
        bestAction = action;
      }
    }

    // Fallback: should never happen since end_turn is always valid
    return bestAction ?? { type: "end_turn" };
  }

  /** Get the underlying network (for training). */
  getNetwork(): NeuralNetwork {
    return this.network;
  }

  getWeights(): SerializedWeights {
    return this.network.getWeights();
  }

  setWeights(weights: SerializedWeights): void {
    this.network.setWeights(weights);
  }
}
