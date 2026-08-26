import {
  Box,
  Button,
  VStack,
  Text,
  Select,
  Input,
  FormControl,
  FormLabel,
  HStack,
  Checkbox,
  Badge,
} from "@chakra-ui/react";
import { useGameStore, type CpuConfig } from "./store/gameStore";
import { useState } from "react";
import { LocalGameScreen } from "./features/local/LocalGameScreen";
import { OnlineMultiplayerScreen } from "./features/online/OnlineMultiplayerScreen";
import type { AiDifficulty } from "../shared/ai";

type AppMode = "menu" | "local" | "cpu" | "online";

function App() {
  const [mode, setMode] = useState<AppMode>("menu");
  const [gameStarted, setGameStarted] = useState(false);

  // Local pass-and-play state
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [debugMode, setDebugMode] = useState(false);
  const [showDeckCounts, setShowDeckCounts] = useState(true);

  // CPU game state
  const [humanName, setHumanName] = useState("");
  const [cpuCount, setCpuCount] = useState(1);
  const [cpuDifficulties, setCpuDifficulties] = useState<AiDifficulty[]>([
    "medium",
  ]);

  const initializeGame = useGameStore((state) => state.initializeGame);

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

  const handleStartLocalGame = () => {
    if (
      playerNames.length === playerCount &&
      playerNames.every((name) => name)
    ) {
      initializeGame(playerCount, playerNames, debugMode, [], showDeckCounts);
      setGameStarted(true);
    }
  };

  const handleCpuCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value);
    setCpuCount(count);
    setCpuDifficulties((prev) => {
      const next = [...prev];
      while (next.length < count) next.push("medium");
      return next.slice(0, count);
    });
  };

  const handleCpuDifficultyChange = (
    index: number,
    difficulty: AiDifficulty,
  ) => {
    setCpuDifficulties((prev) => {
      const next = [...prev];
      next[index] = difficulty;
      return next;
    });
  };

  const handleStartCpuGame = () => {
    if (!humanName.trim()) return;

    const totalPlayers = 1 + cpuCount;
    const names: string[] = [humanName.trim()];
    const cpuConfig: CpuConfig[] = [];

    for (let i = 0; i < cpuCount; i++) {
      const diff = cpuDifficulties[i] || "medium";
      const label = diff.charAt(0).toUpperCase() + diff.slice(1);
      names.push(`CPU ${i + 1} (${label})`);
      cpuConfig.push({ playerIndex: i + 1, difficulty: diff });
    }

    initializeGame(totalPlayers, names, debugMode, cpuConfig, showDeckCounts);
    setGameStarted(true);
  };

  const handleRestart = () => {
    useGameStore.getState().reset();
    setGameStarted(false);
    setPlayerCount(2);
    setPlayerNames([]);
    setHumanName("");
    setCpuCount(1);
    setCpuDifficulties(["medium"]);
    setMode("menu");
  };

  if (mode === "online") {
    return (
      <Box minH="100vh" p={4}>
        <OnlineMultiplayerScreen onBack={() => setMode("menu")} />
      </Box>
    );
  }

  // The board manages its own padding (and must fit 100vh exactly), so the
  // outer wrapper only pads the menu/setup screens.
  return (
    <Box minH="100vh" p={gameStarted ? 0 : 4}>
      {!gameStarted ? (
        <VStack
          align="center"
          justify="center"
          minH="100vh"
          spacing={6}
          maxW="md"
          mx="auto"
        >
          <VStack spacing={1}>
            <Text
              fontSize="5xl"
              fontWeight="bold"
              color="tableGold.300"
              fontFamily="Georgia, 'Times New Roman', serif"
              letterSpacing="0.06em"
              textShadow="0 2px 8px rgba(0,0,0,0.5)"
            >
              Splendor
            </Text>
            <Box h="2px" w="180px" bg="linear-gradient(90deg, transparent, rgba(217,180,91,0.8), transparent)" />
          </VStack>

          <VStack
            bg="linear-gradient(160deg, #f9f4e8 0%, #f2e9d4 60%, #eadfc6 100%)"
          border="1px solid rgba(111, 86, 45, 0.45)"
          boxShadow="0 20px 50px rgba(6, 22, 15, 0.55)"
          borderRadius="18px"
          p={8}
            spacing={5}
            w="100%"
            align="stretch"
          >

          {mode === "menu" ? (
            <VStack spacing={4} w="100%">
              <Button
                colorScheme="yellow"
                bg="tableGold.400"
                color="ink.900"
                _hover={{ bg: "tableGold.300" }}
                size="lg"
                w="100%"
                onClick={() => setMode("cpu")}
              >
                Play vs CPU
              </Button>
              <Button
                variant="outline"
                borderColor="rgba(111, 86, 45, 0.55)"
                color="ink.900"
                _hover={{ bg: "rgba(217, 180, 91, 0.2)" }}
                size="lg"
                w="100%"
                onClick={() => setMode("local")}
              >
                Play Local (Pass-and-Play)
              </Button>
              <Button
                variant="outline"
                borderColor="rgba(111, 86, 45, 0.55)"
                color="ink.900"
                _hover={{ bg: "rgba(217, 180, 91, 0.2)" }}
                size="lg"
                w="100%"
                onClick={() => setMode("online")}
              >
                Play Online Multiplayer
              </Button>
            </VStack>
          ) : mode === "cpu" ? (
            <>
              <FormControl>
                <FormLabel>Your Name</FormLabel>
                <Input
                  placeholder="Enter your name"
                  value={humanName}
                  onChange={(e) => setHumanName(e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Number of CPU Opponents</FormLabel>
                <Select
                  value={cpuCount}
                  onChange={handleCpuCountChange}
                >
                  <option value={1}>1 CPU Opponent</option>
                  <option value={2}>2 CPU Opponents</option>
                  <option value={3}>3 CPU Opponents</option>
                </Select>
              </FormControl>

              <VStack spacing={3} w="100%">
                {Array.from({ length: cpuCount }).map((_, index) => (
                  <HStack key={index} w="100%" spacing={3}>
                    <Text fontWeight="medium" minW="80px">
                      CPU {index + 1}
                    </Text>
                    <Select
                      value={cpuDifficulties[index] || "medium"}
                      onChange={(e) =>
                        handleCpuDifficultyChange(
                          index,
                          e.target.value as AiDifficulty,
                        )
                      }
                    >
                      <option value="easy">Easy (Random)</option>
                      <option value="medium">Medium (Heuristic)</option>
                      <option value="hard">Hard (Q-Learning)</option>
                    </Select>
                    <Badge
                      colorScheme={
                        (cpuDifficulties[index] || "medium") === "easy"
                          ? "green"
                          : (cpuDifficulties[index] || "medium") === "medium"
                            ? "yellow"
                            : "red"
                      }
                    >
                      {(cpuDifficulties[index] || "medium").toUpperCase()}
                    </Badge>
                  </HStack>
                ))}
              </VStack>

              <Checkbox
                isChecked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
              >
                Debug Mode (Free Purchases)
              </Checkbox>

              <Checkbox
                isChecked={showDeckCounts}
                onChange={(e) => setShowDeckCounts(e.target.checked)}
              >
                Show remaining deck counts
              </Checkbox>

              <HStack w="100%">
                <Button
                  variant="outline"
                  size="lg"
                  flex={1}
                  onClick={() => setMode("menu")}
                >
                  Back
                </Button>
                <Button
                  colorScheme="yellow"
                  bg="tableGold.400"
                  color="ink.900"
                  _hover={{ bg: "tableGold.300" }}
                  size="lg"
                  flex={1}
                  onClick={handleStartCpuGame}
                  isDisabled={!humanName.trim()}
                >
                  Start Game
                </Button>
              </HStack>
            </>
          ) : (
            <>
              <FormControl>
                <FormLabel>Number of Players</FormLabel>
                <Select
                  value={playerCount}
                  onChange={handlePlayerCountChange}
                >
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

              <Checkbox
                isChecked={showDeckCounts}
                onChange={(e) => setShowDeckCounts(e.target.checked)}
              >
                Show remaining deck counts
              </Checkbox>

              <HStack w="100%">
                <Button
                  variant="outline"
                  size="lg"
                  flex={1}
                  onClick={() => setMode("menu")}
                >
                  Back
                </Button>
                <Button
                  colorScheme="yellow"
                  bg="tableGold.400"
                  color="ink.900"
                  _hover={{ bg: "tableGold.300" }}
                  size="lg"
                  flex={1}
                  onClick={handleStartLocalGame}
                  isDisabled={
                    playerNames.length !== playerCount ||
                    !playerNames.every((name) => name)
                  }
                >
                  Start New Game
                </Button>
              </HStack>
            </>
          )}
          </VStack>
        </VStack>
      ) : (
        <LocalGameScreen onRestart={handleRestart} />
      )}
    </Box>
  );
}

export default App;
