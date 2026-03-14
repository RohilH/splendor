import { Box, HStack, Text, VStack, Image, Button } from "@chakra-ui/react";
import { Card, GemType } from "../types/game";
import { gemColors, gemImages } from "../utils/constants";

interface CardFieldProps {
  level: 1 | 2 | 3;
  cards: Card[];
  canAfford: (card: Card) => boolean;
  canReserveCard: boolean;
  onPurchase: (card: Card, cardIndex: number) => void;
  onReserve: (card: Card, cardIndex: number) => void;
}

export const CardField = ({
  cards,
  canAfford,
  canReserveCard,
  onPurchase,
  onReserve,
}: CardFieldProps) => {
  return (
    <Box
      display={["grid", null, "flex"]}
      gridTemplateColumns="repeat(4, 1fr)"
      gap={[1, null, 4]}
      overflowX={["hidden", null, "auto"]}
      w="100%"
      alignItems="start"
    >
      {cards.map((card: Card, index: number) => (
        <Box
          key={index}
          position="relative"
          flexShrink={0}
          _hover={{
            "& > .card-actions": {
              opacity: 1,
            },
          }}
        >
          <Box
            w={["100%", null, "150px"]}
            h={["auto", null, "200px"]}
            aspectRatio={["5 / 7", null, "auto"]}
            bg={`linear-gradient(135deg, ${gemColors[card.gem].primary}, ${
              gemColors[card.gem].secondary
            })`}
            borderRadius="lg"
            p={[2, null, 3]}
            position="relative"
            border="1px solid"
            borderColor={card.gem === "diamond" ? "gray.300" : "transparent"}
            overflow="hidden"
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
            <VStack h="100%" justify="space-between" align="stretch">
              <HStack justify="space-between">
                <Text
                  fontSize={["md", null, "2xl"]}
                  fontWeight="bold"
                  color={card.gem === "diamond" ? "black" : "white"}
                >
                  {card.points || ""}
                </Text>
                <Image
                  src={gemImages[card.gem]}
                  alt={card.gem}
                  boxSize={["18px", null, "30px"]}
                />
              </HStack>

              <VStack align="stretch" spacing={[0.5, null, 1]}>
                {Object.entries(card.cost)
                  .filter(([, count]) => count > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([gem, count]) => (
                    <HStack
                      key={gem}
                      justify="flex-end"
                      spacing={1}
                      p={[0.5, null, 1]}
                      borderRadius="md"
                      bg={
                        card.gem === "diamond"
                          ? "gray.100"
                          : "rgba(0,0,0,0.2)"
                      }
                    >
                      <Text
                        fontSize={["xs", null, "sm"]}
                        fontWeight="bold"
                        color={card.gem === "diamond" ? "black" : "white"}
                      >
                        {count}
                      </Text>
                      <Image
                        src={gemImages[gem as GemType]}
                        alt={gem}
                        boxSize={["14px", null, "20px"]}
                      />
                    </HStack>
                  ))}
              </VStack>
            </VStack>
          </Box>

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
            p={[2, null, 4]}
          >
            <Button
              size="sm"
              width="full"
              colorScheme="blue"
              isDisabled={!canAfford(card)}
              onClick={() => onPurchase(card, index)}
            >
              {canAfford(card) ? "Purchase" : "Can't Afford"}
            </Button>
            <Button
              size="sm"
              width="full"
              colorScheme="gray"
              isDisabled={!canReserveCard}
              onClick={() => onReserve(card, index)}
            >
              {canReserveCard ? "Reserve" : "Reserve Full"}
            </Button>
          </VStack>
        </Box>
      ))}
    </Box>
  );
};
