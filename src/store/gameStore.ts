import { create } from "zustand";
import {
  createInitialGameState,
  applyGameAction,
} from "../../shared/game/engine";
import type { GameServerState } from "../../shared/game/engine";
import type { OnlineGameAction } from "../../shared/game/actions";

const localUserId = (index: number): string => `local-${index}`;

interface LocalGameStore {
  gameState: GameServerState | null;
  debugMode: boolean;

  initializeGame: (
    numPlayers: number,
    playerNames: string[],
    debugMode?: boolean
  ) => void;

  dispatch: (action: OnlineGameAction) => string | undefined;

  reset: () => void;
}

export const useGameStore = create<LocalGameStore>((set, get) => ({
  gameState: null,
  debugMode: false,

  initializeGame: (_numPlayers, playerNames, debugMode = false) => {
    const players = playerNames.map((name, index) => ({
      userId: localUserId(index),
      name,
    }));
    const gameState = createInitialGameState(players, debugMode);
    set({ gameState, debugMode });
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

  reset: () => set({ gameState: null, debugMode: false }),
}));

export { localUserId };
