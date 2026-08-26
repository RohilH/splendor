import { useState, useEffect, useCallback, useRef } from "react";
import { canAffordCard } from "../../../shared/game/selectors";
import type { GemType, Noble } from "../../types/game";
import { GameBoardView } from "../../components/GameBoardView";
import { useGameStore, localUserId } from "../../store/gameStore";
import { createEmptyGemSelection } from "../../store/tempGemStore";

interface LocalGameScreenProps {
  onRestart: () => void;
}

const CPU_TURN_DELAY = 600;

export const LocalGameScreen = ({ onRestart }: LocalGameScreenProps) => {
  const gameState = useGameStore((s) => s.gameState);
  const debugMode = useGameStore((s) => s.debugMode);
  const dispatch = useGameStore((s) => s.dispatch);
  const executeCpuTurn = useGameStore((s) => s.executeCpuTurn);
  const isCpuPlayer = useGameStore((s) => s.isCpuPlayer);
  const isCpuThinking = useGameStore((s) => s.isCpuThinking);

  const [selectedGems, setSelectedGems] = useState<Record<GemType, number>>(
    createEmptyGemSelection(),
  );
  const [turnKey, setTurnKey] = useState(0);
  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // CPU auto-play logic
  const runCpuTurns = useCallback(() => {
    const state = useGameStore.getState().gameState;
    if (!state || state.isGameOver) return;

    const needsCpuAction =
      useGameStore.getState().cpuPlayers.has(state.currentPlayer) ||
      (state.pendingNobleSelectionPlayerId !== null &&
        (() => {
          const pendingIdx = state.players.findIndex(
            (p) => p.userId === state.pendingNobleSelectionPlayerId,
          );
          return pendingIdx >= 0 && useGameStore.getState().cpuPlayers.has(pendingIdx);
        })());

    if (needsCpuAction) {
      cpuTimerRef.current = setTimeout(() => {
        const executed = executeCpuTurn();
        if (executed) {
          // Check if next turn is also CPU
          runCpuTurns();
        }
      }, CPU_TURN_DELAY);
    }
  }, [executeCpuTurn]);

  // Trigger CPU turns when game state changes
  useEffect(() => {
    if (!gameState || gameState.isGameOver) return;

    const currentIsCpu = isCpuPlayer(gameState.currentPlayer);
    const hasPendingNoble = gameState.pendingNobleSelectionPlayerId !== null;
    let pendingIsCpu = false;
    if (hasPendingNoble) {
      const pendingIdx = gameState.players.findIndex(
        (p) => p.userId === gameState.pendingNobleSelectionPlayerId,
      );
      pendingIsCpu = pendingIdx >= 0 && isCpuPlayer(pendingIdx);
    }

    if (currentIsCpu || pendingIsCpu) {
      runCpuTurns();
    }

    return () => {
      if (cpuTimerRef.current) {
        clearTimeout(cpuTimerRef.current);
        cpuTimerRef.current = null;
      }
    };
  }, [gameState?.currentPlayer, gameState?.stateVersion, gameState?.isGameOver, isCpuPlayer, runCpuTurns]);

  if (!gameState) return null;

  const activePlayer = gameState.players[gameState.currentPlayer];
  const hasSelectedGems = Object.values(selectedGems).some((c) => c > 0);
  const currentPlayerIsCpu = isCpuPlayer(gameState.currentPlayer);
  const interactionDisabled = gameState.isGameOver || gameState.showNobleSelection || currentPlayerIsCpu || isCpuThinking;

  const resetGemSelection = () => setSelectedGems(createEmptyGemSelection());

  const advanceTurn = () => {
    resetGemSelection();
    setTurnKey((k) => k + 1);
  };

  const handleSelectGem = (gem: GemType) => {
    if (interactionDisabled) return;
    setSelectedGems((prev) => ({ ...prev, [gem]: prev[gem] + 1 }));
  };

  const handleRemoveGem = (gem: GemType) => {
    if (interactionDisabled) return;
    setSelectedGems((prev) => ({
      ...prev,
      [gem]: Math.max(0, prev[gem] - 1),
    }));
  };

  const handleTakeGems = (): boolean => {
    if (interactionDisabled) return false;
    const error = dispatch({ type: "take_gems", gems: selectedGems });
    if (!error) {
      advanceTurn();
      return true;
    }
    return false;
  };

  const handleEndTurn = () => {
    if (interactionDisabled) return;
    dispatch({ type: "end_turn" });
    advanceTurn();
  };

  const handlePurchaseCard = (
    _card: unknown,
    cardIndex: number,
    level: 1 | 2 | 3,
  ) => {
    if (interactionDisabled) return;
    const error = dispatch({ type: "purchase_card", level, cardIndex });
    if (!error) advanceTurn();
  };

  const handleReserveCard = (
    _card: unknown,
    cardIndex: number,
    level: 1 | 2 | 3,
  ) => {
    if (interactionDisabled) return;
    const error = dispatch({ type: "reserve_card", level, cardIndex });
    if (!error) advanceTurn();
  };

  const handlePurchaseReservedCard = (cardIndex: number) => {
    if (interactionDisabled) return;
    const error = dispatch({ type: "purchase_reserved_card", cardIndex });
    if (!error) advanceTurn();
  };

  const handleSelectNoble = (noble: Noble) => {
    const nobleIndex = gameState.availableNobles.findIndex((n) => n === noble);
    if (nobleIndex >= 0) {
      dispatch({ type: "select_noble", nobleIndex });
    }
  };

  const pendingUserId = gameState.pendingNobleSelectionPlayerId;
  const isNobleSelectionActive =
    gameState.showNobleSelection &&
    pendingUserId === localUserId(gameState.currentPlayer) &&
    !currentPlayerIsCpu;

  const titleText = currentPlayerIsCpu || isCpuThinking
    ? `${activePlayer.name} is thinking...`
    : `${activePlayer.name}'s Turn`;

  return (
    <GameBoardView
      key={turnKey}
      players={gameState.players}
      currentPlayer={gameState.currentPlayer}
      gems={gameState.gems}
      visibleCards={gameState.visibleCards}
      nobles={gameState.nobles}
      availableNobles={gameState.availableNobles}
      showNobleSelection={isNobleSelectionActive}
      selectedGems={selectedGems}
      isGameOver={gameState.isGameOver}
      winner={gameState.winner}
      activePlayer={activePlayer}
      onSelectGem={handleSelectGem}
      onRemoveSelectedGem={handleRemoveGem}
      onTakeSelectedGems={handleTakeGems}
      onEndTurn={handleEndTurn}
      canAffordCard={(card) => canAffordCard(activePlayer, card, debugMode)}
      canReserveCard={
        !interactionDisabled &&
        activePlayer.reservedCards.length < 3
      }
      onPurchaseCard={handlePurchaseCard}
      onReserveCard={handleReserveCard}
      onPurchaseReservedCard={handlePurchaseReservedCard}
      canAffordReservedCard={(card) =>
        canAffordCard(activePlayer, card, debugMode)
      }
      onSelectNoble={handleSelectNoble}
      onRestart={onRestart}
      title={titleText}
      primaryActionLabel={
        hasSelectedGems ? "Take Gems & End Turn" : "End Turn"
      }
      isInteractionDisabled={interactionDisabled}
      isGemBankInteractive={!interactionDisabled}
      isCpuPlayer={(idx) => isCpuPlayer(idx)}
    />
  );
};
