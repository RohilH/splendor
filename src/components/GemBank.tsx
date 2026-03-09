import {
  Box,
  SimpleGrid,
  Text,
  VStack,
  Image,
  useToast,
} from "@chakra-ui/react";
import { GemType, Gems, Player } from "../types/game";

const gemImages: Record<GemType, string> = {
  diamond: "/gems/diamond.svg",
  sapphire: "/gems/sapphire.svg",
  emerald: "/gems/emerald.svg",
  ruby: "/gems/ruby.svg",
  onyx: "/gems/onyx.svg",
  gold: "/gems/gold.svg",
};

const gemColors: Record<GemType, string> = {
  diamond: "#ffffff",
  sapphire: "#0066cc",
  emerald: "#00cc66",
  ruby: "#cc0000",
  onyx: "#333333",
  gold: "#ffcc00",
};

interface GemBankProps {
  gems: Gems;
  player: Pick<Player, "gems">;
  selectedGems: Record<GemType, number>;
  addGem: (gem: GemType) => void;
  isInteractive: boolean;
}

export const GemBank = ({
  gems,
  player,
  selectedGems,
  addGem,
  isInteractive,
}: GemBankProps) => {
  const toast = useToast();

  const totalPlayerGems = Object.values(player.gems).reduce(
    (sum, count) => sum + count,
    0
  );
  const selectedGemCount = Object.values(selectedGems).reduce(
    (sum, count) => sum + count,
    0
  );
  const remainingSpace = 10 - totalPlayerGems;

  const hasTwoOfSame = Object.values(selectedGems).some((count) => count === 2);

  const differentGemsCount = Object.entries(selectedGems).filter(
    ([g, count]) => g !== "gold" && count > 0
  ).length;

  const handleGemClick = (gemType: GemType) => {
    if (gemType === "gold") return;

    const availableGems = gems[gemType] - (selectedGems[gemType] || 0);
    const currentTempCount = selectedGems[gemType];

    if (selectedGemCount + 1 > remainingSpace) {
      toast({
        title: "Cannot take more gems",
        description: "You would exceed the 10-gem limit",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (hasTwoOfSame && currentTempCount === 0) {
      toast({
        title: "Cannot take more gems",
        description: "You've already selected 2 of the same gem",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (currentTempCount === 1 && differentGemsCount > 1) {
      toast({
        title: "Cannot take two gems",
        description: "You've already selected different gems",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (availableGems > 0 && currentTempCount < 2) {
      if (currentTempCount === 1) {
        if (selectedGemCount + 1 > remainingSpace) {
          toast({
            title: "Cannot take two gems",
            description: "You would exceed the 10-gem limit",
            status: "warning",
            duration: 3000,
            isClosable: true,
          });
          return;
        }

        if (gems[gemType] >= 4) {
          addGem(gemType);
        } else {
          toast({
            title: "Cannot take two gems",
            description: "Not enough gems in the bank",
            status: "warning",
            duration: 3000,
            isClosable: true,
          });
        }
        return;
      }

      if (currentTempCount === 0 && differentGemsCount < 3) {
        addGem(gemType);
        return;
      }

      toast({
        title: "Invalid move",
        description:
          "You can only take up to 3 different gems or 2 of the same gem",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box w="100%" bg="white" p={4} borderRadius="xl" boxShadow="sm">
      <SimpleGrid columns={2} spacing={4}>
        {(Object.entries(gems) as [GemType, number][]).map(([gem, count]) => {
          const availableGems = count - (selectedGems[gem] || 0);
          const isDisabled =
            !isInteractive ||
            gem === "gold" ||
            availableGems === 0 ||
            selectedGemCount >= remainingSpace ||
            (hasTwoOfSame && selectedGems[gem] === 0) ||
            (differentGemsCount === 3 && selectedGems[gem] === 0);

          return (
            <VStack
              key={gem}
              spacing={1}
              p={3}
              bg={gemColors[gem]}
              borderRadius="lg"
              opacity={isDisabled ? 0.3 : 1}
              cursor={isDisabled ? "not-allowed" : "pointer"}
              onClick={() => !isDisabled && handleGemClick(gem)}
              transition="all 0.2s"
              _hover={!isDisabled ? { transform: "scale(1.05)" } : undefined}
              border="1px solid"
              borderColor={gem === "diamond" ? "gray.300" : "transparent"}
            >
              <Image src={gemImages[gem]} alt={gem} boxSize="40px" />
              <Text
                fontSize="lg"
                fontWeight="bold"
                color={gem === "diamond" ? "black" : "white"}
              >
                {availableGems}
              </Text>
            </VStack>
          );
        })}
      </SimpleGrid>
    </Box>
  );
};
