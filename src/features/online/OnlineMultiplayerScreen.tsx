import {
  Alert,
  AlertDescription,
  AlertIcon,
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

  const [roomCodeInput, setRoomCodeInput] = useState("");

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (!user) {
    return (
      <AuthScreen
        onBack={onBack}
        error={error}
        onLogin={login}
        onRegister={register}
      />
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

      {!room?.started && (
        <LobbyScreen
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

      {room?.started && gameState && (
        <OnlineGameScreen
          userId={user.id}
          gameState={gameState}
          sendGameAction={sendGameAction}
          onLeaveGame={leaveRoom}
        />
      )}
    </VStack>
  );
};
