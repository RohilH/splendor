/**
 * Tabular Q-learning training for the Splendor "Hard" CPU.
 *
 * Classic Q-learning over the abstracted state space (shared/ai/stateAbstraction.ts)
 * and the 14 abstract action classes (shared/ai/qActions.ts):
 *
 *   Q(s,a) += α · (r + γ · max_{a' ∈ valid(s')} Q(s',a') − Q(s,a))
 *
 * Curriculum: the first 15% of games are played against a random opponent to
 * learn the basics; after that each game is 50% self-play (both seats ε-greedy
 * on the shared table, both writing updates), 35% vs the heuristic agent, and
 * 15% vs random. The learner seat alternates every game.
 *
 * Usage:
 *   npm run train:q                        # 150k games → shared/ai/qtable.json
 *   npx tsx scripts/trainQ.ts --games 5000 --eval 100 --out /tmp/qtable.json
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  createInitialGameState,
  applyGameAction,
} from "../shared/game/engine";
import type { GameServerState } from "../shared/game/engine";
import { calculatePlayerPoints } from "../shared/game/selectors";
import type { AiAgent } from "../shared/ai/types";
import { RandomAgent } from "../shared/ai/randomAgent";
import { HeuristicAgent } from "../shared/ai/heuristicAgent";
import { QLearningAgent } from "../shared/ai/qLearningAgent";
import { QTable } from "../shared/ai/qTable";
import { encodeStateKey } from "../shared/ai/stateAbstraction";
import { enumerateQActions, Q_SLOT } from "../shared/ai/qActions";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Hyperparameters ───────────────────────────────────────────────
const GAMMA = 0.98;
const EPSILON_START = 0.25;
const EPSILON_END = 0.02;
const EPSILON_DECAY_FRACTION = 0.6; // linear decay over first 60% of games
const MAX_PLIES = 300;
const RANDOM_ONLY_FRACTION = 0.15; // opening curriculum
const SELF_PLAY_SHARE = 0.5;
const HEURISTIC_SHARE = 0.35; // remainder is vs random

// Reward shaping — deliberately small next to the ±1 terminal reward.
const TERMINAL_WIN = 1;
const TERMINAL_LOSS = -1;
const TERMINAL_TIMEOUT = -0.2;
const SHAPE_PER_POINT = 0.02;
const SHAPE_PER_CARD = 0.01;
const SHAPE_PER_NOBLE = 0.05;
const SHAPE_STEP_COST = -0.001;

const LOG_EVERY = 5_000;
const CHECKPOINT_EVERY = 25_000;

// ─── CLI ───────────────────────────────────────────────────────────
const argValue = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const NUM_GAMES = Number(argValue("--games") ?? 150_000);
const EVAL_GAMES = Number(argValue("--eval") ?? 200);
const OUT_PATH =
  argValue("--out") ?? path.join(__dirname, "..", "shared", "ai", "qtable.json");
const CHECKPOINT_DIR = path.join(__dirname, "..", "shared", "ai", "checkpoints");

// ─── Helpers ───────────────────────────────────────────────────────
const uid = (i: number) => `q-${i}`;

const createGame = (): GameServerState =>
  createInitialGameState([
    { userId: uid(0), name: "P0" },
    { userId: uid(1), name: "P1" },
  ]);

interface PlayerSnapshot {
  points: number;
  cards: number;
  nobles: number;
}

const snapshot = (gs: GameServerState, seat: number): PlayerSnapshot => ({
  points: calculatePlayerPoints(gs.players[seat]),
  cards: gs.players[seat].purchasedCards.length,
  nobles: gs.players[seat].nobles.length,
});

const shapingReward = (
  before: PlayerSnapshot,
  after: PlayerSnapshot,
): number =>
  SHAPE_PER_POINT * (after.points - before.points) +
  SHAPE_PER_CARD * (after.cards - before.cards) +
  SHAPE_PER_NOBLE * (after.nobles - before.nobles) +
  SHAPE_STEP_COST;

interface PendingTransition {
  key: number;
  slot: number;
  reward: number;
}

/**
 * One training game. `learnerSeats` play ε-greedy from the shared table and
 * write updates; other seats are driven by `opponent`. A learner transition
 * spans from one of its decision points to its next one (opponent moves are
 * folded into the environment).
 */
