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
    <VStack align="stretch" spacing={5} maxW="lg" mx="auto" mt={8}>
      <HStack justify="space-between">
        <Heading size="lg">Online Multiplayer</Heading>
        <Button onClick={onBack} variant="ghost">
          Back
        </Button>
      </HStack>
      <Text color="gray.600">
        Pick a unique name to join public online games and start playing.
      </Text>

      <FormControl>
        <FormLabel>Name</FormLabel>
        <Input value={username} onChange={(event) => setUsername(event.target.value)} />
      </FormControl>
      <Button colorScheme="purple" onClick={() => void handleSubmit()}>
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
