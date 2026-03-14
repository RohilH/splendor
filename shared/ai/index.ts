import type { AiAgent, AiDifficulty } from "./types";
import { RandomAgent } from "./randomAgent";
import { HeuristicAgent } from "./heuristicAgent";
import { RLAgent } from "./rlAgent";
import { TRAINED_WEIGHTS } from "./trainedWeights";

export type { AiAgent, AiDifficulty };

export const createAgent = (difficulty: AiDifficulty): AiAgent => {
  switch (difficulty) {
    case "easy":
      return new RandomAgent();
    case "medium":
      return new HeuristicAgent();
    case "hard":
      // Use trained weights if available, otherwise fall back to heuristic
      if (TRAINED_WEIGHTS) {
        return new RLAgent(TRAINED_WEIGHTS);
      }
      return new HeuristicAgent();
  }
};
