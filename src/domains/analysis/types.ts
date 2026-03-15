import type { PriceResult } from "@/domains/scraping/types";
import type { WeatherData } from "@/domains/weather/types";

export interface CombinedAnalysis {
  priceInfo: PriceResult;
  weatherData: WeatherData;
  totalScore: number;
  valueScore: number;
  recommendation: string;
  priceRank: number;
  weatherRank: number;
  overallRank: number;
}
