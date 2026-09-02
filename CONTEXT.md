# Thalassa — Domain Context

Web app for finding the best hotel prices across resort hotels in Greece
(Halkidiki, Kavala, the islands) and Bulgaria (Obzor). Scrapes prices from the
hotels' booking engines (reserve-online.net, hvdhotels.com), scores weather via
Open-Meteo, and combines both into stay recommendations. Six self-contained
domains live under `src/domains/`: hotels, locations, scraping, weather,
analysis, tracking.

## Glossary

- **Scraping strategy** — how a hotel's prices are fetched from its booking
  engine. Three exist: **calendar** (HTML scraping of reserve-online.net's
  `/calendar` endpoint via Cheerio), **AVL** (JSON from reserve-online.net's
  `/avl` endpoint) and **hvd** (server-rendered search page of
  reservations.hvdhotels.com, one stay per request). Each hotel config declares
  its strategy.
- **Beach score** — 0–100 weather suitability for a beach day, derived from
  temperature, precipitation, wind, and UV. Sea temperature is *estimated* from
  monthly climate averages (`weather/climate-data.ts`), not measured.
- **Combined score** — the value recommendation: 60% weather / 40% price
  (`analysis/combined-scorer.ts`). Changing this weighting changes what the app
  recommends everywhere.
- **Watchlist entry** — a tracked stay (hotel + dates + guests) with optional
  deal-alert thresholds: `targetPrice` (absolute) and `alertPctDrop` (relative).
- **Price snapshot** — a stored price observation for a watchlist entry.
  **Delta-stored**: a snapshot is recorded only when the price differs from the
  last one (`tracking/delta.ts` — `shouldRecordSnapshot`), so history is sparse
  by design; absence of a snapshot means "unchanged", not "not checked".
- **Deal alert** — **edge-triggered** email (Resend): fires only when a price
  *crosses* a threshold, not on every scrape while it stays below
  (`tracking/alerts.ts` — `evaluateDealAlert`).

## Persistence

Tracking is the only persistent domain: Neon Postgres via a lazy client
(`tracking/db.ts`, `DATABASE_URL`), tables `watchlist` and `price_snapshots`
(`tracking/schema.sql`). All other domains are stateless config + pure logic.
