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
  onLogin: (username: string, password: string) => Promise<boolean>;
  onRegister: (username: string, password: string) => Promise<boolean>;
}

export const AuthScreen = ({
  onBack,
  error,
  onLogin,
  onRegister,
}: AuthScreenProps) => {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (): Promise<void> => {
    if (!username.trim() || !password.trim()) {
      return;
    }

    const success =
      authMode === "register"
        ? await onRegister(username, password)
        : await onLogin(username, password);

    if (success) {
      setPassword("");
    }
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
        <Input value={username} onChange={(event) => setUsername(event.target.value)} />
      </FormControl>
      <FormControl>
        <FormLabel>Password</FormLabel>
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </FormControl>
      <Button colorScheme="purple" onClick={() => void handleSubmit()}>
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
};
