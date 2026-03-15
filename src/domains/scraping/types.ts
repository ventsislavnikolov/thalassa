import type { HotelConfig, RoomType } from "@/domains/hotels/types";

export interface SearchParams {
  checkin: string; // YYYY-MM-DD
  checkout: string; // YYYY-MM-DD
  nights: number;
  adults: number;
  children?: number;
  infants?: number;
  room?: string;
  currency?: string; // Default: EUR
}

export interface PriceResult {
  date: string;
  dayOfWeek: string;
  averagePerNight: number;
  stayTotal: number;
  isLowestRate: boolean;
  nights: number;
  currency: string;
  hotelId: string;
  hotelName: string;
  roomType?: string;
  roomCode?: string;
}

export interface ScrapeResponse {
  prices: PriceResult[];
  roomOptions: RoomType[];
  hotelId: string;
  hotelName: string;
}

export interface ScrapingStrategy {
  type: "calendar" | "avl";
  fetchPrices(params: {
    hotel: HotelConfig;
    searchParams: SearchParams;
    signal?: AbortSignal;
  }): Promise<ScrapeResponse>;
}

export class ScrapingError extends Error {
  readonly hotelId: string;
  override readonly cause?: unknown;

  constructor(message: string, hotelId: string, cause?: unknown) {
    super(message);
    this.name = "ScrapingError";
    this.hotelId = hotelId;
    this.cause = cause;
  }
}
