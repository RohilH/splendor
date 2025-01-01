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
import { GemType, Card } from "../types/game";
import { useTempGemStore } from "./GemBank";

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
}

const CardSummary = ({ card, onClick }: CardSummaryProps) => {
  const { players, currentPlayer } = useGameStore();
  const player = players[currentPlayer];

  // Check if player can afford the card
  const canAfford = () => {
    const totalGems = { ...player.gems };
    // Add bonuses from purchased cards
    player.purchasedCards.forEach((purchasedCard) => {
      totalGems[purchasedCard.gem] = (totalGems[purchasedCard.gem] || 0) + 1;
    });

    // Check if player has enough gems
    let goldNeeded = 0;
    for (const [gem, cost] of Object.entries(card.cost)) {
      const available = totalGems[gem as GemType] || 0;
      const bonusGems = player.purchasedCards.filter(
        (c) => c.gem === gem
      ).length;
      const required = Math.max(0, cost - bonusGems);
      if (available >= required) {
        totalGems[gem as GemType] -= required;
      } else {
        goldNeeded += required - available;
        totalGems[gem as GemType] = 0;
      }
    }
    return goldNeeded <= (totalGems.gold || 0);
  };

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
          cursor={onClick && canAfford() ? "pointer" : "default"}
          onClick={onClick && canAfford() ? onClick : undefined}
          border="1px solid"
          borderColor={card.gem === "diamond" ? "gray.300" : "transparent"}
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
              borderRadius="md"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Button
                size="xs"
                colorScheme={canAfford() ? "blue" : "gray"}
                isDisabled={!canAfford()}
                onClick={onClick}
              >
                {canAfford() ? "Buy" : "Can't Buy"}
              </Button>
            </Box>
          )}
        </Box>
      </Tooltip>
    </Box>
  );
};

export const ActivePlayerArea = () => {
  const { players, currentPlayer } = useGameStore();
  const endTurn = useGameStore((state) => state.endTurn);
  const takeGems = useGameStore((state) => state.takeGems);
  const purchaseReservedCard = useGameStore(
    (state) => state.purchaseReservedCard
  );
  const isGameOver = useGameStore((state) => state.isGameOver);
  const activePlayer = players[currentPlayer];
  const { selectedGems, removeGem, clearGems } = useTempGemStore();

  // Calculate gem bonuses from purchased cards
  const gemBonuses = (
    ["diamond", "sapphire", "emerald", "ruby", "onyx"] as const
  ).reduce((acc, gem) => {
    acc[gem] = activePlayer.purchasedCards.filter(
      (card) => card.gem === gem
    ).length;
    return acc;
  }, {} as Record<Exclude<GemType, "gold">, number>);

  const handleEndTurn = () => {
    const hasSelectedGems = Object.values(selectedGems).some(
      (count) => count > 0
    );
    if (hasSelectedGems) {
      const success = takeGems(selectedGems);
      if (success) {
        clearGems();
        endTurn();
      }
    } else {
      endTurn();
    }
  };

  const handleGemClick = (gemType: GemType) => {
    if (selectedGems[gemType] > 0) {
      removeGem(gemType);
    }
  };

  const handleReservedCardClick = (card: Card, index: number) => {
    const success = purchaseReservedCard(index);
    if (success) {
      endTurn();
    }
  };

  // Combine current gems with selected gems for display
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
            Player {activePlayer.id + 1}'s Turn
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
                      cursor={selectedGems[gem] > 0 ? "pointer" : "default"}
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
            <VStack align="start" minW="180px">
              <Text fontSize="sm" fontWeight="semibold">
                Reserved Cards ({activePlayer.reservedCards.length}/3)
              </Text>
              <HStack spacing={2}>
                {activePlayer.reservedCards.map((card, index) => (
                  <CardSummary
                    key={index}
                    card={card}
                    onClick={() => handleReservedCardClick(card, index)}
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
          isDisabled={isGameOver}
        >
          {Object.values(selectedGems).some((count) => count > 0)
            ? "Take Gems & End Turn"
            : "End Turn"}
        </Button>
      </HStack>
    </Box>
  );
};
