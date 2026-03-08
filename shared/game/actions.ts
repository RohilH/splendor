import type { GemType } from "../types/game";

export type OnlineGameAction =
  | {
      type: "take_gems";
      gems: Partial<Record<GemType, number>>;
    }
  | {
      type: "purchase_card";
      level: 1 | 2 | 3;
      cardIndex: number;
    }
  | {
      type: "reserve_card";
      level: 1 | 2 | 3;
      cardIndex: number;
    }
  | {
      type: "purchase_reserved_card";
      cardIndex: number;
    }
  | {
      type: "end_turn";
    }
  | {
      type: "select_noble";
      nobleIndex: number;
    };
