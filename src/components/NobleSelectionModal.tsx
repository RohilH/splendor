import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  SimpleGrid,
} from "@chakra-ui/react";
import { Noble } from "../types/game";
import { NobleTile } from "./NobleTile";

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
      <ModalOverlay bg="rgba(6, 22, 15, 0.75)" />
      <ModalContent
        bg="linear-gradient(160deg, #f9f4e8 0%, #f2e9d4 60%, #eadfc6 100%)"
        border="1px solid rgba(111, 86, 45, 0.45)"
        boxShadow="0 20px 50px rgba(6, 22, 15, 0.6)"
        borderRadius="16px"
      >
        <ModalHeader
          textAlign="center"
          fontFamily="Georgia, 'Times New Roman', serif"
          color="ink.900"
        >
          Select a Noble to Visit You
        </ModalHeader>
        <ModalBody p={6}>
          <SimpleGrid columns={2} spacing={5} justifyItems="center">
            {nobles.map((noble, index) => (
              <NobleTile
                key={index}
                noble={noble}
                size="modal"
                onClick={() => onSelect(noble)}
              />
            ))}
          </SimpleGrid>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
