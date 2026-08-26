import { create } from "zustand";
import {
  createInitialGameState,
  applyGameAction,
} from "../../shared/game/engine";
import type { GameServerState } from "../../shared/game/engine";
import type { OnlineGameAction } from "../../shared/game/actions";
import { createAgent, type AiAgent, type AiDifficulty } from "../../shared/ai";

const localUserId = (index: number): string => `local-${index}`;

interface CpuConfig {
  playerIndex: number;
  difficulty: AiDifficulty;
}

interface LocalGameStore {
  gameState: GameServerState | null;
  debugMode: boolean;
  cpuPlayers: Map<number, AiAgent>;
  cpuDifficulties: Map<number, AiDifficulty>;
  isCpuThinking: boolean;

  initializeGame: (
    numPlayers: number,
    playerNames: string[],
    debugMode?: boolean,
    cpuConfig?: CpuConfig[],
  ) => void;

  dispatch: (action: OnlineGameAction) => string | undefined;

  executeCpuTurn: () => boolean;

  isCpuPlayer: (playerIndex: number) => boolean;

  reset: () => void;
}

export const useGameStore = create<LocalGameStore>((set, get) => ({
  gameState: null,
  debugMode: false,
  cpuPlayers: new Map(),
  cpuDifficulties: new Map(),
  isCpuThinking: false,

  initializeGame: (_numPlayers, playerNames, debugMode = false, cpuConfig = []) => {
    const players = playerNames.map((name, index) => ({
      userId: localUserId(index),
      name,
    }));
    const gameState = createInitialGameState(players, debugMode);

    const cpuPlayers = new Map<number, AiAgent>();
    const cpuDifficulties = new Map<number, AiDifficulty>();
    for (const cfg of cpuConfig) {
      cpuPlayers.set(cfg.playerIndex, createAgent(cfg.difficulty));
      cpuDifficulties.set(cfg.playerIndex, cfg.difficulty);
    }

    set({ gameState, debugMode, cpuPlayers, cpuDifficulties });
  },

  dispatch: (action) => {
    const { gameState } = get();
    if (!gameState) return "No active game.";

    const actorUserId = localUserId(gameState.currentPlayer);
    const result = applyGameAction(gameState, actorUserId, action);

    if (result.error) return result.error;
    set({ gameState: result.state });
    return undefined;
  },

  executeCpuTurn: () => {
    const { gameState, cpuPlayers } = get();
    if (!gameState || gameState.isGameOver) return false;

    const pi = gameState.currentPlayer;

    // Handle pending noble selection for CPU
    if (gameState.pendingNobleSelectionPlayerId) {
      const pendingPlayerIndex = gameState.players.findIndex(
        (p) => p.userId === gameState.pendingNobleSelectionPlayerId,
      );
      if (pendingPlayerIndex >= 0 && cpuPlayers.has(pendingPlayerIndex)) {
        set({ isCpuThinking: true });
        // Select first available noble (simple but effective)
        const result = applyGameAction(
          gameState,
          gameState.pendingNobleSelectionPlayerId,
          { type: "select_noble", nobleIndex: 0 },
        );
        if (!result.error) {
          set({ gameState: result.state, isCpuThinking: false });
          return true;
        }
        set({ isCpuThinking: false });
      }
      return false;
    }

    const agent = cpuPlayers.get(pi);
    if (!agent) return false;

    set({ isCpuThinking: true });
    const action = agent.pickAction(gameState, pi);
    const actorUserId = localUserId(pi);
    const result = applyGameAction(gameState, actorUserId, action);

    if (result.error) {
      // Fallback to end_turn
      const fallback = applyGameAction(gameState, actorUserId, { type: "end_turn" });
      if (!fallback.error) {
        set({ gameState: fallback.state, isCpuThinking: false });
        return true;
      }
      set({ isCpuThinking: false });
      return false;
    }

    set({ gameState: result.state, isCpuThinking: false });
    return true;
  },

  isCpuPlayer: (playerIndex: number) => {
    return get().cpuPlayers.has(playerIndex);
  },

  reset: () =>
    set({
      gameState: null,
      debugMode: false,
      cpuPlayers: new Map(),
      cpuDifficulties: new Map(),
      isCpuThinking: false,
    }),
}));

export { localUserId };
export type { CpuConfig };