const playTrainingGame = (
  table: QTable,
  opponent: AiAgent | null,
  learnerSeats: number[],
  epsilon: number,
): { winner: number | null; plies: number; timedOut: boolean } => {
  let gs = createGame();
  let plies = 0;
  const pending = new Map<number, PendingTransition>();
  const isLearner = (seat: number) => learnerSeats.includes(seat);

  while (!gs.isGameOver && plies < MAX_PLIES) {
    // Forced noble picks resolve outside the Q decision loop; their value
    // reaches the learner through the point/noble shaping diff below.
    if (gs.pendingNobleSelectionPlayerId) {
      const seat = gs.players.findIndex(
        (p) => p.userId === gs.pendingNobleSelectionPlayerId,
      );
      const before = snapshot(gs, seat);
      const result = applyGameAction(gs, gs.pendingNobleSelectionPlayerId, {
        type: "select_noble",
        nobleIndex: 0,
      });
      if (result.error) break;
      gs = result.state;
      const transition = pending.get(seat);
      if (transition) {
        transition.reward +=
          shapingReward(before, snapshot(gs, seat)) - SHAPE_STEP_COST;
      }
      continue;
    }

    const seat = gs.currentPlayer;

    if (isLearner(seat)) {
      const qActions = enumerateQActions(gs, seat);
      const key = encodeStateKey(gs, seat);
      const validSlots = qActions.map((qa) => qa.qSlot);

      // Arriving at this seat's next decision point closes out its previous
      // transition with a bootstrapped target.
      const previous = pending.get(seat);
      if (previous) {
        table.update(
          previous.key,
          previous.slot,
          previous.reward,
          key,
          validSlots,
          false,
          GAMMA,
        );
        pending.delete(seat);
      }

      let chosen =
        Math.random() < epsilon
          ? qActions[Math.floor(Math.random() * qActions.length)]
          : qActions.find(
              (qa) => qa.qSlot === table.bestValid(key, validSlots).slot,
            ) ?? qActions[qActions.length - 1];

      const before = snapshot(gs, seat);
      let result = applyGameAction(gs, uid(seat), chosen.action);
      if (result.error) {
        // enumerateQActions only emits legal moves, so this is a safety net.
        chosen = { qSlot: Q_SLOT.endTurn, action: { type: "end_turn" } };
        result = applyGameAction(gs, uid(seat), chosen.action);
        if (result.error) break;
      }
      gs = result.state;

      pending.set(seat, {
        key,
        slot: chosen.qSlot,
        reward: shapingReward(before, snapshot(gs, seat)),
      });
    } else {
      const action = opponent!.pickAction(gs, seat);
      let result = applyGameAction(gs, uid(seat), action);
      if (result.error) {
        result = applyGameAction(gs, uid(seat), { type: "end_turn" });
        if (result.error) break;
      }
      gs = result.state;
    }

    plies += 1;
  }

  const timedOut = !gs.isGameOver;
  for (const seat of learnerSeats) {
    const transition = pending.get(seat);
    if (!transition) continue;
    const outcome = timedOut
      ? TERMINAL_TIMEOUT
      : gs.winner === seat
        ? TERMINAL_WIN
        : TERMINAL_LOSS;
    table.update(
      transition.key,
      transition.slot,
      transition.reward + outcome,
      null,
      [],
      true,
      GAMMA,
    );
  }

  table.games += 1;
  return { winner: gs.isGameOver ? gs.winner : null, plies, timedOut };
};

/** Greedy (no exploration, no updates) evaluation game. Returns the winner. */
const playEvalGame = (agent0: AiAgent, agent1: AiAgent): number | null => {
  let gs = createGame();
  let plies = 0;

  while (!gs.isGameOver && plies < MAX_PLIES) {
    if (gs.pendingNobleSelectionPlayerId) {
      const result = applyGameAction(gs, gs.pendingNobleSelectionPlayerId, {
        type: "select_noble",
        nobleIndex: 0,
      });
      if (result.error) break;
      gs = result.state;
      continue;
    }

    const seat = gs.currentPlayer;
    const agent = seat === 0 ? agent0 : agent1;
    let result = applyGameAction(gs, uid(seat), agent.pickAction(gs, seat));
    if (result.error) {
      result = applyGameAction(gs, uid(seat), { type: "end_turn" });
      if (result.error) break;
    }
    gs = result.state;
    plies += 1;
  }

  return gs.isGameOver ? gs.winner : null;
};

