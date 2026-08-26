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
      <Box borderRadius="14px" p={5} bg="linear-gradient(160deg, #f9f4e8 0%, #f2e9d4 60%, #eadfc6 100%)" border="1px solid rgba(111, 86, 45, 0.45)" boxShadow="0 12px 30px rgba(6, 22, 15, 0.45)">
        <VStack align="stretch" spacing={4}>
          <Heading size="sm" color="ink.900">Public Rooms</Heading>
          <Button
            onClick={onCreateRoom}
            colorScheme="yellow"
            bg="tableGold.400"
            color="ink.900"
            _hover={{ bg: "tableGold.300" }}
          >
            Create New Room
          </Button>
          <Divider />
          <VStack align="stretch" spacing={3}>
            {publicRooms.length === 0 && (
              <Text color="ink.500">No public rooms yet. Create one to get started.</Text>
            )}
            {publicRooms.map((publicRoom) => {
              const canJoin = !publicRoom.started && publicRoom.players.length < 4;

              return (
                <Box key={publicRoom.code} borderWidth="1px" borderColor="rgba(111, 86, 45, 0.35)" borderRadius="md" p={3} bg="rgba(255, 252, 244, 0.6)">
                  <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={1}>
                      <HStack>
                        <Text fontWeight="semibold">{publicRoom.code}</Text>
                        <Badge colorScheme={publicRoom.started ? "orange" : "green"}>
                          {publicRoom.started ? "In Progress" : "Open"}
                        </Badge>
                      </HStack>
                      <Text fontSize="sm" color="ink.500">
                        {publicRoom.players.length}/4 players
                      </Text>
                      <Text fontSize="sm" color="ink.500">
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
          <Text fontSize="sm" color="ink.500">
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
    <Box borderRadius="14px" p={5} bg="linear-gradient(160deg, #f9f4e8 0%, #f2e9d4 60%, #eadfc6 100%)" border="1px solid rgba(111, 86, 45, 0.45)" boxShadow="0 12px 30px rgba(6, 22, 15, 0.45)">
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <Heading size="sm" color="ink.900">
            Room: <Badge colorScheme="yellow" bg="tableGold.400" color="ink.900">{room.code}</Badge>
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
            colorScheme="yellow"
            bg="tableGold.400"
            color="ink.900"
            _hover={{ bg: "tableGold.300" }}
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
