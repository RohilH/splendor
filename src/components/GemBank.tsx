import { Box, Flex, Text, useToast } from "@chakra-ui/react";
import { GemType, Gems, Player } from "../types/game";
import { GemChip } from "./GemChip";

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
    <Box
      w="100%"
      p={[3, null, 4]}
      borderRadius="14px"
      bg="rgba(6, 22, 15, 0.45)"
      border="1px solid rgba(217, 180, 91, 0.28)"
      boxShadow="inset 0 2px 10px rgba(0, 0, 0, 0.45)"
    >
      <Text
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="sm"
        fontWeight="bold"
        letterSpacing="0.14em"
        textTransform="uppercase"
        color="tableGold.300"
        textAlign="center"
        mb={3}
      >
        Bank
      </Text>
      <Flex
        direction={["row", null, "column"]}
        wrap={["wrap", null, "nowrap"]}
        justify="center"
        align="center"
        gap={[3, null, 4]}
      >
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
            <GemChip
              key={gem}
              gem={gem}
              count={availableGems}
              isSelected={selectedGems[gem] > 0}
              isDisabled={isDisabled}
              onClick={() => handleGemClick(gem)}
            />
          );
        })}
      </Flex>
    </Box>
  );
};
