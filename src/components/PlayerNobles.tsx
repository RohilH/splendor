import { Box, Flex, HStack, Text, Tooltip, VStack } from "@chakra-ui/react";
import type { Noble } from "../types/game";
import { GEM_ORDER } from "../utils/constants";
import { NobleTile } from "./NobleTile";

interface PlayerNoblesProps {
  nobles: Noble[];
}

const describeRequirements = (noble: Noble): string =>
  GEM_ORDER.filter((gem) => (noble.requirements[gem] ?? 0) > 0)
    .map((gem) => `${noble.requirements[gem]} ${gem}`)
    .join(", ");

/**
 * The nobles a player has claimed. Nobles never return to the board, so showing
 * them on the owner's mat is what tells everyone else those tiles are taken.
 */
export const PlayerNobles = ({ nobles }: PlayerNoblesProps) => {
  if (nobles.length === 0) return null;

  const noblePoints = nobles.reduce((sum, noble) => sum + noble.points, 0);

  return (
    <VStack
      align="stretch"
      spacing={1}
      bg="rgba(217, 180, 91, 0.18)"
      border="1px solid rgba(163, 127, 46, 0.35)"
      borderRadius="md"
      px={2}
      py={1.5}
    >
      <HStack spacing={1} justify="space-between">
        <Text
          fontSize="2xs"
          fontWeight="bold"
          color="ink.500"
          textTransform="uppercase"
          letterSpacing="wide"
        >
          Nobles claimed
        </Text>
        <Text fontSize="2xs" fontWeight="bold" color="ink.500">
          +{noblePoints} pts
        </Text>
      </HStack>

      <Flex gap={1} wrap="wrap">
        {nobles.map((noble) => (
          <Tooltip
            key={noble.id}
            label={`${noble.points} prestige for ${describeRequirements(
              noble
            )}. Claimed for the rest of the game.`}
          >
            {/* Tooltip needs a ref-forwarding child, which NobleTile is not. */}
            <Box>
              <NobleTile noble={noble} size="mat" />
            </Box>
          </Tooltip>
        ))}
      </Flex>
    </VStack>
  );
};
