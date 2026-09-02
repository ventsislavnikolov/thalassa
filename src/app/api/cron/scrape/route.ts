import { addDays, format } from "date-fns";
import { type NextRequest, NextResponse } from "next/server";
import { buildBookingUrl } from "@/domains/hotels/booking-url";
import { getAllHotels, getHotel } from "@/domains/hotels/registry";
import { scrapeHotels } from "@/domains/scraping/engine";
import type { SearchParams } from "@/domains/scraping/types";
import {
  evaluateAutoAlert,
  evaluateDealAlert,
  resolveAlertMode,
} from "@/domains/tracking/alerts";
import {
  groupEntriesForScraping,
  matchResultsToEntries,
  runWithConcurrency,
  type ScrapeBatch,
  selectHotelsForRun,
} from "@/domains/tracking/batching";
import { shouldRecordSnapshot } from "@/domains/tracking/delta";
import {
  buildRichAlertEmail,
  type DigestItem,
} from "@/domains/tracking/digest";
import { sendEmail } from "@/domains/tracking/notify";
import {
  addWatchlistEntry,
  deactivateExpired,
  getActiveWatchlistForHotels,
  getAllWatchlist,
  getCronState,
  getLatestSnapshot,
  getPriceStats,
  insertAlertEvent,
  insertSnapshot,
  markAlerted,
  setCronState,
} from "@/domains/tracking/queries";
import {
  DEFAULT_WINDOW,
  planWatchlistSync,
} from "@/domains/tracking/rolling-window";
import type {
  NewPriceSnapshot,
  PriceStats,
  WatchlistEntry,
} from "@/domains/tracking/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HOTELS_PER_RUN = 6;
const SCRAPE_CONCURRENCY = 3;
const SINGLE_DATE_HOTEL_DATES_PER_RUN = 4;
const CURSOR_KEY = "scrape_cursor";

