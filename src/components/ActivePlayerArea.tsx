import {
  Box,
  HStack,
  Text,
  VStack,
  Image,
  SimpleGrid,
  Button,
  Divider,
  Tooltip,
} from "@chakra-ui/react";
import { useGameStore } from "../store/gameStore";
import { GemType, Card, Player } from "../types/game";
import { useTempGemStore } from "../store/tempGemStore";
import { canAffordCard, countGemBonuses } from "../../shared/game/selectors";
import type { OnlinePlayer } from "../../shared/onlineTypes";
import { gemImages } from "../utils/constants";
import { DevelopmentCard } from "./DevelopmentCard";

interface CardSummaryProps {
  card: Card;
  onClick?: () => void;
  canAfford?: boolean;
  isDisabled?: boolean;
}

const CardSummary = ({
  card,
  onClick,
  canAfford: canAffordProp,
  isDisabled = false,
}: CardSummaryProps) => {
  const { players, currentPlayer } = useGameStore();
  const player = players[currentPlayer];
  const canAfford =
    canAffordProp ?? canAffordCard(player, card, useGameStore.getState().debugMode);

  return (
    <Box position="relative">
      <Tooltip
        label={
          <VStack p={2} spacing={1}>
            <Text>
              Level {card.level} {card.gem} Card
            </Text>
            <Text>Points: {card.points}</Text>
            <Text fontWeight="bold">Cost:</Text>
            {Object.entries(card.cost).map(
              ([gem, count]) =>
                count > 0 && (
                  <HStack key={gem}>
                    <Image
                      src={gemImages[gem as GemType]}
                      alt={gem}
                      boxSize="15px"
                    />
                    <Text>× {count}</Text>
                  </HStack>
                )
            )}
          </VStack>
        }
      >
        <Box
          position="relative"
          w="64px"
          h="90px"
          cursor={onClick && canAfford && !isDisabled ? "pointer" : "default"}
          onClick={onClick && canAfford && !isDisabled ? onClick : undefined}
          opacity={isDisabled ? 0.7 : 1}
          _hover={{
            "& > .card-actions": {
              opacity: 1,
            },
          }}
        >
          <DevelopmentCard card={card} size="compact" />

          {/* Purchase Button Overlay */}
          {onClick && (
            <Box
              className="card-actions"
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              opacity={0}
              transition="all 0.2s"
              bg="blackAlpha.700"
              borderRadius="16px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Button
                size="xs"
                colorScheme={canAfford ? "blue" : "gray"}
                isDisabled={!canAfford || isDisabled}
                onClick={onClick}
              >
                {canAfford ? "Buy" : "Can't Buy"}
              </Button>
            </Box>
          )}
        </Box>
      </Tooltip>
    </Box>
  );
};

interface ActivePlayerAreaProps {
  activePlayer?: Player | OnlinePlayer;
  selectedGems?: Record<GemType, number>;
  onRemoveSelectedGem?: (gemType: GemType) => void;
  onClearSelectedGems?: () => void;
  onTakeSelectedGems?: (gems: Partial<Record<GemType, number>>) => boolean | void;
  onEndTurn?: () => void;
  onPurchaseReservedCard?: (cardIndex: number) => void;
  canAffordReservedCard?: (card: Card) => boolean;
  isGameOver?: boolean;
  title?: string;
  primaryActionLabel?: string;
  isInteractionDisabled?: boolean;
}

