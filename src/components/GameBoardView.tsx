import { Box, Flex, Grid, VStack } from "@chakra-ui/react";
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
import { DevelopmentDeck } from "./DevelopmentDeck";

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
  isCpuPlayer?: (playerIndex: number) => boolean;
  /** Show "N left" counts on the deck backs (default true). */
  showDeckCounts?: boolean;
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
  isCpuPlayer,
  showDeckCounts = true,
}: GameBoardViewProps) => {
  return (
    <>
      <Box
        display="flex"
        flexDirection="column"
        h={["100dvh", null, "auto"]}
        minH="100vh"
        overflow={["hidden", null, "visible"]}
      >
        <Box
          flex={["1", null, "none"]}
          minH={0}
          overflow={["hidden", null, "visible"]}
          p={[1.5, null, 4]}
          pb={[2, null, "158px"]}
        >
          {infoAlert}

          <Grid
            h={["100%", null, "auto"]}
            minH={0}
            templateAreas={[
              `"players" "board" "bank"`,
              null,
              `"players board bank"`,
            ]}
            templateColumns={[
              "minmax(0, 1fr)",
              null,
              "minmax(190px, 250px) 1fr minmax(120px, 160px)",
            ]}
            templateRows={["auto minmax(0, 1fr) auto", null, "auto"]}
            gap={[1.5, null, 5]}
          >
            {/* Player mats */}
            <Box gridArea="players" overflowX={["auto", null, "visible"]} minW={0}>
              <Flex
                direction={["row", null, "column"]}
                gap={[2, null, 4]}
                align={["flex-start", null, "stretch"]}
                minW={["max-content", null, "auto"]}
              >
                {players.map((player, index) => (
                  <PlayerArea
                    key={player.id}
                    player={
                      playerNameFormatter
                        ? { ...player, name: playerNameFormatter(player) }
                        : player
                    }
                    isActive={index === currentPlayer}
                    isCpu={isCpuPlayer?.(index) ?? false}
                    calculatePoints={calculatePoints}
                  />
                ))}
              </Flex>
            </Box>

            {/* Center table: nobles row above the three card rows, decks at left */}
            <VStack
              gridArea="board"
              gap={[1, null, 4]}
              align="stretch"
              justify="flex-start"
              h={["100%", null, "auto"]}
              minH={0}
              minW={0}
              w="100%"
              overflowY={["auto", null, "visible"]}
              sx={{ containerType: ["size", null, "normal"] }}
            >
              <NobleArea nobles={nobles} />

              {cardLevels.map((level) => {
                const key = `level${level}` as keyof typeof visibleCards;
                return (
                  <Flex
                    key={level}
                    gap={[1, null, 3]}
                    align={["stretch", null, "flex-start"]}
                    flex="none"
                    minH={0}
                    minW={0}
                  >
                    {deckCounts && (
                      <Box display={["none", null, "block"]}>
                        <DevelopmentDeck
                          level={level}
                          remainingCards={deckCounts[key]}
                          showCount={showDeckCounts}
                        />
                      </Box>
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
                  </Flex>
                );
              })}
            </VStack>

            {/* Chip bank */}
            <Box gridArea="bank" minW={0}>
              <GemBank
                gems={gems}
                player={activePlayer}
                selectedGems={selectedGems}
                addGem={onSelectGem}
                isInteractive={isGemBankInteractive}
              />
            </Box>
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
      </Box>

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
