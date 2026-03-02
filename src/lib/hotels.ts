export type HotelConfig = {
  id: string;
  name: string;
  displayName: string;
  baseUrl: string;
  apiEndpoint?: string;
};

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
  myra: {
    id: "myra",
    name: "Myra Hotel",
    displayName: "Myra Hotel",
    baseUrl: "https://myrahotel.reserve-online.net",
  },
  portocarras: {
    id: "portocarras",
    name: "Porto Carras",
    displayName: "Porto Carras",
    baseUrl: "https://portocarras.reserve-online.net",
    apiEndpoint: "/avl",
  },
  eaglespalace: {
    id: "eaglespalace",
    name: "Eagles Palace",
    displayName: "Eagles Palace, Small Luxury Hotels of the World",
    baseUrl: "https://eaglesresort.reserve-online.net",
    apiEndpoint: "/avl",
  },
  eaglesvillas: {
    id: "eaglesvillas",
    name: "Eagles Villas",
    displayName: "Eagles Villas, Small Luxury Hotels of the World",
    baseUrl: "https://eaglesresort.reserve-online.net",
    apiEndpoint: "/avl",
  },
  excelsior: {
    id: "excelsior",
    name: "The Excelsior",
    displayName: "The Excelsior",
    baseUrl: "https://excelsiorthessaloniki.reserve-online.net",
    apiEndpoint: "/avl",
  },
  olympionsunset: {
    id: "olympionsunset",
    name: "Olympion Sunset",
    displayName: "Olympion Sunset",
    baseUrl: "https://olympion-sunset.reserve-online.net",
    apiEndpoint: "/avl",
  },
  potideapalace: {
    id: "potideapalace",
    name: "Potidea Palace",
    displayName: "Potidea Palace Hotel",
    baseUrl: "https://potideapalace.reserve-online.net",
  },
  meditekassandra: {
    id: "meditekassandra",
    name: "Medite Kassandra Resort",
    displayName: "Medite Kassandra Resort",
    baseUrl: "https://meditekassandraresort.reserve-online.net",
    apiEndpoint: "/avl",
  },
  pomegranate: {
    id: "pomegranate",
    name: "Pomegranate Spa Hotel",
    displayName: "Pomegranate Spa Hotel",
    baseUrl: "https://pomegranatespahotel.reserve-online.net",
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
