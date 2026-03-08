import { useMemo } from "react";
import {
  Box,
  Circle,
  Grid,
  HStack,
  Image,
  Text,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { Card, GemType } from "../types/game";
import { gemColors, gemImages } from "../utils/constants";
import {
  getCardArtworkDataUri,
  getCardCostEntries,
  getCardInkColor,
} from "../utils/splendorCardVisuals";

interface DevelopmentCardProps {
  card: Card;
  size?: "board" | "compact";
}

const sizeConfig = {
  board: {
    width: "168px",
    height: "228px",
    radius: "22px",
    padding: 3,
    pointSize: "lg",
    pointBox: "34px",
    gemBox: "44px",
    artworkHeight: "118px",
    costIcon: "16px",
    costFont: "md",
    costMinWidth: "68px",
    costPaddingX: 2,
    costPaddingY: 1,
    shadow: "0 16px 30px rgba(24, 20, 14, 0.22)",
  },
  compact: {
    width: "64px",
    height: "90px",
    radius: "16px",
    padding: 2,
    pointSize: "11px",
    pointBox: "20px",
    gemBox: "24px",
    artworkHeight: "40px",
    costIcon: "9px",
    costFont: "10px",
    costMinWidth: "22px",
    costPaddingX: 1,
    costPaddingY: 0.5,
    shadow: "0 10px 18px rgba(24, 20, 14, 0.18)",
  },
} as const;

const CostChip = ({
  gem,
  count,
  size,
}: {
  gem: Exclude<GemType, "gold">;
  count: number;
  size: keyof typeof sizeConfig;
}) => {
  const config = sizeConfig[size];

  return (
    <HStack
      spacing={1}
      minW={config.costMinWidth}
      px={config.costPaddingX}
      py={config.costPaddingY}
      borderRadius="full"
      bg="rgba(247, 242, 232, 0.96)"
      border="1px solid rgba(102, 79, 44, 0.24)"
      boxShadow="inset 0 1px 0 rgba(255, 255, 255, 0.8)"
    >
      <Circle
        size={size === "board" ? "20px" : "11px"}
        bg={`${gemColors[gem].accent}22`}
        border="1px solid rgba(77, 60, 33, 0.16)"
      >
        <Image src={gemImages[gem]} alt={gem} boxSize={config.costIcon} />
      </Circle>
      <Text
        fontSize={config.costFont}
        fontWeight="bold"
        lineHeight={1}
        color="#3b3227"
      >
        {count}
      </Text>
    </HStack>
  );
};

export const DevelopmentCard = ({
  card,
  size = "board",
}: DevelopmentCardProps) => {
  const config = sizeConfig[size];
  const costEntries = getCardCostEntries(card);
  const artwork = useMemo(() => getCardArtworkDataUri(card), [card]);
  const inkColor = getCardInkColor(card.gem);

  return (
    <Box
      w={config.width}
      h={config.height}
      borderRadius={config.radius}
      position="relative"
      overflow="hidden"
      bg="linear-gradient(180deg, #f9f4e8 0%, #eadfc6 100%)"
      border="1px solid rgba(111, 86, 45, 0.45)"
      boxShadow={config.shadow}
      p={config.padding}
      _before={{
        content: '""',
        position: "absolute",
        inset: "6px",
        borderRadius: size === "board" ? "18px" : "12px",
        border: "1px solid rgba(118, 92, 54, 0.26)",
        pointerEvents: "none",
      }}
      _after={{
        content: '""',
        position: "absolute",
        inset: 0,
        opacity: 0.24,
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 2px, transparent 2px, transparent 8px)",
        pointerEvents: "none",
      }}
    >
      <Box
        position="absolute"
        top={0}
        right={0}
        w={size === "board" ? "42%" : "46%"}
        h={size === "board" ? "20%" : "23%"}
        bg={`linear-gradient(135deg, ${gemColors[card.gem].primary}00 0%, ${gemColors[card.gem].secondary}66 100%)`}
        clipPath="polygon(38% 0, 100% 0, 100% 100%, 0 100%)"
        pointerEvents="none"
      />

      <VStack align="stretch" spacing={size === "board" ? 3 : 1.5} h="100%">
        <HStack justify="space-between" align="start">
          <Box minH={config.pointBox}>
            {card.points > 0 ? (
              <Circle
                size={config.pointBox}
                bg="rgba(252, 248, 238, 0.96)"
                border="1px solid rgba(104, 81, 44, 0.35)"
                boxShadow="0 2px 8px rgba(49, 38, 20, 0.12)"
              >
                <Text
                  fontSize={config.pointSize}
                  fontWeight="extrabold"
                  color={inkColor}
                  lineHeight={1}
                >
                  {card.points}
                </Text>
              </Circle>
            ) : (
              <Box w={config.pointBox} h={config.pointBox} />
            )}
          </Box>

          <Circle
            size={config.gemBox}
            bg="rgba(252, 248, 238, 0.96)"
            border="1px solid rgba(104, 81, 44, 0.35)"
            boxShadow="0 2px 8px rgba(49, 38, 20, 0.12)"
          >
            <Image
              src={gemImages[card.gem]}
              alt={`${card.gem} bonus`}
              boxSize={size === "board" ? "24px" : "13px"}
            />
          </Circle>
        </HStack>

        <Box
          h={config.artworkHeight}
          borderRadius={size === "board" ? "16px" : "10px"}
          overflow="hidden"
          border="1px solid rgba(96, 73, 40, 0.22)"
          bgImage={artwork}
          bgSize="cover"
          bgPosition="center"
          position="relative"
        >
          <Box
            position="absolute"
            inset={0}
            bg="linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(32,20,10,0.12) 100%)"
          />
        </Box>

        {size === "board" ? (
          <Wrap spacing={1.5} maxW="78%">
            {costEntries.map(([gem, count]) => (
              <WrapItem key={gem}>
                <CostChip gem={gem} count={count} size={size} />
              </WrapItem>
            ))}
          </Wrap>
        ) : (
          <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={1}>
            {costEntries.map(([gem, count]) => (
              <CostChip key={gem} gem={gem} count={count} size={size} />
            ))}
          </Grid>
        )}
      </VStack>
    </Box>
  );
};
