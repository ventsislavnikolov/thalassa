import type { HotelConfig, RoomType } from "@/domains/hotels/types";

export interface SearchParams {
  adults: number;
  checkin: string; // YYYY-MM-DD
  checkout: string; // YYYY-MM-DD
  children?: number;
  currency?: string; // Default: EUR
  infants?: number;
  nights: number;
  room?: string;
}

export interface PriceResult {
  averagePerNight: number;
  currency: string;
  date: string;
  dayOfWeek: string;
  hotelId: string;
  hotelName: string;
  isLowestRate: boolean;
  nights: number;
  roomCode?: string;
  roomType?: string;
  stayTotal: number;
}

export interface ScrapeResponse {
  hotelId: string;
  hotelName: string;
  prices: PriceResult[];
  roomOptions: RoomType[];
}

export interface ScrapingStrategy {
  fetchPrices(params: {
    hotel: HotelConfig;
    searchParams: SearchParams;
    signal?: AbortSignal;
  }): Promise<ScrapeResponse>;
  type: "calendar" | "avl";
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
