import {
  Box,
  HStack,
  Text,
  VStack,
  Image,
  Button,
  Tooltip,
  useBreakpointValue,
} from "@chakra-ui/react";
import { GemType, Card, Player } from "../types/game";
import { countGemBonuses } from "../../shared/game/selectors";
import type { OnlinePlayer } from "../../shared/onlineTypes";
import { gemImages, bankGemColors } from "../utils/constants";

interface CardSummaryProps {
  card: Card;
  onClick?: () => void;
  canAfford: boolean;
  isDisabled?: boolean;
}

const CardSummary = ({
  card,
  onClick,
  canAfford,
  isDisabled = false,
}: CardSummaryProps) => {
  return (
    <Box position="relative">
      <Tooltip
        label={
          <VStack p={2} spacing={1}>
            <Text>
              Level {card.level} {card.gem} Card
            </Text>
            <Text>Points: {card.points}</Text>
            <Text fontWeight="bold">Cost:</Text>
            {Object.entries(card.cost).map(
              ([gem, count]) =>
                count > 0 && (
                  <HStack key={gem}>
                    <Image
                      src={gemImages[gem as GemType]}
                      alt={gem}
                      boxSize="15px"
                    />
                    <Text>× {count}</Text>
                  </HStack>
                )
            )}
          </VStack>
        }
      >
        <Box
          w={["32px", null, "40px"]}
          h={["44px", null, "56px"]}
          bg={bankGemColors[card.gem].bg}
          borderRadius="md"
          display="flex"
          alignItems="center"
          justifyContent="center"
          position="relative"
          cursor={onClick && canAfford && !isDisabled ? "pointer" : "default"}
          onClick={onClick && canAfford && !isDisabled ? onClick : undefined}
          border="1px solid"
          borderColor={card.gem === "diamond" ? "gray.300" : "transparent"}
          opacity={isDisabled ? 0.7 : 1}
          _hover={{
            "& > .card-actions": {
              opacity: 1,
            },
          }}
        >
          <Text
            fontSize="lg"
            fontWeight="bold"
            color={card.gem === "diamond" ? "black" : "white"}
          >
            {card.points || "·"}
          </Text>

          {onClick && (
            <Box
              className="card-actions"
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              opacity={0}
              transition="all 0.2s"
              bg="blackAlpha.700"
              borderRadius="md"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Button
                size="xs"
                colorScheme={canAfford ? "blue" : "gray"}
                isDisabled={!canAfford || isDisabled}
                onClick={onClick}
              >
                {canAfford ? "Buy" : "Can't Buy"}
              </Button>
            </Box>
          )}
        </Box>
      </Tooltip>
    </Box>
  );
};

interface ActivePlayerAreaProps {
  activePlayer: Player | OnlinePlayer;
  selectedGems: Record<GemType, number>;
  onRemoveSelectedGem: (gemType: GemType) => void;
  onTakeSelectedGems: (gems: Partial<Record<GemType, number>>) => boolean | void;
  onEndTurn: () => void;
  onPurchaseReservedCard: (cardIndex: number) => void;
  canAffordReservedCard: (card: Card) => boolean;
  isGameOver: boolean;
  title: string;
  primaryActionLabel: string;
  isInteractionDisabled: boolean;
}

