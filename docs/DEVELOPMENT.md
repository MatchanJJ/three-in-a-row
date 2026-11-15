# Development and deployment

Setup, deployment, verification, and architecture for contributors. For game instructions, see the [player guide](../README.md).

## Run

Requires Node.js 24.x and npm, matching the runtime selected for Vercel and CI.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Local play works without environment variables or an online backend.

Backend credentials are not included in the repository. Create `.env.local` using the setup below to enable online play. Keep it out of Git, screenshots, and public source archives.

## Configure another environment

1. Create a Neon project in an AWS region and enable Managed Better Auth for its database. This project uses Singapore (`aws-ap-southeast-1`).
2. Run `db/schema.sql` on the application database. In the SQL editor, run the file as a script; with a prepared-statement client, execute each statement separately.
3. Copy `.env.example` to `.env.local`. Set the pooled `DATABASE_URL`, the branch's `NEON_AUTH_BASE_URL`, and a new random `NEON_AUTH_COOKIE_SECRET` of at least 32 characters. All three variables are server-only.
4. Keep email/password sign-up enabled. This version uses the default configuration with email verification off. If enabling verification, implement the verification screen before requiring it. Managed Auth stores passwords and sessions; the application never stores password hashes itself.
5. For development use `http://localhost:3000`; localhost origins are enabled by default.

Development backend: Neon project `royal-dew-90844693`, branch `br-odd-heart-aoqifait` (`development`). The deployed game uses the separate Neon project `icy-darkness-98008167`, branch `br-restless-salad-b3n87idb` (`production`). Application tables are separate from the managed `neon_auth` schema.

## Publish to Vercel

1. Run `npm ci`, `npm test`, and `npm run build`, then push the changes to the existing [GitHub repository](https://github.com/MatchanJJ/three-in-a-row). Make it public if submitting it for the challenge. GitHub Actions repeats the rules, build, type, and production smoke checks without backend secrets.
2. Import the repository into Vercel. Select the repository root, **Next.js**, the default `npm run build` command, and the default output directory. `package.json` selects Node.js 24.x. `vercel.json` places server functions in Singapore (`sin1`) near the documented Neon database; update that region if your production database is elsewhere. No custom rewrites or static export are needed. See [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) and [region configuration](https://vercel.com/docs/project-configuration/vercel-json#regions).
3. Add these variables to Vercel's **Production** environment before deploying:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Pooled connection string for the production database with `db/schema.sql` applied. |
   | `NEON_AUTH_BASE_URL` | Managed Auth URL for that same database branch, including `/neondb/auth` (or your database name). |
   | `NEON_AUTH_COOKIE_SECRET` | A private random secret of at least 32 characters, kept stable across deployments. |

   Generate a cookie secret privately with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Use a separate production branch/database when moving beyond the application demo. Apply the schema once during setup; builds do not create or migrate tables. Never use `NEXT_PUBLIC_*` for these variables.
4. Deploy, then add the exact Vercel production origin (for example `https://three-in-a-row.vercel.app`) to that database branch's Neon Auth **trusted domains**, with scheme and no trailing slash. Add custom-domain origins too. Follow the [Neon Next.js setup](https://neon.com/docs/auth/quick-start/nextjs-api-only). Redeploy after changing Vercel environment variables. Changing the cookie secret invalidates cached session cookies.
5. Open `/api/player` on the production URL: `configured: true` means the database URL is present, and `accounts: true` means the Auth URL is present; these flags alone do not verify the database schema or login. Check sign-up, sign-in, sign-out, session restoration, a room from two browsers/devices, a win, a draw, and a mutual rematch. Local play remains available when the backend is absent or unavailable.
6. For **Preview** deployments, use a development Neon branch and its own three environment variables, and register each preview origin with that branch's trusted domains. Leaving preview variables unset gives local-only play. Avoid pointing previews at production player data.

For challenge submission, capture desktop, mobile, and celebration screenshots. At https://apply.capm.us choose **1) Tic-Tac-Toe**, and provide the production URL, public GitHub URL, and screenshots. A demo video is optional.

Copy credentials privately into Vercel's environment-variable settings; `.gitignore` excludes environment files, `node_modules`, `.next`, and `.vercel`.

## Troubleshoot an online 503

An empty player profile can load successfully even when game database queries fail. Successful signup or login also does not prove that the game tables exist.

Check the Neon project, branch, and database used by Vercel's production `DATABASE_URL`. That database needs all four application tables: `guest_players`, `game_rooms`, `game_results`, and `request_limits`. Enabling Neon Auth creates its own `neon_auth` tables; it does not apply `db/schema.sql`. Apply the repository schema to each database used for production or previews, even if it was already applied to a different development database.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

The rules suite checks all winning lines for both players, invalid moves, win/draw scoring, round transitions, and every legal completed game (255,168 paths).

To check a production build without backend credentials, leave `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_COOKIE_SECRET` unset (including in `.env.local`), then run in two terminals:

```sh
npm run build
npm start -- --port 3002
# In the second terminal:
npm run test:deployment
```

This read-only smoke check covers the rendered page, icon, local-only profile, JSON auth failure responses, and origin protection. It also catches a partially configured Auth URL with a missing cookie secret. `TEST_BASE_URL` can select another local port. CI runs this check automatically; online functionality still needs the backend checks below.

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
