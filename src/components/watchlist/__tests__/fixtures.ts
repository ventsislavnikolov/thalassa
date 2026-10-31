import type {
  PriceSnapshot,
  PriceTrend,
  WatchlistEntry,
} from "@/domains/tracking/types";

export function entry(overrides: Partial<WatchlistEntry> = {}): WatchlistEntry {
  return {
    active: true,
    adults: 2,
    alertedAt: null,
    alertPctDrop: null,
    checkinDate: "2026-07-04",
    children: 0,
    createdAt: "2026-06-01T10:00:00Z",
    hotelSlug: "cocooning",
    id: 7,
    nights: 7,
    roomType: null,
    source: "manual",
    targetPrice: null,
    ...overrides,
  };
}

export function snapshot(
  id: number,
  price: number | null,
  scrapedAt: string,
  available = price !== null
): PriceSnapshot {
  return { available, currency: "EUR", id, price, scrapedAt, watchlistId: 7 };
}

export function trend(overrides: Partial<PriceTrend> = {}): PriceTrend {
  return {
    changeFromFirstPct: -10,
    changeFromLowPct: 8.333,
    currency: "EUR",
    current: 1300,
    currentAvailable: true,
    direction: "down",
    first: 1450,
    hasData: true,
    high: 1500,
    isAtLow: false,
    low: 1200,
    pointCount: 3,
    ...overrides,
  };
}
