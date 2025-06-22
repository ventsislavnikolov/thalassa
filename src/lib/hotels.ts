export interface HotelConfig {
  id: string;
  name: string;
  displayName: string;
  baseUrl: string;
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export const HOTELS: Record<string, HotelConfig> = {
  bluecarpet: {
    id: 'bluecarpet',
    name: 'Blue Carpet Suites',
    displayName: '🏖️ Blue Carpet Suites',
    baseUrl: 'https://bluecarpetsuites.reserve-online.net',
    location: 'Pefkohori, Greece',
    coordinates: {
      latitude: 40.0083,
      longitude: 23.5236
    }
  },
  cocooning: {
    id: 'cocooning',
    name: 'Cocooning Suites',
    displayName: '🌺 Cocooning Suites',
    baseUrl: 'https://cocooningsuites.reserve-online.net',
    location: 'Pefkohori, Greece',
    coordinates: {
      latitude: 40.0083, // Same location as Blue Carpet
      longitude: 23.5236
    }
  }
};

export const DEFAULT_HOTELS = ['bluecarpet', 'cocooning'];

export function getHotelConfig(hotelId: string): HotelConfig {
  const hotel = HOTELS[hotelId];
  if (!hotel) {
    throw new Error(`Unknown hotel: ${hotelId}`);
  }
  return hotel;
}

export function getAllHotels(): HotelConfig[] {
  return Object.values(HOTELS);
}

export function getDefaultHotels(): HotelConfig[] {
  return DEFAULT_HOTELS.map(id => HOTELS[id]);
}