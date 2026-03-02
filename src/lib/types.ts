export interface SearchParams {
  adults: number;
  checkin: string; // Format: YYYY-MM-DD
  checkout: string; // Format: YYYY-MM-DD
  children?: number;
  currency?: string; // Default: EUR
  infants?: number;
  nights: number;
  room?: string; // Suite type (optional, defaults to empty for all rooms)
}

export interface PriceInfo {
  averagePerNight: number;
  currency: string;
  date: string;
  dayOfWeek: string;
  hotelId: string;
  hotelName: string;
  isLowestRate: boolean;
  nights: number;
  roomCode?: string; // e.g., "TRPL"
  roomType?: string; // e.g., "Triple Suite | Sea View"
  stayTotal: number;
}

export interface RoomOption {
  name: string;
  value: string;
}

export interface CalendarResponse {
  hotelId: string;
  hotelName: string;
  month: string;
  prices: PriceInfo[];
  roomOptions: RoomOption[];
  year: number;
}
