import { randomInt } from "node:crypto";
import { database } from "../../../lib/db";
import { createGame } from "../../../lib/game.mjs";
import {
  apiError,
  checkOrigin,
  jsonBody,
  rateLimit,
  requirePlayer,
  ApiError,
} from "../../../lib/players";
import { roomCode, roomView, type RoomRow } from "../../../lib/rooms";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const player = await requirePlayer();
    const body = await jsonBody(request);
    if (body.action === "create") {
      await rateLimit(`create:${player.id}`, 5);
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = Array.from(
          { length: 8 },
          () => alphabet[randomInt(alphabet.length)],
        ).join("");
        const rows =
          await database()`INSERT INTO game_rooms(code,x_actor,x_name,game)
          VALUES (${code},${player.id},${player.name},${JSON.stringify(createGame())}::jsonb)
          ON CONFLICT DO NOTHING RETURNING *`;
        if (rows[0])
          return Response.json(roomView(rows[0] as RoomRow, player.id));
      }
      throw new ApiError("Couldn't create a room. Please try again.", 503);
    }
    if (body.action !== "join") throw new ApiError("Unknown room action.");
    await rateLimit(`join:${player.id}`, 20);
    const code = roomCode(body.code || "");
    const rows = await database()`UPDATE game_rooms SET
      o_actor=CASE WHEN x_actor=${player.id} THEN o_actor ELSE ${player.id} END,
      o_name=CASE WHEN x_actor=${player.id} THEN o_name ELSE ${player.name} END,
      revision=revision+1
      WHERE code=${code} AND expires_at>now() AND NOT closed
      AND (o_actor IS NULL OR o_actor=${player.id} OR x_actor=${player.id}) RETURNING *`;
    if (!rows[0])
      throw new ApiError("Room not found, expired, or already full.", 404);
    return Response.json(roomView(rows[0] as RoomRow, player.id));
  } catch (error) {
    return apiError(error);
  }
}
