/**
 * DQN Training Script for Splendor RL Agent
 *
 * Trains against the heuristic agent (not self-play) so the RL agent
 * learns strategies effective against strong play.
 *
 * Usage: npx tsx scripts/train.ts
 */

import { createInitialGameState, applyGameAction } from "../shared/game/engine";
import type { GameServerState } from "../shared/game/engine";
import { calculatePlayerPoints } from "../shared/game/selectors";
import { extractFeatures } from "../shared/ai/features";
import { enumerateValidActions } from "../shared/ai/actionEnumerator";
import { NeuralNetwork } from "../shared/ai/neuralNetwork";
import { NUM_ACTION_SLOTS, NUM_FEATURES } from "../shared/ai/types";
import { HeuristicAgent } from "../shared/ai/heuristicAgent";
import { RandomAgent } from "../shared/ai/randomAgent";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Hyperparameters ───────────────────────────────────────────────
const HIDDEN_SIZE = 64;
const NUM_GAMES = 20_000;
const BUFFER_SIZE = 20_000;
const BATCH_SIZE = 16;
const LEARNING_RATE = 0.001;
const GAMMA = 0.95;
const EPSILON_START = 0.9;
const EPSILON_END = 0.05;
const EPSILON_DECAY_GAMES = 12_000;
const TARGET_UPDATE_GAMES = 100;
const TRAIN_STEPS_PER_GAME = 6;
const MIN_BUFFER = 500;
const MAX_TURNS = 200;
const LOG_EVERY = 500;

// ─── Experience replay buffer ──────────────────────────────────────
interface Experience {
  state: number[];
  actionSlot: number;
  reward: number;
  nextState: number[];
  done: boolean;
}

class ReplayBuffer {
  private buf: Experience[] = [];
  private pos = 0;
  constructor(private max: number) {}
  push(e: Experience) {
    if (this.buf.length < this.max) this.buf.push(e);
    else this.buf[this.pos] = e;
    this.pos = (this.pos + 1) % this.max;
  }
  sample(n: number): Experience[] {
    const b: Experience[] = [];
    for (let i = 0; i < n; i++)
      b.push(this.buf[Math.floor(Math.random() * this.buf.length)]);
    return b;
  }
  get size() { return this.buf.length; }
}

// ─── Helpers ───────────────────────────────────────────────────────
const uid = (i: number) => `t-${i}`;
const heuristic = new HeuristicAgent();
const random = new RandomAgent();

const createGame = () =>
  createInitialGameState([
    { userId: uid(0), name: "RL" },
    { userId: uid(1), name: "Opp" },
  ]);

