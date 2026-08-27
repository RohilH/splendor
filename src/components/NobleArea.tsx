import { Flex } from "@chakra-ui/react";
import { Noble } from "../types/game";
import { NobleTile } from "./NobleTile";

interface NobleAreaProps {
  nobles: Noble[];
}

/** The row of noble tiles laid out above the development card rows. */
export const NobleArea = ({ nobles }: NobleAreaProps) => {
  return (
    <Flex
      w="100%"
      justify="center"
      gap={[1, null, 3]}
      overflow="hidden"
      flexShrink={0}
    >
      {nobles.map((noble, index) => (
        <NobleTile key={index} noble={noble} />
      ))}
    </Flex>
  );
};
