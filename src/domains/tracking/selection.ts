import type { PriceResult } from "@/domains/scraping/types";
import type { NewPriceSnapshot } from "./types";

/**
 * Pick the price for a watchlist entry from a set of scraped results. Results
 * are already filtered to the entry's check-in date. When a room type is
 * tracked, prefer a matching room; otherwise (or when no match exists) take the
 * cheapest available result. Returns null when nothing is available.
 */
export function selectResultForEntry(
  dateResults: PriceResult[],
  roomType?: string | null
): PriceResult | null {
  if (dateResults.length === 0) {
    return null;
  }

  const candidates = roomType
    ? dateResults.filter(
        (r) => r.roomCode === roomType || r.roomType === roomType
      )
    : dateResults;

  const pool = candidates.length > 0 ? candidates : dateResults;

  return pool.reduce((cheapest, current) =>
    current.stayTotal < cheapest.stayTotal ? current : cheapest
  );
}

/** Convert a selected result (or its absence) into a snapshot to store. */
export function toSnapshot(result: PriceResult | null): NewPriceSnapshot {
  if (!result) {
    return { price: null, currency: "EUR", available: false };
  }
  return {
    price: result.stayTotal,
    currency: result.currency,
    available: true,
  };
}
