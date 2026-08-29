import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  HStack,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useOnlineSessionStore } from "../../store/onlineSessionStore";
import { AuthScreen } from "../auth/AuthScreen";
import { LobbyScreen } from "../lobby/LobbyScreen";
import { OnlineGameScreen } from "./OnlineGameScreen";

export const OnlineMultiplayerScreen = ({ onBack }: { onBack: () => void }) => {
  const {
    user,
    publicRooms,
    room,
    gameState,
    status,
    error,
    initialize,
    claimName,
    logout,
    clearError,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    sendGameAction,
  } = useOnlineSessionStore();

  const [roomCodeInput, setRoomCodeInput] = useState("");

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (!user) {
    return (
      <Box p={4}>
        <AuthScreen
          onBack={onBack}
          error={error}
          onClaimName={claimName}
        />
      </Box>
    );
  }

  if (room?.started && gameState) {
    return (
      <OnlineGameScreen
        userId={user.id}
        gameState={gameState}
        sendGameAction={sendGameAction}
        onLeaveGame={leaveRoom}
      />
    );
  }

  return (
    <Box p={4}>
      <VStack align="stretch" spacing={4}>
      <HStack justify="space-between">
        <VStack align="start" spacing={0}>
          <Heading size="md" color="parchment.100" textShadow="0 1px 4px rgba(0,0,0,0.5)">Online Multiplayer</Heading>
          <Text color="parchment.300" fontSize="sm" textShadow="0 1px 3px rgba(0,0,0,0.5)">
            Playing as <b>{user.username}</b> · Socket: {status}
          </Text>
        </VStack>
        <HStack>
          <Button
            onClick={logout}
            variant="outline"
            color="parchment.100"
            borderColor="rgba(217, 180, 91, 0.55)"
            _hover={{ bg: "whiteAlpha.200" }}
          >
            Use Different Name
          </Button>
          <Button
            onClick={onBack}
            variant="ghost"
            color="parchment.100"
            _hover={{ bg: "whiteAlpha.200" }}
          >
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

      {!room?.started && (
        <LobbyScreen
          publicRooms={publicRooms}
          room={room}
          currentUserId={user.id}
          roomCodeInput={roomCodeInput}
          onRoomCodeInputChange={setRoomCodeInput}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          onLeaveRoom={leaveRoom}
          onStartGame={startGame}
        />
      )}
      </VStack>
    </Box>
  );
};
