import { Box, Flex, Image, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";
import type { GemType } from "../types/game";
import { gemChipColors, gemImages } from "../utils/constants";

interface GemChipProps {
  gem: GemType;
  count: number;
  isSelected?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  size?: string;
}

/**
 * A punch-board gem chip: colored outer ring, cream inner disc with the gem
 * illustration, and a parchment count badge. The gem image's direct parent is
 * the clickable element (the e2e suite locates chips through it).
 */
export const GemChip = ({
  gem,
  count,
  isSelected = false,
  isDisabled = false,
  onClick,
  size = "clamp(44px, 4.4vw, 62px)",
}: GemChipProps) => {
  const palette = gemChipColors[gem];
  const isGold = gem === "gold";

  return (
    <motion.div
      whileTap={!isDisabled && onClick ? { scale: 0.92 } : undefined}
      animate={{ scale: isSelected ? 1.08 : 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      style={{ position: "relative", flexShrink: 0 }}
    >
      <Flex
        w={size}
        h={size}
        borderRadius="full"
        align="center"
        justify="center"
        bg={`radial-gradient(circle at 35% 30%, #fffdf6 0%, ${palette.fill} 55%, ${palette.fill} 100%)`}
        border="5px solid"
        borderColor={palette.ring}
        outline={isGold ? `2px solid ${palette.ring}` : undefined}
        outlineOffset={isGold ? "2px" : undefined}
        cursor={isDisabled ? "not-allowed" : onClick ? "pointer" : "default"}
        onClick={!isDisabled ? onClick : undefined}
        opacity={isDisabled ? 0.35 : 1}
        transition="box-shadow 0.15s, opacity 0.15s"
        boxShadow={
          isSelected
            ? "0 0 0 3px rgba(217, 180, 91, 0.95), 0 3px 6px rgba(10, 24, 18, 0.5), 2px 2px 0 rgba(10, 24, 18, 0.3)"
            : "0 3px 6px rgba(10, 24, 18, 0.5), 2px 2px 0 rgba(10, 24, 18, 0.3), 3px 4px 0 rgba(10, 24, 18, 0.18)"
        }
      >
        <Image
          src={gemImages[gem]}
          alt={gem}
          boxSize="58%"
          pointerEvents="none"
          filter="drop-shadow(0 1px 1px rgba(0,0,0,0.3))"
        />
      </Flex>

      <Box
        position="absolute"
        bottom="-4px"
        right="-4px"
        minW="22px"
        h="22px"
        px="5px"
        borderRadius="full"
        bg="linear-gradient(160deg, #f9f4e8 0%, #eadfc6 100%)"
        border="1px solid rgba(111, 86, 45, 0.45)"
        boxShadow="0 1px 3px rgba(10, 24, 18, 0.4)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        pointerEvents="none"
      >
        <Text fontSize="12px" fontWeight="bold" color="#3b3227" lineHeight={1}>
          {count}
        </Text>
      </Box>
    </motion.div>
  );
};
