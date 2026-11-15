# Three in a Row

A React / Next.js tic-tac-toe game built by Mark Jade Palma with AI assistance for the SUpost junior developer challenge.

## Play modes

- **One device:** two players share a board. New Game keeps the match score and alternates the starter. Reset scores starts a fresh match.
- **Online guest:** enter a display name, create a private room, and share its 8-character code. A friend chooses a guest name or signs in, then joins from another device.
- **Online account:** sign up or sign in with email/password. Completed online rounds add to your persistent wins, losses, and draws. Local games do not affect your account record.

Winners get confetti and an "ABSOLUTE CINEMA" or "LET THEM COOK" meme card. Online opponents get an "EMOTIONAL DAMAGE" reaction. Celebrations clear after four seconds, can be replayed, never block controls, and are hidden when reduced motion is enabled.

## Run

Requires Node.js 20.9+ and npm. Node.js 22 or 24 is recommended.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Local play works without environment variables or an online backend.

This working copy already has local backend configuration in `.env.local`. That file contains secrets: keep it out of Git, screenshots, and public source archives.

## Configure another environment

1. Create a Neon project in an AWS region and enable Managed Better Auth for its database. This project uses Singapore (`aws-ap-southeast-1`).
2. Run `db/schema.sql` on the application database. In the SQL editor, run the file as a script; with a prepared-statement client, execute each statement separately.
3. Copy `.env.example` to `.env.local`. Set the pooled `DATABASE_URL`, the branch's `NEON_AUTH_BASE_URL`, and a new random `NEON_AUTH_COOKIE_SECRET` of at least 32 characters. All three variables are server-only.
4. Keep email/password sign-up enabled. This version uses the default configuration with email verification off. If enabling verification, implement the verification screen before requiring it. Managed Auth stores passwords and sessions; the application never stores password hashes itself.
5. For development use `http://localhost:3000`; localhost origins are enabled by default.

Configured development backend: Neon project `royal-dew-90844693`, branch `br-odd-heart-aoqifait` (`development`). Application tables are separate from the managed `neon_auth` schema.

## Publish to Vercel

1. Create a **public** GitHub repository and push the project. `.gitignore` excludes `.env.local`, `node_modules`, and `.next`.
2. Import the repository into Vercel. Keep the detected **Next.js** framework and default build command.
3. Add the three server-only environment variables above to Vercel. Use a separate production branch/database when moving beyond the application demo. Run the application schema on that branch and use its own Auth URL.
4. Deploy. Add the exact Vercel production origin (for example `https://three-in-a-row.vercel.app`) to that branch's Neon Auth **trusted domains**, with scheme and no trailing slash. Redeploy if environment variables changed.
5. Check sign-up, sign-in, an online room from two browsers/devices, a win, a draw, and a mutual rematch on the **production** URL.
6. Capture desktop, mobile, and celebration screenshots. At https://apply.capm.us choose **1) Tic-Tac-Toe**, and provide the production URL, public GitHub URL, and screenshots. A demo video is optional.

Existing `.env.local` values are intentionally omitted from downloadable archives. Copy them privately into Vercel's environment-variable settings. Never put a database connection string into a `NEXT_PUBLIC_*` variable.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

The rules suite checks all winning lines for both players, invalid moves, win/draw scoring, round transitions, and every legal completed game (255,168 paths).

For the online integration checks, start a development server on port 3002:

```sh
npm run dev -- --port 3002
npm run test:online
```

`TEST_BASE_URL` can point to another local server. The smoke checks create isolated QA guests, rooms, and a test account. Run against development, not a public production database. They test independent sessions, membership, full rooms, turn enforcement, stale moves, cross-origin requests, win/draw scoring, mutual rematches, account signup/signout/signin, and persistent records. Generated test credentials are never printed.

## Architecture

- `app/page.tsx`: local game and mode selection.
- `app/online-game.tsx`: guest/account lobby, room entry, synchronized board, loading and error states.
- `app/win-celebration.tsx`: deterministic CSS animation with no remote GIF service or animation library.
- `lib/game.mjs`: immutable reducer and pure game rules shared by the browser, server, and tests. JSDoc defines its types.
- `app/api/auth/[...path]/route.ts`: same-origin Managed Better Auth proxy.
- `app/api/player/route.ts`: server-validated identity, guest creation, and account record.
- `app/api/rooms/*`: room creation/joining, private reads, moves, rematches, and closure.
- `db/schema.sql`: guests, rooms, immutable round results, and request limits.

Online state lives in Postgres rather than process memory, so it works across server instances. Visible clients poll every 1.5 seconds; hidden tabs pause reads. Mutations carry a revision. A SQL compare-and-swap rejects stale concurrent updates. A result record commits in the same statement as the winning move and has a unique `(room_code, round)` key.

The server decides identity, seat, turn, result, and score. A room code allows joining an open seat but does not grant outsider read/move access. Guest cookies contain random tokens; the database stores only hashes. API writes check the origin and use persistent rate limits. Explicitly leaving closes the room for both players; switching modes or refreshing does not forfeit a seat. Online rematches require both players; local New Game is immediate.

## Deliberate limits

- Rooms expire after 24 hours; guest sessions after 30 days. Closing a tab does not count as a forfeit. An abandoned room waits until expiry.
- Guests resume in the same browser. Accounts can sign in elsewhere and recover their seat using the room code. Guest records do not automatically merge into a later account.
- Updates use polling, not WebSockets.
- Expiry prevents access but does not delete stored records. Add scheduled cleanup and retention rules for a long-running service.
- Email verification, password recovery UI, social sign-in, spectators, matchmaking, and chat are outside this version. Complete Managed Auth's production email setup before a general public launch.
- Google Fonts have system fallbacks; gameplay does not require the font service.

Challenge: https://tremendous-tiger-a4a.notion.site/Test-1-Tic-Tac-Toe-React-App-22200bbdfc3b80d089deee909ae597e4
