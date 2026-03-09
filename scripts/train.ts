/**
 * DQN Training Script for Splendor RL Agent
 *
 * Trains a neural network via self-play using Deep Q-Learning with:
 *  - Experience replay buffer
 *  - Target network (updated periodically)
 *  - Epsilon-greedy exploration with decay
 *  - Adam optimizer
 *
 * Usage: npx tsx scripts/train.ts
 */

import { createInitialGameState, applyGameAction } from "../shared/game/engine";
import type { GameServerState } from "../shared/game/engine";
import { calculatePlayerPoints } from "../shared/game/selectors";
import { extractFeatures } from "../shared/ai/features";
import { enumerateValidActions } from "../shared/ai/actionEnumerator";
import { NeuralNetwork, type SerializedWeights } from "../shared/ai/neuralNetwork";
import { NUM_ACTION_SLOTS, NUM_FEATURES } from "../shared/ai/types";
import { HeuristicAgent } from "../shared/ai/heuristicAgent";
import * as fs from "fs";
import * as path from "path";

// ─── Hyperparameters ───────────────────────────────────────────────
const NUM_GAMES = 200_000;
const BUFFER_SIZE = 50_000;
const BATCH_SIZE = 64;
const LEARNING_RATE = 0.0005;
const GAMMA = 0.99; // discount factor
const EPSILON_START = 1.0;
const EPSILON_END = 0.05;
const EPSILON_DECAY_GAMES = 100_000; // linear decay over this many games
const TARGET_UPDATE_STEPS = 2_000;
const TRAIN_EVERY_STEPS = 4;
const MAX_TURNS_PER_GAME = 300; // safety limit
const LOG_EVERY = 5_000;
const CHECKPOINT_EVERY = 50_000;

// ─── Experience replay buffer ──────────────────────────────────────
interface Experience {
  state: number[];
  actionSlot: number;
  reward: number;
  nextState: number[];
  done: boolean;
}

class ReplayBuffer {
  private buffer: Experience[] = [];
  private pos = 0;

  constructor(private maxSize: number) {}

