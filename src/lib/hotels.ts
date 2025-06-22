export interface HotelConfig {
  id: string;
  name: string;
  displayName: string;
  baseUrl: string;
}

const HOTELS: Record<string, HotelConfig> = {
  bluecarpet: {
    id: "bluecarpet",
    name: "Blue Carpet Suites",
    displayName: "Blue Carpet Suites",
    baseUrl: "https://bluecarpetsuites.reserve-online.net",
  },
  cocooning: {
    id: "cocooning",
    name: "Cocooning Suites",
    displayName: "Cocooning Suites",
    baseUrl: "https://cocooningsuites.reserve-online.net",
  },
};

export function getHotelConfig(hotelId: string): HotelConfig {
  const hotel = HOTELS[hotelId];
  if (!hotel) {
    throw new Error(`Hotel configuration not found for: ${hotelId}`);
  }
  return hotel;
}

export function getDefaultHotels(): HotelConfig[] {
  return Object.values(HOTELS);
}

export function getAllHotels(): HotelConfig[] {
  return Object.values(HOTELS);
}

export function getAllHotelIds(): string[] {
  return Object.keys(HOTELS);
}