const evaluate = (
  table: QTable,
  opponent: AiAgent,
  games: number,
): number => {
  const learner = new QLearningAgent(table);
  let wins = 0;
  for (let i = 0; i < games; i += 1) {
    // Alternate seats to cancel first-mover advantage.
    const learnerSeat = i % 2;
    const winner =
      learnerSeat === 0
        ? playEvalGame(learner, opponent)
        : playEvalGame(opponent, learner);
    if (winner === learnerSeat) wins += 1;
  }
  return wins / games;
};

const writeTable = (table: QTable, filePath: string): number => {
  const serialized = table.serialize({ minVisits: 3, round: 3 });
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(serialized));
  return Object.keys(serialized.entries).length;
};

// ─── Main ──────────────────────────────────────────────────────────
const main = () => {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Splendor tabular Q-learning");
  console.log(
    `  Games: ${NUM_GAMES.toLocaleString()}  γ=${GAMMA}  ε: ${EPSILON_START}→${EPSILON_END}`,
  );
  console.log(`  Output: ${OUT_PATH}`);
  console.log("═══════════════════════════════════════════════════\n");

  const table = new QTable();
  const randomAgent = new RandomAgent();
  const heuristicAgent = new HeuristicAgent();

  let timeouts = 0;
  let totalPlies = 0;
  const startedAt = Date.now();

  for (let game = 0; game < NUM_GAMES; game += 1) {
    const progress = game / NUM_GAMES;
    const epsilon = Math.max(
      EPSILON_END,
      EPSILON_START -
        (EPSILON_START - EPSILON_END) * (progress / EPSILON_DECAY_FRACTION),
    );

    let outcome: { plies: number; timedOut: boolean };
    if (progress < RANDOM_ONLY_FRACTION) {
      outcome = playTrainingGame(table, randomAgent, [game % 2], epsilon);
    } else {
      const roll = Math.random();
      if (roll < SELF_PLAY_SHARE) {
        outcome = playTrainingGame(table, null, [0, 1], epsilon);
      } else if (roll < SELF_PLAY_SHARE + HEURISTIC_SHARE) {
        outcome = playTrainingGame(table, heuristicAgent, [game % 2], epsilon);
      } else {
        outcome = playTrainingGame(table, randomAgent, [game % 2], epsilon);
      }
    }

    totalPlies += outcome.plies;
    if (outcome.timedOut) timeouts += 1;

    if ((game + 1) % LOG_EVERY === 0) {
      const elapsed = (Date.now() - startedAt) / 1000;
      const vsRandom = evaluate(table, randomAgent, EVAL_GAMES);
      const vsHeuristic = evaluate(table, heuristicAgent, EVAL_GAMES);
      console.log(
        `[${(game + 1).toLocaleString().padStart(9)}] ` +
          `ε=${epsilon.toFixed(3)}  states=${table.size.toLocaleString()}  ` +
          `win vs random=${(vsRandom * 100).toFixed(1)}%  ` +
          `vs heuristic=${(vsHeuristic * 100).toFixed(1)}%  ` +
          `avg plies=${(totalPlies / (game + 1)).toFixed(1)}  ` +
          `timeouts=${timeouts}  ` +
          `${((game + 1) / elapsed).toFixed(1)} games/s`,
      );
    }

    if ((game + 1) % CHECKPOINT_EVERY === 0 && game + 1 < NUM_GAMES) {
      const checkpointPath = path.join(
        CHECKPOINT_DIR,
        `qtable-${game + 1}.json`,
      );
      const kept = writeTable(table, checkpointPath);
      console.log(`  ↳ checkpoint ${checkpointPath} (${kept.toLocaleString()} entries)`);
    }
  }

  console.log("\nFinal evaluation (500 games each)…");
  const vsRandom = evaluate(table, randomAgent, 500);
  const vsHeuristic = evaluate(table, heuristicAgent, 500);
  console.log(`  vs random:    ${(vsRandom * 100).toFixed(1)}%`);
  console.log(`  vs heuristic: ${(vsHeuristic * 100).toFixed(1)}%`);

  const kept = writeTable(table, OUT_PATH);
  const sizeMb = fs.statSync(OUT_PATH).size / (1024 * 1024);
  console.log(
    `\nWrote ${OUT_PATH}: ${kept.toLocaleString()} entries ` +
      `(of ${table.size.toLocaleString()} visited states), ${sizeMb.toFixed(2)} MB`,
  );
};

main();
