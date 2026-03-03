import { describe, expect, it } from "vitest";
import type { PriceResult } from "@/domains/scraping/types";
import type { WeatherData } from "@/domains/weather/types";
import {
  analyzeDeals,
  calculateCombinedScore,
  calculateValueScore,
  generateRecommendation,
} from "../combined-scorer";

describe("calculateValueScore", () => {
  it("returns high score for big discount", () => {
    // Price 500, average 1000 = 50% discount -> doubled = 100 (capped)
    expect(calculateValueScore(500, 1000)).toBe(100);
  });

  it("returns 0 for price above average", () => {
    expect(calculateValueScore(1200, 1000)).toBe(0);
  });

  it("returns moderate score for small discount", () => {
    // Price 900, average 1000 = 10% discount -> doubled = 20
    expect(calculateValueScore(900, 1000)).toBe(20);
  });

  it("returns 0 for price equal to average", () => {
    expect(calculateValueScore(1000, 1000)).toBe(0);
  });
});

describe("calculateCombinedScore", () => {
  it("weights 60% weather + 40% value", () => {
    // 80 * 0.6 + 50 * 0.4 = 48 + 20 = 68
    expect(calculateCombinedScore(80, 50)).toBe(68);
  });

  it("returns weather-only when value is 0", () => {
    // 100 * 0.6 + 0 * 0.4 = 60
    expect(calculateCombinedScore(100, 0)).toBe(60);
  });
});

describe("generateRecommendation", () => {
  it("highly recommends for score >= 80", () => {
    expect(generateRecommendation(85, 80, 80)).toContain("HIGHLY RECOMMENDED");
  });

  it("says good choice for score >= 70", () => {
    expect(generateRecommendation(75, 80, 60)).toContain("GOOD CHOICE");
  });

  it("differentiates weather-driven good choice", () => {
    expect(generateRecommendation(75, 80, 60)).toContain("Great weather");
  });

  it("differentiates price-driven good choice", () => {
    expect(generateRecommendation(75, 60, 80)).toContain("Excellent price");
  });

  it("says acceptable for score >= 60", () => {
    expect(generateRecommendation(65, 60, 60)).toContain("ACCEPTABLE");
  });

  it("says consider carefully for score >= 50", () => {
    expect(generateRecommendation(55, 50, 50)).toContain("CONSIDER CAREFULLY");
  });

  it("says not recommended for score < 50", () => {
    expect(generateRecommendation(40, 30, 50)).toContain("NOT RECOMMENDED");
  });
});

describe("analyzeDeals", () => {
  const makePrice = (
    date: string,
    stayTotal: number,
    hotelId = "hotel-1"
  ): PriceResult => ({
    date,
    dayOfWeek: "Monday",
    averagePerNight: stayTotal / 3,
    stayTotal,
    isLowestRate: false,
    nights: 3,
    currency: "EUR",
    hotelId,
    hotelName: "Test Hotel",
  });

  const makeWeather = (date: string, score: number): WeatherData => ({
    date,
    temperature: { min: 20, max: 30, avg: 25 },
    precipitation: 0,
    windSpeed: 10,
    humidity: 50,
    uvIndex: 5,
    weatherCode: 0,
    description: "Clear sky",
    beachConditions: "Perfect",
    recommendation: "Excellent",
    score,
  });

  it("returns analyses sorted by totalScore descending", () => {
    const prices = [
      makePrice("2025-07-01", 300),
      makePrice("2025-07-02", 400),
      makePrice("2025-07-03", 500),
    ];
    const weatherMap = new Map<string, WeatherData>([
      ["2025-07-01", makeWeather("2025-07-01", 60)],
      ["2025-07-02", makeWeather("2025-07-02", 90)],
      ["2025-07-03", makeWeather("2025-07-03", 50)],
    ]);

    const results = analyzeDeals(prices, weatherMap, 3);
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].totalScore).toBeGreaterThanOrEqual(
        results[i + 1].totalScore
      );
    }
  });

  it("assigns correct overall ranks", () => {
    const prices = [makePrice("2025-07-01", 300), makePrice("2025-07-02", 400)];
    const weatherMap = new Map<string, WeatherData>([
      ["2025-07-01", makeWeather("2025-07-01", 80)],
      ["2025-07-02", makeWeather("2025-07-02", 90)],
    ]);

    const results = analyzeDeals(prices, weatherMap, 2);
    expect(results[0].overallRank).toBe(1);
    expect(results[1].overallRank).toBe(2);
  });

  it("assigns correct price ranks", () => {
    const prices = [makePrice("2025-07-01", 500), makePrice("2025-07-02", 300)];
    const weatherMap = new Map<string, WeatherData>([
      ["2025-07-01", makeWeather("2025-07-01", 90)],
      ["2025-07-02", makeWeather("2025-07-02", 50)],
    ]);

    const results = analyzeDeals(prices, weatherMap, 2);
    const cheapest = results.find((r) => r.priceInfo.date === "2025-07-02");
    expect(cheapest?.priceRank).toBe(1);
  });

  it("assigns correct weather ranks", () => {
    const prices = [makePrice("2025-07-01", 300), makePrice("2025-07-02", 400)];
    const weatherMap = new Map<string, WeatherData>([
      ["2025-07-01", makeWeather("2025-07-01", 60)],
      ["2025-07-02", makeWeather("2025-07-02", 90)],
    ]);

    const results = analyzeDeals(prices, weatherMap, 2);
    const bestWeather = results.find((r) => r.priceInfo.date === "2025-07-02");
    expect(bestWeather?.weatherRank).toBe(1);
  });

  it("limits results to topCount", () => {
    const prices = [
      makePrice("2025-07-01", 300),
      makePrice("2025-07-02", 400),
      makePrice("2025-07-03", 500),
      makePrice("2025-07-04", 600),
    ];
    const weatherMap = new Map<string, WeatherData>([
      ["2025-07-01", makeWeather("2025-07-01", 80)],
      ["2025-07-02", makeWeather("2025-07-02", 70)],
      ["2025-07-03", makeWeather("2025-07-03", 60)],
      ["2025-07-04", makeWeather("2025-07-04", 50)],
    ]);

    const results = analyzeDeals(prices, weatherMap, 2);
    expect(results).toHaveLength(2);
  });

  it("defaults topCount to 5", () => {
    const prices = Array.from({ length: 10 }, (_, i) =>
      makePrice(`2025-07-${String(i + 1).padStart(2, "0")}`, 300 + i * 100)
    );
    const weatherMap = new Map<string, WeatherData>();
    for (const p of prices) {
      weatherMap.set(p.date, makeWeather(p.date, 70));
    }

    const results = analyzeDeals(prices, weatherMap);
    expect(results).toHaveLength(5);
  });

  it("skips entries without weather data", () => {
    const prices = [makePrice("2025-07-01", 300), makePrice("2025-07-02", 400)];
    const weatherMap = new Map<string, WeatherData>([
      ["2025-07-01", makeWeather("2025-07-01", 80)],
    ]);

    const results = analyzeDeals(prices, weatherMap, 2);
    expect(results).toHaveLength(1);
    expect(results[0].priceInfo.date).toBe("2025-07-01");
  });
});
