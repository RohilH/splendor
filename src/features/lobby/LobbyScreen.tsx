import {
  Badge,
  Box,
  Button,
  Divider,
  HStack,
  Heading,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { RoomState } from "../../../shared/onlineTypes";

interface LobbyScreenProps {
  room: RoomState | null;
  currentUserId: string;
  roomCodeInput: string;
  onRoomCodeInputChange: (value: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomCode: string) => void;
  onLeaveRoom: () => void;
  onStartGame: () => void;
}

export const LobbyScreen = ({
  room,
  currentUserId,
  roomCodeInput,
  onRoomCodeInputChange,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onStartGame,
}: LobbyScreenProps) => {
  if (!room) {
    return (
      <Box borderWidth="1px" borderRadius="lg" p={5} bg="white">
        <VStack align="stretch" spacing={4}>
          <Heading size="sm">Create or Join a Room</Heading>
          <Button onClick={onCreateRoom} colorScheme="purple">
            Create New Room
          </Button>
          <Divider />
          <HStack>
            <Input
              placeholder="Enter room code"
              value={roomCodeInput}
              onChange={(event) => onRoomCodeInputChange(event.target.value.toUpperCase())}
            />
            <Button onClick={() => onJoinRoom(roomCodeInput)} colorScheme="blue">
              Join Room
            </Button>
          </HStack>
        </VStack>
      </Box>
    );
  }

  return (
    <Box borderWidth="1px" borderRadius="lg" p={5} bg="white">
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <Heading size="sm">
            Room: <Badge colorScheme="purple">{room.code}</Badge>
          </Heading>
          {!room.started && (
            <Button size="sm" variant="outline" onClick={onLeaveRoom}>
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
            onClick={onStartGame}
            isDisabled={room.hostUserId !== currentUserId || room.players.length < 2}
          >
            Start Game
          </Button>
        )}
      </VStack>
    </Box>
  );
};
