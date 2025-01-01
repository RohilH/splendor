import { Box, HStack, Text, Image, SimpleGrid, VStack } from "@chakra-ui/react";
import { useGameStore } from "../store/gameStore";
import { GemType, Noble } from "../types/game";

const gemImages: Record<Exclude<GemType, "gold">, string> = {
  diamond: "/gems/diamond.svg",
  sapphire: "/gems/sapphire.svg",
  emerald: "/gems/emerald.svg",
  ruby: "/gems/ruby.svg",
  onyx: "/gems/onyx.svg",
};

const NobleCard = ({ noble }: { noble: Noble }) => (
  <Box
    p={2}
    bg="purple.50"
    borderRadius="lg"
    boxShadow="md"
    w="100px"
    h="100px"
    position="relative"
    display="flex"
    flexDirection="column"
    alignItems="center"
  >
    <Text fontSize="3xl" fontWeight="bold" color="purple.800" mb={1}>
      {noble.points}
    </Text>

    <Box w="full" px={1}>
      <HStack spacing={2} justify="center">
        {Object.entries(noble.requirements).map(([gem, count]) => (
          <VStack key={gem} spacing={0} align="center">
            <Text fontSize="sm" fontWeight="bold" color="purple.700">
              {count}
            </Text>
            <Image
              src={gemImages[gem as Exclude<GemType, "gold">]}
              alt={gem}
              boxSize="18px"
            />
          </VStack>
        ))}
      </HStack>
    </Box>
  </Box>
);

export const NobleArea = () => {
  const nobles = useGameStore((state) => state.nobles);
  const nobleCount = nobles.length;

  return (
    <Box w="100%" bg="white" p={4} borderRadius="xl" boxShadow="sm">
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
