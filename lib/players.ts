import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { getAuth } from "./auth/server";
import { database } from "./db";

export type PlayerIdentity = {
  id: string;
  name: string;
  kind: "account" | "guest";
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function cleanName(value: unknown) {
  if (typeof value !== "string") throw new ApiError("Enter a display name.");
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 24 || /[\x00-\x1f\x7f]/.test(name))
    throw new ApiError("Use a name with 2–24 characters.");
  return name;
}
export async function currentPlayer(): Promise<PlayerIdentity | null> {
  if (process.env.NEON_AUTH_BASE_URL) {
    const { data, error } = await getAuth().getSession();
    if (error)
      throw new ApiError(
        "Account service is temporarily unavailable. Please try again.",
        503,
      );
    if (data?.user)
      return {
        id: `user:${data.user.id}`,
        name: data.user.name.slice(0, 24),
        kind: "account",
      };
  }
  const token = (await cookies()).get("little-games-guest")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const rows =
    await database()`SELECT name FROM guest_players WHERE token_hash=${hashToken(token)} AND expires_at>now()`;
  return rows[0]
    ? { id: `guest:${hashToken(token)}`, name: rows[0].name, kind: "guest" }
    : null;
}
export async function requirePlayer() {
  const player = await currentPlayer();
  if (!player) throw new ApiError("Choose a guest name or sign in first.", 401);
  return player;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new ApiError("Request origin was not accepted.", 403);
}
export async function rateLimit(key: string, limit: number) {
  const rows = await database()`
    INSERT INTO request_limits(key,window_start,hits) VALUES (${key},date_trunc('minute',now()),1)
    ON CONFLICT (key) DO UPDATE SET
      hits=CASE WHEN request_limits.window_start<date_trunc('minute',now()) THEN 1 ELSE request_limits.hits+1 END,
      window_start=date_trunc('minute',now())
    WHERE request_limits.window_start<date_trunc('minute',now()) OR request_limits.hits<${limit}
    RETURNING hits`;
  if (!rows.length)
    throw new ApiError("A little too speedy. Try again in a minute.", 429);
}
export async function jsonBody(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 4096)
    throw new ApiError("Request is too large.", 413);
  const text = await request.text();
  if (text.length > 4096) throw new ApiError("Request is too large.", 413);
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
    return body;
  } catch {
    throw new ApiError("Invalid JSON request.");
  }
}
export function apiError(error: unknown) {
  if (error instanceof ApiError)
    return Response.json({ error: error.message }, { status: error.status });
  // Never expose database errors or connection strings to the browser.
  return Response.json(
    {
      error:
        "Online service is unavailable. Please try again shortly; local play still works.",
    },
    { status: 503 },
  );
}
