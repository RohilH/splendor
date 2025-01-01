import {
  Box,
  Button,
  VStack,
  Text,
  Select,
  Input,
  FormControl,
  FormLabel,
  useToast,
  ChakraProvider,
  Checkbox,
} from "@chakra-ui/react";
import { useGameStore } from "./store/gameStore";
import { GameBoard } from "./components/GameBoard";
import { useState } from "react";
import { VictoryScreen } from "./components/VictoryScreen";

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [debugMode, setDebugMode] = useState(false);
  const initializeGame = useGameStore((state) => state.initializeGame);
  const isGameOver = useGameStore((state) => state.isGameOver);
  const toast = useToast();

  const handlePlayerCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value);
    setPlayerCount(count);
    setPlayerNames(Array(count).fill(""));
  };

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const handleStartGame = () => {
    if (
      playerNames.length === playerCount &&
      playerNames.every((name) => name)
    ) {
      initializeGame(playerCount, playerNames, debugMode);
      setGameStarted(true);
    }
  };

  const handleRestart = () => {
    setGameStarted(false);
    setPlayerCount(2);
    setPlayerNames([]);
  };

  return (
    <ChakraProvider>
      <Box minH="100vh" bg="gray.50" p={4}>
        {!gameStarted ? (
          <VStack
            align="center"
            justify="center"
            h="100vh"
            spacing={8}
            maxW="md"
            mx="auto"
          >
            <Text fontSize="4xl" fontWeight="bold" color="purple.600">
              Splendor
            </Text>

            <FormControl>
              <FormLabel>Number of Players</FormLabel>
              <Select value={playerCount} onChange={handlePlayerCountChange}>
                <option value={2}>2 Players</option>
                <option value={3}>3 Players</option>
                <option value={4}>4 Players</option>
              </Select>
            </FormControl>

            <VStack spacing={4} w="100%">
              {Array.from({ length: playerCount }).map((_, index) => (
                <FormControl key={index}>
                  <FormLabel>Player {index + 1} Name</FormLabel>
                  <Input
                    placeholder={`Enter Player ${index + 1} name`}
                    value={playerNames[index] || ""}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                  />
                </FormControl>
              ))}
            </VStack>

            <Checkbox
              isChecked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
            >
              Debug Mode (Free Purchases)
            </Checkbox>

            <Button
              colorScheme="purple"
              size="lg"
              onClick={handleStartGame}
              isDisabled={
                playerNames.length !== playerCount ||
                !playerNames.every((name) => name)
              }
            >
              Start New Game
            </Button>
          </VStack>
        ) : (
          <>
            <GameBoard />
            {isGameOver && <VictoryScreen onRestart={handleRestart} />}
          </>
        )}
      </Box>
    </ChakraProvider>
  );
}

export default App;
