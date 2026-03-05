import { Box, HStack, Text, VStack, Image, Button } from "@chakra-ui/react";
import { useGameStore } from "../store/gameStore";
import { Card, GemType } from "../types/game";
import { gemColors, gemImages } from "../utils/constants";
import { canAffordCard } from "../../shared/game/selectors";

interface CardFieldProps {
  level: 1 | 2 | 3;
}

export const CardField = ({ level }: CardFieldProps) => {
  const { visibleCards, currentPlayer, players } = useGameStore();
  const purchaseCard = useGameStore((state) => state.purchaseCard);
  const reserveCard = useGameStore((state) => state.reserveCard);
  const assignNoblesAndEndTurn = useGameStore(
    (state) => state.assignNoblesAndEndTurn
  );

  const cards = visibleCards[`level${level}`];
  const player = players[currentPlayer];

  const canAfford = (card: Card) =>
    canAffordCard(player, card, useGameStore.getState().debugMode);

  const canReserveCard = () => {
    return player.reservedCards.length < 3;
  };

  return (
    <HStack spacing={4} align="start">
      {cards.map((card: Card, index: number) => (
        <Box
          key={index}
          position="relative"
          _hover={{
            "& > .card-actions": {
              opacity: 1,
            },
          }}
        >
          <Box
            w="150px"
            h="200px"
            bg={`linear-gradient(135deg, ${gemColors[card.gem].primary}, ${
              gemColors[card.gem].secondary
            })`}
            borderRadius="lg"
            p={3}
            position="relative"
            border="1px solid"
            borderColor={card.gem === "diamond" ? "gray.300" : "transparent"}
            overflow="visible"
            _before={{
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.1,
              borderRadius: "lg",
              background:
                "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)",
            }}
          >
            {/* Card Content */}
            <VStack h="100%" justify="space-between" align="stretch">
              <HStack justify="space-between">
                <Text
                  fontSize="2xl"
                  fontWeight="bold"
                  color={card.gem === "diamond" ? "black" : "white"}
                >
                  {card.points || ""}
                </Text>
                <Image
                  src={gemImages[card.gem]}
                  alt={card.gem}
                  boxSize="30px"
                />
              </HStack>

              <VStack align="stretch" spacing={1}>
                {Object.entries(card.cost)
                  .filter(([, count]) => count > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([gem, count]) => (
                    <HStack
                      key={gem}
                      justify="flex-end"
                      spacing={1}
                      p={1}
                      borderRadius="md"
                      bg={
                        card.gem === "diamond" ? "gray.100" : "rgba(0,0,0,0.2)"
                      }
                    >
                      <Text
                        fontSize="sm"
                        fontWeight="bold"
                        color={card.gem === "diamond" ? "black" : "white"}
                      >
                        {count}
                      </Text>
                      <Image
                        src={gemImages[gem as GemType]}
                        alt={gem}
                        boxSize="20px"
                      />
                    </HStack>
                  ))}
              </VStack>
            </VStack>
          </Box>

          {/* Hover Actions */}
          <VStack
            className="card-actions"
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            opacity={0}
            transition="all 0.2s"
            spacing={2}
            justify="center"
            bg="blackAlpha.700"
            borderRadius="lg"
            p={4}
          >
            <Button
              size="sm"
              width="full"
              colorScheme="blue"
              isDisabled={!canAfford(card)}
              onClick={() => {
                const success = purchaseCard(card, level);
                if (success) assignNoblesAndEndTurn();
              }}
            >
              {canAfford(card) ? "Purchase" : "Can't Afford"}
            </Button>
            <Button
              size="sm"
              width="full"
              colorScheme="gray"
              isDisabled={!canReserveCard()}
              onClick={() => {
                const success = reserveCard(card, level);
                if (success) assignNoblesAndEndTurn();
              }}
            >
              {canReserveCard() ? "Reserve" : "Reserve Full"}
            </Button>
          </VStack>
        </Box>
      ))}
    </HStack>
  );
};
