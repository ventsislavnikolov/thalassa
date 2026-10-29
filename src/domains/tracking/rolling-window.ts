import { addDays, format, getDay, parseISO } from "date-fns";
import type { NewWatchlistEntry, WatchlistEntry } from "./types";

export interface WindowConfig {
  adults: number;
  /** Check-in weekdays to track (0 = Sunday … 6 = Saturday) with stay length. */
  checkinWeekdays: { nights: number; weekday: number }[];
  children: number;
  maxDaysAhead: number;
  minDaysAhead: number;
}

/** Weekly 7-night stays with Saturday check-in, 14–90 days ahead, 2 adults. */
export const DEFAULT_WINDOW: WindowConfig = {
  adults: 2,
  checkinWeekdays: [{ nights: 7, weekday: 6 }],
  children: 0,
  maxDaysAhead: 90,
  minDaysAhead: 14,
};

export interface WindowDate {
  checkinDate: string; // YYYY-MM-DD
  nights: number;
}

/** All check-in dates inside the window matching the configured weekdays. */
export function generateWindowDates(
  today: string,
  config: WindowConfig
): WindowDate[] {
  const start = addDays(parseISO(today), config.minDaysAhead);
  const dates: WindowDate[] = [];
  const span = config.maxDaysAhead - config.minDaysAhead;
  for (let offset = 0; offset <= span; offset += 1) {
    const day = addDays(start, offset);
    for (const target of config.checkinWeekdays) {
      if (getDay(day) === target.weekday) {
        dates.push({
          checkinDate: format(day, "yyyy-MM-dd"),
          nights: target.nights,
        });
      }
    }
  }
  return dates;
}

export interface WatchlistSyncPlan {
  toDeactivateIds: number[];
  toUpsert: NewWatchlistEntry[];
}

function entryKey(
  hotelSlug: string,
  checkinDate: string,
  nights: number,
  adults: number,
  children: number
): string {
  return `${hotelSlug}|${checkinDate}|${nights}|${adults}|${children}`;
}

/**
 * Diff the desired rolling window against the current watchlist. Proposes
 * auto entries missing from the table and deactivation of any active entry
 * (manual or auto) whose check-in date has passed. Manual entries are never
 * created or deactivated for any other reason.
 */
export function planWatchlistSync(
  today: string,
  hotelSlugs: string[],
  config: WindowConfig,
  existing: WatchlistEntry[]
): WatchlistSyncPlan {
  const toDeactivateIds = existing
    .filter((e) => e.active && e.checkinDate < today)
    .map((e) => e.id);

  const existingKeys = new Set(
    existing.map((e) =>
      entryKey(e.hotelSlug, e.checkinDate, e.nights, e.adults, e.children)
    )
  );

  const windowDates = generateWindowDates(today, config);
  const toUpsert: NewWatchlistEntry[] = [];
  for (const slug of hotelSlugs) {
    for (const date of windowDates) {
      const key = entryKey(
        slug,
        date.checkinDate,
        date.nights,
        config.adults,
        config.children
      );
      if (existingKeys.has(key)) {
        continue;
      }
      toUpsert.push({
        adults: config.adults,
        checkinDate: date.checkinDate,
        children: config.children,
        hotelSlug: slug,
        nights: date.nights,
        source: "auto",
      });
    }
  }

  return { toDeactivateIds, toUpsert };
}
