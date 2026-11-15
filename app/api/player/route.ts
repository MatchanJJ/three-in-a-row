import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { database } from "../../../lib/db";
import {
  apiError,
  checkOrigin,
  cleanName,
  currentPlayer,
  hashToken,
  jsonBody,
  rateLimit,
} from "../../../lib/players";

export async function GET() {
  try {
    if (!process.env.DATABASE_URL)
      return Response.json({
        player: null,
        configured: false,
        accounts: false,
      });
    const player = await currentPlayer();
    let stats = null;
    if (player?.kind === "account") {
      const rows = await database()`SELECT
        count(*) FILTER (WHERE winner_actor=${player.id})::int AS wins,
        count(*) FILTER (WHERE winner_actor IS NOT NULL AND winner_actor<>${player.id})::int AS losses,
        count(*) FILTER (WHERE winner_actor IS NULL)::int AS draws
        FROM game_results WHERE x_actor=${player.id} OR o_actor=${player.id}`;
      stats = rows[0];
    }
    return Response.json(
      {
        player: player ? { name: player.name, kind: player.kind } : null,
        stats,
        configured: true,
        accounts: Boolean(process.env.NEON_AUTH_BASE_URL),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const name = cleanName((await jsonBody(request)).name);
    const player = await currentPlayer();
    if (player?.kind === "account")
      return Response.json({
        player: { name: player.name, kind: player.kind },
      });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
    await rateLimit(
      `guest:${hashToken(ip + (process.env.NEON_AUTH_COOKIE_SECRET || ""))}`,
      12,
    );
    const jar = await cookies();
    const old = jar.get("little-games-guest")?.value;
    const token =
      old && /^[a-f0-9]{64}$/.test(old) ? old : randomBytes(32).toString("hex");
    await database()`INSERT INTO guest_players(token_hash,name) VALUES (${hashToken(token)},${name})
      ON CONFLICT(token_hash) DO UPDATE SET name=excluded.name,expires_at=now()+interval '30 days'`;
    jar.set("little-games-guest", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return Response.json({ player: { name, kind: "guest" } });
  } catch (error) {
    return apiError(error);
  }
}