export const ActivePlayerArea = ({
  activePlayer: activePlayerProp,
  selectedGems: selectedGemsProp,
  onRemoveSelectedGem,
  onClearSelectedGems,
  onTakeSelectedGems,
  onEndTurn,
  onPurchaseReservedCard,
  canAffordReservedCard,
  isGameOver: isGameOverProp,
  title,
  primaryActionLabel,
  isInteractionDisabled = false,
}: ActivePlayerAreaProps = {}) => {
  const { players, currentPlayer } = useGameStore();
  const takeGems = useGameStore((state) => state.takeGems);
  const assignNoblesAndEndTurn = useGameStore(
    (state) => state.assignNoblesAndEndTurn
  );
  const purchaseReservedCard = useGameStore(
    (state) => state.purchaseReservedCard
  );
  const storeIsGameOver = useGameStore((state) => state.isGameOver);
  const { selectedGems: storeSelectedGems, removeGem, clearGems } = useTempGemStore();
  const activePlayer = activePlayerProp ?? players[currentPlayer];
  const selectedGems = selectedGemsProp ?? storeSelectedGems;
  const isGameOver = isGameOverProp ?? storeIsGameOver;
  const gemBonuses = countGemBonuses(activePlayer);

  const handleEndTurn = () => {
    const hasSelectedGems = Object.values(selectedGems).some(
      (count) => count > 0
    );
    if (hasSelectedGems) {
      const success = onTakeSelectedGems ? onTakeSelectedGems(selectedGems) : takeGems(selectedGems);
      if (success) {
        if (onClearSelectedGems) {
          onClearSelectedGems();
        } else {
          clearGems();
          assignNoblesAndEndTurn();
        }
      }
    } else if (onEndTurn) {
      onEndTurn();
    } else {
      assignNoblesAndEndTurn();
    }
  };

  const handleGemClick = (gemType: GemType) => {
    if (isInteractionDisabled) {
      return;
    }

    if (selectedGems[gemType] > 0) {
      if (onRemoveSelectedGem) {
        onRemoveSelectedGem(gemType);
      } else {
        removeGem(gemType);
      }
    }
  };

  const handleReservedCardClick = (index: number) => {
    if (isInteractionDisabled) {
      return;
    }

    if (onPurchaseReservedCard) {
      onPurchaseReservedCard(index);
      return;
    }

    const success = purchaseReservedCard(index);
    if (success && !onPurchaseReservedCard) {
      handleEndTurn();
    }
  };

  // Combine current gems with selected gems for display
  const displayGems = { ...activePlayer.gems };
  Object.entries(selectedGems).forEach(([gem, count]) => {
    if (count > 0) {
      displayGems[gem as GemType] = (displayGems[gem as GemType] || 0) + count;
    }
  });

  const hasSelectedGems = Object.values(selectedGems).some((count) => count > 0);
  const resolvedTitle = title ?? `Player ${activePlayer.id + 1}'s Turn`;
  const resolvedActionLabel =
    primaryActionLabel ?? (hasSelectedGems ? "Take Gems & End Turn" : "End Turn");
  const resolvedInteractionDisabled = isGameOver || isInteractionDisabled;

  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      bg="white"
      boxShadow="0 -4px 6px -1px rgba(0, 0, 0, 0.1)"
      p={3}
    >
      <HStack justify="space-between" align="start" spacing={6}>
        <VStack align="start" spacing={3} flex={1}>
          <Text fontSize="lg" fontWeight="bold" color="blue.600">
            {resolvedTitle}
          </Text>

          <HStack spacing={6} w="100%" align="start">
            {/* Gems Section */}
            <VStack align="start" minW="200px">
              <Text fontSize="sm" fontWeight="semibold">
                Your Gems
              </Text>
              <SimpleGrid columns={6} spacing={3} w="100%">
                {(Object.entries(displayGems) as [GemType, number][]).map(
                  ([gem, count]) => (
                    <VStack
                      key={gem}
                      spacing={1}
                      cursor={
                        selectedGems[gem] > 0 && !resolvedInteractionDisabled
                          ? "pointer"
                          : "default"
                      }
                      onClick={() => handleGemClick(gem)}
                      position="relative"
                      opacity={selectedGems[gem] > 0 ? 1 : 0.7}
                    >
                      <Image src={gemImages[gem]} alt={gem} boxSize="25px" />
                      <Text
                        fontSize="sm"
                        fontWeight="bold"
                        color={selectedGems[gem] > 0 ? "green.500" : "inherit"}
                      >
                        {count}
                      </Text>
                    </VStack>
                  )
                )}
              </SimpleGrid>
            </VStack>

            <Divider orientation="vertical" h="90px" />

            {/* Card Bonuses Section */}
            <VStack align="start" minW="180px">
              <Text fontSize="sm" fontWeight="semibold">
                Card Bonuses
              </Text>
              <SimpleGrid columns={5} spacing={3} w="100%">
                {(Object.entries(gemBonuses) as [GemType, number][]).map(
                  ([gem, count]) => (
                    <VStack key={gem} spacing={1}>
                      <Image src={gemImages[gem]} alt={gem} boxSize="25px" />
                      <Text
                        fontSize="sm"
                        fontWeight="bold"
                        color={count > 0 ? "blue.500" : "gray.400"}
                      >
                        {count}
                      </Text>
                    </VStack>
                  )
                )}
              </SimpleGrid>
            </VStack>

            <Divider orientation="vertical" h="90px" />

            {/* Reserved Cards Section */}
            <VStack align="start" minW="220px">
              <Text fontSize="sm" fontWeight="semibold">
                Reserved Cards ({activePlayer.reservedCards.length}/3)
              </Text>
              <HStack spacing={2}>
                {activePlayer.reservedCards.map((card, index) => (
                  <CardSummary
                    key={index}
                    card={card}
                    onClick={() => handleReservedCardClick(index)}
                    canAfford={
                      canAffordReservedCard
                        ? canAffordReservedCard(card)
                        : undefined
                    }
                    isDisabled={resolvedInteractionDisabled}
                  />
                ))}
              </HStack>
            </VStack>
          </HStack>
        </VStack>

        <Button
          colorScheme="blue"
          size="lg"
          onClick={handleEndTurn}
          isDisabled={resolvedInteractionDisabled}
        >
          {resolvedActionLabel}
        </Button>
      </HStack>
    </Box>
  );
};
