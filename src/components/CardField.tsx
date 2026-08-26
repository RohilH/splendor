import { Box, Button, VStack } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { Card } from "../types/game";
import { DevelopmentCard } from "./DevelopmentCard";

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
      gap={[1.5, null, 3]}
      w="100%"
      alignItems={["stretch", null, "start"]}
    >
      {cards.map((card: Card, index: number) => (
        <motion.div
          key={index}
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
          style={{ position: "relative", flexShrink: 0 }}
        >
          <Box
            position="relative"
            _hover={{
              "& > .card-actions": {
                opacity: 1,
              },
            }}
          >
            <DevelopmentCard card={card} />

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
              borderRadius="10px"
              p={[2, null, 3]}
            >
              <Button
                size="sm"
                width="full"
                colorScheme="yellow"
                bg="tableGold.400"
                color="ink.900"
                _hover={{ bg: "tableGold.300" }}
                isDisabled={!canAfford(card)}
                onClick={() => onPurchase(card, index)}
              >
                {canAfford(card) ? "Purchase" : "Can't Afford"}
              </Button>
              <Button
                size="sm"
                width="full"
                variant="outline"
                color="parchment.100"
                borderColor="parchment.300"
                _hover={{ bg: "whiteAlpha.200" }}
                isDisabled={!canReserveCard}
                onClick={() => onReserve(card, index)}
              >
                {canReserveCard ? "Reserve" : "Reserve Full"}
              </Button>
            </VStack>
          </Box>
        </motion.div>
      ))}
    </Box>
  );
};
