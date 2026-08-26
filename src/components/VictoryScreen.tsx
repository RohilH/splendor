import { Box, Button, Text, VStack } from "@chakra-ui/react";
import { useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import { calculatePlayerPoints } from "../../shared/game/selectors";

interface VictoryScreenProps {
  onRestart: () => void;
  players: Array<{
    name: string;
    purchasedCards: Array<{ points: number }>;
    nobles: Array<{ points: number }>;
  }>;
  winner: number | null;
  calculatePoints?: (player: {
    purchasedCards: Array<{ points: number }>;
    nobles: Array<{ points: number }>;
  }) => number;
  actionLabel?: string;
}

export const VictoryScreen = ({
  onRestart,
  players,
  winner,
  calculatePoints = calculatePlayerPoints,
  actionLabel = "Play Again",
}: VictoryScreenProps) => {
  const fireConfetti = useCallback(() => {
    const duration = 5000;
    const end = Date.now() + duration;

    // Gem-colored confetti: diamond, sapphire, emerald, ruby, onyx, gold.
    const colors = [
      "#f0f0f0",
      "#2b6cb0",
      "#2f855a",
      "#c53030",
      "#2d3748",
      "#d9b45b",
    ];

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors: colors,
        startVelocity: 45,
        gravity: 0.8,
        shapes: ["star", "circle"],
        ticks: 200,
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors: colors,
        startVelocity: 45,
        gravity: 0.8,
        shapes: ["star", "circle"],
        ticks: 200,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  useEffect(() => {
    fireConfetti();
  }, [fireConfetti]);

  if (winner === null) return null;

  const winningPlayer = players[winner];
  const totalPoints = calculatePoints(winningPlayer);

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="rgba(6, 22, 15, 0.78)"
      zIndex={1000}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <VStack
        bg="linear-gradient(160deg, #f9f4e8 0%, #f2e9d4 60%, #eadfc6 100%)"
        border="1px solid rgba(111, 86, 45, 0.45)"
        p={8}
        borderRadius="xl"
        spacing={6}
        boxShadow="0 20px 50px rgba(6, 22, 15, 0.6)"
        textAlign="center"
        maxW="md"
        w="90%"
      >
        <Text fontSize="4xl" fontWeight="bold" color="ink.900" fontFamily="Georgia, 'Times New Roman', serif">
          🎉 Victory! 🎉
        </Text>
        <Text fontSize="2xl" fontWeight="semibold" color="ink.900" fontFamily="Georgia, 'Times New Roman', serif">
          {winningPlayer.name} wins!
        </Text>
        <Text fontSize="lg" color="ink.500">
          with {totalPoints} points
        </Text>
        <Button
          colorScheme="yellow"
          bg="tableGold.400"
          color="ink.900"
          _hover={{ bg: "tableGold.300" }}
          size="lg"
          onClick={onRestart}
        >
          {actionLabel}
        </Button>
      </VStack>
    </Box>
  );
};
