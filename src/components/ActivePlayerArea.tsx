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
import { GemType, Card, Player } from "../types/game";
import { countGemBonuses } from "../../shared/game/selectors";
import type { OnlinePlayer } from "../../shared/onlineTypes";

const gemImages: Record<GemType, string> = {
  diamond: "/gems/diamond.svg",
  sapphire: "/gems/sapphire.svg",
  emerald: "/gems/emerald.svg",
  ruby: "/gems/ruby.svg",
  onyx: "/gems/onyx.svg",
  gold: "/gems/gold.svg",
};

const gemColors: Record<GemType, string> = {
  diamond: "#ffffff",
  sapphire: "#0066cc",
  emerald: "#00cc66",
  ruby: "#cc0000",
  onyx: "#333333",
  gold: "#ffcc00",
};

interface CardSummaryProps {
  card: Card;
  onClick?: () => void;
  canAfford: boolean;
  isDisabled?: boolean;
}

const CardSummary = ({
  card,
  onClick,
  canAfford,
  isDisabled = false,
}: CardSummaryProps) => {
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
          w="40px"
          h="56px"
          bg={gemColors[card.gem]}
          borderRadius="md"
          display="flex"
          alignItems="center"
          justifyContent="center"
          position="relative"
          cursor={onClick && canAfford && !isDisabled ? "pointer" : "default"}
          onClick={onClick && canAfford && !isDisabled ? onClick : undefined}
          border="1px solid"
          borderColor={card.gem === "diamond" ? "gray.300" : "transparent"}
          opacity={isDisabled ? 0.7 : 1}
          _hover={{
            "& > .card-actions": {
              opacity: 1,
            },
          }}
        >
          <Text
            fontSize="lg"
            fontWeight="bold"
            color={card.gem === "diamond" ? "black" : "white"}
          >
            {card.points || "·"}
          </Text>

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
              borderRadius="md"
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
  activePlayer: Player | OnlinePlayer;
  selectedGems: Record<GemType, number>;
  onRemoveSelectedGem: (gemType: GemType) => void;
  onTakeSelectedGems: (gems: Partial<Record<GemType, number>>) => boolean | void;
  onEndTurn: () => void;
  onPurchaseReservedCard: (cardIndex: number) => void;
  canAffordReservedCard: (card: Card) => boolean;
  isGameOver: boolean;
  title: string;
  primaryActionLabel: string;
  isInteractionDisabled: boolean;
}

export const ActivePlayerArea = ({
  activePlayer,
  selectedGems,
  onRemoveSelectedGem,
  onTakeSelectedGems,
  onEndTurn,
  onPurchaseReservedCard,
  canAffordReservedCard,
  isGameOver,
  title,
  primaryActionLabel,
  isInteractionDisabled,
}: ActivePlayerAreaProps) => {
  const gemBonuses = countGemBonuses(activePlayer);
  const resolvedInteractionDisabled = isGameOver || isInteractionDisabled;

  const handleEndTurn = () => {
    const hasSelectedGems = Object.values(selectedGems).some(
      (count) => count > 0
    );
    if (hasSelectedGems) {
      onTakeSelectedGems(selectedGems);
    } else {
      onEndTurn();
    }
  };

  const handleGemClick = (gemType: GemType) => {
    if (resolvedInteractionDisabled) return;
    if (selectedGems[gemType] > 0) {
      onRemoveSelectedGem(gemType);
    }
  };

  const handleReservedCardClick = (index: number) => {
    if (resolvedInteractionDisabled) return;
    onPurchaseReservedCard(index);
  };

  const displayGems = { ...activePlayer.gems };
  Object.entries(selectedGems).forEach(([gem, count]) => {
    if (count > 0) {
      displayGems[gem as GemType] = (displayGems[gem as GemType] || 0) + count;
    }
  });

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
            {title}
          </Text>

          <HStack spacing={6} w="100%" align="start">
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

            <VStack align="start" minW="180px">
              <Text fontSize="sm" fontWeight="semibold">
                Reserved Cards ({activePlayer.reservedCards.length}/3)
              </Text>
              <HStack spacing={2}>
                {activePlayer.reservedCards.map((card, index) => (
                  <CardSummary
                    key={index}
                    card={card}
                    onClick={() => handleReservedCardClick(index)}
                    canAfford={canAffordReservedCard(card)}
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
          {primaryActionLabel}
        </Button>
      </HStack>
    </Box>
  );
};
