import { database } from "../../../../lib/db";
import { gameReducer, getResult } from "../../../../lib/game.mjs";
import {
  ApiError,
  apiError,
  checkOrigin,
  jsonBody,
  rateLimit,
  requirePlayer,
} from "../../../../lib/players";
import { roomCode, roomView, type RoomRow } from "../../../../lib/rooms";

type Context = { params: Promise<{ code: string }> };
async function findRoom(code: string) {
  const rows =
    await database()`SELECT * FROM game_rooms WHERE code=${roomCode(code)} AND expires_at>now()`;
  if (!rows[0])
    throw new ApiError("This room has expired or doesn't exist.", 404);
  return rows[0] as RoomRow;
}
export async function GET(_request: Request, context: Context) {
  try {
    const player = await requirePlayer();
    const room = await findRoom((await context.params).code);
    return Response.json(roomView(room, player.id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const player = await requirePlayer();
    await rateLimit(`action:${player.id}`, 100);
    const room = await findRoom((await context.params).code);
    const view = roomView(room, player.id);
    if (room.closed)
      throw new ApiError("This room is closed. Create a new one.", 410);
    const body = await jsonBody(request);
    if (body.revision !== room.revision)
      throw new ApiError("The board changed. Try your move again.", 409);
    let game = room.game;
    let ready = room.ready;
    let closed = false;
    const current = getResult(game.board);
    if (body.action === "play") {
      if (!view.joined)
        throw new ApiError("Wait for your friend to join.", 409);
      if (game.turn !== view.seat)
        throw new ApiError("It's your friend's turn.", 403);
      const next = gameReducer(game, { type: "play", index: body.index });
      if (next === game)
        throw new ApiError("That square isn't available.", 409);
      game = next;
    } else if (body.action === "rematch") {
      if (!current.winner && !current.draw)
        throw new ApiError(
          "Finish this round before requesting a rematch.",
          409,
        );
      ready = Array.from(new Set([...ready, player.id]));
      if (ready.length === 2) {
        game = gameReducer(game, { type: "next" });
        ready = [];
      }
    } else if (body.action === "leave") closed = true;
    else throw new ApiError("Unknown game action.");

    const result = getResult(game.board);
    const record =
      body.action === "play" && Boolean(result.winner || result.draw);
    const winner =
      result.winner === "X"
        ? room.x_actor
        : result.winner === "O"
          ? room.o_actor
          : null;
    // Compare-and-swap and the result insert share one SQL statement/transaction.
    // A stale or duplicate request can neither overwrite a move nor award a second result.
    const rows = await database()`WITH updated AS (
      UPDATE game_rooms SET game=${JSON.stringify(game)}::jsonb,ready=${JSON.stringify(ready)}::jsonb,
        closed=${closed},revision=revision+1
      WHERE code=${room.code} AND revision=${room.revision} AND NOT closed AND expires_at>now() RETURNING *
    ), recorded AS (
      INSERT INTO game_results(room_code,round,x_actor,o_actor,winner_actor)
      SELECT code,${game.round},x_actor,o_actor,${winner} FROM updated WHERE ${record}
      ON CONFLICT DO NOTHING RETURNING room_code
    ) SELECT * FROM updated`;
    if (!rows[0]) throw new ApiError("The board changed. Try again.", 409);
    return Response.json(roomView(rows[0] as RoomRow, player.id));
  } catch (error) {
    return apiError(error);
  }
}
