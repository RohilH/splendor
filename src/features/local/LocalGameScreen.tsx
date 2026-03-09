import { useState } from "react";
import { canAffordCard } from "../../../shared/game/selectors";
import type { GemType, Noble } from "../../types/game";
import { GameBoardView } from "../../components/GameBoardView";
import { useGameStore, localUserId } from "../../store/gameStore";
import { createEmptyGemSelection } from "../../store/tempGemStore";

interface LocalGameScreenProps {
  onRestart: () => void;
}

export const LocalGameScreen = ({ onRestart }: LocalGameScreenProps) => {
  const gameState = useGameStore((s) => s.gameState);
  const debugMode = useGameStore((s) => s.debugMode);
  const dispatch = useGameStore((s) => s.dispatch);

  const [selectedGems, setSelectedGems] = useState<Record<GemType, number>>(
    createEmptyGemSelection()
  );
  const [turnKey, setTurnKey] = useState(0);

  if (!gameState) return null;

  const activePlayer = gameState.players[gameState.currentPlayer];
  const hasSelectedGems = Object.values(selectedGems).some((c) => c > 0);

  const resetGemSelection = () => setSelectedGems(createEmptyGemSelection());

  const advanceTurn = () => {
    resetGemSelection();
    setTurnKey((k) => k + 1);
  };

  const handleSelectGem = (gem: GemType) => {
    setSelectedGems((prev) => ({ ...prev, [gem]: prev[gem] + 1 }));
  };

  const handleRemoveGem = (gem: GemType) => {
    setSelectedGems((prev) => ({
      ...prev,
      [gem]: Math.max(0, prev[gem] - 1),
    }));
  };

  const handleTakeGems = (): boolean => {
    const error = dispatch({ type: "take_gems", gems: selectedGems });
    if (!error) {
      advanceTurn();
      return true;
    }
    return false;
  };

  const handleEndTurn = () => {
    dispatch({ type: "end_turn" });
    advanceTurn();
  };

  const handlePurchaseCard = (
    _card: unknown,
    cardIndex: number,
    level: 1 | 2 | 3
  ) => {
    const error = dispatch({ type: "purchase_card", level, cardIndex });
    if (!error) advanceTurn();
  };

  const handleReserveCard = (
    _card: unknown,
    cardIndex: number,
    level: 1 | 2 | 3
  ) => {
    const error = dispatch({ type: "reserve_card", level, cardIndex });
    if (!error) advanceTurn();
  };

  const handlePurchaseReservedCard = (cardIndex: number) => {
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
    pendingUserId === localUserId(gameState.currentPlayer);

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
        !gameState.isGameOver &&
        !gameState.showNobleSelection &&
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
      title={`${activePlayer.name}'s Turn`}
      primaryActionLabel={
        hasSelectedGems ? "Take Gems & End Turn" : "End Turn"
      }
      isInteractionDisabled={
        gameState.isGameOver || gameState.showNobleSelection
      }
      isGemBankInteractive={
        !gameState.isGameOver && !gameState.showNobleSelection
      }
    />
  );
};
