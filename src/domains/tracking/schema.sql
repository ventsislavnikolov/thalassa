-- Tracking domain schema (Neon Postgres).
-- Applied to the `thalassa` Neon project. Kept here as the source of truth for
-- the two tables; re-runnable (IF NOT EXISTS) for fresh environments.

CREATE TABLE IF NOT EXISTS watchlist (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hotel_slug     TEXT        NOT NULL,
  checkin_date   DATE        NOT NULL,
  nights         INTEGER     NOT NULL CHECK (nights >= 1),
  adults         INTEGER     NOT NULL CHECK (adults >= 1),
  children       INTEGER     NOT NULL DEFAULT 0 CHECK (children >= 0),
  room_type      TEXT,
  active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Deal-alert config (nullable = disabled):
  target_price   NUMERIC(10,2),
  alert_pct_drop INTEGER     CHECK (alert_pct_drop IS NULL OR (alert_pct_drop BETWEEN 1 AND 90)),
  alerted_at     TIMESTAMPTZ,
  UNIQUE (hotel_slug, checkin_date, nights, adults, children, room_type)
);

CREATE TABLE IF NOT EXISTS price_snapshots (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  watchlist_id BIGINT      NOT NULL REFERENCES watchlist(id) ON DELETE CASCADE,
  price        NUMERIC(10,2),
  currency     TEXT        NOT NULL DEFAULT 'EUR',
  available    BOOLEAN     NOT NULL DEFAULT TRUE,
  scraped_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- History/chart queries read snapshots per watchlist entry, newest first.
CREATE INDEX IF NOT EXISTS idx_price_snapshots_watchlist_scraped
  ON price_snapshots (watchlist_id, scraped_at DESC);
