import { Box, Circle, Text, VStack } from "@chakra-ui/react";
import { BOARD_CARD_WIDTH, deckBackPalettes, levelRomanNumerals } from "../utils/cardVisuals";
import type { Card } from "../types/game";

interface DevelopmentDeckProps {
  level: Card["level"];
  remainingCards: number;
  /** Hide the "N left" pill for hardcore play; "Empty" always shows. */
  showCount?: boolean;
}

/**
 * The face-down draw pile for one card level, styled as a physical deck:
 * level-colored back with a lattice texture, Roman numeral, stacked-layer
 * offsets, and the remaining-card count on a pill.
 */
export const DevelopmentDeck = ({
  level,
  remainingCards,
  showCount = true,
}: DevelopmentDeckProps) => {
  const palette = deckBackPalettes[level];
  const label = levelRomanNumerals[level];
  const isEmpty = remainingCards === 0;

  return (
    <Box
      w={BOARD_CARD_WIDTH}
      sx={{ aspectRatio: "140 / 190" }}
      position="relative"
      flexShrink={0}
    >
      {[2, 1].map((offset) => (
        <Box
          key={offset}
          position="absolute"
          top={`${offset * 3}px`}
          left={`${offset * 3}px`}
          right={0}
          bottom={0}
          borderRadius="10px"
          bg={isEmpty ? "rgba(253, 249, 240, 0.18)" : "rgba(255, 250, 243, 0.6)"}
          border="1px solid rgba(107, 84, 48, 0.25)"
        />
      ))}

      <Box
        position="absolute"
        inset={0}
        borderRadius="10px"
        overflow="hidden"
        bg={
          isEmpty
            ? "linear-gradient(180deg, rgba(223, 215, 199, 0.35) 0%, rgba(194, 183, 156, 0.35) 100%)"
            : `linear-gradient(180deg, ${palette.top} 0%, ${palette.bottom} 100%)`
        }
        border="1px solid rgba(59, 50, 39, 0.55)"
        boxShadow="0 4px 10px rgba(10, 24, 18, 0.45)"
      >
        <Box
          position="absolute"
          inset="5px"
          borderRadius="7px"
          border={`1px solid ${isEmpty ? "rgba(101, 87, 62, 0.28)" : palette.border}`}
          opacity={0.82}
        />
        <Box
          position="absolute"
          inset={0}
          opacity={isEmpty ? 0.1 : 0.24}
          backgroundImage="linear-gradient(45deg, transparent 24%, rgba(255,255,255,0.7) 25%, rgba(255,255,255,0.7) 27%, transparent 28%, transparent 72%, rgba(255,255,255,0.7) 73%, rgba(255,255,255,0.7) 75%, transparent 76%), linear-gradient(-45deg, transparent 24%, rgba(255,255,255,0.6) 25%, rgba(255,255,255,0.6) 27%, transparent 28%, transparent 72%, rgba(255,255,255,0.6) 73%, rgba(255,255,255,0.6) 75%, transparent 76%)"
          backgroundSize="26px 26px"
        />

        <VStack
          h="100%"
          justify="center"
          spacing="clamp(6px, 1vw, 12px)"
          position="relative"
          color={isEmpty ? "rgba(249, 244, 232, 0.75)" : palette.ink}
        >
          <Circle
            size="clamp(36px, 3.6vw, 52px)"
            bg={isEmpty ? "rgba(250, 244, 232, 0.25)" : "rgba(255, 248, 235, 0.16)"}
            border={`1px solid ${isEmpty ? "rgba(249, 244, 232, 0.35)" : palette.border}`}
          >
            <Text
              fontFamily="Georgia, 'Times New Roman', serif"
              fontSize="clamp(16px, 1.8vw, 24px)"
              fontWeight="black"
              letterSpacing="0.08em"
            >
              {label}
            </Text>
          </Circle>

          {(showCount || isEmpty) && (
            <Box
              px={3}
              py={1}
              borderRadius="full"
              bg={isEmpty ? "rgba(250, 244, 232, 0.2)" : "rgba(255, 248, 235, 0.16)"}
              border={`1px solid ${isEmpty ? "rgba(249, 244, 232, 0.35)" : palette.border}`}
            >
              <Text fontSize="clamp(10px, 1vw, 13px)" fontWeight="bold" whiteSpace="nowrap">
                {isEmpty ? "Empty" : `${remainingCards} left`}
              </Text>
            </Box>
          )}
        </VStack>
      </Box>
    </Box>
  );
};
