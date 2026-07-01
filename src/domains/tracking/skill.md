# Tracking Domain Skills

The tracking domain persists watchlisted hotel stays and their price history to
Neon Postgres, and powers the scheduled scraper.

## Layout

- `db.ts` — lazy Neon SQL client (`getSql()`), reads `DATABASE_URL`.
- `queries.ts` — the query layer (watchlist CRUD + snapshot read/insert).
  Temporal columns are cast to `::text` so the driver returns ISO strings.
- `delta.ts` — `shouldRecordSnapshot()`, the delta-storage rule (pure).
- `selection.ts` — `selectResultForEntry()` / `toSnapshot()`, map scrape results
  to a stored snapshot (pure).
- `types.ts` — `WatchlistEntry`, `PriceSnapshot`, and input/value shapes.
- `schema.sql` — source of truth for the two tables + index.

## Environment

- `DATABASE_URL` — Neon connection string (set in Vercel + `.env.local`).
- `CRON_SECRET` — bearer token guarding `GET /api/cron/scrape`.

## Skill: Apply the schema to a fresh database

Run the statements in `schema.sql` against the target Neon branch (one
statement per call, or as a transaction). They are idempotent (`IF NOT EXISTS`).

## Skill: Add a query

1. Add the function to `queries.ts`, mapping snake_case rows to camelCase.
2. Cast `DATE`/`TIMESTAMPTZ` columns to `::text` in the SELECT/RETURNING list.
3. Keep pure decisions (what to store, whether to store) in `delta.ts` /
   `selection.ts` so they stay unit-testable without a database.

## Skill: Change the delta rule

Edit `shouldRecordSnapshot()` in `delta.ts` and update
`__tests__/delta.test.ts`. The cron route and any backfill reuse this one
function — do not inline the comparison elsewhere.

## Cron wiring

`GET /api/cron/scrape` is triggered externally (cron-job.org, `0 */2 * * *`)
with header `Authorization: Bearer ${CRON_SECRET}`. It loads active watchlist
rows, scrapes each via `scraping/engine.ts`, and inserts a snapshot only when
`shouldRecordSnapshot` returns true. Returns `{ checked, changed, errors }`.
