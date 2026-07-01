export interface WatchlistEntry {
  active: boolean;
  adults: number;
  alertedAt: string | null;
  alertPctDrop: number | null;
  checkinDate: string; // YYYY-MM-DD
  children: number;
  createdAt: string;
  hotelSlug: string;
  id: number;
  nights: number;
  roomType: string | null;
  targetPrice: number | null;
}

export interface NewWatchlistEntry {
  adults: number;
  alertPctDrop?: number | null;
  checkinDate: string; // YYYY-MM-DD
  children: number;
  hotelSlug: string;
  nights: number;
  roomType?: string | null;
  targetPrice?: number | null;
}

/** Editable deal-alert thresholds for a watchlist entry. */
export interface AlertConfig {
  alertPctDrop: number | null;
  targetPrice: number | null;
}

export interface PriceSnapshot {
  available: boolean;
  currency: string;
  id: number;
  price: number | null;
  scrapedAt: string;
  watchlistId: number;
}

export interface NewPriceSnapshot {
  available: boolean;
  currency: string;
  price: number | null;
}

/** The comparable value of a snapshot, used for delta detection. */
export interface SnapshotValue {
  available: boolean;
  price: number | null;
}

/** Response shape of GET /api/watchlist/[id]/history. */
export interface PriceHistoryResponse {
  snapshots: PriceSnapshot[];
  trend: PriceTrend;
}

/** Aggregated price trend derived from a watchlist entry's snapshots. */
export interface PriceTrend {
  changeFromFirstPct: number | null;
  changeFromLowPct: number | null;
  currency: string;
  current: number | null;
  currentAvailable: boolean;
  direction: "up" | "down" | "flat";
  first: number | null;
  hasData: boolean;
  high: number | null;
  isAtLow: boolean;
  low: number | null;
  pointCount: number;
}
