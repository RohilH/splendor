import {
  Box,
  HStack,
  Text,
  VStack,
  SimpleGrid,
  useBreakpointValue,
} from "@chakra-ui/react";
import {
  countGemBonuses,
  calculatePlayerPoints,
} from "../../shared/game/selectors";
import type { PlayerPointView } from "../../shared/game/selectors";
import { Player, GemType } from "../types/game";

interface PlayerAreaProps {
  player: Player;
  isActive: boolean;
  calculatePoints?: (player: PlayerPointView) => number;
}

const bankGemColors: Record<GemType, { bg: string; border: string }> = {
  diamond: { bg: "#ffffff", border: "#e2e8f0" },
  sapphire: { bg: "#2b6cb0", border: "#2c5282" },
  emerald: { bg: "#2f855a", border: "#276749" },
  ruby: { bg: "#c53030", border: "#9b2c2c" },
  onyx: { bg: "#1a202c", border: "#171923" },
  gold: { bg: "#d69e2e", border: "#b7791f" },
};

export const PlayerArea = ({
  player,
  isActive,
  calculatePoints = calculatePlayerPoints,
}: PlayerAreaProps) => {
  const totalPoints = calculatePoints(player);
  const gemBonuses = countGemBonuses(player) as Record<
    Exclude<GemType, "gold">,
    number
  >;
  const isMobile = useBreakpointValue(
    { base: true, md: false },
    { fallback: "md" }
  );

  if (isMobile) {
    return (
      <Box
        p={2}
        bg={isActive ? "orange.50" : "white"}
        borderRadius="lg"
        borderWidth={2}
        borderColor={isActive ? "orange.300" : "gray.200"}
        boxShadow="sm"
        flexShrink={0}
        minW="150px"
      >
        <VStack align="stretch" spacing={1.5}>
          <HStack
            bg="yellow.100"
            px={2}
            py={1}
            borderRadius="md"
            spacing={2}
            justify="space-between"
          >
            <Text fontSize="sm" fontWeight="bold" noOfLines={1}>
              {player.name}
            </Text>
            <Text fontSize="sm" fontWeight="bold" flexShrink={0}>
              {totalPoints}pt
            </Text>
          </HStack>

          <HStack spacing={1} justify="center">
            {(
              [
                "diamond",
                "sapphire",
                "emerald",
                "ruby",
                "onyx",
                "gold",
              ] as const
            ).map((gem) => (
              <Box
                key={gem}
                w="22px"
                h="22px"
                bg={bankGemColors[gem].bg}
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                border="1px solid"
                borderColor={
                  player.gems[gem] > 0
                    ? bankGemColors[gem].border
                    : "gray.200"
                }
                opacity={player.gems[gem] > 0 ? 1 : 0.3}
              >
                {player.gems[gem] > 0 && (
                  <Text
                    fontSize="2xs"
                    fontWeight="bold"
                    color={gem === "diamond" ? "gray.800" : "white"}
                  >
                    {player.gems[gem]}
                  </Text>
                )}
              </Box>
            ))}
          </HStack>

          <HStack spacing={1} justify="center">
            {(
              ["diamond", "sapphire", "emerald", "ruby", "onyx"] as const
            ).map((gem) => (
              <Box
                key={gem}
                w="22px"
                h="28px"
                bg={bankGemColors[gem].bg}
                borderRadius="sm"
                display="flex"
                alignItems="center"
                justifyContent="center"
                border="1px solid"
                borderColor={
                  gemBonuses[gem] > 0
                    ? bankGemColors[gem].border
                    : "gray.200"
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
                  borderRadius: "sm",
                  background:
                    "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 6px)",
                }}
                position="relative"
              >
                {gemBonuses[gem] > 0 && (
                  <Text
                    fontSize="2xs"
                    fontWeight="bold"
                    color={gem === "diamond" ? "gray.800" : "white"}
                  >
                    {gemBonuses[gem]}
                  </Text>
                )}
              </Box>
            ))}
            <Box
              w="22px"
              h="28px"
              bg="gray.100"
              borderRadius="sm"
              display="flex"
              alignItems="center"
              justifyContent="center"
              border="1px solid"
              borderColor={
                player.reservedCards.length > 0 ? "gray.400" : "gray.200"
              }
              opacity={player.reservedCards.length > 0 ? 1 : 0.3}
            >
              {player.reservedCards.length > 0 && (
                <Text fontSize="2xs" fontWeight="bold" color="gray.800">
                  {player.reservedCards.length}
                </Text>
              )}
            </Box>
          </HStack>
        </VStack>
      </Box>
    );
  }

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

        <SimpleGrid columns={6} spacing={2}>
          {(["diamond", "sapphire", "emerald", "ruby", "onyx"] as const).map(
            (gem) => (
              <VStack key={gem} spacing={2} align="center">
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
                    gemBonuses[gem] > 0
                      ? bankGemColors[gem].border
                      : "gray.200"
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

          <VStack spacing={2} align="center">
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
