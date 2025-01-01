import { Box, Button, Text, VStack } from "@chakra-ui/react";
import { useGameStore } from "../store/gameStore";
import { useEffect, useCallback } from "react";
import confetti from "canvas-confetti";

interface VictoryScreenProps {
  onRestart: () => void;
}

export const VictoryScreen = ({ onRestart }: VictoryScreenProps) => {
  const players = useGameStore((state) => state.players);
  const winner = useGameStore((state) => state.winner);

  const fireConfetti = useCallback(() => {
    const duration = 5000;
    const end = Date.now() + duration;

    const colors = [
      "#FF0000", // Red
      "#FF7F00", // Orange
      "#FFFF00", // Yellow
      "#00FF00", // Green
      "#0000FF", // Blue
      "#4B0082", // Indigo
      "#8B00FF", // Violet
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
  const totalPoints =
    winningPlayer.purchasedCards.reduce((sum, c) => sum + c.points, 0) +
    winningPlayer.nobles.reduce((sum, n) => sum + n.points, 0);

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="blackAlpha.700"
      zIndex={1000}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <VStack
        bg="white"
        p={8}
        borderRadius="xl"
        spacing={6}
        boxShadow="2xl"
        textAlign="center"
        maxW="md"
        w="90%"
      >
        <Text fontSize="4xl" fontWeight="bold" color="purple.600">
          🎉 Victory! 🎉
        </Text>
        <Text fontSize="2xl" fontWeight="semibold">
          {winningPlayer.name} wins!
        </Text>
        <Text fontSize="lg" color="gray.600">
          with {totalPoints} points
        </Text>
        <Button colorScheme="purple" size="lg" onClick={onRestart}>
          Play Again
        </Button>
      </VStack>
    </Box>
  );
};