  push(exp: Experience): void {
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(exp);
    } else {
      this.buffer[this.pos] = exp;
    }
    this.pos = (this.pos + 1) % this.maxSize;
  }

  sample(batchSize: number): Experience[] {
    const batch: Experience[] = [];
    for (let i = 0; i < batchSize; i++) {
      const idx = Math.floor(Math.random() * this.buffer.length);
      batch.push(this.buffer[idx]);
    }
    return batch;
  }

  get size(): number {
    return this.buffer.length;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

const userId = (index: number): string => `train-${index}`;

const createTrainingGame = (): GameServerState =>
  createInitialGameState([
    { userId: userId(0), name: "Agent0" },
    { userId: userId(1), name: "Agent1" },
  ]);

/**
 * Pick an action using epsilon-greedy policy.
 * Returns the chosen action's slot index and the action itself.
 */
const epsilonGreedyAction = (
  network: NeuralNetwork,
  state: GameServerState,
  playerIndex: number,
  epsilon: number,
): { slotIndex: number; action: ReturnType<typeof enumerateValidActions>[number]["action"] } => {
  const validActions = enumerateValidActions(state, playerIndex);
  const nonPass = validActions.filter((a) => a.action.type !== "end_turn");
  const candidates = nonPass.length > 0 ? nonPass : validActions;

  if (Math.random() < epsilon) {
    // Random exploration
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return { slotIndex: pick.slotIndex, action: pick.action };
  }

  // Greedy
  const features = extractFeatures(state, playerIndex);
  const qValues = network.forward(features);

  let bestQ = -Infinity;
  let bestPick = candidates[0];
  for (const va of candidates) {
    if (qValues[va.slotIndex] > bestQ) {
      bestQ = qValues[va.slotIndex];
      bestPick = va;
    }
  }
  return { slotIndex: bestPick.slotIndex, action: bestPick.action };
};

/**
 * Compute immediate reward for a turn.
 */
const computeReward = (
  prevState: GameServerState,
  newState: GameServerState,
  playerIndex: number,
): number => {
  const prevPoints = calculatePlayerPoints(prevState.players[playerIndex]);
  const newPoints = calculatePlayerPoints(newState.players[playerIndex]);
  const pointsGained = newPoints - prevPoints;

  let reward = pointsGained * 0.1;

  // Small reward for purchasing any card (even 0 points)
  const prevCards = prevState.players[playerIndex].purchasedCards.length;
  const newCards = newState.players[playerIndex].purchasedCards.length;
  if (newCards > prevCards) {
    reward += 0.05;
  }

  return reward;
};

/**
 * Train the network on a batch from the replay buffer.
 */
const trainOnBatch = (
  onlineNet: NeuralNetwork,
  targetNet: NeuralNetwork,
  buffer: ReplayBuffer,
  batchSize: number,
): number => {
  const batch = buffer.sample(batchSize);
  let totalLoss = 0;

  for (const exp of batch) {
    let targetQ: number;

    if (exp.done) {
      targetQ = exp.reward;
    } else {
      const nextQValues = targetNet.forward(exp.nextState);
      const maxNextQ = Math.max(...nextQValues);
      targetQ = exp.reward + GAMMA * maxNextQ;
    }

    const targets = new Map<number, number>();
    targets.set(exp.actionSlot, targetQ);
    const loss = onlineNet.trainStep(exp.state, targets, LEARNING_RATE);
    totalLoss += loss;
  }

  return totalLoss / batchSize;
};

// ─── Main training loop ────────────────────────────────────────────

const main = () => {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Splendor DQN Training");
  console.log(`  Games: ${NUM_GAMES.toLocaleString()}`);
  console.log(`  Network: [${NUM_FEATURES}, 128, 64, ${NUM_ACTION_SLOTS}]`);
  console.log(`  Buffer: ${BUFFER_SIZE.toLocaleString()}, Batch: ${BATCH_SIZE}`);
  console.log(`  LR: ${LEARNING_RATE}, Gamma: ${GAMMA}`);
  console.log("═══════════════════════════════════════════════════\n");

  const onlineNet = new NeuralNetwork([NUM_FEATURES, 128, 64, NUM_ACTION_SLOTS]);
  const targetNet = onlineNet.clone();
  const buffer = new ReplayBuffer(BUFFER_SIZE);

  let totalSteps = 0;
  let recentWins = [0, 0]; // wins for player 0, player 1
  let recentLoss = 0;
  let recentLossCount = 0;
  let recentGameLengths: number[] = [];

  const startTime = Date.now();

  for (let game = 0; game < NUM_GAMES; game++) {
    const epsilon =
      EPSILON_START -
      (EPSILON_START - EPSILON_END) *
        Math.min(1, game / EPSILON_DECAY_GAMES);

    let gameState = createTrainingGame();
    let turns = 0;

    // Store per-player experiences for terminal reward assignment
    const gameExperiences: Array<{ exp: Experience; playerIndex: number }> = [];

    while (!gameState.isGameOver && turns < MAX_TURNS_PER_GAME) {
      const pi = gameState.currentPlayer;
      const prevState = gameState;
      const features = extractFeatures(prevState, pi);

      // Handle noble selection
      if (gameState.pendingNobleSelectionPlayerId) {
        // Auto-select first noble (simple strategy for training)
        const result = applyGameAction(gameState, userId(pi), {
          type: "select_noble",
          nobleIndex: 0,
        });
        if (!result.error) {
          gameState = result.state;
        }
        continue;
      }

      const { slotIndex, action } = epsilonGreedyAction(
        onlineNet,
        gameState,
        pi,
        epsilon,
      );

      const result = applyGameAction(gameState, userId(pi), action);
      if (result.error) {
        // Should not happen with proper action enumeration
        // Skip and try end_turn
        const fallback = applyGameAction(gameState, userId(pi), {
          type: "end_turn",
        });
        if (!fallback.error) {
          gameState = fallback.state;
        }
        turns++;
        continue;
      }

      const newState = result.state;
      const reward = computeReward(prevState, newState, pi);
      const nextFeatures = extractFeatures(
        newState,
        pi,
      );

      const exp: Experience = {
        state: features,
        actionSlot: slotIndex,
        reward,
        nextState: nextFeatures,
        done: newState.isGameOver,
      };

      gameExperiences.push({ exp, playerIndex: pi });
      buffer.push(exp);
      gameState = newState;
      turns++;
      totalSteps++;

      // Train periodically
      if (
        totalSteps % TRAIN_EVERY_STEPS === 0 &&
        buffer.size >= BATCH_SIZE
      ) {
        const loss = trainOnBatch(onlineNet, targetNet, buffer, BATCH_SIZE);
        recentLoss += loss;
        recentLossCount++;
      }

      // Update target network
      if (totalSteps % TARGET_UPDATE_STEPS === 0) {
        targetNet.setWeights(onlineNet.getWeights());
      }
    }

    // Assign terminal rewards
    if (gameState.isGameOver && gameState.winner !== null) {
      recentWins[gameState.winner]++;
      for (const { exp, playerIndex } of gameExperiences) {
        if (exp.done) {
          exp.reward += playerIndex === gameState.winner ? 1.0 : -1.0;
        }
      }
    }

    recentGameLengths.push(turns);

    // Logging
    if ((game + 1) % LOG_EVERY === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const avgLen =
        recentGameLengths.reduce((s, v) => s + v, 0) /
        recentGameLengths.length;
      const avgLoss =
        recentLossCount > 0 ? (recentLoss / recentLossCount).toFixed(6) : "N/A";
      const totalW = recentWins[0] + recentWins[1];
      const p0WinPct = totalW > 0 ? ((recentWins[0] / totalW) * 100).toFixed(1) : "N/A";

      console.log(
        `Game ${(game + 1).toLocaleString().padStart(7)} | ` +
          `ε=${epsilon.toFixed(3)} | ` +
          `Loss=${avgLoss} | ` +
          `AvgTurns=${avgLen.toFixed(1)} | ` +
          `P0Win=${p0WinPct}% | ` +
          `Buffer=${buffer.size.toLocaleString()} | ` +
          `Steps=${totalSteps.toLocaleString()} | ` +
          `${elapsed}s`,
      );

      recentWins = [0, 0];
      recentLoss = 0;
      recentLossCount = 0;
      recentGameLengths = [];
    }

    // Checkpoint
    if ((game + 1) % CHECKPOINT_EVERY === 0) {
      const checkpointDir = path.join(__dirname, "..", "shared", "ai", "checkpoints");
      fs.mkdirSync(checkpointDir, { recursive: true });
      const weightsPath = path.join(checkpointDir, `weights_${game + 1}.json`);
      fs.writeFileSync(weightsPath, JSON.stringify(onlineNet.getWeights()));
      console.log(`  → Checkpoint saved: ${weightsPath}`);
    }
  }

  // ─── Evaluation ──────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Evaluating trained agent...");
  console.log("═══════════════════════════════════════════════════\n");

  const trainedWeights = onlineNet.getWeights();
  const evalGames = 1000;
  const heuristic = new HeuristicAgent();

  let rlWins = 0;
  let heuristicWins = 0;
  let draws = 0;

  for (let g = 0; g < evalGames; g++) {
    let gs = createInitialGameState([
      { userId: "rl", name: "RL" },
      { userId: "heuristic", name: "Heuristic" },
    ]);

    let t = 0;
    while (!gs.isGameOver && t < MAX_TURNS_PER_GAME) {
      const pi = gs.currentPlayer;

      if (gs.pendingNobleSelectionPlayerId) {
        const res = applyGameAction(gs, pi === 0 ? "rl" : "heuristic", {
          type: "select_noble",
          nobleIndex: 0,
        });
        if (!res.error) gs = res.state;
        continue;
      }

      let action;
      if (pi === 0) {
        // RL agent
        const features = extractFeatures(gs, 0);
        const qValues = onlineNet.forward(features);
        const valid = enumerateValidActions(gs, 0);
        const nonPass = valid.filter((a) => a.action.type !== "end_turn");
        const candidates = nonPass.length > 0 ? nonPass : valid;

        let bestQ = -Infinity;
        let bestAction = candidates[0];
        for (const va of candidates) {
          if (qValues[va.slotIndex] > bestQ) {
            bestQ = qValues[va.slotIndex];
            bestAction = va;
          }
        }
        action = bestAction.action;
      } else {
        action = heuristic.pickAction(gs, 1);
      }

      const result = applyGameAction(gs, pi === 0 ? "rl" : "heuristic", action);
      if (result.error) {
        const fb = applyGameAction(gs, pi === 0 ? "rl" : "heuristic", {
          type: "end_turn",
        });
        if (!fb.error) gs = fb.state;
      } else {
        gs = result.state;
      }
      t++;
    }

    if (gs.isGameOver && gs.winner !== null) {
      if (gs.winner === 0) rlWins++;
      else heuristicWins++;
    } else {
      draws++;
    }
  }

  console.log(`  RL vs Heuristic (${evalGames} games):`);
  console.log(`    RL wins:        ${rlWins} (${((rlWins / evalGames) * 100).toFixed(1)}%)`);
  console.log(`    Heuristic wins: ${heuristicWins} (${((heuristicWins / evalGames) * 100).toFixed(1)}%)`);
  console.log(`    Draws/timeout:  ${draws}`);

  // ─── Evaluate vs Random ────────────────────────────────────────
  let rlWinsVsRandom = 0;
  let randomWins = 0;
  let randomDraws = 0;

  for (let g = 0; g < evalGames; g++) {
    let gs = createInitialGameState([
      { userId: "rl", name: "RL" },
      { userId: "random", name: "Random" },
    ]);

    let t = 0;
    while (!gs.isGameOver && t < MAX_TURNS_PER_GAME) {
      const pi = gs.currentPlayer;

      if (gs.pendingNobleSelectionPlayerId) {
        const res = applyGameAction(gs, pi === 0 ? "rl" : "random", {
          type: "select_noble",
          nobleIndex: 0,
        });
        if (!res.error) gs = res.state;
        continue;
      }

      let action;
      if (pi === 0) {
        const features = extractFeatures(gs, 0);
        const qValues = onlineNet.forward(features);
        const valid = enumerateValidActions(gs, 0);
        const nonPass = valid.filter((a) => a.action.type !== "end_turn");
        const candidates = nonPass.length > 0 ? nonPass : valid;

        let bestQ = -Infinity;
        let bestAction = candidates[0];
        for (const va of candidates) {
          if (qValues[va.slotIndex] > bestQ) {
            bestQ = qValues[va.slotIndex];
            bestAction = va;
          }
        }
        action = bestAction.action;
      } else {
        // Random agent
        const valid = enumerateValidActions(gs, 1);
        const nonPass = valid.filter((a) => a.action.type !== "end_turn");
        const candidates = nonPass.length > 0 ? nonPass : valid;
        action = candidates[Math.floor(Math.random() * candidates.length)].action;
      }

      const result = applyGameAction(gs, pi === 0 ? "rl" : "random", action);
      if (result.error) {
        const fb = applyGameAction(gs, pi === 0 ? "rl" : "random", {
          type: "end_turn",
        });
        if (!fb.error) gs = fb.state;
      } else {
        gs = result.state;
      }
      t++;
    }

    if (gs.isGameOver && gs.winner !== null) {
      if (gs.winner === 0) rlWinsVsRandom++;
      else randomWins++;
    } else {
      randomDraws++;
    }
  }

  console.log(`\n  RL vs Random (${evalGames} games):`);
  console.log(`    RL wins:     ${rlWinsVsRandom} (${((rlWinsVsRandom / evalGames) * 100).toFixed(1)}%)`);
  console.log(`    Random wins: ${randomWins} (${((randomWins / evalGames) * 100).toFixed(1)}%)`);
  console.log(`    Draws/timeout: ${randomDraws}`);

  // ─── Save final weights ──────────────────────────────────────────
  const weightsFilePath = path.join(
    __dirname,
    "..",
    "shared",
    "ai",
    "trainedWeights.ts",
  );

  const weightsJson = JSON.stringify(trainedWeights);
  const fileContent = `import type { SerializedWeights } from "./neuralNetwork";

/**
 * Pre-trained DQN weights for the Hard difficulty RL agent.
 * Generated by scripts/train.ts — do not edit manually.
 *
 * Network architecture: [${NUM_FEATURES}, 128, 64, ${NUM_ACTION_SLOTS}]
 * Training: ${NUM_GAMES.toLocaleString()} self-play games
 * RL vs Heuristic: ${rlWins}/${evalGames} (${((rlWins / evalGames) * 100).toFixed(1)}%)
 * RL vs Random: ${rlWinsVsRandom}/${evalGames} (${((rlWinsVsRandom / evalGames) * 100).toFixed(1)}%)
 */
export const TRAINED_WEIGHTS: SerializedWeights = ${weightsJson};
`;

  fs.writeFileSync(weightsFilePath, fileContent);
  console.log(`\n  ✅ Weights saved to ${weightsFilePath}`);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  Total training time: ${totalTime}s`);
  console.log("═══════════════════════════════════════════════════\n");
};

main();
