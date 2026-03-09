import { Alert, AlertDescription, AlertIcon } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import {
  canAffordCard,
  calculatePlayerPoints,
} from "../../../shared/game/selectors";
import type {
  GamePublicState,
  GemType,
  OnlineGameAction,
} from "../../../shared/onlineTypes";
import { GameBoardView } from "../../components/GameBoardView";
import { createEmptyGemSelection } from "../../store/tempGemStore";

interface OnlineGameScreenProps {
  userId: string;
  gameState: GamePublicState;
  sendGameAction: (action: OnlineGameAction) => void;
  onLeaveGame: () => void;
}

export const OnlineGameScreen = ({
  userId,
  gameState,
  sendGameAction,
  onLeaveGame,
}: OnlineGameScreenProps) => {
  const [selectedGems, setSelectedGems] = useState<Record<GemType, number>>(
    createEmptyGemSelection()
  );

  const myPlayer = useMemo(
    () => gameState.players.find((player) => player.userId === userId) ?? null,
    [gameState.players, userId]
  );

  const isMyTurn = Boolean(
    gameState.players[gameState.currentPlayer]?.userId === userId &&
      !gameState.pendingNobleSelectionPlayerId
  );
  const isMyNobleSelection = Boolean(
    gameState.showNobleSelection &&
      gameState.pendingNobleSelectionPlayerId === userId
  );
  const currentPlayer = gameState.players[gameState.currentPlayer] ?? null;
  const hasSelectedGems = Object.values(selectedGems).some(
    (count) => count > 0
  );

  useEffect(() => {
    setSelectedGems(createEmptyGemSelection());
  }, [gameState.stateVersion, gameState.pendingNobleSelectionPlayerId, userId]);

  const handleGemAdjust = (gem: GemType, delta: number): void => {
    setSelectedGems((current) => {
      const next = Math.max(0, (current[gem] || 0) + delta);
      return { ...current, [gem]: next };
    });
  };

  const resetGemSelection = (): void => {
    setSelectedGems(createEmptyGemSelection());
  };

  const submitTakeGems = (): boolean => {
    if (!isMyTurn) return false;
    sendGameAction({ type: "take_gems", gems: selectedGems });
    resetGemSelection();
    return true;
  };

  if (!myPlayer) return null;

  const infoAlert =
    gameState.pendingNobleSelectionPlayerId &&
    !isMyNobleSelection &&
    currentPlayer ? (
      <Alert status="info" mb={4} borderRadius="lg">
        <AlertIcon />
        <AlertDescription>
          Waiting for {currentPlayer.name} to choose a noble.
        </AlertDescription>
      </Alert>
    ) : undefined;

  return (
    <GameBoardView
      players={gameState.players}
      currentPlayer={gameState.currentPlayer}
      gems={gameState.gems}
      visibleCards={gameState.visibleCards}
      nobles={gameState.nobles}
      availableNobles={gameState.availableNobles}
      showNobleSelection={isMyNobleSelection}
      selectedGems={selectedGems}
      isGameOver={gameState.isGameOver}
      winner={gameState.winner}
      activePlayer={myPlayer}
      onSelectGem={(gem) => handleGemAdjust(gem, 1)}
      onRemoveSelectedGem={(gem) => handleGemAdjust(gem, -1)}
      onTakeSelectedGems={submitTakeGems}
      onEndTurn={() => sendGameAction({ type: "end_turn" })}
      canAffordCard={(card) =>
        Boolean(myPlayer && isMyTurn && canAffordCard(myPlayer, card))
      }
      canReserveCard={Boolean(
        myPlayer &&
          isMyTurn &&
          !gameState.isGameOver &&
          !gameState.showNobleSelection &&
          myPlayer.reservedCards.length < 3
      )}
      onPurchaseCard={(_card, cardIndex, level) =>
        sendGameAction({ type: "purchase_card", level, cardIndex })
      }
      onReserveCard={(_card, cardIndex, level) =>
        sendGameAction({ type: "reserve_card", level, cardIndex })
      }
      onPurchaseReservedCard={(cardIndex) =>
        sendGameAction({ type: "purchase_reserved_card", cardIndex })
      }
      canAffordReservedCard={(card) =>
        Boolean(myPlayer && isMyTurn && canAffordCard(myPlayer, card))
      }
      onSelectNoble={(noble) =>
        sendGameAction({
          type: "select_noble",
          nobleIndex: gameState.availableNobles.findIndex((n) => n === noble),
        })
      }
      onRestart={onLeaveGame}
      title={
        isMyTurn
          ? "Your Turn"
          : `Waiting for ${currentPlayer?.name ?? "opponent"}`
      }
      primaryActionLabel={
        isMyTurn
          ? hasSelectedGems
            ? "Take Gems & End Turn"
            : "End Turn"
          : `Waiting for ${currentPlayer?.name ?? "opponent"}`
      }
      isInteractionDisabled={!isMyTurn || gameState.showNobleSelection}
      isGemBankInteractive={
        isMyTurn && !gameState.isGameOver && !gameState.showNobleSelection
      }
      deckCounts={gameState.deckCounts}
      calculatePoints={calculatePlayerPoints}
      victoryActionLabel="Return to Lobby"
      infoAlert={infoAlert}
      playerNameFormatter={(player) =>
        "userId" in player && player.userId === userId
          ? `${player.name} (You)`
          : player.name
      }
    />
  );
};
