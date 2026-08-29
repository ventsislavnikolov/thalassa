import { getSql } from "./db";
import type {
  AlertEvent,
  NewAlertEvent,
  NewPriceSnapshot,
  NewWatchlistEntry,
  PriceSnapshot,
  PriceStats,
  SnapshotValue,
  WatchlistEntry,
  WatchlistSource,
} from "./types";

type WatchlistRow = {
  active: boolean;
  adults: number;
  alert_pct_drop: number | null;
  alerted_at: string | null;
  checkin_date: string;
  children: number;
  created_at: string;
  hotel_slug: string;
  id: number | string;
  nights: number;
  room_type: string | null;
  source: WatchlistSource;
  target_price: string | null;
};

type SnapshotRow = {
  available: boolean;
  currency: string;
  id: number | string;
  price: string | null;
  scraped_at: string;
  watchlist_id: number | string;
};

// NOTE: temporal columns are cast to ::text in every query below so the Neon
// driver returns plain ISO strings ("YYYY-MM-DD" / RFC 3339) rather than JS
// Date objects. Keep the casts when editing these statements.
function mapWatchlist(row: WatchlistRow): WatchlistEntry {
  return {
    id: Number(row.id),
    hotelSlug: row.hotel_slug,
    checkinDate: row.checkin_date,
    nights: Number(row.nights),
    adults: Number(row.adults),
    children: Number(row.children),
    roomType: row.room_type,
    source: row.source,
    active: row.active,
    createdAt: row.created_at,
    targetPrice: row.target_price === null ? null : Number(row.target_price),
    alertPctDrop:
      row.alert_pct_drop === null ? null : Number(row.alert_pct_drop),
    alertedAt: row.alerted_at,
  };
}

function mapSnapshot(row: SnapshotRow): PriceSnapshot {
  return {
    id: Number(row.id),
    watchlistId: Number(row.watchlist_id),
    price: row.price === null ? null : Number(row.price),
    currency: row.currency,
    available: row.available,
    scrapedAt: String(row.scraped_at),
  };
}

export async function getAllWatchlist(): Promise<WatchlistEntry[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, hotel_slug, checkin_date::text, nights, adults, children,
           room_type, active, created_at::text, target_price::text,
           alert_pct_drop, alerted_at::text, source
    FROM watchlist ORDER BY created_at DESC
  `) as WatchlistRow[];
  return rows.map(mapWatchlist);
}

export async function getActiveWatchlist(): Promise<WatchlistEntry[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, hotel_slug, checkin_date::text, nights, adults, children,
           room_type, active, created_at::text, target_price::text,
           alert_pct_drop, alerted_at::text, source
    FROM watchlist WHERE active = TRUE ORDER BY created_at DESC
  `) as WatchlistRow[];
  return rows.map(mapWatchlist);
}

export async function addWatchlistEntry(
  entry: NewWatchlistEntry
): Promise<WatchlistEntry> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO watchlist
      (hotel_slug, checkin_date, nights, adults, children, room_type,
       target_price, alert_pct_drop, source)
    VALUES
      (${entry.hotelSlug}, ${entry.checkinDate}, ${entry.nights},
       ${entry.adults}, ${entry.children}, ${entry.roomType ?? null},
       ${entry.targetPrice ?? null}, ${entry.alertPctDrop ?? null},
       ${entry.source ?? "manual"})
    ON CONFLICT (hotel_slug, checkin_date, nights, adults, children, room_type)
      DO UPDATE SET active = TRUE,
                    target_price = EXCLUDED.target_price,
                    alert_pct_drop = EXCLUDED.alert_pct_drop
    RETURNING id, hotel_slug, checkin_date::text, nights, adults, children,
              room_type, active, created_at::text, target_price::text,
              alert_pct_drop, alerted_at::text, source
  `) as WatchlistRow[];
  return mapWatchlist(rows[0]);
}

export async function deleteWatchlistEntry(id: number): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM watchlist WHERE id = ${id} RETURNING id
  `) as { id: number | string }[];
  return rows.length > 0;
}

export async function setWatchlistActive(
  id: number,
  active: boolean
): Promise<WatchlistEntry | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE watchlist SET active = ${active} WHERE id = ${id}
    RETURNING id, hotel_slug, checkin_date::text, nights, adults, children,
              room_type, active, created_at::text, target_price::text,
              alert_pct_drop, alerted_at::text, source
  `) as WatchlistRow[];
  return rows.length > 0 ? mapWatchlist(rows[0]) : null;
}

export async function updateWatchlistAlerts(
  id: number,
  targetPrice: number | null,
  alertPctDrop: number | null
): Promise<WatchlistEntry | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE watchlist
    SET target_price = ${targetPrice}, alert_pct_drop = ${alertPctDrop}
    WHERE id = ${id}
    RETURNING id, hotel_slug, checkin_date::text, nights, adults, children,
              room_type, active, created_at::text, target_price::text,
              alert_pct_drop, alerted_at::text, source
  `) as WatchlistRow[];
  return rows.length > 0 ? mapWatchlist(rows[0]) : null;
}

