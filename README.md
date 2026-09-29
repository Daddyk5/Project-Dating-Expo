# KingxQueen

A dating app inspired by Tinder (swipe deck) and Badoo (People Nearby). Universal Expo app (iOS, Android, web) on a Node/Express API, with Neon for Postgres, auth and photo storage, and server-side AI features.

```
apps/api         Express 5 + Socket.io API (TypeScript, Drizzle ORM)
apps/app         Expo Router app (SDK 57): iOS, Android, web
packages/shared  zod schemas, constants and types used by both
e2e/             Playwright end-to-end test (web)
neon.ts          Neon services: Auth, private "uploads" bucket, "api" function
```

## Stack

| Concern | What's used |
| --- | --- |
| Database | Neon Lakebase Postgres + PostGIS, Drizzle ORM (`apps/api/src/db/schema.ts`, migrations in `apps/api/drizzle/`) |
| Auth | Neon Auth (Managed Better Auth). The app signs in against the branch's Auth URL; the API verifies the 15-minute EdDSA JWT against the branch JWKS (`apps/api/src/auth/jwt.ts`) |
| Photos | Neon Object Storage bucket `uploads` (private). Presigned PUT for uploads, presigned GET for reads |
| Realtime | Socket.io, authenticated with the same JWT |
| AI | Provider interface in `apps/api/src/ai/`: **Ollama** (default, local), Anthropic, or Neon AI Gateway |
| App | Expo Router, Reanimated + Gesture Handler (swipe deck), TanStack Query |

## Getting started

Prerequisites: Node 22, the Neon CLI (`npm i -g neon`), and [Ollama](https://ollama.com) with `ollama pull llama3.2:3b`.

```bash
npm install
neon auth                  # once, in a browser
neon checkout dev          # pins the dev branch and writes its DATABASE_URL, auth and storage vars into .env
cp apps/app/.env.example apps/app/.env   # then set EXPO_PUBLIC_NEON_AUTH_URL (neon neon-auth status)
npm run db:migrate         # apply migrations to the checked-out branch
npm run seed               # 40 fictional demo profiles (refused when NODE_ENV=production)
npm run dev:api            # API on http://localhost:4870
npm run dev:app            # Expo; press w for web (http://localhost:8081)
```

`.env` holds secrets and is gitignored; `.env.example` lists every variable.

### Neon branches

| Branch | Used for |
| --- | --- |
| `production` | Production. Never seeded. |
| `dev` | Local development (`.neon` points here). Has the demo profiles. |
| `test` | Vitest. Migrated automatically before each run; tests clean up after themselves. |

Each branch has its own database, Auth users and bucket contents.

## Scripts (repo root)

| Command | What it does |
| --- | --- |
| `npm run dev:api` / `npm run dev:app` | Run the API / Expo app |
| `npm run db:generate` | Generate a migration after editing the Drizzle schema |
| `npm run db:migrate` | Apply migrations to the branch in `DATABASE_URL` |
| `npm run seed` / `npm run seed:reset` | Replace / remove the demo profiles |
| `npm test` | API tests (vitest + supertest) against the Neon `test` branch |
| `npm run e2e` | Web end-to-end test: sign up → onboarding → swipe → match → chat (needs API, Expo web and Ollama running; `npx playwright install chromium` once) |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript for all workspaces (`npx expo lint` inside `apps/app`) |

## AI features

All model calls happen on the server; keys never reach the app. Prompts live in `apps/api/src/ai/prompts.ts`, and every response is validated with zod (one retry on invalid output).

- `POST /ai/icebreakers`: 3 openers based on shared interests and both bios
- `POST /ai/bio-polish`: 2 rewrites that keep the user's facts
- `POST /ai/compatibility`: one line on what two profiles share (cached 7 days per pair)
- Message safety: every message runs through fast rules (money/crypto/investment scams), then the model (harassment, explicit content, subtler scams). Flagged messages are delivered behind a "This message may be unsafe" warning. If the model is down, chat keeps working on the rules alone.

User-triggered AI calls are limited to 20 per user per hour (`AI_REQUESTS_PER_HOUR`).

Switch providers in `.env`:

```bash
AI_PROVIDER=ollama        AI_MODEL=llama3.2:3b                  # default, local
AI_PROVIDER=anthropic     AI_MODEL=claude-haiku-4-5-20251001    # plus ANTHROPIC_API_KEY
AI_PROVIDER=neon-gateway  AI_MODEL=<model>                      # paid Neon plans; set NEON_AI_GATEWAY_URL/TOKEN
```

## Safety rules enforced by the API

- Every route except `/health` requires a valid Neon Auth JWT, and so does the Socket.io handshake.
- Users must be 18 or older. This is checked in the app, in the API (zod), and by a Postgres `CHECK` constraint.
- Only members of an active match can message each other. Blocking or unmatching ends the chat.
- Demo profiles (`is_demo`) are fictional, use illustrated DiceBear avatars, show a "Demo" badge, can't receive messages, and are hidden from Discover in production.

## Known limitations

- **Auth client:** `@neondatabase/auth@0.5.0-beta` can't be installed in this npm workspace (npm's resolver crashes on its peer-dependency tree), so `apps/app/src/lib/auth.tsx` calls the same Managed Better Auth endpoints directly. Swap in the SDK once it installs cleanly.
- **Google sign-in** is shown on web only and hasn't been tested end to end. It uses Neon's shared development Google credentials; production needs your own OAuth app (`neon neon-auth oauth-provider`).
- **Native builds** (iOS/Android) typecheck and bundle, but only the web app has been tested end to end.
- **Push notifications** aren't implemented yet.
- **Photo moderation:** production photos start as `pending`, and there's no moderation tool yet to approve them (development auto-approves).
- **Metro on Windows** sometimes misses file changes in this monorepo. If an edit doesn't show up, restart with `npx expo start -c`.
- **Latency:** the Neon project is in `aws-us-east-2`. From the Philippines each query round trip is about 300 ms. A project in `aws-ap-southeast-1` (Singapore) would make the app noticeably snappier.
