export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationConfig {
  slug: string;
  name: string;
  region: string;
  country: string;
  coordinates: Coordinates;
  timezone: string;
  image: string;
}