interface CronSummary {
  alerted: number;
  changed: number;
  checked: number;
  cursor: number;
  deactivated: number;
  errors: { error: string; watchlistId: number | null }[];
  eventsQueued: number;
  hotels: string[];
  upserted: number;
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function bookingUrl(entry: WatchlistEntry): string {
  const checkout = format(
    addDays(new Date(entry.checkinDate), entry.nights),
    "yyyy-MM-dd"
  );
  return buildBookingUrl(getHotel(entry.hotelSlug), {
    adults: entry.adults,
    checkin: entry.checkinDate,
    checkout,
  });
}

function toDigestItem(
  entry: WatchlistEntry,
  snapshot: NewPriceSnapshot,
  previous: number | null,
  stats: PriceStats,
  reasons: string[]
): DigestItem {
  return {
    entry,
    hotelName: getHotel(entry.hotelSlug).displayName,
    price: snapshot.price ?? 0,
    previousPrice: previous,
    minPrice: stats.min,
    avgPrice: stats.avg,
    reasons,
    bookingUrl: bookingUrl(entry),
  };
}

async function handleAlerts(
  entry: WatchlistEntry,
  snapshot: NewPriceSnapshot,
  previous: number | null,
  stats: PriceStats,
  summary: CronSummary
): Promise<void> {
  if (snapshot.price === null || !snapshot.available) {
    return;
  }

  if (resolveAlertMode(entry) === "custom") {
    const result = evaluateDealAlert({
      current: snapshot.price,
      previous,
      targetPrice: entry.targetPrice,
      alertPctDrop: entry.alertPctDrop,
    });
    if (!result.fired) {
      return;
    }
    const item = toDigestItem(entry, snapshot, previous, stats, result.reasons);
    const status = await sendEmail(buildRichAlertEmail(item));
    if (status === "sent") {
      await markAlerted(entry.id);
      summary.alerted += 1;
    } else if (status === "failed") {
      summary.errors.push({
        watchlistId: entry.id,
        error: "Deal alert fired but the email failed to send",
      });
    }
    return;
  }

  const result = evaluateAutoAlert({
    current: snapshot.price,
    previous,
    historicalMin: stats.min,
    priorSnapshotCount: stats.count,
  });
  if (!result.fired) {
    return;
  }
  await insertAlertEvent({
    watchlistId: entry.id,
    price: snapshot.price,
    previousPrice: previous,
    minPrice: stats.min,
    reasons: result.reasons,
  });
  summary.eventsQueued += 1;

  if (result.instant) {
    const item = toDigestItem(entry, snapshot, previous, stats, result.reasons);
    const status = await sendEmail(buildRichAlertEmail(item));
    if (status === "sent") {
      summary.alerted += 1;
    } else if (status === "failed") {
      summary.errors.push({
        watchlistId: entry.id,
        error: "Instant alert fired but the email failed to send",
      });
    }
  }
}

async function processBatch(
  batch: ScrapeBatch,
  summary: CronSummary
): Promise<void> {
  const hotel = getHotel(batch.hotelSlug);
  const searchParams: SearchParams = {
    checkin: batch.checkin,
    checkout: format(
      addDays(new Date(batch.checkin), batch.nights),
      "yyyy-MM-dd"
    ),
    nights: batch.nights,
    adults: batch.adults,
    children: batch.children,
    infants: 0,
    currency: "EUR",
  };

  const { results } = await scrapeHotels([hotel.id], searchParams);

  for (const { entry, snapshot } of matchResultsToEntries(results, batch)) {
    summary.checked += 1;
    try {
      const latest = await getLatestSnapshot(entry.id);
      if (!shouldRecordSnapshot(latest, snapshot)) {
        continue;
      }
      const stats = await getPriceStats(entry.id);
      await insertSnapshot(entry.id, snapshot);
      summary.changed += 1;
      const previous = latest?.available ? latest.price : null;
      await handleAlerts(entry, snapshot, previous, stats, summary);
    } catch (error) {
      summary.errors.push({
        watchlistId: entry.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

/**
 * Only calendar-strategy hotels return the whole window from a single call;
 * every other engine yields one date per scrape, so trim those batches to the
 * nearest few check-ins per run; the cursor brings the rest around next runs.
 */
function limitSingleDateBatches(batches: ScrapeBatch[]): ScrapeBatch[] {
  const trimmed: ScrapeBatch[] = [];
  for (const batch of batches) {
    if (getHotel(batch.hotelSlug).strategyType === "calendar") {
      trimmed.push(batch);
      continue;
    }
    const entries = [...batch.entries]
      .sort((a, b) => a.checkinDate.localeCompare(b.checkinDate))
      .slice(0, SINGLE_DATE_HOTEL_DATES_PER_RUN);
    for (const entry of entries) {
      trimmed.push({ ...batch, checkin: entry.checkinDate, entries: [entry] });
    }
  }
  return trimmed;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const summary: CronSummary = {
    hotels: [],
    cursor: 0,
    upserted: 0,
    deactivated: 0,
    checked: 0,
    changed: 0,
    eventsQueued: 0,
    alerted: 0,
    errors: [],
  };

  summary.deactivated = await deactivateExpired(today);

  const hotelSlugs = getAllHotels().map((h) => h.slug);
  const plan = planWatchlistSync(
    today,
    hotelSlugs,
    DEFAULT_WINDOW,
    await getAllWatchlist()
  );
  for (const entry of plan.toUpsert) {
    try {
      await addWatchlistEntry(entry);
      summary.upserted += 1;
    } catch (error) {
      summary.errors.push({
        watchlistId: null,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const cursor = (await getCronState<{ hotelOffset: number }>(CURSOR_KEY)) ?? {
    hotelOffset: 0,
  };
  const { selected, nextOffset } = selectHotelsForRun(
    hotelSlugs,
    cursor.hotelOffset,
    HOTELS_PER_RUN
  );
  await setCronState(CURSOR_KEY, { hotelOffset: nextOffset });
  summary.hotels = selected;
  summary.cursor = nextOffset;

  const entries = await getActiveWatchlistForHotels(selected);
  const batches = limitSingleDateBatches(groupEntriesForScraping(entries));
  await runWithConcurrency(
    batches.map((batch) => () => processBatch(batch, summary)),
    SCRAPE_CONCURRENCY
  );

  return NextResponse.json(summary);
}
