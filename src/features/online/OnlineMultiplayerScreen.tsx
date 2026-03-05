import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Heading,
  Input,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import type {
  Card,
  GamePublicState,
  GemType,
  OnlinePlayer,
} from "../../../shared/onlineTypes";
import { useOnlineSessionStore } from "../../store/onlineSessionStore";

const gemOrder: GemType[] = [
  "diamond",
  "sapphire",
  "emerald",
  "ruby",
  "onyx",
  "gold",
];

const getPlayerPoints = (player: OnlinePlayer): number =>
  player.purchasedCards.reduce((sum, card) => sum + card.points, 0) +
  player.nobles.reduce((sum, noble) => sum + noble.points, 0);

const cardLevels: Array<1 | 2 | 3> = [3, 2, 1];

const CardCost = ({ card }: { card: Card }) => (
  <VStack align="start" spacing={1}>
    {Object.entries(card.cost).map(([gem, count]) => (
      <Text key={`${card.level}-${card.gem}-${gem}`} fontSize="xs">
        {gem}: {count}
      </Text>
    ))}
  </VStack>
);

const GameCard = ({
  card,
  onPurchase,
  onReserve,
  canAct,
  showReserve,
}: {
  card: Card;
  onPurchase: () => void;
  onReserve?: () => void;
  canAct: boolean;
  showReserve: boolean;
}) => (
  <Box borderWidth="1px" borderRadius="md" p={2} bg="white">
    <HStack justify="space-between" mb={2}>
      <Badge colorScheme="purple">Lvl {card.level}</Badge>
      <Badge colorScheme="yellow">{card.points} pts</Badge>
    </HStack>
    <Text fontSize="sm" fontWeight="bold" mb={2} textTransform="capitalize">
      Bonus: {card.gem}
    </Text>
    <CardCost card={card} />
    <VStack mt={3} spacing={2}>
      <Button
        size="sm"
        w="100%"
        colorScheme="blue"
        onClick={onPurchase}
        isDisabled={!canAct}
      >
        Purchase
      </Button>
      {showReserve && (
        <Button
          size="sm"
          w="100%"
          variant="outline"
          onClick={onReserve}
          isDisabled={!canAct}
        >
          Reserve
        </Button>
      )}
    </VStack>
  </Box>
);

