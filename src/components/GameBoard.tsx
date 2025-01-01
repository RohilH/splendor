import { Box, Grid, VStack } from "@chakra-ui/react";
import { useGameStore } from "../store/gameStore";
import { GemBank } from "./GemBank";
import { CardField } from "./CardField";
import { PlayerArea } from "./PlayerArea";
import { NobleArea } from "./NobleArea";
import { ActivePlayerArea } from "./ActivePlayerArea";

export const GameBoard = () => {
  const { players, currentPlayer } = useGameStore();

  return (
    <Box p={4} pb={48} bg="gray.100" minH="100vh">
      <Grid templateColumns="1fr 2fr 1fr" gap={6}>
        <VStack gap={4} align="stretch">
          {players.map((player, index) => (
            <PlayerArea
              key={player.id}
              player={player}
              isActive={index === currentPlayer}
            />
          ))}
        </VStack>

        <VStack gap={4} align="stretch">
          <CardField level={3} />
          <CardField level={2} />
          <CardField level={1} />
        </VStack>

        <VStack gap={4} align="stretch">
          <GemBank />
          <NobleArea />
        </VStack>
      </Grid>

      <ActivePlayerArea />
    </Box>
  );
};
