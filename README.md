# 🎾 Tennis Predictor League

Predict ATP & WTA match results, earn points for correct winners, scores and set
scores, and climb an automated leaderboard. Built with **Next.js 14 (App Router)**,
**TypeScript**, **Tailwind + shadcn-style UI**, **Prisma** and **PostgreSQL**, with
**NextAuth** credential auth.

## Features (MVP)

- **Auth** — register / login / logout, bcrypt password hashing, role-based access
  (USER / ADMIN), JWT sessions.
- **Predictions** — one-at-a-time flow with progress bar; predict winner, match
  score and (optionally) per-set games. Auto-locks when a match starts.
- **Scoring engine** — +15 winner, +15 exact match score, +10 per correct set
  winner, +10 more per exact set score (stacks to 20 for a fully-correct set);
  best-of-3 (max 90) vs best-of-5 (max 130) auto-detected.
- **Admin** — CSV match import (with validation + error report + publish step),
  CSV results import that auto-scores every prediction, recomputes the
  leaderboard and notifies users; users list; audit log & import history; reset.
- **Leaderboard** — ranks with medals, correct winners/scores/sets, accuracy,
  filters (All Time / Today / Tournament).
- **Dashboard, My Predictions, History, Profile, Notifications.**
- **Tennis News** (Dashboard) — top 5 current ATP/WTA headlines fetched live via
  the Claude API (Haiku 4.5 + web search), cached in the DB for 45 minutes with a
  manual refresh button. Requires `ANTHROPIC_API_KEY`; degrades gracefully to an
  "unavailable" message if unset.
- **Theme** — dark by default, light toggle, ATP blue / WTA purple / court green.

## Getting started

### 1. Install dependencies
```bash
npm install
```

### 2. Start PostgreSQL

**Option A — Docker (matches production):**
```bash
docker compose up -d
```

**Option B — existing Postgres / Supabase:** set `DATABASE_URL` in `.env`.

The default `.env` points at the docker-compose database:
```
postgresql://tennis:tennis@localhost:5432/tennis_predictor
```

### 3. Migrate & seed
```bash
npm run db:migrate      # create schema
npm run db:seed         # demo users, today's open matches, yesterday's results
```

### 4. Run
```bash
npm run dev
# http://localhost:3000
```

## Demo logins

| Role  | Username | Password   |
|-------|----------|------------|
| Admin | `admin`  | `Admin123!`|
| User  | `alice`  | `Test123!` |
| User  | `bob` / `carol` / `dave` | `Test123!` |

## Sample CSVs

In [`/samples`](./samples):
- `matches_sample.csv` — daily match import format.
- `results_sample.csv` — official results for today's seeded matches; import it as
  admin to watch live scoring + leaderboard updates.

## CSV formats

**Matches:** `Tournament, Draw, Time (BST), Time (AEST), Player 1, Player 2, Status`
(date is chosen at upload time; ATP/WTA & best-of detected from the draw).

**Results:** `Tournament, Date, Match_Time_BST, Draw, Round, Player_1, Player_2,
Set1_P1..Set5_P2, Winner, Score`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build (runs `prisma generate`) |
| `npm run db:migrate` | Prisma migrate (dev) |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | Drop, re-migrate & re-seed |

## Deployment (Vercel + Supabase)

1. **Database:** create a Supabase project. From the dashboard **Connect** button,
   grab the **Transaction pooler** string (port 6543) and the **Session pooler**
   string (port 5432).
2. **Push** this repo to GitHub.
3. **Vercel:** import the repo and set these environment variables:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | Transaction pooler string + `?pgbouncer=true` |
   | `DIRECT_URL` | Session pooler string (port 5432) |
   | `NEXTAUTH_SECRET` | output of `npx auth secret` (or `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`) |
   | `NEXTAUTH_URL` | your deployed URL, e.g. `https://your-app.vercel.app` |

4. **Deploy.** The build runs `prisma migrate deploy`, so tables are created
   automatically. (Demo data is **not** seeded in production.)
5. **Create your admin** against the production DB (never run `db:seed` in prod —
   it wipes data):
   ```bash
   ADMIN_USERNAME=admin ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='ChangeMe123!' npm run db:create-admin
   ```
   or `npm run db:create-admin -- admin you@example.com 'ChangeMe123!'`.

## Roadmap

Live scores & ATP/WTA API ingestion, private leagues, badges/achievements, email
reminders & push, public leaderboard pages, multi-language, REST API. The schema
and service layer are structured to add these without rework.
