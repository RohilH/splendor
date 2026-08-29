import { Box, Flex, HStack, Image, Text } from "@chakra-ui/react";
import type { Card } from "../types/game";
import { gemChipColors, gemImages } from "../utils/constants";
import {
  BOARD_CARD_WIDTH,
  getCardArtworkDataUri,
  getCardCostEntries,
  getCardInkColor,
} from "../utils/cardVisuals";

interface DevelopmentCardProps {
  card: Card;
  /** board: full-size tableau card; compact: small summary (reserved rows). */
  size?: "board" | "compact";
}

const SIZES = {
  board: {
    width: ["100%", null, BOARD_CARD_WIDTH],
    pointsSize: "clamp(11px, 18cqw, 28px)",
    bonusSize: "clamp(11px, 16cqw, 26px)",
    costSize: "clamp(10px, 14cqw, 22px)",
    costFont: "clamp(8px, 10cqw, 13px)",
    bandPadding: 2,
  },
  compact: {
    width: "76px",
    pointsSize: "16px",
    bonusSize: "14px",
    costSize: "14px",
    costFont: "9px",
    bandPadding: 1,
  },
};

/**
 * A Splendor development card styled after the physical game: full-bleed
 * generated artwork, a translucent parchment band across the top carrying the
 * prestige points and bonus gem, and the cost as colored circles stacked in
 * the bottom-left corner.
 */
export const DevelopmentCard = ({
  card,
  size = "board",
}: DevelopmentCardProps) => {
  const dims = SIZES[size];
  const ink = getCardInkColor(card.gem);
  const costs = getCardCostEntries(card);

  return (
    <Box
      w={dims.width}
      sx={{ aspectRatio: "140 / 190", containerType: "inline-size" }}
      borderRadius={["6px", null, "10px"]}
      overflow="hidden"
      position="relative"
      // Inline style: Chakra's backgroundImage transform corrupts long
      // data-URI url() values, and the artwork is unique per card anyway.
      style={{ backgroundImage: getCardArtworkDataUri(card) }}
      backgroundSize="cover"
      backgroundPosition="center"
      border="1px solid rgba(59, 50, 39, 0.55)"
      boxShadow="0 4px 10px rgba(10, 24, 18, 0.45), inset 0 0 0 2px rgba(249, 244, 232, 0.25)"
      flexShrink={[1, null, 0]}
    >
      {/* Prestige band */}
      <Flex
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="26%"
        px={dims.bandPadding}
        align="center"
        justify="space-between"
        bg="linear-gradient(180deg, rgba(249, 244, 232, 0.88) 0%, rgba(249, 244, 232, 0.72) 78%, rgba(249, 244, 232, 0) 100%)"
        borderBottom="1px solid rgba(59, 50, 39, 0.12)"
      >
        <Text
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="bold"
          fontSize={dims.pointsSize}
          lineHeight={1}
          color={ink}
          textShadow="0 1px 0 rgba(255,255,255,0.5)"
        >
          {card.points || ""}
        </Text>
        <Image
          src={gemImages[card.gem]}
          alt={card.gem}
          boxSize={dims.bonusSize}
          filter="drop-shadow(0 1px 1px rgba(0,0,0,0.35))"
        />
      </Flex>

      {/* Cost circles */}
      <Flex
        position="absolute"
        bottom={["4px", null, "6px"]}
        left={["4px", null, "6px"]}
        direction="column-reverse"
        gap="3px"
      >
        {costs.map(([gem, count]) => (
          <HStack key={gem} spacing={0}>
            <Flex
              w={dims.costSize}
              h={dims.costSize}
              borderRadius="full"
              align="center"
              justify="center"
              bg={gemChipColors[gem].ring}
              border="1.5px solid rgba(249, 244, 232, 0.85)"
              boxShadow="0 1px 3px rgba(0,0,0,0.4)"
            >
              <Text
                fontSize={dims.costFont}
                fontWeight="bold"
                lineHeight={1}
                color={gem === "diamond" ? "#3b3227" : "white"}
                textShadow={
                  gem === "diamond" ? "none" : "0 1px 1px rgba(0,0,0,0.45)"
                }
              >
                {count}
              </Text>
            </Flex>
          </HStack>
        ))}
      </Flex>
    </Box>
  );
};