export const ActivePlayerArea = ({
  activePlayer,
  selectedGems,
  onRemoveSelectedGem,
  onTakeSelectedGems,
  onEndTurn,
  onPurchaseReservedCard,
  canAffordReservedCard,
  isGameOver,
  title,
  primaryActionLabel,
  isInteractionDisabled,
}: ActivePlayerAreaProps) => {
  const gemBonuses = countGemBonuses(activePlayer);
  const resolvedInteractionDisabled = isGameOver || isInteractionDisabled;
  const isMobile = useBreakpointValue({ base: true, md: false }, { fallback: "md" });

  const handleEndTurn = () => {
    const hasSelectedGems = Object.values(selectedGems).some(
      (count) => count > 0
    );
    if (hasSelectedGems) {
      onTakeSelectedGems(selectedGems);
    } else {
      onEndTurn();
    }
  };

  const handleGemClick = (gemType: GemType) => {
    if (resolvedInteractionDisabled) return;
    if (selectedGems[gemType] > 0) {
      onRemoveSelectedGem(gemType);
    }
  };

  const handleReservedCardClick = (index: number) => {
    if (resolvedInteractionDisabled) return;
    onPurchaseReservedCard(index);
  };

  const displayGems = { ...activePlayer.gems };
  Object.entries(selectedGems).forEach(([gem, count]) => {
    if (count > 0) {
      displayGems[gem as GemType] = (displayGems[gem as GemType] || 0) + count;
    }
  });

  if (isMobile) {
    return (
      <Box
        position="relative"
        flexShrink={0}
        bg="repeating-linear-gradient(90deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 2px, transparent 2px, transparent 90px), repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 14px), linear-gradient(180deg, #5a3d26 0%, #4a3220 45%, #3e2a1a 100%)"
        borderTop="3px solid rgba(217, 180, 91, 0.6)"
        boxShadow="0 -6px 18px rgba(6, 22, 15, 0.55)"
        px={2}
        py={1}
        pb="max(4px, env(safe-area-inset-bottom))"
        zIndex={10}
      >
        <VStack spacing={1} align="stretch">
          <HStack justify="space-between" align="center" spacing={2}>
            <Text fontSize="xs" fontWeight="bold" color="tableGold.300" noOfLines={1} fontFamily="Georgia, 'Times New Roman', serif">
              {title}
            </Text>
            <HStack spacing={1} flexShrink={0}>
              {activePlayer.reservedCards.length > 0 &&
                activePlayer.reservedCards.map((card, index) => (
                  <CardSummary
                    key={index}
                    card={card}
                    onClick={() => handleReservedCardClick(index)}
                    canAfford={canAffordReservedCard(card)}
                    isDisabled={resolvedInteractionDisabled}
                  />
                ))}
            </HStack>
          </HStack>

          <HStack spacing={2} overflowX="auto">
            <Box bg="linear-gradient(160deg, rgba(249, 244, 232, 0.94) 0%, rgba(234, 223, 198, 0.94) 100%)" px={2} py={1} borderRadius="md" border="1px solid" borderColor="rgba(111, 86, 45, 0.35)" flexShrink={0}>
              <VStack spacing={0.5} align="start">
                <Text fontSize="2xs" fontWeight="bold" color="ink.500" textTransform="uppercase" letterSpacing="wide">
                  Coins
                </Text>
                <HStack spacing={1.5}>
                  {(Object.entries(displayGems) as [GemType, number][]).map(
                    ([gem, count]) => (
                      <Box
                        key={gem}
                        w="20px"
                        h="20px"
                        bg={bankGemColors[gem].bg}
                        borderRadius="full"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        border="1px solid"
                        borderColor={
                          count > 0 ? bankGemColors[gem].border : "gray.200"
                        }
                        opacity={count > 0 ? 1 : 0.3}
                        cursor={
                          selectedGems[gem] > 0 && !resolvedInteractionDisabled
                            ? "pointer"
                            : "default"
                        }
                        onClick={() => handleGemClick(gem)}
                        boxShadow={selectedGems[gem] > 0 ? "0 0 0 2px var(--chakra-colors-green-400)" : "none"}
                      >
                        {count > 0 && (
                          <Text
                            fontSize="2xs"
                            fontWeight="bold"
                            color={gem === "diamond" ? "gray.800" : "white"}
                          >
                            {count}
                          </Text>
                        )}
                      </Box>
                    )
                  )}
                </HStack>
              </VStack>
            </Box>

            <Box bg="linear-gradient(160deg, rgba(249, 244, 232, 0.94) 0%, rgba(234, 223, 198, 0.94) 100%)" px={2} py={1} borderRadius="md" border="1px solid" borderColor="rgba(111, 86, 45, 0.35)" flexShrink={0}>
              <VStack spacing={0.5} align="start">
                <Text fontSize="2xs" fontWeight="bold" color="ink.500" textTransform="uppercase" letterSpacing="wide">
                  Cards
                </Text>
                <HStack spacing={1.5}>
                  {(Object.entries(gemBonuses) as [GemType, number][]).map(
                    ([gem, count]) => (
                      <Box
                        key={gem}
                        position="relative"
                        w="20px"
                        h="26px"
                        bg={bankGemColors[gem].bg}
                        borderRadius="sm"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        border="1px solid"
                        borderColor={
                          count > 0 ? bankGemColors[gem].border : "gray.200"
                        }
                        opacity={count > 0 ? 1 : 0.3}
                        _before={{
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          opacity: 0.15,
                          borderRadius: "sm",
                          background:
                            "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.2) 3px, rgba(255,255,255,0.2) 6px)",
                        }}
                      >
                        {count > 0 && (
                          <Text
                            fontSize="2xs"
                            fontWeight="bold"
                            color={gem === "diamond" ? "gray.800" : "white"}
                          >
                            {count}
                          </Text>
                        )}
                      </Box>
                    )
                  )}
                </HStack>
              </VStack>
            </Box>
          </HStack>

          <Button
            colorScheme="yellow"
            bg="tableGold.400"
            color="ink.900"
            _hover={{ bg: "tableGold.300" }}
            size="sm"
            w="100%"
            h="32px"
            onClick={handleEndTurn}
            isDisabled={resolvedInteractionDisabled}
          >
            {primaryActionLabel}
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      bg="repeating-linear-gradient(90deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 2px, transparent 2px, transparent 90px), repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 14px), linear-gradient(180deg, #5a3d26 0%, #4a3220 45%, #3e2a1a 100%)"
      borderTop="3px solid rgba(217, 180, 91, 0.6)"
      boxShadow="0 -6px 18px rgba(6, 22, 15, 0.55)"
      p={3}
    >
      <HStack justify="space-between" align="start" spacing={6}>
        <VStack align="start" spacing={3} flex={1}>
          <Text fontSize="lg" fontWeight="bold" color="tableGold.300" fontFamily="Georgia, 'Times New Roman', serif">
            {title}
          </Text>

          <HStack spacing={4} w="100%" align="start">
            <Box bg="linear-gradient(160deg, rgba(249, 244, 232, 0.94) 0%, rgba(234, 223, 198, 0.94) 100%)" px={3} py={2} borderRadius="lg" border="1px solid" borderColor="rgba(111, 86, 45, 0.35)">
              <VStack align="start">
                <Text fontSize="xs" fontWeight="bold" color="ink.500" textTransform="uppercase" letterSpacing="wide">
                  Coins
                </Text>
                <HStack spacing={3}>
                  {(Object.entries(displayGems) as [GemType, number][]).map(
                    ([gem, count]) => (
                      <VStack
                        key={gem}
                        spacing={1}
                        cursor={
                          selectedGems[gem] > 0 && !resolvedInteractionDisabled
                            ? "pointer"
                            : "default"
                        }
                        onClick={() => handleGemClick(gem)}
                      >
                        <Box
                          w="30px"
                          h="30px"
                          bg={bankGemColors[gem].bg}
                          borderRadius="full"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          border="2px solid"
                          borderColor={
                            count > 0 ? bankGemColors[gem].border : "gray.200"
                          }
                          opacity={count > 0 ? 1 : 0.3}
                          transition="all 0.15s"
                          boxShadow={selectedGems[gem] > 0 ? "0 0 0 2px var(--chakra-colors-green-400)" : "none"}
                        >
                          <Text
                            fontSize="sm"
                            fontWeight="bold"
                            color={gem === "diamond" ? "gray.800" : "white"}
                          >
                            {count > 0 ? count : ""}
                          </Text>
                        </Box>
                      </VStack>
                    )
                  )}
                </HStack>
              </VStack>
            </Box>

            <Box bg="linear-gradient(160deg, rgba(249, 244, 232, 0.94) 0%, rgba(234, 223, 198, 0.94) 100%)" px={3} py={2} borderRadius="lg" border="1px solid" borderColor="rgba(111, 86, 45, 0.35)">
              <VStack align="start">
                <Text fontSize="xs" fontWeight="bold" color="ink.500" textTransform="uppercase" letterSpacing="wide">
                  Cards
                </Text>
                <HStack spacing={3}>
                  {(Object.entries(gemBonuses) as [GemType, number][]).map(
                    ([gem, count]) => (
                      <VStack key={gem} spacing={1}>
                        <Box
                          position="relative"
                          w="30px"
                          h="40px"
                          bg={bankGemColors[gem].bg}
                          borderRadius="md"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          border="2px solid"
                          borderColor={
                            count > 0 ? bankGemColors[gem].border : "gray.200"
                          }
                          opacity={count > 0 ? 1 : 0.3}
                          _before={{
                            content: '""',
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            opacity: 0.15,
                            borderRadius: "md",
                            background:
                              "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.2) 4px, rgba(255,255,255,0.2) 8px)",
                          }}
                        >
                          <Text
                            fontSize="sm"
                            fontWeight="bold"
                            color={gem === "diamond" ? "gray.800" : "white"}
                          >
                            {count > 0 ? count : ""}
                          </Text>
                        </Box>
                      </VStack>
                    )
                  )}
                </HStack>
              </VStack>
            </Box>

            <Box bg="linear-gradient(160deg, rgba(249, 244, 232, 0.94) 0%, rgba(234, 223, 198, 0.94) 100%)" px={3} py={2} borderRadius="lg" border="1px solid" borderColor="rgba(111, 86, 45, 0.35)">
              <VStack align="start">
                <Text fontSize="xs" fontWeight="bold" color="ink.500" textTransform="uppercase" letterSpacing="wide">
                  Reserved ({activePlayer.reservedCards.length}/3)
                </Text>
                <HStack spacing={2}>
                  {activePlayer.reservedCards.map((card, index) => (
                    <CardSummary
                      key={index}
                      card={card}
                      onClick={() => handleReservedCardClick(index)}
                      canAfford={canAffordReservedCard(card)}
                      isDisabled={resolvedInteractionDisabled}
                    />
                  ))}
                  {activePlayer.reservedCards.length === 0 && (
                    <Text fontSize="sm" color="ink.500" opacity={0.6}>None</Text>
                  )}
                </HStack>
              </VStack>
            </Box>
          </HStack>
        </VStack>

        <Button
          colorScheme="yellow"
          bg="tableGold.400"
          color="ink.900"
          _hover={{ bg: "tableGold.300" }}
          size="lg"
          onClick={handleEndTurn}
          isDisabled={resolvedInteractionDisabled}
        >
          {primaryActionLabel}
        </Button>
      </HStack>
    </Box>
  );
};
