import {
  Box,
  HStack,
  Text,
  Image,
  SimpleGrid,
  VStack,
  useBreakpointValue,
} from "@chakra-ui/react";
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
    w={["80px", null, "100px"]}
    h={["80px", null, "100px"]}
    flexShrink={0}
    position="relative"
    display="flex"
    flexDirection="column"
    alignItems="center"
  >
    <Text
      fontSize={["2xl", null, "3xl"]}
      fontWeight="bold"
      color="purple.800"
      mb={1}
    >
      {noble.points}
    </Text>

    <Box w="full" px={1}>
      <HStack spacing={[1, null, 2]} justify="center">
        {Object.entries(noble.requirements).map(([gem, count]) => (
          <VStack key={gem} spacing={0} align="center">
            <Text
              fontSize={["xs", null, "sm"]}
              fontWeight="bold"
              color="purple.700"
            >
              {count}
            </Text>
            <Image
              src={gemImages[gem as Exclude<GemType, "gold">]}
              alt={gem}
              boxSize={["14px", null, "18px"]}
            />
          </VStack>
        ))}
      </HStack>
    </Box>
  </Box>
);

interface NobleAreaProps {
  nobles: Noble[];
}

export const NobleArea = ({ nobles }: NobleAreaProps) => {
  const nobleCount = nobles.length;
  const isMobile = useBreakpointValue({ base: true, md: false }, { fallback: "md" });

  return (
    <Box
      w="100%"
      bg="white"
      p={[3, null, 4]}
      borderRadius="xl"
      boxShadow="sm"
      overflowX={["auto", null, "visible"]}
    >
      {isMobile ? (
        <HStack spacing={2} minW="max-content">
          {nobles.map((noble, index) => (
            <NobleCard key={index} noble={noble} />
          ))}
        </HStack>
      ) : nobleCount === 3 ? (
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
