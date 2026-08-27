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
      gridTemplateColumns="repeat(4, minmax(0, 1fr))"
      gap={[1, null, 3]}
      w="100%"
      h={["100%", null, "auto"]}
      minH={0}
      minW={0}
      alignItems="center"
      justifyItems="center"
      sx={{ containerType: "size" }}
    >
      {cards.map((card: Card, index: number) => (
        <motion.div
          key={index}
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            minWidth: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Box
            position="relative"
            h="auto"
            maxH="100%"
            maxW="100%"
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
              spacing={1}
              justify="center"
              bg="blackAlpha.700"
              borderRadius={["6px", null, "10px"]}
              p={[1, null, 3]}
            >
              <Button
                size={["xs", null, "sm"]}
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
                size={["xs", null, "sm"]}
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
