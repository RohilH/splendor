import { Box, Flex, Text, VStack } from "@chakra-ui/react";
import type { Noble } from "../types/game";
import { GEM_ORDER, gemChipColors } from "../utils/constants";
import { getNobleArtworkDataUri } from "../utils/cardVisuals";

interface NobleTileProps {
  noble: Noble;
  /** board: tableau tile; modal: larger selectable tile. */
  size?: "board" | "modal";
  onClick?: () => void;
}

const SIZES = {
  board: {
    tile: "clamp(84px, min(8vw, 12.2vh), 110px)",
    points: "clamp(18px, 1.9vw, 26px)",
    req: "clamp(15px, 1.5vw, 20px)",
    reqFont: "clamp(9px, 0.9vw, 12px)",
  },
  modal: {
    tile: "150px",
    points: "30px",
    req: "24px",
    reqFont: "13px",
  },
} as const;

/**
 * A square noble tile like the physical punch-board piece: parchment frame,
 * generated portrait, and a translucent strip down the left edge with the
 * prestige points above the stacked requirement squares.
 */
export const NobleTile = ({ noble, size = "board", onClick }: NobleTileProps) => {
  const dims = SIZES[size];

  return (
    <Box
      w={dims.tile}
      h={dims.tile}
      borderRadius="10px"
      overflow="hidden"
      position="relative"
      // Inline style: Chakra's backgroundImage transform corrupts long
      // data-URI url() values, and the portrait is unique per noble anyway.
      style={{ backgroundImage: getNobleArtworkDataUri(noble) }}
      backgroundSize="cover"
      backgroundPosition="center"
      // Ornate gold double frame — deliberately unlike the parchment-banded
      // development cards, so nobles read as portrait tiles at a glance.
      border="2px solid #b98a2f"
      boxShadow="0 4px 10px rgba(10, 24, 18, 0.5), inset 0 0 0 2px rgba(20, 14, 6, 0.55), inset 0 0 0 4px rgba(217, 180, 91, 0.75)"
      flexShrink={0}
      cursor={onClick ? "pointer" : "default"}
      onClick={onClick}
      transition="transform 0.15s, box-shadow 0.15s"
      _hover={
        onClick
          ? {
              transform: "translateY(-3px) scale(1.03)",
              boxShadow:
                "0 0 0 3px rgba(217, 180, 91, 0.9), 0 8px 16px rgba(10, 24, 18, 0.5)",
            }
          : undefined
      }
    >
      <VStack
        position="absolute"
        top={0}
        left={0}
        bottom={0}
        w="34%"
        py={1}
        spacing={1}
        justify="flex-start"
        bg="linear-gradient(90deg, rgba(247, 239, 221, 0.96) 0%, rgba(247, 239, 221, 0.92) 78%, rgba(247, 239, 221, 0) 100%)"
        borderRight="1px solid rgba(185, 138, 47, 0.35)"
      >
        <Text
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="bold"
          fontSize={dims.points}
          lineHeight={1.1}
          color="#3b3227"
          textShadow="0 1px 0 rgba(255,255,255,0.5)"
        >
          {noble.points}
        </Text>

        <VStack spacing="2px">
          {GEM_ORDER.filter((gem) => (noble.requirements[gem] ?? 0) > 0).map(
            (gem) => (
              <Flex
                key={gem}
                // Mini card-shaped rect (taller than wide), like the physical
                // tile's requirement markers.
                w={`calc(${dims.req} * 0.8)`}
                h={dims.req}
                borderRadius="3px"
                align="center"
                justify="center"
                bg={gemChipColors[gem].ring}
                border="1px solid rgba(249, 244, 232, 0.85)"
                boxShadow="0 1px 2px rgba(0,0,0,0.35)"
              >
                <Text
                  fontSize={dims.reqFont}
                  fontWeight="bold"
                  lineHeight={1}
                  color={gem === "diamond" ? "#3b3227" : "white"}
                >
                  {noble.requirements[gem]}
                </Text>
              </Flex>
            )
          )}
        </VStack>
      </VStack>
    </Box>
  );
};
