import type { Coordinates } from "@/domains/locations/types";

export interface WeatherData {
  date: string;
  temperature: { min: number; max: number; avg: number };
  precipitation: number;
  windSpeed: number;
  humidity: number;
  uvIndex: number;
  weatherCode: number;
  description: string;
  seaTemperature?: number;
  beachConditions: string;
  recommendation: string;
  score: number;
}

export interface WeatherProvider {
  fetchForecast(
    coordinates: Coordinates,
    dates: string[],
    timezone: string
  ): Promise<Map<string, WeatherData>>;
}
