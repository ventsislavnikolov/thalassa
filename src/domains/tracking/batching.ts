import type { PriceResult } from "@/domains/scraping/types";
import { selectResultForEntry, toSnapshot } from "./selection";
import type { NewPriceSnapshot, WatchlistEntry } from "./types";

/**
 * One scrape call serves every entry sharing hotel + occupancy: calendar
 * strategy hotels return results for many dates, so `checkin` is the earliest
 * tracked date and `entries` are matched back to results per date afterwards.
 */
export interface ScrapeBatch {
  adults: number;
  checkin: string; // earliest check-in date across entries
  children: number;
  entries: WatchlistEntry[];
  hotelSlug: string;
  nights: number;
}

export function groupEntriesForScraping(
  entries: WatchlistEntry[]
): ScrapeBatch[] {
  const batches = new Map<string, ScrapeBatch>();
  for (const entry of entries) {
    const key = `${entry.hotelSlug}|${entry.nights}|${entry.adults}|${entry.children}`;
    const batch = batches.get(key);
    if (batch) {
      batch.entries.push(entry);
      if (entry.checkinDate < batch.checkin) {
        batch.checkin = entry.checkinDate;
      }
    } else {
      batches.set(key, {
        hotelSlug: entry.hotelSlug,
        nights: entry.nights,
        adults: entry.adults,
        children: entry.children,
        checkin: entry.checkinDate,
        entries: [entry],
      });
    }
  }
  return [...batches.values()];
}

export interface HotelRunSelection {
  nextOffset: number;
  selected: string[];
}

/** Round-robin slice of hotels for one cron run, wrapping at the end. */
export function selectHotelsForRun(
  allHotelSlugs: string[],
  hotelOffset: number,
  hotelsPerRun: number
): HotelRunSelection {
  if (allHotelSlugs.length === 0) {
    return { selected: [], nextOffset: 0 };
  }
  const offset =
    ((hotelOffset % allHotelSlugs.length) + allHotelSlugs.length) %
    allHotelSlugs.length;
  const count = Math.min(hotelsPerRun, allHotelSlugs.length);
  const selected: string[] = [];
  for (let i = 0; i < count; i++) {
    selected.push(allHotelSlugs[(offset + i) % allHotelSlugs.length]);
  }
  return { selected, nextOffset: (offset + count) % allHotelSlugs.length };
}

export interface MatchedSnapshot {
  entry: WatchlistEntry;
  snapshot: NewPriceSnapshot;
}

/** Match scraped results back to each entry in the batch by check-in date. */
export function matchResultsToEntries(
  results: PriceResult[],
  batch: ScrapeBatch
): MatchedSnapshot[] {
  return batch.entries.map((entry) => {
    const dateResults = results.filter((r) => r.date === entry.checkinDate);
    return {
      entry,
      snapshot: toSnapshot(selectResultForEntry(dateResults, entry.roomType)),
    };
  });
}

/** Run async tasks with at most `limit` in flight; rejections resolve to null. */
export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<(T | null)[]> {
  const results: (T | null)[] = new Array(tasks.length).fill(null);
  let next = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, tasks.length)) },
    async () => {
      while (next < tasks.length) {
        const index = next;
        next += 1;
        try {
          results[index] = await tasks[index]();
        } catch {
          results[index] = null;
        }
      }
    }
  );
  await Promise.all(workers);
  return results;
}
