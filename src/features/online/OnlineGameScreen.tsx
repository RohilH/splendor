import { Alert, AlertDescription, AlertIcon, Box, Grid, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { canAffordCard, calculatePlayerPoints } from "../../../shared/game/selectors";
import type { GamePublicState, GemType, OnlineGameAction } from "../../../shared/onlineTypes";
import { ActivePlayerArea } from "../../components/ActivePlayerArea";
import { CardField } from "../../components/CardField";
import { GemBank } from "../../components/GemBank";
import { NobleArea } from "../../components/NobleArea";
import { NobleSelectionModal } from "../../components/NobleSelectionModal";
import { PlayerArea } from "../../components/PlayerArea";
import { VictoryScreen } from "../../components/VictoryScreen";
import { createEmptyGemSelection } from "../../store/tempGemStore";

const cardLevels: Array<1 | 2 | 3> = [3, 2, 1];

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
    gameState.showNobleSelection && gameState.pendingNobleSelectionPlayerId === userId
  );
  const currentPlayer = gameState.players[gameState.currentPlayer] ?? null;
  const hasSelectedGems = Object.values(selectedGems).some((count) => count > 0);

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
    if (!isMyTurn) {
      return false;
    }

    sendGameAction({
      type: "take_gems",
      gems: selectedGems,
    });
    resetGemSelection();
    return true;
  };

  return (
    <>
      <Box
        p={4}
        pb={48}
        bg="linear-gradient(180deg, #314d3f 0%, #1f3028 100%)"
        minH="100vh"
      >
        {gameState.pendingNobleSelectionPlayerId && !isMyNobleSelection && currentPlayer && (
          <Alert status="info" mb={4} borderRadius="lg">
            <AlertIcon />
            <AlertDescription>
              Waiting for {currentPlayer.name} to choose a noble.
            </AlertDescription>
          </Alert>
        )}

        <Grid templateColumns="1fr 2.3fr 1fr" gap={6}>
          <VStack gap={5} align="stretch">
            {gameState.players.map((player, index) => (
              <PlayerArea
                key={player.userId}
                player={{
                  ...player,
                  name: player.userId === userId ? `${player.name} (You)` : player.name,
                }}
                isActive={index === gameState.currentPlayer}
                calculatePoints={calculatePlayerPoints}
              />
            ))}
          </VStack>

          <VStack gap={4} align="stretch">
            {cardLevels.map((level) => {
              const key: keyof GamePublicState["visibleCards"] = `level${level}`;
              return (
                <Box key={level}>
                  <CardField
                    level={level}
                    cards={gameState.visibleCards[key]}
                    remainingCards={gameState.deckCounts[key]}
                    player={myPlayer ?? undefined}
                    canAfford={(card) =>
                      Boolean(myPlayer && isMyTurn && canAffordCard(myPlayer, card))
                    }
                    canReserveCard={Boolean(
                      myPlayer &&
                        isMyTurn &&
                        !gameState.isGameOver &&
                        !gameState.showNobleSelection &&
                        myPlayer.reservedCards.length < 3
                    )}
                    onPurchase={(_, cardIndex) =>
                      sendGameAction({
                        type: "purchase_card",
                        level,
                        cardIndex,
                      })
                    }
                    onReserve={(_, cardIndex) =>
                      sendGameAction({
                        type: "reserve_card",
                        level,
                        cardIndex,
                      })
                    }
                  />
                </Box>
              );
            })}
          </VStack>

          <VStack gap={4} align="stretch">
            {myPlayer && (
              <GemBank
                gems={gameState.gems}
                player={myPlayer}
                selectedGems={selectedGems}
                addGem={(gem) => handleGemAdjust(gem, 1)}
                isInteractive={isMyTurn && !gameState.isGameOver && !gameState.showNobleSelection}
              />
            )}
            <NobleArea nobles={gameState.nobles} />
          </VStack>
        </Grid>
      </Box>

      {myPlayer && (
        <ActivePlayerArea
          activePlayer={myPlayer}
          selectedGems={selectedGems}
          onRemoveSelectedGem={(gem) => handleGemAdjust(gem, -1)}
          onClearSelectedGems={resetGemSelection}
          onTakeSelectedGems={submitTakeGems}
          onEndTurn={() => sendGameAction({ type: "end_turn" })}
          onPurchaseReservedCard={(cardIndex) =>
            sendGameAction({ type: "purchase_reserved_card", cardIndex })
          }
          canAffordReservedCard={(card) =>
            Boolean(myPlayer && isMyTurn && canAffordCard(myPlayer, card))
          }
          isGameOver={gameState.isGameOver}
          title={isMyTurn ? "Your Turn" : `Waiting for ${currentPlayer?.name ?? "opponent"}`}
          primaryActionLabel={
            isMyTurn
              ? hasSelectedGems
                ? "Take Gems & End Turn"
                : "End Turn"
              : `Waiting for ${currentPlayer?.name ?? "opponent"}`
          }
          isInteractionDisabled={!isMyTurn || gameState.showNobleSelection}
        />
      )}

      <NobleSelectionModal
        isOpen={isMyNobleSelection}
        nobles={gameState.availableNobles}
        onSelect={(selectedNoble) =>
          sendGameAction({
            type: "select_noble",
            nobleIndex: gameState.availableNobles.findIndex(
              (noble) => noble === selectedNoble
            ),
          })
        }
      />

      {gameState.isGameOver && (
        <VictoryScreen
          players={gameState.players}
          winner={gameState.winner}
          calculatePoints={calculatePlayerPoints}
          actionLabel="Return to Lobby"
          onRestart={onLeaveGame}
        />
      )}
    </>
  );
};
