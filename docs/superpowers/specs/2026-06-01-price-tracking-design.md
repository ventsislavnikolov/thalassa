# Automated Price Tracking — Design

**Date:** 2026-06-01
**Status:** Approved
**Linear milestone:** M2 — Price Tracking

## Goal

Track watchlisted hotel stays over time to provide price history/trends, deal
alerts, and data to feed best-time-to-book analysis. A scheduled scraper runs
every 2 hours and persists prices to a database, storing a new record **only
when the price changed** from the previous snapshot.

## Context

- Next.js 16 app on Vercel. No database and no cron today.
- Scraping is currently on-demand only via `POST /api/scrape` (60s max), backed
  by `src/domains/scraping/engine.ts` and the calendar/AVL strategies.
- 13 hotels across 3+ locations, two scraping strategies.

## Locked decisions

- **Delta storage** — persist a `price_snapshots` row only when the value
  differs from the latest snapshot for that watchlist entry. An unavailable
  result (null price) is itself a recordable change.
- **Watchlist-driven scope** — only explicitly-tracked combos
  (hotel + check-in date + nights + occupancy + room type) are scraped, keeping
  per-run volume low and predictable.
- **Database:** Neon Postgres via Vercel Marketplace.
- **Scheduler:** external cron (cron-job.org) pinging a secured endpoint every
  2h (`0 */2 * * *`). Avoids needing Vercel Pro for sub-daily crons.
- Reuse existing `scraping/engine`, hotel/location registries, search param
  types, and result UI components — no rewrite.

## Architecture

New isolated domain `src/domains/tracking/` for the DB query layer and tracking
logic, consistent with the existing domain structure.

### Schema (Neon Postgres)

`watchlist`
- `id` (pk)
- `hotel_slug`
- `checkin_date`
- `nights`
- `adults`
- `children`
- `room_type` (nullable)
- `active` (bool)
- `created_at`

`price_snapshots`
- `id` (pk)
- `watchlist_id` (fk → watchlist)
- `price` (nullable)
- `currency`
- `available` (bool)
- `scraped_at`

Indexed on `(watchlist_id, scraped_at)` for history/chart queries.

## Sub-tasks (build order)

1. **Neon Postgres + schema** — provision Neon via Marketplace, create the
   `src/domains/tracking/` query layer, define the two tables and migrations.
2. **Cron scraper (core ask)** — secured `GET /api/cron/scrape` route. Validates
   `Authorization: Bearer ${CRON_SECRET}`, loads all `active` watchlist rows,
   runs them through `scraping/engine.ts`, compares each result to the latest
   snapshot, inserts only on change. Returns `{checked, changed, errors}`.
   Triggered by cron-job.org every 2h. Watchlist can be seeded manually to start.
3. **Watchlist management** — `GET/POST/DELETE /api/watchlist` + minimal UI to
   add/remove tracked combos. Reuses hotel registry and search param types.
4. **Price history + trends UI** — per-watchlist price chart from
   `price_snapshots`, current vs. historical low, % change. Hooks into existing
   results components.
5. **Deal alerts** — evaluated during the cron run; when a snapshot drops below
   a threshold (target price or % drop) send a notification. Channel decided in
   this sub-task (likely email via Resend).

The "every 2h" requirement lives in sub-tasks 2 and 5.

## Out of scope (for now)

- User accounts / multi-user watchlists (single shared watchlist initially).
- Full-year / multi-occupancy sweeps (watchlist-driven only).
- Vercel-native cron (revisit if the project moves to Pro).
