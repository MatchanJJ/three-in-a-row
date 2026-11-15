import type { Game, Player } from "./game.mjs";
import { ApiError } from "./players";

export type RoomRow = {
  code: string;
  x_actor: string;
  o_actor: string | null;
  x_name: string;
  o_name: string | null;
  game: Game;
  ready: string[];
  revision: number;
  closed: boolean;
  expires_at: string;
};
export function roomCode(value: string) {
  if (typeof value !== "string")
    throw new ApiError("Enter the 8-character room code.");
  const code = value.trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code))
    throw new ApiError("Enter the 8-character room code.");
  return code;
}
export function roomView(room: RoomRow, actor: string) {
  const seat: Player | null =
    room.x_actor === actor ? "X" : room.o_actor === actor ? "O" : null;
  if (!seat) throw new ApiError("Join this room before viewing it.", 403);
  return {
    code: room.code,
    game: room.game,
    revision: room.revision,
    seat,
    players: { X: room.x_name, O: room.o_name },
    joined: Boolean(room.o_actor),
    closed: room.closed,
    youReady: room.ready.includes(actor),
    opponentReady: room.ready.some((id) => id !== actor),
    expiresAt: room.expires_at,
  };
}
export type RoomView = ReturnType<typeof roomView>;
