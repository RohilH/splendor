import type { Card, GemType, Gems, Noble } from "../../shared/types/game";

export type { Card, GemType, Gems, Noble };

export interface Player {
  id: number;
  name: string;
  gems: Gems;
  reservedCards: Card[];
  purchasedCards: Card[];
  nobles: Noble[];
}
