export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationConfig {
  coordinates: Coordinates;
  country: string;
  image: string;
  name: string;
  region: string;
  slug: string;
  timezone: string;
}
