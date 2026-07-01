import type { PriceResult } from "@/domains/scraping/types";
import type { WeatherData } from "@/domains/weather/types";

export interface CombinedAnalysis {
  overallRank: number;
  priceInfo: PriceResult;
  priceRank: number;
  recommendation: string;
  totalScore: number;
  valueScore: number;
  weatherData: WeatherData;
  weatherRank: number;
}
