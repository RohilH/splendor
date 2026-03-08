import { Box, Circle, HStack, Text, VStack } from "@chakra-ui/react";
import { deckBackPalettes, levelRomanNumerals } from "../utils/splendorCardVisuals";
import type { Card } from "../types/game";

interface DevelopmentDeckProps {
  level: Card["level"];
  remainingCards: number;
}

export const DevelopmentDeck = ({
  level,
  remainingCards,
}: DevelopmentDeckProps) => {
  const palette = deckBackPalettes[level];
  const label = levelRomanNumerals[level];
  const isEmpty = remainingCards === 0;

  return (
    <Box w="168px" h="228px" position="relative" flexShrink={0}>
      {[2, 1].map((offset) => (
        <Box
          key={offset}
          position="absolute"
          top={`${offset * 4}px`}
          left={`${offset * 4}px`}
          right={0}
          bottom={0}
          borderRadius="22px"
          bg={isEmpty ? "rgba(253, 249, 240, 0.28)" : "rgba(255, 250, 243, 0.72)"}
          border="1px solid rgba(107, 84, 48, 0.18)"
        />
      ))}

      <Box
        position="absolute"
        inset={0}
        borderRadius="22px"
        overflow="hidden"
        bg={
          isEmpty
            ? "linear-gradient(180deg, #dfd7c7 0%, #c2b79c 100%)"
            : `linear-gradient(180deg, ${palette.top} 0%, ${palette.bottom} 100%)`
        }
        border="1px solid rgba(111, 86, 45, 0.45)"
        boxShadow="0 16px 30px rgba(24, 20, 14, 0.22)"
      >
        <Box
          position="absolute"
          inset="6px"
          borderRadius="18px"
          border={`1px solid ${isEmpty ? "rgba(101, 87, 62, 0.28)" : palette.border}`}
          opacity={0.82}
        />
        <Box
          position="absolute"
          inset={0}
          opacity={isEmpty ? 0.12 : 0.26}
          backgroundImage="linear-gradient(45deg, transparent 24%, rgba(255,255,255,0.7) 25%, rgba(255,255,255,0.7) 27%, transparent 28%, transparent 72%, rgba(255,255,255,0.7) 73%, rgba(255,255,255,0.7) 75%, transparent 76%), linear-gradient(-45deg, transparent 24%, rgba(255,255,255,0.6) 25%, rgba(255,255,255,0.6) 27%, transparent 28%, transparent 72%, rgba(255,255,255,0.6) 73%, rgba(255,255,255,0.6) 75%, transparent 76%)"
          backgroundSize="34px 34px"
        />

        <VStack
          h="100%"
          justify="center"
          spacing={4}
          position="relative"
          color={isEmpty ? "#5a4a34" : palette.ink}
        >
          <Circle
            size="64px"
            bg={isEmpty ? "rgba(250, 244, 232, 0.85)" : "rgba(255, 248, 235, 0.16)"}
            border={`1px solid ${isEmpty ? "rgba(111, 86, 45, 0.24)" : palette.border}`}
          >
            <Text fontSize="3xl" fontWeight="black" letterSpacing="0.08em">
              {label}
            </Text>
          </Circle>

          <Text fontSize="xs" fontWeight="semibold" letterSpacing="0.24em">
            DEVELOPMENT
          </Text>

          <HStack spacing={2}>
            {Array.from({ length: level }).map((_, index) => (
              <Circle
                key={index}
                size="10px"
                bg={isEmpty ? "rgba(90, 74, 52, 0.55)" : palette.ink}
                opacity={0.85}
              />
            ))}
          </HStack>

          <Box
            px={4}
            py={2}
            borderRadius="full"
            bg={isEmpty ? "rgba(250, 244, 232, 0.82)" : "rgba(255, 248, 235, 0.16)"}
            border={`1px solid ${isEmpty ? "rgba(111, 86, 45, 0.24)" : palette.border}`}
          >
            <Text fontSize="sm" fontWeight="bold">
              {isEmpty ? "Deck Empty" : `${remainingCards} left`}
            </Text>
          </Box>
        </VStack>
      </Box>
    </Box>
  );
};
