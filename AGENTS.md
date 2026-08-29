# AGENTS.md

Hotel price finder for 10 hotels in Greece. Domain model and glossary: `CONTEXT.md`.

## Rules

- Run `pnpm test` after every change.
- Lint/format is Biome via ultracite (`pnpm check` / `pnpm fix`). There is no ESLint; `pnpm lint` does not exist — do not add either.
- The scrape routes (`/api/scrape`, `/api/cron/scrape`) hit the live reserve-online.net site. Don't trigger real scrapes in loops during dev; unit tests are network-free.

## Environment quirks (not discoverable from the repo)

- Production scheduling is an EXTERNAL cron: cron-job.org calls `GET /api/cron/scrape` every 2 hours (`0 */2 * * *`) and `GET /api/cron/digest` daily at 18:00 UTC, both with `Bearer CRON_SECRET`. Neither is in `vercel.json` — renaming the routes or changing their auth silently breaks scheduled scraping/digests.
- Deal-alert emails are silently disabled when the Resend env vars are unset (see `.env.example`); price snapshots are still recorded.

## Pointers

- Per-domain extension recipes: `src/domains/*/skill.md` and `src/components/skill.md`.
- Design docs and plans: `docs/plans/`, `docs/superpowers/specs/`.
