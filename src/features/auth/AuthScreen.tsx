import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";

interface AuthScreenProps {
  onBack: () => void;
  error: string | null;
  onClaimName: (username: string) => Promise<boolean>;
}

export const AuthScreen = ({ onBack, error, onClaimName }: AuthScreenProps) => {
  const [username, setUsername] = useState("");

  const handleSubmit = async (): Promise<void> => {
    if (!username.trim()) {
      return;
    }

    await onClaimName(username);
  };

  return (
    <VStack
      align="stretch"
      spacing={5}
      maxW="lg"
      mx="auto"
      mt={8}
      bg="linear-gradient(160deg, #f9f4e8 0%, #f2e9d4 60%, #eadfc6 100%)"
      border="1px solid rgba(111, 86, 45, 0.45)"
      boxShadow="0 20px 50px rgba(6, 22, 15, 0.55)"
      borderRadius="18px"
      p={8}
    >
      <HStack justify="space-between">
        <Heading size="lg" color="ink.900">Online Multiplayer</Heading>
        <Button onClick={onBack} variant="ghost">
          Back
        </Button>
      </HStack>
      <Text color="ink.500">
        Pick a unique name to join public online games and start playing.
      </Text>

      <FormControl>
        <FormLabel>Name</FormLabel>
        <Input value={username} onChange={(event) => setUsername(event.target.value)} />
      </FormControl>
      <Button
        colorScheme="yellow"
        bg="tableGold.400"
        color="ink.900"
        _hover={{ bg: "tableGold.300" }}
        onClick={() => void handleSubmit()}
      >
        Continue
      </Button>
      {error && (
        <Alert status="error">
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </VStack>
  );
};
