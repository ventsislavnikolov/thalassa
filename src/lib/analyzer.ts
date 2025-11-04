import type { PriceInfo } from "./types";
import { getWeatherForDates, type WeatherData } from "./weather";

export interface CombinedAnalysis {
  priceInfo: PriceInfo;
  weatherData: WeatherData;
  totalScore: number;
  valueScore: number;
  recommendation: string;
  priceRank: number;
  weatherRank: number;
  overallRank: number;
  combinedScore: number;
}

export async function analyzeTopDeals(
  prices: PriceInfo[],
  topCount = 5,
  weatherLocation?: string
): Promise<CombinedAnalysis[]> {
  // Get top N lowest prices
  const topPrices = prices.slice(0, topCount);

  // Group dates by hotel to get appropriate weather data
  const hotelDatesMap = new Map<string, string[]>();
  topPrices.forEach((priceInfo) => {
    if (!hotelDatesMap.has(priceInfo.hotelId)) {
      hotelDatesMap.set(priceInfo.hotelId, []);
    }
    hotelDatesMap.get(priceInfo.hotelId)!.push(priceInfo.date);
  });

  // Get weather data for each hotel's dates
  const weatherDataMap = new Map<string, WeatherData>();
  for (const [hotelId, dates] of hotelDatesMap) {
    const weatherMap = await getWeatherForDates(
      dates,
      hotelId,
      weatherLocation
    );
    weatherMap.forEach((weather, date) => {
      weatherDataMap.set(date, weather);
    });
  }

  // Combine and analyze
  const analyses: CombinedAnalysis[] = topPrices.map((priceInfo) => {
    const weatherData = weatherDataMap.get(priceInfo.date)!;
    const analysis = createCombinedAnalysis(priceInfo, weatherData, prices);
    return analysis;
  });

  // Sort by total score and assign rankings
  const sortedByTotalScore = analyses.sort(
    (a, b) => b.totalScore - a.totalScore
  );
  const sortedByPrice = [...analyses].sort(
    (a, b) => a.priceInfo.stayTotal - b.priceInfo.stayTotal
  );
  const sortedByWeather = [...analyses].sort(
    (a, b) => b.weatherData.score - a.weatherData.score
  );

  // Assign rankings
  sortedByTotalScore.forEach((analysis, index) => {
    analysis.overallRank = index + 1;
    analysis.priceRank =
      sortedByPrice.findIndex(
        (a) => a.priceInfo.date === analysis.priceInfo.date
      ) + 1;
    analysis.weatherRank =
      sortedByWeather.findIndex(
        (a) => a.priceInfo.date === analysis.priceInfo.date
      ) + 1;
  });

  return sortedByTotalScore;
}

function createCombinedAnalysis(
  priceInfo: PriceInfo,
  weatherData: WeatherData,
  allPrices: PriceInfo[]
): CombinedAnalysis {
  // Calculate value score (how good the price is compared to average)
  const avgPrice =
    allPrices.reduce((sum, p) => sum + p.stayTotal, 0) / allPrices.length;
  const priceDiscount = ((avgPrice - priceInfo.stayTotal) / avgPrice) * 100;
  const valueScore = Math.min(100, Math.max(0, priceDiscount * 2)); // Double weight for bigger discounts

  // Combined score (60% weather, 40% value)
  const totalScore = weatherData.score * 0.6 + valueScore * 0.4;

  // Generate recommendation
  const recommendation = generateRecommendation(
    totalScore,
    weatherData.score,
    valueScore
  );

  return {
    priceInfo,
    weatherData,
    totalScore,
    valueScore,
    recommendation,
    priceRank: 0, // Will be assigned later
    weatherRank: 0, // Will be assigned later
    overallRank: 0, // Will be assigned later
    combinedScore: totalScore,
  };
}

function generateRecommendation(
  totalScore: number,
  weatherScore: number,
  valueScore: number
): string {
  if (totalScore >= 80) {
    return "🌟 HIGHLY RECOMMENDED - Excellent value and weather";
  }
  if (totalScore >= 70) {
    if (weatherScore > valueScore) {
      return "☀️ GOOD CHOICE - Great weather compensates for moderate savings";
    }
    return "💰 GOOD CHOICE - Excellent price makes up for average weather";
  }
  if (totalScore >= 60) {
    return "👍 ACCEPTABLE - Decent combination of price and weather";
  }
  if (totalScore >= 50) {
    return "⚖️ CONSIDER CAREFULLY - Some trade-offs between price and weather";
  }
  return "❌ NOT RECOMMENDED - Poor weather outweighs price savings";
}
