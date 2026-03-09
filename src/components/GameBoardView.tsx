import { Box, Grid, Text, VStack } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { calculatePlayerPoints } from "../../shared/game/selectors";
import type { PlayerPointView } from "../../shared/game/selectors";
import type { Card, GemType, Gems, Noble, Player } from "../types/game";
import type { OnlinePlayer } from "../../shared/onlineTypes";
import { GemBank } from "./GemBank";
import { CardField } from "./CardField";
import { PlayerArea } from "./PlayerArea";
import { NobleArea } from "./NobleArea";
import { ActivePlayerArea } from "./ActivePlayerArea";
import { NobleSelectionModal } from "./NobleSelectionModal";
import { VictoryScreen } from "./VictoryScreen";

const cardLevels: Array<1 | 2 | 3> = [3, 2, 1];

export interface GameBoardViewProps {
  players: Array<Player | OnlinePlayer>;
  currentPlayer: number;
  gems: Gems;
  visibleCards: { level1: Card[]; level2: Card[]; level3: Card[] };
  nobles: Noble[];
  availableNobles: Noble[];
  showNobleSelection: boolean;
  selectedGems: Record<GemType, number>;
  isGameOver: boolean;
  winner: number | null;

  activePlayer: Player | OnlinePlayer;

  onSelectGem: (gem: GemType) => void;
  onRemoveSelectedGem: (gem: GemType) => void;
  onTakeSelectedGems: (
    gems: Partial<Record<GemType, number>>
  ) => boolean | void;
  onEndTurn: () => void;

  canAffordCard: (card: Card) => boolean;
  canReserveCard: boolean;
  onPurchaseCard: (card: Card, cardIndex: number, level: 1 | 2 | 3) => void;
  onReserveCard: (card: Card, cardIndex: number, level: 1 | 2 | 3) => void;
  onPurchaseReservedCard: (cardIndex: number) => void;
  canAffordReservedCard: (card: Card) => boolean;

  onSelectNoble: (noble: Noble) => void;
  onRestart: () => void;

  title: string;
  primaryActionLabel: string;
  isInteractionDisabled: boolean;
  isGemBankInteractive: boolean;

  deckCounts?: { level1: number; level2: number; level3: number };
  calculatePoints?: (player: PlayerPointView) => number;
  victoryActionLabel?: string;
  infoAlert?: ReactNode;
  playerNameFormatter?: (player: Player | OnlinePlayer) => string;
}

export const GameBoardView = ({
  players,
  currentPlayer,
  gems,
  visibleCards,
  nobles,
  availableNobles,
  showNobleSelection,
  selectedGems,
  isGameOver,
  winner,
  activePlayer,
  onSelectGem,
  onRemoveSelectedGem,
  onTakeSelectedGems,
  onEndTurn,
  canAffordCard: canAfford,
  canReserveCard,
  onPurchaseCard,
  onReserveCard,
  onPurchaseReservedCard,
  canAffordReservedCard,
  onSelectNoble,
  onRestart,
  title,
  primaryActionLabel,
  isInteractionDisabled,
  isGemBankInteractive,
  deckCounts,
  calculatePoints = calculatePlayerPoints,
  victoryActionLabel,
  infoAlert,
  playerNameFormatter,
}: GameBoardViewProps) => {
  return (
    <>
      <Box p={4} pb={48} bg="gray.100" minH="100vh">
        {infoAlert}

        <Grid templateColumns="1fr 2fr 1fr" gap={6}>
          <VStack gap={4} align="stretch">
            {players.map((player, index) => (
              <PlayerArea
                key={player.id}
                player={
                  playerNameFormatter
                    ? { ...player, name: playerNameFormatter(player) }
                    : player
                }
                isActive={index === currentPlayer}
                calculatePoints={calculatePoints}
              />
            ))}
          </VStack>

          <VStack gap={4} align="stretch">
            {cardLevels.map((level) => {
              const key = `level${level}` as keyof typeof visibleCards;
              return (
                <Box key={level}>
                  {deckCounts && (
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      Level {level} deck remaining: {deckCounts[key]}
                    </Text>
                  )}
                  <CardField
                    level={level}
                    cards={visibleCards[key]}
                    canAfford={canAfford}
                    canReserveCard={canReserveCard}
                    onPurchase={(card, cardIndex) =>
                      onPurchaseCard(card, cardIndex, level)
                    }
                    onReserve={(card, cardIndex) =>
                      onReserveCard(card, cardIndex, level)
                    }
                  />
                </Box>
              );
            })}
          </VStack>

          <VStack gap={4} align="stretch">
            <GemBank
              gems={gems}
              player={activePlayer}
              selectedGems={selectedGems}
              addGem={onSelectGem}
              isInteractive={isGemBankInteractive}
            />
            <NobleArea nobles={nobles} />
          </VStack>
        </Grid>
      </Box>

      <ActivePlayerArea
        activePlayer={activePlayer}
        selectedGems={selectedGems}
        onRemoveSelectedGem={onRemoveSelectedGem}
        onTakeSelectedGems={onTakeSelectedGems}
        onEndTurn={onEndTurn}
        onPurchaseReservedCard={onPurchaseReservedCard}
        canAffordReservedCard={canAffordReservedCard}
        isGameOver={isGameOver}
        title={title}
        primaryActionLabel={primaryActionLabel}
        isInteractionDisabled={isInteractionDisabled}
      />

      <NobleSelectionModal
        isOpen={showNobleSelection}
        nobles={availableNobles}
        onSelect={onSelectNoble}
      />

      {isGameOver && (
        <VictoryScreen
          players={players}
          winner={winner}
          calculatePoints={calculatePoints}
          actionLabel={victoryActionLabel}
          onRestart={onRestart}
        />
      )}
    </>
  );
};
