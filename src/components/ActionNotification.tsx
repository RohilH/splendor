import { Box, HStack, Image, Text } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import type { GemType } from "../../shared/types/game";
import type { GameActionResult } from "../../shared/protocol/wsMessages";
import { gemImages } from "../utils/constants";

const MotionBox = motion(Box);

const DISMISS_MS = 4500;
const MAX_VISIBLE = 4;

interface NotificationEntry {
  id: number;
  result: GameActionResult;
}

let nextId = 0;

const GemDot = ({ gem }: { gem: GemType }) => (
  <Image src={gemImages[gem]} alt={gem} boxSize="18px" display="inline-block" />
);

const gemDisplayOrder: GemType[] = [
  "diamond",
  "sapphire",
  "emerald",
  "ruby",
  "onyx",
  "gold",
];

const ActionBody = ({ result }: { result: GameActionResult }) => {
  const { action } = result;

  switch (action.type) {
    case "take_gems": {
      const gems: GemType[] = [];
      for (const g of gemDisplayOrder) {
        const count = action.gems[g] ?? 0;
        for (let i = 0; i < count; i++) gems.push(g);
      }
      if (gems.length === 0) return <Text fontSize="sm">took no gems</Text>;
      return (
        <HStack spacing={1} flexWrap="wrap">
          <Text fontSize="sm">took</Text>
          {gems.map((g, i) => (
            <GemDot key={`${g}-${i}`} gem={g} />
          ))}
        </HStack>
      );
    }

    case "purchase_card":
    case "purchase_reserved_card": {
      const { card } = action;
      const label = action.type === "purchase_reserved_card" ? "bought reserved" : "bought";
      return (
        <HStack spacing={1}>
          <Text fontSize="sm">{label}</Text>
          <Image src={gemImages[card.gem]} alt={card.gem} boxSize="16px" />
          <Text fontSize="sm" fontWeight="bold">
            L{card.level}
          </Text>
          {card.points > 0 && (
            <Text fontSize="sm" fontWeight="bold" color="yellow.300">
              {card.points}pt{card.points > 1 ? "s" : ""}
            </Text>
          )}
        </HStack>
      );
    }

    case "reserve_card":
      return (
        <HStack spacing={1}>
          <Text fontSize="sm">reserved a L{action.level} card</Text>
          {action.gotGold && <GemDot gem="gold" />}
        </HStack>
      );

    case "select_noble":
      return (
        <Text fontSize="sm">
          claimed a noble ({action.noblePoints}pts)
        </Text>
      );

    case "end_turn":
      return <Text fontSize="sm">ended their turn</Text>;

    default:
      return null;
  }
};

const actionIcon = (result: GameActionResult): string => {
  switch (result.action.type) {
    case "take_gems":
      return "💎";
    case "purchase_card":
    case "purchase_reserved_card":
      return "🃏";
    case "reserve_card":
      return "📌";
    case "select_noble":
      return "👑";
    case "end_turn":
      return "⏭";
    default:
      return "📣";
  }
};

const playerColors = [
  "blue.300",
  "orange.300",
  "green.300",
  "pink.300",
];

interface ActionNotificationHostProps {
  userId: string;
  onSubscribe: (handler: (result: GameActionResult) => void) => () => void;
}

export const ActionNotificationHost = ({
  userId,
  onSubscribe,
}: ActionNotificationHostProps) => {
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);

  const addNotification = useCallback(
    (result: GameActionResult) => {
      if (result.playerId === userId && result.action.type === "end_turn") return;

      const id = nextId++;
      setNotifications((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, result }]);

      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, DISMISS_MS);
    },
    [userId]
  );

  useEffect(() => onSubscribe(addNotification), [onSubscribe, addNotification]);

  return (
    <Box
      position="fixed"
      top={4}
      right={4}
      zIndex="toast"
      display="flex"
      flexDirection="column"
      gap={2}
      pointerEvents="none"
      maxW="340px"
    >
      <AnimatePresence mode="popLayout">
        {notifications.map(({ id, result }, idx) => (
          <MotionBox
            key={id}
            layout
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            bg="gray.800"
            color="white"
            borderRadius="lg"
            px={3}
            py={2}
            boxShadow="lg"
            pointerEvents="auto"
            borderLeft="4px solid"
            borderLeftColor={playerColors[idx % playerColors.length]}
          >
            <HStack spacing={2} align="center">
              <Text fontSize="md">{actionIcon(result)}</Text>
              <Box flex={1} minW={0}>
                <Text
                  fontSize="sm"
                  fontWeight="bold"
                  noOfLines={1}
                  color={
                    result.playerId === userId
                      ? "green.300"
                      : playerColors[idx % playerColors.length]
                  }
                >
                  {result.playerId === userId ? "You" : result.playerName}
                </Text>
                <ActionBody result={result} />
              </Box>
            </HStack>
          </MotionBox>
        ))}
      </AnimatePresence>
    </Box>
  );
};
