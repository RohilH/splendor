import type { OnlineGameAction } from "../game/actions";
import type { GamePublicState, PublicRoomState, RoomState } from "../onlineTypes";

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
      type: "pong";
      ts: number;
    };
