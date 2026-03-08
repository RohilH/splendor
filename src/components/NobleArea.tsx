import {
  Box,
  Circle,
  HStack,
  Image,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useGameStore } from "../store/gameStore";
import { GemType, Noble } from "../types/game";
import { gemImages } from "../utils/constants";

const RequirementChip = ({
  gem,
  count,
}: {
  gem: Exclude<GemType, "gold">;
  count: number;
}) => (
  <HStack
    spacing={1}
    px={2}
    py={1}
    borderRadius="full"
    bg="rgba(247, 242, 232, 0.95)"
    border="1px solid rgba(102, 79, 44, 0.22)"
  >
    <Circle size="18px" bg="rgba(255,255,255,0.78)">
      <Image src={gemImages[gem]} alt={gem} boxSize="12px" />
    </Circle>
    <Text fontSize="xs" fontWeight="bold" color="#4a3924">
      {count}
    </Text>
  </HStack>
);

const NobleCard = ({ noble }: { noble: Noble }) => (
  <Box
    p={3}
    bg="linear-gradient(180deg, #f8f1e2 0%, #e9dcc4 100%)"
    borderRadius="xl"
    border="1px solid rgba(111, 86, 45, 0.34)"
    boxShadow="0 12px 22px rgba(24, 20, 14, 0.16)"
    w="126px"
    h="126px"
    position="relative"
    overflow="hidden"
  >
    <Box
      position="absolute"
      inset="6px"
      borderRadius="16px"
      border="1px solid rgba(118, 92, 54, 0.22)"
      pointerEvents="none"
    />
    <Box
      h="58px"
      borderRadius="lg"
      bg="linear-gradient(135deg, rgba(102, 56, 113, 0.92) 0%, rgba(186, 123, 192, 0.65) 100%)"
      position="relative"
      overflow="hidden"
    >
      <Box
        position="absolute"
        inset={0}
        opacity={0.24}
        backgroundImage="radial-gradient(circle at 25% 35%, white 0 16%, transparent 17%), radial-gradient(circle at 68% 28%, white 0 12%, transparent 13%), linear-gradient(180deg, transparent 20%, rgba(255,255,255,0.32) 100%)"
      />
    </Box>

    <Circle
      position="absolute"
      top="10px"
      left="10px"
      size="34px"
      bg="rgba(251, 246, 236, 0.96)"
      border="1px solid rgba(104, 81, 44, 0.35)"
    >
      <Text fontSize="lg" fontWeight="black" color="#4d3c24">
        {noble.points}
      </Text>
    </Circle>

    <VStack spacing={2} mt={3} align="stretch">
      <Text
        fontSize="10px"
        fontWeight="semibold"
        letterSpacing="0.16em"
        color="#6f5532"
        textAlign="center"
      >
        NOBLE
      </Text>
      <VStack spacing={1.5}>
        {Object.entries(noble.requirements).map(([gem, count]) => (
          <RequirementChip
            key={gem}
            gem={gem as Exclude<GemType, "gold">}
            count={count}
          />
        ))}
      </VStack>
    </VStack>
  </Box>
);

interface NobleAreaProps {
  nobles?: Noble[];
}

export const NobleArea = ({ nobles: noblesProp }: NobleAreaProps) => {
  const storeNobles = useGameStore((state) => state.nobles);
  const nobles = noblesProp ?? storeNobles;
  const nobleCount = nobles.length;

  return (
    <Box
      w="100%"
      bg="rgba(248, 241, 227, 0.96)"
      p={4}
      borderRadius="xl"
      boxShadow="lg"
      border="1px solid rgba(255, 255, 255, 0.2)"
    >
      {nobleCount === 3 ? (
        <VStack spacing={3} align="center">
          <HStack spacing={3} justify="center">
            <NobleCard noble={nobles[0]} />
            <NobleCard noble={nobles[1]} />
          </HStack>
          <Box>
            <NobleCard noble={nobles[2]} />
          </Box>
        </VStack>
      ) : (
        <SimpleGrid columns={2} spacing={3} justifyItems="center">
          {nobles.map((noble, index) => (
            <NobleCard key={index} noble={noble} />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
};
