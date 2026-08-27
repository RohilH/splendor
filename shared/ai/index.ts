import type { AiAgent, AiDifficulty } from "./types";
import { RandomAgent } from "./randomAgent";
import { HeuristicAgent } from "./heuristicAgent";
import { QLearningAgent } from "./qLearningAgent";
import type { SerializedQTable } from "./qTable";
import trainedQTable from "./qtable.json";

export type { AiAgent, AiDifficulty };
export { RandomAgent } from "./randomAgent";
export { HeuristicAgent } from "./heuristicAgent";
export { QLearningAgent } from "./qLearningAgent";
export { QTable, type SerializedQTable } from "./qTable";

const TRAINED_TABLE = trainedQTable as SerializedQTable;

export const createAgent = (difficulty: AiDifficulty): AiAgent => {
  switch (difficulty) {
    case "easy":
      return new RandomAgent();
    case "medium":
      return new HeuristicAgent();
    case "hard":
      // QLearningAgent falls back to the heuristic on states the trained
      // table has never seen (including an empty placeholder table).
      return new QLearningAgent(
        Object.keys(TRAINED_TABLE.entries).length > 0 ? TRAINED_TABLE : null,
      );
  }
};
