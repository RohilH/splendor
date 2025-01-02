import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  SimpleGrid,
  Box,
  Text,
  Image,
  VStack,
  HStack,
} from "@chakra-ui/react";
import { Noble, GemType } from "../types/game";

const gemImages: Record<Exclude<GemType, "gold">, string> = {
  diamond: "/gems/diamond.svg",
  sapphire: "/gems/sapphire.svg",
  emerald: "/gems/emerald.svg",
  ruby: "/gems/ruby.svg",
  onyx: "/gems/onyx.svg",
};

interface NobleSelectionModalProps {
  isOpen: boolean;
  nobles: Noble[];
  onSelect: (noble: Noble) => void;
}

export const NobleSelectionModal = ({
  isOpen,
  nobles,
  onSelect,
}: NobleSelectionModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={() => {}} isCentered size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign="center">
          Select a Noble to Visit You
        </ModalHeader>
        <ModalBody p={6}>
          <SimpleGrid columns={2} spacing={4} justifyItems="center">
            {nobles.map((noble, index) => (
              <Box
                key={index}
                p={4}
                bg="purple.50"
                borderRadius="lg"
                boxShadow="md"
                w="160px"
                h="160px"
                cursor="pointer"
                onClick={() => onSelect(noble)}
                transition="transform 0.2s"
                _hover={{ transform: "scale(1.05)" }}
              >
                <VStack spacing={3}>
                  <Text fontSize="3xl" fontWeight="bold" color="purple.800">
                    {noble.points}
                  </Text>
                  <Box>
                    <HStack spacing={2} justify="center" flexWrap="wrap">
                      {Object.entries(noble.requirements).map(
                        ([gem, count]) => (
                          <VStack key={gem} spacing={0} align="center">
                            <Text
                              fontSize="sm"
                              fontWeight="bold"
                              color="purple.700"
                            >
                              {count}
                            </Text>
                            <Image
                              src={gemImages[gem as Exclude<GemType, "gold">]}
                              alt={gem}
                              boxSize="24px"
                            />
                          </VStack>
                        )
                      )}
                    </HStack>
                  </Box>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