export async function markAlerted(id: number): Promise<void> {
  const sql = getSql();
  await sql`UPDATE watchlist SET alerted_at = now() WHERE id = ${id}`;
}

export async function getLatestSnapshot(
  watchlistId: number
): Promise<SnapshotValue | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT price, available FROM price_snapshots
    WHERE watchlist_id = ${watchlistId}
    ORDER BY scraped_at DESC
    LIMIT 1
  `) as { available: boolean; price: string | null }[];
  if (rows.length === 0) {
    return null;
  }
  const row = rows[0];
  return {
    price: row.price === null ? null : Number(row.price),
    available: row.available,
  };
}

export async function insertSnapshot(
  watchlistId: number,
  snapshot: NewPriceSnapshot
): Promise<PriceSnapshot> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO price_snapshots (watchlist_id, price, currency, available)
    VALUES (${watchlistId}, ${snapshot.price}, ${snapshot.currency}, ${snapshot.available})
    RETURNING id, watchlist_id, price::text, currency, available, scraped_at::text
  `) as SnapshotRow[];
  return mapSnapshot(rows[0]);
}

export async function getActiveWatchlistForHotels(
  hotelSlugs: string[]
): Promise<WatchlistEntry[]> {
  if (hotelSlugs.length === 0) {
    return [];
  }
  const sql = getSql();
  const rows = (await sql`
    SELECT id, hotel_slug, checkin_date::text, nights, adults, children,
           room_type, active, created_at::text, target_price::text,
           alert_pct_drop, alerted_at::text, source
    FROM watchlist
    WHERE active = TRUE AND hotel_slug = ANY(${hotelSlugs})
    ORDER BY checkin_date ASC
  `) as WatchlistRow[];
  return rows.map(mapWatchlist);
}

export async function deactivateExpired(today: string): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE watchlist SET active = FALSE
    WHERE active = TRUE AND checkin_date < ${today}
    RETURNING id
  `) as { id: number | string }[];
  return rows.length;
}

export async function getPriceStats(watchlistId: number): Promise<PriceStats> {
  const sql = getSql();
  const rows = (await sql`
    SELECT min(price)::text AS min, avg(price)::text AS avg, count(*) AS count
    FROM price_snapshots
    WHERE watchlist_id = ${watchlistId} AND available AND price IS NOT NULL
  `) as { avg: string | null; count: number | string; min: string | null }[];
  const row = rows[0];
  return {
    min: row.min === null ? null : Number(row.min),
    avg: row.avg === null ? null : Number(row.avg),
    count: Number(row.count),
  };
}

export async function getCronState<T>(key: string): Promise<T | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT value FROM cron_state WHERE key = ${key}
  `) as { value: T }[];
  return rows.length > 0 ? rows[0].value : null;
}

export async function setCronState(key: string, value: unknown): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO cron_state (key, value) VALUES (${key}, ${JSON.stringify(value)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}

type AlertEventRow = {
  created_at: string;
  digested_at: string | null;
  id: number | string;
  min_price: string | null;
  previous_price: string | null;
  price: string;
  reasons: string[];
  watchlist_id: number | string;
};

function mapAlertEvent(row: AlertEventRow): AlertEvent {
  return {
    id: Number(row.id),
    watchlistId: Number(row.watchlist_id),
    price: Number(row.price),
    previousPrice:
      row.previous_price === null ? null : Number(row.previous_price),
    minPrice: row.min_price === null ? null : Number(row.min_price),
    reasons: row.reasons,
    createdAt: row.created_at,
    digestedAt: row.digested_at,
  };
}

export async function insertAlertEvent(event: NewAlertEvent): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO alert_events (watchlist_id, price, previous_price, min_price, reasons)
    VALUES (${event.watchlistId}, ${event.price}, ${event.previousPrice},
            ${event.minPrice}, ${event.reasons})
  `;
}

export async function getUndigestedAlertEvents(): Promise<AlertEvent[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, watchlist_id, price::text, previous_price::text, min_price::text,
           reasons, created_at::text, digested_at::text
    FROM alert_events
    WHERE digested_at IS NULL
    ORDER BY created_at ASC
  `) as AlertEventRow[];
  return rows.map(mapAlertEvent);
}

export async function markEventsDigested(ids: number[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  const sql = getSql();
  await sql`
    UPDATE alert_events SET digested_at = now() WHERE id = ANY(${ids})
  `;
}

export async function getSnapshots(
  watchlistId: number,
  limit = 500
): Promise<PriceSnapshot[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, watchlist_id, price::text, currency, available, scraped_at::text
    FROM price_snapshots
    WHERE watchlist_id = ${watchlistId}
    ORDER BY scraped_at ASC
    LIMIT ${limit}
  `) as SnapshotRow[];
  return rows.map(mapSnapshot);
}
