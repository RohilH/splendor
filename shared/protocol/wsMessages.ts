import type { OnlineGameAction } from "../game/actions";
import type { Card, GemType } from "../types/game";
import type { GamePublicState, PublicRoomState, RoomState } from "../onlineTypes";

export type ActionResultDetails =
  | { type: "take_gems"; gems: Partial<Record<GemType, number>> }
  | { type: "purchase_card"; card: Card }
  | { type: "reserve_card"; level: 1 | 2 | 3; gotGold: boolean }
  | { type: "purchase_reserved_card"; card: Card }
  | { type: "end_turn" }
  | { type: "select_noble"; noblePoints: number };

export interface GameActionResult {
  playerName: string;
  playerId: string;
  action: ActionResultDetails;
}

export type ClientToServerMessage =
  | { type: "auth"; token: string }
  | { type: "ping"; ts: number }
  | { type: "room:create" }
  | { type: "room:join"; roomCode: string }
  | { type: "room:leave" }
  | { type: "room:start" }
  | { type: "game:action"; actionId?: string; action: OnlineGameAction };

export type ServerToClientMessage =
  | {
      type: "auth:ok";
      user: { id: string; username: string };
    }
  | {
      type: "auth:error";
      message: string;
    }
  | {
      type: "rooms:update";
      rooms: PublicRoomState[];
    }
  | {
      type: "room:update";
      room: RoomState | null;
    }
  | {
      type: "game:state";
      gameState: GamePublicState;
    }
  | {
      type: "info";
      message: string;
    }
  | {
      type: "error";
      message: string;
    }
  | {
      type: "game:action_result";
      result: GameActionResult;
    }
  | {
      type: "pong";
      ts: number;
    };
