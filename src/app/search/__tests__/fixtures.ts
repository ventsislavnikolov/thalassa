import type { ScrapeApiResponse } from "@/app/api/scrape/types";
import type { CombinedAnalysis } from "@/domains/analysis/types";
import type { PriceResult } from "@/domains/scraping/types";

export function price(overrides: Partial<PriceResult> = {}): PriceResult {
  return {
    averagePerNight: 200,
    currency: "EUR",
    date: "2026-07-04",
    dayOfWeek: "Saturday",
    hotelId: "cocooning",
    hotelName: "Cocooning Suites",
    isLowestRate: false,
    nights: 5,
    stayTotal: 1000,
    ...overrides,
  };
}

export function analysis(priceInfo: PriceResult): CombinedAnalysis {
  return {
    overallRank: 1,
    priceInfo,
    priceRank: 1,
    recommendation: "HIGHLY RECOMMENDED - Excellent value and weather",
    totalScore: 88,
    valueScore: 80,
    weatherData: {
      beachConditions: "Perfect beach weather",
      date: priceInfo.date,
      description: "Clear sky",
      humidity: 50,
      precipitation: 0,
      recommendation: "Exceptional beach weather",
      score: 95,
      seaTemperature: 25,
      temperature: { avg: 27, max: 31, min: 23 },
      uvIndex: 7,
      weatherCode: 0,
      windSpeed: 8,
    },
    weatherRank: 1,
  };
}

export function scrapeResponse(
  results: PriceResult[],
  overrides: Partial<ScrapeApiResponse> = {}
): ScrapeApiResponse {
  return {
    meta: {
      errors: [],
      hotelsSearched: ["cocooning"],
      searchDuration: 1200,
      totalResults: results.length,
    },
    results,
    roomOptions: [],
    weather: null,
    ...overrides,
  };
}
