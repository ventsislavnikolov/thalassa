# Tracking

`src/domains/tracking/` stores watchlisted stays and their price history in
Neon Postgres, and holds the logic behind the two cron routes. It is the only
domain with state.

## Files

- `db.ts`: lazy Neon client (`getSql()`), reads `DATABASE_URL`.
- `queries.ts`: every SQL query. Rows are mapped from snake_case to camelCase,
  and `DATE`/`TIMESTAMPTZ` columns are cast to `::text` so the driver returns
  ISO strings.
- `schema.sql`: source of truth for the tables `watchlist`,
  `price_snapshots`, `cron_state` and `alert_events`. Every statement is
  idempotent (`IF NOT EXISTS`), so a fresh Neon branch is set up by running
  the file.
- Pure, unit-tested logic:
  - `delta.ts`: `shouldRecordSnapshot()`, the delta-storage rule.
  - `selection.ts`: picks the price for an entry from scrape results.
  - `rolling-window.ts`: the auto-tracked window and the watchlist sync plan.
  - `batching.ts`: groups entries into scrape calls, round-robin hotel
    selection, bounded concurrency.
  - `alerts.ts`: custom and auto deal alerts.
  - `history.ts`: trend stats for the watchlist UI.
  - `digest.ts`: alert and digest email content.
- `notify.ts`: `sendEmail()` through the Resend REST API. Returns `"skipped"`
  when `RESEND_API_KEY`, `ALERT_EMAIL_FROM` or `ALERT_EMAIL_TO` is unset, so
  prices are still recorded without email.

Keep decisions (what to store, when to alert) in the pure modules so they stay
testable without a database. The cron route and any backfill use
`shouldRecordSnapshot()`; do not inline the comparison.

## Scheduled runs

Both routes require `Authorization: Bearer ${CRON_SECRET}` and are called by
cron-job.org, not by `vercel.json`. Renaming them or changing their auth
silently stops scheduled scraping and digests.

- `GET /api/cron/scrape`, every 2 hours (`0 */2 * * *`):
  1. deactivates entries whose check-in has passed;
  2. adds `auto` entries for the rolling window (`DEFAULT_WINDOW`: Saturday
     check-in, 7 nights, 14-90 days ahead, 2 adults) for every visible hotel;
  3. scrapes the next 6 hotels in round-robin order (cursor in `cron_state`),
     3 batches at a time;
  4. stores a snapshot only when the price or availability changed, and
     evaluates alerts.
- `GET /api/cron/digest`, daily at 18:00 UTC: emails the queued
  `alert_events` and marks them digested.

## Deal alerts

- **Custom** (an entry has `target_price` or `alert_pct_drop`):
  `evaluateDealAlert()` is edge-triggered. It fires when a price crosses to at
  or below the target, or when one step down meets the percent drop, and
  emails at once.
- **Auto** (no thresholds): `evaluateAutoAlert()` fires on a drop of 10% or
  more from the previous snapshot, or on a new low once 3 snapshots exist.
  The event is queued for the daily digest; drops of 25% or more also email at
  once.

## Decisions

- Delta storage: history is sparse by design. A missing snapshot means
  "unchanged", not "not checked". A change to or from "unavailable" is
  recorded.
- Watchlist-driven scope: only tracked stays are scraped, so the volume per
  run stays small and predictable.
- External cron: cron-job.org gives sub-daily runs without a paid Vercel plan.
  Revisit if the project moves to Vercel Pro.
- One shared watchlist, no user accounts.
