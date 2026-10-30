# Thalassa

Public hotel price finder for resort hotels in Greece and Bulgaria. It scrapes
prices from the hotels' booking engines, scores beach weather with Open-Meteo,
recommends the best stays, and tracks watchlisted stays with deal-alert emails.
It runs on Vercel. Domain model and glossary: `CONTEXT.md`.

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui.
- Scraping with axios and Cheerio; validation with Zod; dates with date-fns.
- Neon Postgres (`@neondatabase/serverless`) for tracking only; email through
  the Resend REST API.
- Vitest for unit tests; Biome through ultracite for lint and format.

## Layout

- `src/app/`: pages (`(marketing)`, `hotels`, `search`, `watchlist`) and API
  routes (`api/scrape`, `api/hotels`, `api/weather`, `api/watchlist`,
  `api/cron/*`).
- `src/domains/`: hotels, locations, scraping, weather, analysis, tracking.
  Config and pure logic, tests in each `__tests__/`.
- `src/components/`: UI grouped by concern; `ui/` holds the shadcn primitives.
- `public/images/`: hotel and location images.
- `scripts/install-git-hooks.mjs`: installs lefthook on `pnpm install`.

## Commands

Use pnpm. Node comes from `.nvmrc`.

- `pnpm dev`: dev server with Turbopack.
- `pnpm lint` / `pnpm fix`: ultracite (Biome) check / auto-fix.
- `pnpm typecheck`: `tsc --noEmit`.
- `pnpm test`: Vitest once; `pnpm test:watch` to watch.
- `pnpm build`: production build.
- `pnpm ci:local`: lint, typecheck, test and build, fail-fast, as CI runs them.

Git hooks (lefthook): pre-commit runs Biome on staged files (check only),
commit-msg runs commitlint, pre-push runs `pnpm ci:local`. CI runs lint,
typecheck, test and build on every push to `main`.

## Rules

- Biome via ultracite is the only linter and formatter; do not add ESLint.
- `/api/scrape` and `/api/cron/scrape` hit the live booking sites. Do not run
  real scrapes in loops; unit tests stay network-free.
- `GET /api/cron/scrape` (every 2 hours) and `GET /api/cron/digest` (daily,
  18:00 UTC) are called by cron-job.org with `Bearer CRON_SECRET`, not by
  `vercel.json`. Renaming them or changing their auth silently stops scheduled
  scraping and digests.
- Deal-alert email is off when any Resend variable in `.env.example` is unset;
  prices are still recorded.
- `src/domains/tracking/schema.sql` is the schema's source of truth; keep every
  statement idempotent.
- The 60/40 weather/price weighting in `analysis/combined-scorer.ts` drives
  every recommendation; change it only on purpose, with its tests.

## Workflow

- Branch from `main` as `<type>/<topic>` (e.g. `fix/pr-template-comment`).
- Conventional commits: `<type>(<scope>): <subject>`, imperative, at most 50
  characters. `commitlint.config.js` only relaxes body line length, so the
  format is a convention, not enforced.
- Open PRs with `.github/pull_request_template.md`, filling every section.
- Vercel builds from GitHub; merging to `main` deploys production.
- Env vars live in Vercel; local values go in `.env.local` (names in
  `.env.example`).

## Docs

- `CONTEXT.md`: glossary and persistence.
- `docs/modules/`: one page per domain, with how to add a hotel, location,
  scraping strategy or weather provider, and the tracking cron and alerts.

## Agent commands

Global Claude Code commands (defined in `~/.claude/commands`, not in this repo):

- `/create-commit`: conventional commits split by concern; the git hooks always run.
- `/create-pull-request`: push, open a PR from `.github/pull_request_template.md`, watch CI.
- `/cleanup`: check out main, pull, delete merged branches and their worktrees.