export const OnlineMultiplayerScreen = ({ onBack }: { onBack: () => void }) => {
  const {
    user,
    room,
    gameState,
    status,
    error,
    initialize,
    register,
    login,
    logout,
    clearError,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    sendGameAction,
  } = useOnlineSessionStore();

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [selectedGems, setSelectedGems] = useState<Record<GemType, number>>({
    diamond: 0,
    sapphire: 0,
    emerald: 0,
    ruby: 0,
    onyx: 0,
    gold: 0,
  });

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const myPlayer = useMemo(
    () => gameState?.players.find((player) => player.userId === user?.id) ?? null,
    [gameState?.players, user?.id]
  );
  const isMyTurn = Boolean(
    user &&
      gameState &&
      gameState.players[gameState.currentPlayer]?.userId === user.id &&
      !gameState.pendingNobleSelectionPlayerId
  );
  const isMyNobleSelection = Boolean(
    user &&
      gameState?.showNobleSelection &&
      gameState.pendingNobleSelectionPlayerId === user.id
  );

  const handleAuthSubmit = async (): Promise<void> => {
    if (!username.trim() || !password.trim()) {
      return;
    }

    const ok =
      authMode === "register"
        ? await register(username, password)
        : await login(username, password);

    if (ok) {
      setPassword("");
    }
  };

  const handleGemAdjust = (gem: GemType, delta: number): void => {
    setSelectedGems((current) => {
      const next = Math.max(0, (current[gem] || 0) + delta);
      return { ...current, [gem]: next };
    });
  };

  const resetGemSelection = (): void => {
    setSelectedGems({
      diamond: 0,
      sapphire: 0,
      emerald: 0,
      ruby: 0,
      onyx: 0,
      gold: 0,
    });
  };

  const submitTakeGems = (): void => {
    sendGameAction({
      type: "take_gems",
      gems: selectedGems,
    });
    resetGemSelection();
  };

  if (!user) {
    return (
      <VStack align="stretch" spacing={5} maxW="lg" mx="auto" mt={8}>
        <HStack justify="space-between">
          <Heading size="lg">Online Multiplayer</Heading>
          <Button onClick={onBack} variant="ghost">
            Back
          </Button>
        </HStack>
        <Text color="gray.600">
          Create an account (or login) to play online with friends in different locations.
        </Text>

        <HStack>
          <Button
            size="sm"
            colorScheme={authMode === "login" ? "purple" : "gray"}
            onClick={() => setAuthMode("login")}
          >
            Login
          </Button>
          <Button
            size="sm"
            colorScheme={authMode === "register" ? "purple" : "gray"}
            onClick={() => setAuthMode("register")}
          >
            Register
          </Button>
        </HStack>

        <FormControl>
          <FormLabel>Username</FormLabel>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} />
        </FormControl>
        <FormControl>
          <FormLabel>Password</FormLabel>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormControl>
        <Button colorScheme="purple" onClick={() => void handleAuthSubmit()}>
          {authMode === "register" ? "Create Account" : "Login"}
        </Button>
        {error && (
          <Alert status="error">
            <AlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </VStack>
    );
  }

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between">
        <VStack align="start" spacing={0}>
          <Heading size="md">Online Multiplayer</Heading>
          <Text color="gray.600" fontSize="sm">
            Signed in as <b>{user.username}</b> · Socket: {status}
          </Text>
        </VStack>
        <HStack>
          <Button onClick={logout} variant="outline">
            Logout
          </Button>
          <Button onClick={onBack} variant="ghost">
            Back
          </Button>
        </HStack>
      </HStack>

      {error && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
          <Button ml="auto" size="xs" onClick={clearError}>
            Dismiss
          </Button>
        </Alert>
      )}

      {!room && (
        <Box borderWidth="1px" borderRadius="lg" p={5} bg="white">
          <VStack align="stretch" spacing={4}>
            <Heading size="sm">Create or Join a Room</Heading>
            <Button onClick={createRoom} colorScheme="purple">
              Create New Room
            </Button>
            <Divider />
            <HStack>
              <Input
                placeholder="Enter room code"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              />
              <Button onClick={() => joinRoom(roomCodeInput)} colorScheme="blue">
                Join Room
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}

      {room && (
        <Box borderWidth="1px" borderRadius="lg" p={5} bg="white">
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <Heading size="sm">
                Room: <Badge colorScheme="purple">{room.code}</Badge>
              </Heading>
              {!room.started && (
                <Button size="sm" variant="outline" onClick={leaveRoom}>
                  Leave Room
                </Button>
              )}
            </HStack>
            <VStack align="stretch">
              {room.players.map((player) => (
                <HStack key={player.userId} justify="space-between">
                  <Text>
                    {player.username}
                    {player.userId === room.hostUserId ? " (Host)" : ""}
                  </Text>
                  <Badge colorScheme={player.connected ? "green" : "orange"}>
                    {player.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </HStack>
              ))}
            </VStack>
            {!room.started && (
              <Button
                colorScheme="green"
                onClick={startGame}
                isDisabled={room.hostUserId !== user.id || room.players.length < 2}
              >
                Start Game
              </Button>
            )}
          </VStack>
        </Box>
      )}

      {room?.started && gameState && (
        <Grid templateColumns="repeat(12, 1fr)" gap={4}>
          <GridItem colSpan={{ base: 12, lg: 3 }}>
            <Box borderWidth="1px" borderRadius="lg" p={4} bg="white">
              <Heading size="sm" mb={3}>
                Players
              </Heading>
              <VStack align="stretch" spacing={2}>
                {gameState.players.map((player, index) => (
                  <Box
                    key={player.userId}
                    borderWidth="1px"
                    borderRadius="md"
                    p={2}
                    bg={index === gameState.currentPlayer ? "purple.50" : "gray.50"}
                  >
                    <Text fontWeight="bold">
                      {player.name}
                      {player.userId === user.id ? " (You)" : ""}
                    </Text>
                    <Text fontSize="sm">Points: {getPlayerPoints(player)}</Text>
                    <Text fontSize="sm">
                      Gems:{" "}
                      {gemOrder
                        .map((gem) => `${gem.slice(0, 1).toUpperCase()}:${player.gems[gem]}`)
                        .join(" ")}
                    </Text>
                    <Text fontSize="sm">
                      Purchased: {player.purchasedCards.length} · Reserved:{" "}
                      {player.reservedCards.length}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </Box>
          </GridItem>

          <GridItem colSpan={{ base: 12, lg: 6 }}>
            <Box borderWidth="1px" borderRadius="lg" p={4} bg="white">
              <Heading size="sm" mb={3}>
                Board
              </Heading>
              <Text mb={3}>
                Current turn:{" "}
                <b>{gameState.players[gameState.currentPlayer]?.name || "Unknown"}</b>
              </Text>
              {gameState.isGameOver && gameState.winner !== null && (
                <Alert status="success" mb={3}>
                  <AlertIcon />
                  <AlertDescription>
                    Winner: {gameState.players[gameState.winner]?.name}
                  </AlertDescription>
                </Alert>
              )}

              {cardLevels.map((level) => {
                const key: keyof GamePublicState["visibleCards"] = `level${level}`;
                return (
                  <Box key={level} mb={4}>
                    <HStack justify="space-between" mb={2}>
                      <Heading size="xs">Level {level}</Heading>
                      <Text fontSize="xs" color="gray.500">
                        Deck remaining: {gameState.deckCounts[key]}
                      </Text>
                    </HStack>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                      {gameState.visibleCards[key].map((card: Card, cardIndex: number) => (
                        <GameCard
                          key={`${key}-${cardIndex}`}
                          card={card}
                          canAct={isMyTurn && !gameState.isGameOver}
                          onPurchase={() =>
                            sendGameAction({
                              type: "purchase_card",
                              level: level as 1 | 2 | 3,
                              cardIndex,
                            })
                          }
                          onReserve={() =>
                            sendGameAction({
                              type: "reserve_card",
                              level: level as 1 | 2 | 3,
                              cardIndex,
                            })
                          }
                          showReserve
                        />
                      ))}
                    </SimpleGrid>
                  </Box>
                );
              })}
            </Box>
          </GridItem>

          <GridItem colSpan={{ base: 12, lg: 3 }}>
            <VStack align="stretch" spacing={4}>
              <Box borderWidth="1px" borderRadius="lg" p={4} bg="white">
                <Heading size="sm" mb={3}>
                  Gem Bank
                </Heading>
                <VStack align="stretch" spacing={2}>
                  {gemOrder.map((gem) => (
                    <HStack key={gem} justify="space-between">
                      <Text textTransform="capitalize">{gem}</Text>
                      <HStack>
                        <Button
                          size="xs"
                          onClick={() => handleGemAdjust(gem, -1)}
                          isDisabled={!isMyTurn || gem === "gold"}
                        >
                          -
                        </Button>
                        <Text minW="24px" textAlign="center">
                          {selectedGems[gem] || 0}
                        </Text>
                        <Button
                          size="xs"
                          onClick={() => handleGemAdjust(gem, 1)}
                          isDisabled={!isMyTurn || gem === "gold"}
                        >
                          +
                        </Button>
                        <Badge>{gameState.gems[gem]}</Badge>
                      </HStack>
                    </HStack>
                  ))}
                </VStack>
                <HStack mt={3}>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={submitTakeGems}
                    isDisabled={!isMyTurn}
                  >
                    Take Gems
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetGemSelection}
                    isDisabled={!isMyTurn}
                  >
                    Clear
                  </Button>
                </HStack>
                <Button
                  mt={2}
                  size="sm"
                  colorScheme="purple"
                  onClick={() => sendGameAction({ type: "end_turn" })}
                  isDisabled={!isMyTurn}
                >
                  End Turn
                </Button>
              </Box>

              {myPlayer && (
                <Box borderWidth="1px" borderRadius="lg" p={4} bg="white">
                  <Heading size="sm" mb={3}>
                    Your Reserved Cards
                  </Heading>
                  <VStack align="stretch" spacing={3}>
                    {myPlayer.reservedCards.length === 0 && (
                      <Text color="gray.500" fontSize="sm">
                        No reserved cards yet.
                      </Text>
                    )}
                    {myPlayer.reservedCards.map((card, cardIndex) => (
                      <GameCard
                        key={`reserved-${cardIndex}`}
                        card={card}
                        canAct={isMyTurn && !gameState.isGameOver}
                        onPurchase={() =>
                          sendGameAction({
                            type: "purchase_reserved_card",
                            cardIndex,
                          })
                        }
                        showReserve={false}
                      />
                    ))}
                  </VStack>
                </Box>
              )}

              {isMyNobleSelection && (
                <Box borderWidth="1px" borderRadius="lg" p={4} bg="yellow.50">
                  <Heading size="sm" mb={3}>
                    Select a Noble
                  </Heading>
                  <VStack align="stretch" spacing={2}>
                    {gameState.availableNobles.map((noble, index) => (
                      <Button
                        key={`noble-${index}`}
                        onClick={() =>
                          sendGameAction({ type: "select_noble", nobleIndex: index })
                        }
                      >
                        {noble.points} pts ·{" "}
                        {Object.entries(noble.requirements)
                          .map(([gem, count]) => `${gem}:${count}`)
                          .join(", ")}
                      </Button>
                    ))}
                  </VStack>
                </Box>
              )}
            </VStack>
          </GridItem>
        </Grid>
      )}
    </VStack>
  );
};
