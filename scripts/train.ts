/**
 * DQN Training Script for Splendor RL Agent
 *
 * Trains a neural network via self-play using Deep Q-Learning.
 * Optimized for speed: smaller network, efficient training loop.
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
const HIDDEN_SIZE = 64;
const NUM_GAMES = 30_000;
const BUFFER_SIZE = 20_000;
const BATCH_SIZE = 16;
const LEARNING_RATE = 0.001;
const GAMMA = 0.95;
const EPSILON_START = 1.0;
const EPSILON_END = 0.08;
const EPSILON_DECAY_GAMES = 20_000;
const TARGET_UPDATE_GAMES = 200;
const TRAIN_EVERY_GAMES = 1; // train after every game
const TRAIN_STEPS_PER_GAME = 8; // number of batch samples per game
const MIN_BUFFER_TO_TRAIN = 500;
const MAX_TURNS_PER_GAME = 200;
const LOG_EVERY = 1_000;
const CHECKPOINT_EVERY = 10_000;

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
      batch.push(this.buffer[Math.floor(Math.random() * this.buffer.length)]);
    }
    return batch;
  }

  get size(): number {
    return this.buffer.length;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

const uid = (i: number): string => `t-${i}`;

const createGame = (): GameServerState =>
  createInitialGameState([
    { userId: uid(0), name: "A0" },
    { userId: uid(1), name: "A1" },
  ]);

// ─── Main training loop ────────────────────────────────────────────

const main = () => {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Splendor DQN Training");
  console.log(`  Games: ${NUM_GAMES.toLocaleString()}`);
  console.log(`  Network: [${NUM_FEATURES}, ${HIDDEN_SIZE}, ${NUM_ACTION_SLOTS}]`);
  console.log("═══════════════════════════════════════════════════\n");

  // Smaller network: just one hidden layer for speed
  const onlineNet = new NeuralNetwork([NUM_FEATURES, HIDDEN_SIZE, NUM_ACTION_SLOTS]);
  const targetNet = onlineNet.clone();
  const buffer = new ReplayBuffer(BUFFER_SIZE);

  let recentWins = [0, 0];
  let recentLoss = 0;
  let recentLossCount = 0;
  let recentTurns = 0;
  let recentGames = 0;

  const startTime = Date.now();

  for (let game = 0; game < NUM_GAMES; game++) {
    const epsilon = Math.max(
      EPSILON_END,
      EPSILON_START - (EPSILON_START - EPSILON_END) * (game / EPSILON_DECAY_GAMES),
    );

    let gs = createGame();
    let turns = 0;

    while (!gs.isGameOver && turns < MAX_TURNS_PER_GAME) {
      const pi = gs.currentPlayer;

      if (gs.pendingNobleSelectionPlayerId) {
        const r = applyGameAction(gs, uid(pi), { type: "select_noble", nobleIndex: 0 });
        if (!r.error) gs = r.state;
        continue;
      }

      const features = extractFeatures(gs, pi);
      const validActions = enumerateValidActions(gs, pi);
      const nonPass = validActions.filter((a) => a.action.type !== "end_turn");
      const candidates = nonPass.length > 0 ? nonPass : validActions;

      // Epsilon-greedy
      let pick;
      if (Math.random() < epsilon) {
        pick = candidates[Math.floor(Math.random() * candidates.length)];
      } else {
        const qValues = onlineNet.forward(features);
        let bestQ = -Infinity;
        pick = candidates[0];
        for (const va of candidates) {
          if (qValues[va.slotIndex] > bestQ) {
            bestQ = qValues[va.slotIndex];
            pick = va;
          }
        }
      }

      const prevPoints = calculatePlayerPoints(gs.players[pi]);
      const result = applyGameAction(gs, uid(pi), pick.action);

      if (result.error) {
        const fb = applyGameAction(gs, uid(pi), { type: "end_turn" });
        if (!fb.error) gs = fb.state;
        turns++;
        continue;
      }

      const newGs = result.state;
      const newPoints = calculatePlayerPoints(newGs.players[pi]);

      let reward = (newPoints - prevPoints) * 0.15;
      if (newGs.players[pi].purchasedCards.length > gs.players[pi].purchasedCards.length) {
        reward += 0.05;
      }
      if (newGs.isGameOver) {
        reward += newGs.winner === pi ? 1.0 : -1.0;
      }

      buffer.push({
        state: features,
        actionSlot: pick.slotIndex,
        reward,
        nextState: extractFeatures(newGs, pi),
        done: newGs.isGameOver,
      });

      gs = newGs;
      turns++;
    }

    if (gs.isGameOver && gs.winner !== null) {
      recentWins[gs.winner]++;
    }
    recentTurns += turns;
    recentGames++;

    // Train after each game
    if (game % TRAIN_EVERY_GAMES === 0 && buffer.size >= MIN_BUFFER_TO_TRAIN) {
      for (let s = 0; s < TRAIN_STEPS_PER_GAME; s++) {
        const batch = buffer.sample(BATCH_SIZE);
        let batchLoss = 0;

        for (const exp of batch) {
          let targetQ: number;
          if (exp.done) {
            targetQ = exp.reward;
          } else {
            const nextQ = targetNet.forward(exp.nextState);
            targetQ = exp.reward + GAMMA * Math.max(...nextQ);
          }
          const targets = new Map<number, number>();
          targets.set(exp.actionSlot, targetQ);
          batchLoss += onlineNet.trainStep(exp.state, targets, LEARNING_RATE);
        }
        recentLoss += batchLoss / BATCH_SIZE;
        recentLossCount++;
      }
    }

    // Update target network
    if ((game + 1) % TARGET_UPDATE_GAMES === 0) {
      targetNet.setWeights(onlineNet.getWeights());
    }

    // Logging
    if ((game + 1) % LOG_EVERY === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const avgLen = recentGames > 0 ? (recentTurns / recentGames).toFixed(0) : "0";
      const avgLoss = recentLossCount > 0 ? (recentLoss / recentLossCount).toFixed(4) : "N/A";
      const totalW = recentWins[0] + recentWins[1];
      const p0 = totalW > 0 ? ((recentWins[0] / totalW) * 100).toFixed(1) : "N/A";

      console.log(
        `G ${String(game + 1).padStart(6)} | ε=${epsilon.toFixed(3)} | ` +
        `Loss=${avgLoss.padStart(8)} | Turns=${avgLen.padStart(3)} | ` +
        `P0=${p0.padStart(5)}% | Buf=${buffer.size} | ${elapsed}s`,
      );

      recentWins = [0, 0];
      recentLoss = 0;
      recentLossCount = 0;
      recentTurns = 0;
      recentGames = 0;
    }

    if ((game + 1) % CHECKPOINT_EVERY === 0) {
      const dir = path.join(__dirname, "..", "shared", "ai", "checkpoints");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, `weights_${game + 1}.json`),
        JSON.stringify(onlineNet.getWeights()),
      );
      console.log(`  → Checkpoint saved`);
    }
  }

  // ─── Evaluation ──────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Evaluating...");
  console.log("═══════════════════════════════════════════════════\n");

  const trainedWeights = onlineNet.getWeights();
  const evalGames = 500;
  const heuristic = new HeuristicAgent();

  const evaluate = (
    oppName: string,
    oppPlay: (gs: GameServerState) => ReturnType<typeof enumerateValidActions>[number]["action"],
  ) => {
    let rlW = 0, oppW = 0, draw = 0;

    for (let g = 0; g < evalGames; g++) {
      let gs = createInitialGameState([
        { userId: "rl", name: "RL" },
        { userId: "opp", name: oppName },
      ]);
      let t = 0;

      while (!gs.isGameOver && t < MAX_TURNS_PER_GAME) {
        const pi = gs.currentPlayer;
        const actorId = pi === 0 ? "rl" : "opp";

        if (gs.pendingNobleSelectionPlayerId) {
          const r = applyGameAction(gs, actorId, { type: "select_noble", nobleIndex: 0 });
          if (!r.error) gs = r.state;
          continue;
        }

        let action;
        if (pi === 0) {
          const features = extractFeatures(gs, 0);
          const qValues = onlineNet.forward(features);
          const valid = enumerateValidActions(gs, 0);
          const nonPass = valid.filter((a) => a.action.type !== "end_turn");
          const cands = nonPass.length > 0 ? nonPass : valid;
          let bestQ = -Infinity, bestA = cands[0];
          for (const va of cands) {
            if (qValues[va.slotIndex] > bestQ) { bestQ = qValues[va.slotIndex]; bestA = va; }
          }
          action = bestA.action;
        } else {
          action = oppPlay(gs);
        }

        const result = applyGameAction(gs, actorId, action);
        if (result.error) {
          const fb = applyGameAction(gs, actorId, { type: "end_turn" });
          if (!fb.error) gs = fb.state;
        } else {
          gs = result.state;
        }
        t++;
      }

      if (gs.isGameOver && gs.winner !== null) {
        if (gs.winner === 0) rlW++; else oppW++;
      } else {
        draw++;
      }
    }

    console.log(`  RL vs ${oppName} (${evalGames} games): RL=${rlW} (${((rlW / evalGames) * 100).toFixed(1)}%), Opp=${oppW} (${((oppW / evalGames) * 100).toFixed(1)}%)${draw > 0 ? `, Draws=${draw}` : ""}`);
    return { rlW, oppW };
  };

  const randomResult = evaluate("Random", (gs) => {
    const valid = enumerateValidActions(gs, 1);
    const np = valid.filter((a) => a.action.type !== "end_turn");
    const c = np.length > 0 ? np : valid;
    return c[Math.floor(Math.random() * c.length)].action;
  });

  const heuristicResult = evaluate("Heuristic", (gs) => heuristic.pickAction(gs, 1));

  // ─── Save final weights ──────────────────────────────────────────
  const weightsFilePath = path.join(__dirname, "..", "shared", "ai", "trainedWeights.ts");
  const fileContent = `import type { SerializedWeights } from "./neuralNetwork";

/**
 * Pre-trained DQN weights for the Hard difficulty RL agent.
 * Generated by scripts/train.ts — do not edit manually.
 *
 * Network: [${NUM_FEATURES}, ${HIDDEN_SIZE}, ${NUM_ACTION_SLOTS}]
 * Training: ${NUM_GAMES.toLocaleString()} self-play games
 * RL vs Random: ${randomResult.rlW}/${evalGames} (${((randomResult.rlW / evalGames) * 100).toFixed(1)}%)
 * RL vs Heuristic: ${heuristicResult.rlW}/${evalGames} (${((heuristicResult.rlW / evalGames) * 100).toFixed(1)}%)
 */
export const TRAINED_WEIGHTS: SerializedWeights = ${JSON.stringify(trainedWeights)};
`;

  fs.writeFileSync(weightsFilePath, fileContent);
  console.log(`\n  ✅ Weights saved to shared/ai/trainedWeights.ts`);
  console.log(`  Total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log("═══════════════════════════════════════════════════\n");
};

main();
