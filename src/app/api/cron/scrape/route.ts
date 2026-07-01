import { addDays, format } from "date-fns";
import { type NextRequest, NextResponse } from "next/server";
import { getHotel } from "@/domains/hotels/registry";
import { scrapeHotels } from "@/domains/scraping/engine";
import type { SearchParams } from "@/domains/scraping/types";
import { shouldRecordSnapshot } from "@/domains/tracking/delta";
import {
  getActiveWatchlist,
  getLatestSnapshot,
  insertSnapshot,
} from "@/domains/tracking/queries";
import { selectResultForEntry, toSnapshot } from "@/domains/tracking/selection";
import type { WatchlistEntry } from "@/domains/tracking/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface CronSummary {
  changed: number;
  checked: number;
  errors: { watchlistId: number; error: string }[];
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function processEntry(
  entry: WatchlistEntry,
  summary: CronSummary
): Promise<void> {
  const hotel = getHotel(entry.hotelSlug);
  const searchParams: SearchParams = {
    checkin: entry.checkinDate,
    checkout: format(
      addDays(new Date(entry.checkinDate), entry.nights),
      "yyyy-MM-dd"
    ),
    nights: entry.nights,
    adults: entry.adults,
    children: entry.children,
    infants: 0,
    room: entry.roomType ?? undefined,
    currency: "EUR",
  };

  const { results } = await scrapeHotels([hotel.id], searchParams);
  const dateResults = results.filter((p) => p.date === entry.checkinDate);
  const snapshot = toSnapshot(
    selectResultForEntry(dateResults, entry.roomType)
  );

  const latest = await getLatestSnapshot(entry.id);
  if (shouldRecordSnapshot(latest, snapshot)) {
    await insertSnapshot(entry.id, snapshot);
    summary.changed += 1;
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await getActiveWatchlist();
  const summary: CronSummary = { checked: 0, changed: 0, errors: [] };

  for (const entry of entries) {
    summary.checked += 1;
    try {
      await processEntry(entry, summary);
    } catch (error) {
      summary.errors.push({
        watchlistId: entry.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json(summary);
}
