import type { PriceResult } from "@/domains/scraping/types";
import type { WeatherData } from "@/domains/weather/types";
import type { CombinedAnalysis } from "./types";

export function calculateValueScore(price: number, avgPrice: number): number {
  const discount = ((avgPrice - price) / avgPrice) * 100;
  return Math.min(100, Math.max(0, discount * 2));
}

export function calculateCombinedScore(
  weatherScore: number,
  valueScore: number
): number {
  return weatherScore * 0.6 + valueScore * 0.4;
}

export function generateRecommendation(
  totalScore: number,
  weatherScore: number,
  valueScore: number
): string {
  if (totalScore >= 80) {
    return "HIGHLY RECOMMENDED - Excellent value and weather";
  }
  if (totalScore >= 70) {
    if (weatherScore > valueScore) {
      return "GOOD CHOICE - Great weather compensates for moderate savings";
    }
    return "GOOD CHOICE - Excellent price makes up for average weather";
  }
  if (totalScore >= 60) {
    return "ACCEPTABLE - Decent combination of price and weather";
  }
  if (totalScore >= 50) {
    return "CONSIDER CAREFULLY - Some trade-offs between price and weather";
  }
  return "NOT RECOMMENDED - Poor weather outweighs price savings";
}

export function analyzeDeals(
  prices: PriceResult[],
  weatherMap: Map<string, WeatherData>,
  topCount = 5
): CombinedAnalysis[] {
  const topPrices = prices.slice(0, topCount);

  const avgPrice =
    prices.reduce((sum, p) => sum + p.stayTotal, 0) / prices.length;

  const analyses: CombinedAnalysis[] = [];

  for (const priceInfo of topPrices) {
    const weatherData = weatherMap.get(priceInfo.date);
    if (!weatherData) {
      continue;
    }

    const valueScore = calculateValueScore(priceInfo.stayTotal, avgPrice);
    const totalScore = calculateCombinedScore(weatherData.score, valueScore);
    const recommendation = generateRecommendation(
      totalScore,
      weatherData.score,
      valueScore
    );

    analyses.push({
      priceInfo,
      weatherData,
      totalScore,
      valueScore,
      recommendation,
      priceRank: 0,
      weatherRank: 0,
      overallRank: 0,
    });
  }

  const sortedByTotalScore = analyses.sort(
    (a, b) => b.totalScore - a.totalScore
  );
  const sortedByPrice = [...analyses].sort(
    (a, b) => a.priceInfo.stayTotal - b.priceInfo.stayTotal
  );
  const sortedByWeather = [...analyses].sort(
    (a, b) => b.weatherData.score - a.weatherData.score
  );

  for (const [index, analysis] of sortedByTotalScore.entries()) {
    analysis.overallRank = index + 1;
    analysis.priceRank =
      sortedByPrice.findIndex(
        (a) => a.priceInfo.date === analysis.priceInfo.date
      ) + 1;
    analysis.weatherRank =
      sortedByWeather.findIndex(
        (a) => a.priceInfo.date === analysis.priceInfo.date
      ) + 1;
  }

  return sortedByTotalScore;
}
