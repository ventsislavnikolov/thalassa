import type {
  HotelConfig,
  RoomType,
  StrategyType,
} from "@/domains/hotels/types";

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

export interface FetchPricesParams {
  hotel: HotelConfig;
  searchParams: SearchParams;
  signal?: AbortSignal;
}

export interface ScrapingStrategy {
  fetchPrices: (params: FetchPricesParams) => Promise<ScrapeResponse>;
  type: StrategyType;
}

export interface ScrapingErrorOptions extends ErrorOptions {
  hotelId: string;
}

export class ScrapingError extends Error {
  readonly hotelId: string;

  constructor(message: string, { hotelId, ...options }: ScrapingErrorOptions) {
    super(message, options);
    this.name = "ScrapingError";
    this.hotelId = hotelId;
  }
}
