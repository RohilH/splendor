import { Box, Button, HStack, VStack } from "@chakra-ui/react";
import { useGameStore } from "../store/gameStore";
import { Card, Player } from "../types/game";
import { canAffordCard } from "../../shared/game/selectors";
import type { OnlinePlayer } from "../../shared/onlineTypes";
import { DevelopmentCard } from "./DevelopmentCard";
import { DevelopmentDeck } from "./DevelopmentDeck";

interface CardFieldProps {
  level: 1 | 2 | 3;
  cards?: Card[];
  remainingCards?: number;
  player?: Player | OnlinePlayer;
  canAfford?: (card: Card) => boolean;
  canReserveCard?: boolean;
  onPurchase?: (card: Card, cardIndex: number) => void;
  onReserve?: (card: Card, cardIndex: number) => void;
}

export const CardField = ({
  level,
  cards: cardsProp,
  remainingCards: remainingCardsProp,
  player: playerProp,
  canAfford: canAffordProp,
  canReserveCard: canReserveCardProp,
  onPurchase,
  onReserve,
}: CardFieldProps) => {
  const { visibleCards, cards, currentPlayer, players } = useGameStore();
  const purchaseCard = useGameStore((state) => state.purchaseCard);
  const reserveCard = useGameStore((state) => state.reserveCard);
  const assignNoblesAndEndTurn = useGameStore(
    (state) => state.assignNoblesAndEndTurn
  );

  const levelKey = `level${level}` as const;
  const cardsForLevel = cardsProp ?? visibleCards[levelKey];
  const player = playerProp ?? players[currentPlayer];
  const remainingCards = remainingCardsProp ?? cards[levelKey].length;

  const canAfford =
    canAffordProp ??
    ((card: Card) => canAffordCard(player, card, useGameStore.getState().debugMode));
  const canReserveCard = canReserveCardProp ?? player.reservedCards.length < 3;

  return (
    <HStack spacing={4} align="start" overflowX="auto" py={1} pr={2}>
      <DevelopmentDeck level={level} remainingCards={remainingCards} />

      {cardsForLevel.map((card: Card, index: number) => (
        <Box
          key={`${level}-${card.gem}-${card.points}-${index}`}
          position="relative"
          flexShrink={0}
          _hover={{
            "& > .card-actions": {
              opacity: 1,
            },
          }}
        >
          <DevelopmentCard card={card} />

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
            borderRadius="22px"
            p={4}
          >
            <Button
              size="sm"
              width="full"
              colorScheme="blue"
              isDisabled={!canAfford(card)}
              onClick={() => {
                if (onPurchase) {
                  onPurchase(card, index);
                  return;
                }

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
              isDisabled={!canReserveCard}
              onClick={() => {
                if (onReserve) {
                  onReserve(card, index);
                  return;
                }

                const success = reserveCard(card, level);
                if (success) assignNoblesAndEndTurn();
              }}
            >
              {canReserveCard ? "Reserve" : "Reserve Full"}
            </Button>
          </VStack>
        </Box>
      ))}
    </HStack>
  );
};