// ─── Main ──────────────────────────────────────────────────────────
const main = () => {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Splendor DQN Training (vs Heuristic)");
  console.log(`  Games: ${NUM_GAMES.toLocaleString()}, Net: [${NUM_FEATURES}, ${HIDDEN_SIZE}, ${NUM_ACTION_SLOTS}]`);
  console.log("═══════════════════════════════════════════════════\n");

  const onlineNet = new NeuralNetwork([NUM_FEATURES, HIDDEN_SIZE, NUM_ACTION_SLOTS]);
  const targetNet = onlineNet.clone();
  const buffer = new ReplayBuffer(BUFFER_SIZE);

  let wins = 0, losses = 0, draws = 0;
  let totalLoss = 0, lossCount = 0;
  let totalTurns = 0;
  const t0 = Date.now();

  for (let game = 0; game < NUM_GAMES; game++) {
    const epsilon = Math.max(
      EPSILON_END,
      EPSILON_START - (EPSILON_START - EPSILON_END) * (game / EPSILON_DECAY_GAMES),
    );

    // Alternate opponent: 70% heuristic, 30% random for diversity
    const useHeuristic = Math.random() < 0.7;

    let gs = createGame();
    let turns = 0;
    let prevRlPoints = 0;

    while (!gs.isGameOver && turns < MAX_TURNS) {
      const pi = gs.currentPlayer;

      if (gs.pendingNobleSelectionPlayerId) {
        const r = applyGameAction(gs, uid(pi), { type: "select_noble", nobleIndex: 0 });
        if (!r.error) gs = r.state;
        continue;
      }

      if (pi === 0) {
        // RL agent's turn
        const features = extractFeatures(gs, 0);
        const valid = enumerateValidActions(gs, 0);
        const nonPass = valid.filter(a => a.action.type !== "end_turn");
        const candidates = nonPass.length > 0 ? nonPass : valid;

        let pick;
        if (Math.random() < epsilon) {
          // Blend: 50% random, 50% heuristic-guided exploration
          if (Math.random() < 0.5) {
            pick = candidates[Math.floor(Math.random() * candidates.length)];
          } else {
            const hAction = heuristic.pickAction(gs, 0);
            pick = candidates.find(c => 
              c.action.type === hAction.type
            ) || candidates[Math.floor(Math.random() * candidates.length)];
          }
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

        prevRlPoints = calculatePlayerPoints(gs.players[0]);
        const result = applyGameAction(gs, uid(0), pick.action);

        if (result.error) {
          const fb = applyGameAction(gs, uid(0), { type: "end_turn" });
          if (!fb.error) gs = fb.state;
          turns++;
          continue;
        }

        const newGs = result.state;
        const newPoints = calculatePlayerPoints(newGs.players[0]);
        const pointsGained = newPoints - prevRlPoints;

        // Rich reward function
        let reward = 0;
        reward += pointsGained * 0.2;
        if (newGs.players[0].purchasedCards.length > gs.players[0].purchasedCards.length) {
          reward += 0.1; // bought a card
        }
        if (newGs.players[0].nobles.length > gs.players[0].nobles.length) {
          reward += 0.3; // got a noble
        }
        if (newGs.isGameOver) {
          reward += newGs.winner === 0 ? 2.0 : -2.0;
        }

        buffer.push({
          state: features,
          actionSlot: pick.slotIndex,
          reward,
          nextState: extractFeatures(newGs, 0),
          done: newGs.isGameOver,
        });

        gs = newGs;
      } else {
        // Opponent's turn (heuristic or random)
        const action = useHeuristic
          ? heuristic.pickAction(gs, 1)
          : random.pickAction(gs, 1);
        const result = applyGameAction(gs, uid(1), action);
        if (result.error) {
          const fb = applyGameAction(gs, uid(1), { type: "end_turn" });
          if (!fb.error) gs = fb.state;
        } else {
          gs = result.state;
        }
      }
      turns++;
    }

    totalTurns += turns;
    if (gs.isGameOver && gs.winner !== null) {
      if (gs.winner === 0) wins++;
      else losses++;
    } else {
      draws++;
    }

    // Train
    if (buffer.size >= MIN_BUFFER) {
      for (let s = 0; s < TRAIN_STEPS_PER_GAME; s++) {
        const batch = buffer.sample(BATCH_SIZE);
        let bLoss = 0;
        for (const exp of batch) {
          let tq: number;
          if (exp.done) {
            tq = exp.reward;
          } else {
            const nq = targetNet.forward(exp.nextState);
            tq = exp.reward + GAMMA * Math.max(...nq);
          }
          const targets = new Map<number, number>();
          targets.set(exp.actionSlot, tq);
          bLoss += onlineNet.trainStep(exp.state, targets, LEARNING_RATE);
        }
        totalLoss += bLoss / BATCH_SIZE;
        lossCount++;
      }
    }

    if ((game + 1) % TARGET_UPDATE_GAMES === 0) {
      targetNet.setWeights(onlineNet.getWeights());
    }

    if ((game + 1) % LOG_EVERY === 0) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      const avgTurns = (totalTurns / LOG_EVERY).toFixed(0);
      const avgLoss = lossCount > 0 ? (totalLoss / lossCount).toFixed(4) : "N/A";
      const winRate = ((wins / (wins + losses + draws)) * 100).toFixed(1);

      console.log(
        `G ${String(game + 1).padStart(5)} | ε=${epsilon.toFixed(3)} | ` +
        `Loss=${avgLoss.padStart(8)} | Turns=${avgTurns.padStart(3)} | ` +
        `Win=${winRate.padStart(5)}% (${wins}W/${losses}L/${draws}D) | ${elapsed}s`,
      );
      wins = losses = draws = 0;
      totalLoss = lossCount = 0;
      totalTurns = 0;
    }
  }

  // ─── Evaluation ──────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Evaluating...");
  console.log("═══════════════════════════════════════════════════\n");

  const trainedWeights = onlineNet.getWeights();
  const N = 300;

  const evaluate = (
    oppName: string,
    oppPlay: (gs: GameServerState) => ReturnType<typeof enumerateValidActions>[number]["action"],
  ) => {
    let rlW = 0, oppW = 0;
    for (let g = 0; g < N; g++) {
      let gs = createInitialGameState([
        { userId: "rl", name: "RL" },
        { userId: "opp", name: oppName },
      ]);
      let t = 0;
      while (!gs.isGameOver && t < MAX_TURNS) {
        const pi = gs.currentPlayer;
        const aid = pi === 0 ? "rl" : "opp";
        if (gs.pendingNobleSelectionPlayerId) {
          const r = applyGameAction(gs, aid, { type: "select_noble", nobleIndex: 0 });
          if (!r.error) gs = r.state;
          continue;
        }
        let action;
        if (pi === 0) {
          const feat = extractFeatures(gs, 0);
          const q = onlineNet.forward(feat);
          const valid = enumerateValidActions(gs, 0);
          const np = valid.filter(a => a.action.type !== "end_turn");
          const cands = np.length > 0 ? np : valid;
          let bQ = -Infinity, bA = cands[0];
          for (const v of cands) { if (q[v.slotIndex] > bQ) { bQ = q[v.slotIndex]; bA = v; } }
          action = bA.action;
        } else {
          action = oppPlay(gs);
        }
        const r = applyGameAction(gs, aid, action);
        if (r.error) {
          const fb = applyGameAction(gs, aid, { type: "end_turn" });
          if (!fb.error) gs = fb.state;
        } else gs = r.state;
        t++;
      }
      if (gs.isGameOver && gs.winner !== null) {
        if (gs.winner === 0) rlW++; else oppW++;
      }
    }
    console.log(`  RL vs ${oppName} (${N} games): RL=${rlW} (${((rlW / N) * 100).toFixed(1)}%), Opp=${oppW} (${((oppW / N) * 100).toFixed(1)}%)`);
    return { rlW, oppW };
  };

  const rr = evaluate("Random", gs => random.pickAction(gs, 1));
  const hr = evaluate("Heuristic", gs => heuristic.pickAction(gs, 1));

  // Save weights
  const wp = path.join(__dirname, "..", "shared", "ai", "trainedWeights.ts");
  fs.writeFileSync(wp, `import type { SerializedWeights } from "./neuralNetwork";

/**
 * Pre-trained DQN weights for the Hard difficulty RL agent.
 * Generated by scripts/train.ts — do not edit manually.
 *
 * Network: [${NUM_FEATURES}, ${HIDDEN_SIZE}, ${NUM_ACTION_SLOTS}]
 * Training: ${NUM_GAMES.toLocaleString()} games vs heuristic/random mix
 * RL vs Random: ${rr.rlW}/${N} (${((rr.rlW / N) * 100).toFixed(1)}%)
 * RL vs Heuristic: ${hr.rlW}/${N} (${((hr.rlW / N) * 100).toFixed(1)}%)
 */
export const TRAINED_WEIGHTS: SerializedWeights = ${JSON.stringify(trainedWeights)};
`);

  console.log(`\n  ✅ Weights saved`);
  console.log(`  Total: ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log("═══════════════════════════════════════════════════\n");
};

main();
