export interface WatchlistEntry {
  active: boolean;
  adults: number;
  checkinDate: string; // YYYY-MM-DD
  children: number;
  createdAt: string;
  hotelSlug: string;
  id: number;
  nights: number;
  roomType: string | null;
}

export interface NewWatchlistEntry {
  adults: number;
  checkinDate: string; // YYYY-MM-DD
  children: number;
  hotelSlug: string;
  nights: number;
  roomType?: string | null;
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
