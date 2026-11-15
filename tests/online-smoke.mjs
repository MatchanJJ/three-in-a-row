// Run against a local test server. Creates isolated QA guests, rooms, and an account.
// Never prints passwords, session cookies, or database credentials.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const base = process.env.TEST_BASE_URL || "http://localhost:3002";
let checks = 0;
function check(condition, label) {
  assert.ok(condition, label);
  checks++;
  console.log(`PASS ${label}`);
}
function client() {
  const jar = new Map();
  return async (path, body, method = "POST", origin = base) => {
    const response = await fetch(base + path, {
      method: body ? method : "GET",
      headers: {
        origin,
        cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const split = pair.indexOf("=");
      jar.set(pair.slice(0, split), pair.slice(split + 1));
    }
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Non-JSON response from ${path}: ${response.status}`);
    }
    return { status: response.status, data };
  };
}
const a = client(),
  b = client(),
  outsider = client();
const guest = await a("/api/player", { name: "QA Cinema" });
check(
  guest.status === 200,
  `guest access (${guest.status}: ${guest.data.error || "ok"})`,
);
check(
  (await b("/api/player", { name: "QA Chef" })).status === 200,
  "second independent guest session",
);
check(
  (await outsider("/api/rooms", { action: "create" })).status === 401,
  "unauthenticated room creation denied",
);
check(
  (
    await a(
      "/api/rooms",
      { action: "create" },
      "POST",
      "https://untrusted.example",
    )
  ).status === 403,
  "cross-origin mutations denied",
);
let { data: room, status } = await a("/api/rooms", { action: "create" });
check(
  status === 200 && room.seat === "X" && !room.joined,
  "create room and assign X",
);
const path = `/api/rooms/${room.code}`;
check(
  (
    await a(
      path,
      { action: "play", index: 0, revision: room.revision },
      "PATCH",
    )
  ).status === 409,
  "cannot play before friend joins",
);
const joined = await b("/api/rooms", { action: "join", code: room.code });
check(
  joined.status === 200 && joined.data.seat === "O",
  "join by room code and assign O",
);
check(
  (await outsider("/api/player", { name: "QA Outsider" })).status === 200,
  "third independent guest session",
);
check((await outsider(path)).status === 403, "outsider cannot read room data");
check(
  (await outsider("/api/rooms", { action: "join", code: room.code })).status ===
    404,
  "third player cannot claim full room",
);
room = (await a(path)).data;
check(
  (
    await b(
      path,
      { action: "play", index: 0, revision: room.revision },
      "PATCH",
    )
  ).status === 403,
  "opponent cannot play out of turn",
);
check(
  (await a(path, { action: "play", index: 0, revision: -1 }, "PATCH"))
    .status === 409,
  "stale revision rejected",
);
for (const index of [0, 3, 1, 4, 2]) {
  const who = room.game.turn === "X" ? a : b;
  const move = await who(
    path,
    { action: "play", index, revision: room.revision },
    "PATCH",
  );
  assert.equal(move.status, 200, move.data.error);
  room = move.data;
}
check(
  room.game.scores.X === 1 && room.game.scores.O === 0,
  "win scored exactly once",
);
check(
  (await b(path)).data.game.scores.X === 1,
  "second device sees same authoritative score",
);
check(
  (
    await b(
      path,
      { action: "play", index: 8, revision: room.revision },
      "PATCH",
    )
  ).status === 409,
  "completed board locks",
);
room = (await a(path, { action: "rematch", revision: room.revision }, "PATCH"))
  .data;
check(
  room.youReady && room.game.round === 1,
  "one player cannot reset opponent board",
);
room = (await b(path, { action: "rematch", revision: room.revision }, "PATCH"))
  .data;
check(
  room.game.round === 2 &&
    room.game.turn === "O" &&
    room.game.scores.X === 1 &&
    room.game.board.every((v) => v === null),
  "mutual rematch clears board and alternates starter",
);
for (const index of [0, 1, 2, 4, 3, 5, 7, 6, 8]) {
  const move = await (room.game.turn === "X" ? a : b)(
    path,
    { action: "play", index, revision: room.revision },
    "PATCH",
  );
  assert.equal(move.status, 200, move.data.error);
  room = move.data;
}
check(room.game.scores.draws === 1, "online draw scored correctly");
check(
  (await a(path)).data.seat === "X",
  "guest session restores original seat on reload",
);
check(
  (await a(path, { action: "leave", revision: room.revision }, "PATCH")).data
    .closed,
  "leaving closes room for both players",
);
check((await b(path)).data.closed, "opponent sees room closure");

// Auth is exercised through the app's same-origin managed-auth proxy.
const account = client();
const email = `qa-${randomBytes(8).toString("hex")}@example.test`;
const password = randomBytes(24).toString("base64url");
const signup = await account("/api/auth/sign-up/email", {
  name: "QA Account",
  email,
  password,
});
check(
  signup.status === 200,
  `account signup (${signup.status}: ${signup.data.error?.message || signup.data.message || "ok"})`,
);
let profile = await account("/api/player");
check(
  profile.data.player?.kind === "account",
  "server validates account session",
);
check(
  (await account("/api/player")).data.player?.name === "QA Account",
  "account session survives another request",
);
let match = (await account("/api/rooms", { action: "create" })).data;
const accountPath = `/api/rooms/${match.code}`;
await b("/api/rooms", { action: "join", code: match.code });
match = (await account(accountPath)).data;
for (const index of [0, 3, 1, 4, 2]) {
  const move = await (match.game.turn === "X" ? account : b)(
    accountPath,
    { action: "play", index, revision: match.revision },
    "PATCH",
  );
  assert.equal(move.status, 200, move.data.error);
  match = move.data;
}
profile = await account("/api/player");
check(
  profile.data.stats?.wins === 1 && profile.data.stats?.losses === 0,
  "account win saved to persistent record",
);
check(
  (await account("/api/auth/sign-out", {})).status === 200,
  "account sign out",
);
check(
  (await account(accountPath)).status === 401,
  "signed-out account loses room access",
);
const wrongPassword = await account("/api/auth/sign-in/email", {
  email,
  password: "incorrect-password",
});
check(wrongPassword.status >= 400, "incorrect password rejected");
const signin = await account("/api/auth/sign-in/email", { email, password });
check(signin.status === 200, "account signs back in");
check(
  (await account(accountPath)).data.seat === "X",
  "signed-in account recovers original room seat",
);
check(
  (await account("/api/player")).data.stats.wins === 1,
  "account record survives sign out and sign in",
);
console.log(
  `${checks} online checks passed. QA rooms expire automatically after 24 hours.`,
);
