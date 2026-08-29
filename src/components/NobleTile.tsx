import { Box, Flex, Text, VStack } from "@chakra-ui/react";
import type { Noble } from "../types/game";
import { GEM_ORDER, gemChipColors } from "../utils/constants";
import { getNobleArtworkDataUri } from "../utils/cardVisuals";

interface NobleTileProps {
  noble: Noble;
  /**
   * board: tableau tile; modal: larger selectable tile; mat: compact tile for a
   * player's claimed nobles, where the requirements are already satisfied.
   */
  size?: "board" | "modal" | "mat";
  onClick?: () => void;
}

const ORNATE_FRAME =
  "0 4px 10px rgba(10, 24, 18, 0.5), inset 0 0 0 2px rgba(20, 14, 6, 0.55), inset 0 0 0 4px rgba(217, 180, 91, 0.75)";

const SIZES = {
  board: {
    tile: [
      "clamp(44px, 14vw, 64px)",
      null,
      "clamp(84px, min(8vw, 12.2vh), 110px)",
    ],
    strip: "34%",
    points: ["clamp(11px, 22cqw, 18px)", null, "clamp(18px, 1.9vw, 26px)"],
    req: ["clamp(9px, 16cqw, 14px)", null, "clamp(15px, 1.5vw, 20px)"],
    reqFont: ["clamp(7px, 12cqw, 10px)", null, "clamp(9px, 0.9vw, 12px)"],
    radius: ["6px", null, "10px"],
    border: "2px solid #b98a2f",
    frame: ORNATE_FRAME,
    showRequirements: true,
  },
  modal: {
    tile: "150px",
    strip: "34%",
    points: "30px",
    req: "24px",
    reqFont: "13px",
    radius: ["6px", null, "10px"],
    border: "2px solid #b98a2f",
    frame: ORNATE_FRAME,
    showRequirements: true,
  },
  mat: {
    tile: "36px",
    strip: "42%",
    points: "13px",
    req: "0px",
    reqFont: "0px",
    radius: "6px",
    border: "1px solid #b98a2f",
    frame:
      "0 2px 4px rgba(10, 24, 18, 0.45), inset 0 0 0 1px rgba(217, 180, 91, 0.8)",
    showRequirements: false,
  },
};

/**
 * Requirement markers are 0.8× as wide as they are tall. Sizes can be
 * responsive arrays, which cannot be interpolated into a single calc() string.
 */
const scaleReqWidth = (
  req: string | Array<string | null>
): string | Array<string | null> =>
  Array.isArray(req)
    ? req.map((value) => (value === null ? null : `calc(${value} * 0.8)`))
    : `calc(${req} * 0.8)`;

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
      borderRadius={dims.radius}
      overflow="hidden"
      position="relative"
      sx={{ containerType: "inline-size" }}
      // Inline style: Chakra's backgroundImage transform corrupts long
      // data-URI url() values, and the portrait is unique per noble anyway.
      style={{ backgroundImage: getNobleArtworkDataUri(noble) }}
      backgroundSize="cover"
      backgroundPosition="center"
      // Ornate gold double frame — deliberately unlike the parchment-banded
      // development cards, so nobles read as portrait tiles at a glance.
      border={dims.border}
      boxShadow={dims.frame}
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
        w={dims.strip}
        py={1}
        spacing={1}
        justify={dims.showRequirements ? "flex-start" : "center"}
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

        {dims.showRequirements && (
          <VStack spacing="2px">
            {GEM_ORDER.filter((gem) => (noble.requirements[gem] ?? 0) > 0).map(
              (gem) => (
                <Flex
                  key={gem}
                  // Mini card-shaped rect (taller than wide), like the physical
                  // tile's requirement markers.
                  w={scaleReqWidth(dims.req)}
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
        )}
      </VStack>
    </Box>
  );
};
