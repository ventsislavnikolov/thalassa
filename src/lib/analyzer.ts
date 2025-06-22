import { PriceInfo } from "./types";
import { WeatherAnalyzer, WeatherData } from "./weather";
// chalk and cli-table3 removed - no longer needed for web API

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

export class VacationAnalyzer {
  private weatherAnalyzer: WeatherAnalyzer;

  constructor() {
    this.weatherAnalyzer = new WeatherAnalyzer();
  }

  async analyzeTopDeals(
    prices: PriceInfo[],
    topCount: number = 5
  ): Promise<CombinedAnalysis[]> {
    // Get top N lowest prices
    const topPrices = prices.slice(0, topCount);

    // Get weather data for these dates
    const dates = topPrices.map((p) => p.date);
    const weatherMap = await this.weatherAnalyzer.getWeatherForDates(dates);

    // Combine and analyze
    const analyses: CombinedAnalysis[] = topPrices.map((priceInfo) => {
      const weatherData = weatherMap.get(priceInfo.date)!;
      const analysis = this.createCombinedAnalysis(
        priceInfo,
        weatherData,
        prices
      );
      return analysis;
    });

    // Sort by total score and assign rankings
    const sortedByTotalScore = analyses.sort((a, b) => b.totalScore - a.totalScore);
    const sortedByPrice = [...analyses].sort((a, b) => a.priceInfo.stayTotal - b.priceInfo.stayTotal);
    const sortedByWeather = [...analyses].sort((a, b) => b.weatherData.score - a.weatherData.score);

    // Assign rankings
    sortedByTotalScore.forEach((analysis, index) => {
      analysis.overallRank = index + 1;
      analysis.priceRank = sortedByPrice.findIndex(a => a.priceInfo.date === analysis.priceInfo.date) + 1;
      analysis.weatherRank = sortedByWeather.findIndex(a => a.priceInfo.date === analysis.priceInfo.date) + 1;
    });

    return sortedByTotalScore;
  }

  private createCombinedAnalysis(
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
    const recommendation = this.generateRecommendation(
      totalScore,
      weatherData.score,
      valueScore,
      priceInfo,
      weatherData
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

  private generateRecommendation(
    totalScore: number,
    weatherScore: number,
    valueScore: number,
    priceInfo: PriceInfo,
    weatherData: WeatherData
  ): string {
    if (totalScore >= 80) {
      return "🌟 HIGHLY RECOMMENDED - Excellent value and weather";
    } else if (totalScore >= 70) {
      if (weatherScore > valueScore) {
        return "☀️ GOOD CHOICE - Great weather compensates for moderate savings";
      } else {
        return "💰 GOOD CHOICE - Excellent price makes up for average weather";
      }
    } else if (totalScore >= 60) {
      return "👍 ACCEPTABLE - Decent combination of price and weather";
    } else if (totalScore >= 50) {
      return "⚖️ CONSIDER CAREFULLY - Some trade-offs between price and weather";
    } else {
      return "❌ NOT RECOMMENDED - Poor weather outweighs price savings";
    }
  }

  // CLI display method removed - web UI handles display through React components
}
