export interface SearchParams {
  checkin: string; // Format: YYYY-MM-DD
  checkout: string; // Format: YYYY-MM-DD
  nights: number;
  adults: number;
  children?: number;
  infants?: number;
  room?: string; // Suite type (optional, defaults to empty for all rooms)
  currency?: string; // Default: BGN
}

export interface PriceInfo {
  date: string;
  dayOfWeek: string;
  averagePerNight: number;
  stayTotal: number;
  isLowestRate: boolean;
  nights: number;
  currency: string;
  hotelId: string;
  hotelName: string;
}

export interface RoomOption {
  value: string;
  name: string;
}

export interface CalendarResponse {
  month: string;
  year: number;
  prices: PriceInfo[];
  roomOptions: RoomOption[];
  hotelId: string;
  hotelName: string;
}
