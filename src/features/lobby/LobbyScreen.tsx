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
import type { PublicRoomState, RoomState } from "../../../shared/onlineTypes";

interface LobbyScreenProps {
  publicRooms: PublicRoomState[];
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
  publicRooms,
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
          <Heading size="sm">Public Rooms</Heading>
          <Button onClick={onCreateRoom} colorScheme="purple">
            Create New Room
          </Button>
          <Divider />
          <VStack align="stretch" spacing={3}>
            {publicRooms.length === 0 && (
              <Text color="gray.600">No public rooms yet. Create one to get started.</Text>
            )}
            {publicRooms.map((publicRoom) => {
              const canJoin = !publicRoom.started && publicRoom.players.length < 4;

              return (
                <Box key={publicRoom.code} borderWidth="1px" borderRadius="md" p={3}>
                  <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={1}>
                      <HStack>
                        <Text fontWeight="semibold">{publicRoom.code}</Text>
                        <Badge colorScheme={publicRoom.started ? "orange" : "green"}>
                          {publicRoom.started ? "In Progress" : "Open"}
                        </Badge>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        {publicRoom.players.length}/4 players
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {publicRoom.players.map((player) => player.username).join(", ")}
                      </Text>
                    </VStack>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={() => onJoinRoom(publicRoom.code)}
                      isDisabled={!canJoin}
                    >
                      Join
                    </Button>
                  </HStack>
                </Box>
              );
            })}
          </VStack>
          <Divider />
          <Text fontSize="sm" color="gray.600">
            Or join directly with a room code.
          </Text>
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
