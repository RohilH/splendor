import { Box, HStack, Text, VStack, SimpleGrid } from "@chakra-ui/react";
import { Player, GemType } from "../types/game";
import { useGameStore } from "../store/gameStore";

interface PlayerAreaProps {
  player: Player;
  isActive: boolean;
}

// Bank gem colors
const bankGemColors: Record<GemType, { bg: string; border: string }> = {
  diamond: { bg: "#ffffff", border: "#e2e8f0" },
  sapphire: { bg: "#2b6cb0", border: "#2c5282" },
  emerald: { bg: "#2f855a", border: "#276749" },
  ruby: { bg: "#c53030", border: "#9b2c2c" },
  onyx: { bg: "#1a202c", border: "#171923" },
  gold: { bg: "#d69e2e", border: "#b7791f" },
};

export const PlayerArea = ({ player, isActive }: PlayerAreaProps) => {
  const calculatePoints = useGameStore((state) => state.calculatePoints);
  const totalPoints = calculatePoints(player);
  const gemBonuses = (
    ["diamond", "sapphire", "emerald", "ruby", "onyx"] as const
  ).reduce((acc, gem) => {
    acc[gem] = player.purchasedCards.filter((card) => card.gem === gem).length;
    return acc;
  }, {} as Record<Exclude<GemType, "gold">, number>);

  return (
    <Box
      p={3}
      bg={isActive ? "orange.50" : "white"}
      borderRadius="xl"
      borderWidth={2}
      borderColor={isActive ? "orange.300" : "gray.200"}
      boxShadow="sm"
    >
      <VStack align="stretch" spacing={3}>
        {/* Header with Name and Points */}
        <HStack
          bg="yellow.100"
          px={3}
          py={2}
          borderRadius="lg"
          spacing={2}
          justify="space-between"
        >
          <Text fontSize="md" fontWeight="bold">
            {player.name}
          </Text>
          <Text fontSize="md" fontWeight="bold">
            {totalPoints}
          </Text>
        </HStack>

        {/* Game Resources */}
        <SimpleGrid columns={6} spacing={2}>
          {/* First 5 columns for gems and cards */}
          {(["diamond", "sapphire", "emerald", "ruby", "onyx"] as const).map(
            (gem) => (
              <VStack key={gem} spacing={2} align="center">
                {/* Gem */}
                <Box
                  position="relative"
                  w="32px"
                  h="32px"
                  bg={bankGemColors[gem].bg}
                  borderRadius="full"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  border="2px solid"
                  borderColor={
                    player.gems[gem] > 0
                      ? bankGemColors[gem].border
                      : "gray.200"
                  }
                  opacity={player.gems[gem] > 0 ? 1 : 0.3}
                >
                  {player.gems[gem] > 0 && (
                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color={gem === "diamond" ? "gray.800" : "white"}
                    >
                      {player.gems[gem]}
                    </Text>
                  )}
                </Box>

                {/* Card */}
                <Box
                  position="relative"
                  w="32px"
                  h="44px"
                  bg={bankGemColors[gem].bg}
                  borderRadius="md"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  border="2px solid"
                  borderColor={
                    gemBonuses[gem] > 0 ? bankGemColors[gem].border : "gray.200"
                  }
                  opacity={gemBonuses[gem] > 0 ? 1 : 0.3}
                  _before={{
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: 0.1,
                    borderRadius: "md",
                    background:
                      "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.1) 5px, rgba(255,255,255,0.1) 10px)",
                  }}
                >
                  {gemBonuses[gem] > 0 && (
                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color={gem === "diamond" ? "gray.800" : "white"}
                    >
                      {gemBonuses[gem]}
                    </Text>
                  )}
                </Box>
              </VStack>
            )
          )}

          {/* Last column for gold and reserved */}
          <VStack spacing={2} align="center">
            {/* Gold Gem */}
            <Box
              position="relative"
              w="32px"
              h="32px"
              bg={bankGemColors.gold.bg}
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
              border="2px solid"
              borderColor={
                player.gems.gold > 0 ? bankGemColors.gold.border : "gray.200"
              }
              opacity={player.gems.gold > 0 ? 1 : 0.3}
            >
              {player.gems.gold > 0 && (
                <Text fontSize="sm" fontWeight="bold" color="white">
                  {player.gems.gold}
                </Text>
              )}
            </Box>

            {/* Reserved Cards */}
            <Box
              bg="gray.100"
              borderRadius="md"
              display="flex"
              alignItems="center"
              w="32px"
              h="44px"
              justifyContent="center"
              border="2px solid"
              borderColor={
                player.reservedCards.length > 0 ? "gray.400" : "gray.200"
              }
              opacity={player.reservedCards.length > 0 ? 1 : 0.3}
            >
              {player.reservedCards.length > 0 && (
                <Text fontSize="sm" fontWeight="bold" color="gray.800">
                  {player.reservedCards.length}
                </Text>
              )}
            </Box>
          </VStack>
        </SimpleGrid>
      </VStack>
    </Box>
  );
};
