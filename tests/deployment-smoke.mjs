// Read-only checks with DATABASE_URL and the auth cookie secret unset.
import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";

const base = process.env.TEST_BASE_URL || "http://localhost:3002";
let home;
for (let attempt = 0; attempt < 40; attempt++) {
  try {
    home = await fetch(base, { signal: AbortSignal.timeout(2000) });
    break;
  } catch (error) {
    if (attempt === 39) throw error;
    await setTimeout(250);
  }
}
assert.equal(home.status, 200, "production home page loads");
assert.match(await home.text(), /Three in a Row/, "game is rendered");
assert.equal((await fetch(`${base}/icon.svg`)).status, 200, "icon is served");

const profile = await fetch(`${base}/api/player`);
assert.equal(profile.status, 200);
assert.deepEqual(await profile.json(), {
  player: null,
  configured: false,
  accounts: false,
});

for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
  const auth = await fetch(`${base}/api/auth/get-session`, { method });
  assert.equal(auth.status, 503, `${method}: unavailable auth is handled`);
  assert.match(auth.headers.get("content-type"), /application\/json/);
  assert.equal(typeof (await auth.json()).error.message, "string");
}
const rejected = await fetch(`${base}/api/player`, {
  method: "POST",
  headers: { Origin: "https://untrusted.example" },
});
assert.equal(rejected.status, 403, "cross-origin writes are rejected");
console.log("Production smoke checks passed (no backend credentials).");
