import type { Coordinates } from "@/domains/locations/types";

export interface WeatherData {
  beachConditions: string;
  date: string;
  description: string;
  humidity: number;
  precipitation: number;
  recommendation: string;
  score: number;
  seaTemperature?: number;
  temperature: { min: number; max: number; avg: number };
  uvIndex: number;
  weatherCode: number;
  windSpeed: number;
}

export interface WeatherProvider {
  fetchForecast(
    coordinates: Coordinates,
    dates: string[],
    timezone: string
  ): Promise<Map<string, WeatherData>>;
}
