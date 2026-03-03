import axios from "axios";
import type { Coordinates } from "@/domains/locations/types";
import { getClimateForMonth, getUvForMonth } from "../climate-data";
import {
  calculateBeachConditions,
  calculateBeachScore,
  estimateSeaTemperature,
  generateWeatherRecommendation,
  getWeatherDescription,
} from "../scoring";
import type { WeatherData, WeatherProvider } from "../types";

const FORECAST_API_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_API_URL = "https://archive-api.open-meteo.com/v1/archive";
const FORECAST_RANGE_DAYS = 16;

const DAILY_FORECAST_PARAMS = [
  "temperature_2m_min",
  "temperature_2m_max",
  "precipitation_sum",
  "windspeed_10m_max",
  "relative_humidity_2m",
  "uv_index_max",
  "weathercode",
].join(",");

const DAILY_ARCHIVE_PARAMS = [
  "temperature_2m_min",
  "temperature_2m_max",
  "precipitation_sum",
  "windspeed_10m_max",
  "relative_humidity_2m",
  "weathercode",
].join(",");

interface DailyApiData {
  time: string[];
  temperature_2m_min: (number | null)[];
  temperature_2m_max: (number | null)[];
  precipitation_sum: (number | null)[];
  windspeed_10m_max: (number | null)[];
  relative_humidity_2m: (number | null)[];
  uv_index_max?: (number | null)[];
  weathercode: (number | null)[];
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function groupDatesByMonth(dates: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const date of dates) {
    const yearMonth = date.substring(0, 7);
    const existing = groups.get(yearMonth);
    if (existing) {
      existing.push(date);
    } else {
      groups.set(yearMonth, [date]);
    }
  }

  return groups;
}

function createWeatherDataFromForecast(
  date: string,
  dailyData: DailyApiData,
  index: number
): WeatherData {
  const minTemp = dailyData.temperature_2m_min[index] ?? 20;
  const maxTemp = dailyData.temperature_2m_max[index] ?? 25;
  const avgTemp = (minTemp + maxTemp) / 2;
  const precipitation = dailyData.precipitation_sum[index] ?? 0;
  const windSpeed = dailyData.windspeed_10m_max[index] ?? 10;
  const humidity = dailyData.relative_humidity_2m[index] ?? 60;
  const uvIndex = dailyData.uv_index_max?.[index] ?? 5;
  const weatherCode = dailyData.weathercode[index] ?? 0;

  const description = getWeatherDescription(weatherCode);
  const seaTemperature = estimateSeaTemperature({ date, airTemp: avgTemp });
  const beachConditions = calculateBeachConditions({
    temperature: avgTemp,
    precipitation,
    windSpeed,
  });
  const score = calculateBeachScore({
    temperature: avgTemp,
    precipitation,
    windSpeed,
    uvIndex,
  });
  const recommendation = generateWeatherRecommendation({
    score,
    temperature: avgTemp,
    precipitation,
    windSpeed,
  });

  return {
    date,
    temperature: { min: minTemp, max: maxTemp, avg: avgTemp },
    precipitation,
    windSpeed,
    humidity,
    uvIndex,
    weatherCode,
    description,
    seaTemperature,
    beachConditions,
    recommendation,
    score,
  };
}

function createWeatherDataFromHistorical(
  date: string,
  dailyData: DailyApiData,
  index: number
): WeatherData {
  const minTemp = dailyData.temperature_2m_min[index] ?? 20;
  const maxTemp = dailyData.temperature_2m_max[index] ?? 25;
  const avgTemp = (minTemp + maxTemp) / 2;
  const precipitation = dailyData.precipitation_sum[index] ?? 0;
  const windSpeed = dailyData.windspeed_10m_max[index] ?? 10;
  const humidity = dailyData.relative_humidity_2m[index] ?? 60;
  const uvIndex = getUvForMonth(Number.parseInt(date.split("-")[1]));
  const weatherCode = dailyData.weathercode[index] ?? 0;

  const description = getWeatherDescription(weatherCode);
  const seaTemperature = estimateSeaTemperature({ date, airTemp: avgTemp });
  const beachConditions = calculateBeachConditions({
    temperature: avgTemp,
    precipitation,
    windSpeed,
  });
  const score = calculateBeachScore({
    temperature: avgTemp,
    precipitation,
    windSpeed,
    uvIndex,
  });
  const recommendation = generateWeatherRecommendation({
    score,
    temperature: avgTemp,
    precipitation,
    windSpeed,
  });

  return {
    date,
    temperature: { min: minTemp, max: maxTemp, avg: avgTemp },
    precipitation,
    windSpeed,
    humidity,
    uvIndex,
    weatherCode,
    description,
    seaTemperature,
    beachConditions,
    recommendation: `${recommendation} (Historical estimate)`,
    score,
  };
}

function createClimateBasedWeatherData(
  date: string,
  month: number
): WeatherData {
  const climate = getClimateForMonth(month);

  const tempVariation = (Math.random() - 0.5) * 4;
  const precipVariation = Math.random() * climate.precipitation;
  const windVariation = (Math.random() - 0.5) * 4;

  const minTemp = Math.round(climate.minTemp + tempVariation);
  const maxTemp = Math.round(climate.maxTemp + tempVariation);
  const precipitation = Math.max(0, Math.round(precipVariation * 10) / 10);
  const windSpeed = Math.max(5, Math.round(climate.windSpeed + windVariation));

  const adjustedAvgTemp = (minTemp + maxTemp) / 2;
  const uvIndex = month >= 4 && month <= 9 ? 7 : 4;
  const humidity = month >= 11 || month <= 3 ? 70 : 60;

  const seaTemperature = estimateSeaTemperature({
    date,
    airTemp: adjustedAvgTemp,
  });
  const beachConditions = calculateBeachConditions({
    temperature: adjustedAvgTemp,
    precipitation,
    windSpeed,
  });
  const score = calculateBeachScore({
    temperature: adjustedAvgTemp,
    precipitation,
    windSpeed,
    uvIndex,
  });
  const recommendation = generateWeatherRecommendation({
    score,
    temperature: adjustedAvgTemp,
    precipitation,
    windSpeed,
  });

  return {
    date,
    temperature: { min: minTemp, max: maxTemp, avg: adjustedAvgTemp },
    precipitation,
    windSpeed,
    humidity,
    uvIndex,
    weatherCode: precipitation > 2 ? 61 : 0,
    description: precipitation > 2 ? "Light rain" : "Clear sky",
    seaTemperature,
    beachConditions,
    recommendation: `${recommendation} (Climate estimate)`,
    score,
  };
}

function createFallbackWeatherData(date: string): WeatherData {
  const avgTemp = 25;
  return {
    date,
    temperature: { min: 22, max: 28, avg: avgTemp },
    precipitation: 0,
    windSpeed: 10,
    humidity: 60,
    uvIndex: 7,
    weatherCode: 0,
    description: "Clear sky",
    seaTemperature: estimateSeaTemperature({ date, airTemp: avgTemp }),
    beachConditions: "Good for beach activities",
    recommendation: "Good weather conditions expected",
    score: 75,
  };
}

export class OpenMeteoProvider implements WeatherProvider {
  async fetchForecast(
    coordinates: Coordinates,
    dates: string[],
    timezone: string
  ): Promise<Map<string, WeatherData>> {
    const weatherMap = new Map<string, WeatherData>();
    const dateGroups = groupDatesByMonth(dates);

    for (const [yearMonth, monthDates] of dateGroups.entries()) {
      try {
        const monthWeather = await this.fetchMonthWeather(
          yearMonth,
          monthDates,
          coordinates,
          timezone
        );
        for (const [date, weather] of monthWeather.entries()) {
          weatherMap.set(date, weather);
        }
      } catch {
        for (const date of monthDates) {
          weatherMap.set(date, createFallbackWeatherData(date));
        }
      }
    }

    return weatherMap;
  }

  private async fetchMonthWeather(
    yearMonth: string,
    dates: string[],
    coordinates: Coordinates,
    timezone: string
  ): Promise<Map<string, WeatherData>> {
    const [year, month] = yearMonth.split("-");
    const yearNum = Number.parseInt(year);
    const monthNum = Number.parseInt(month);
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-${getDaysInMonth(yearNum, monthNum)}`;

    const weatherMap = new Map<string, WeatherData>();

    const now = new Date();
    const maxForecastDate = new Date(
      now.getTime() + FORECAST_RANGE_DAYS * 24 * 60 * 60 * 1000
    );
    const requestStartDate = new Date(startDate);

    if (requestStartDate > maxForecastDate) {
      return this.fetchHistoricalClimateData(
        yearMonth,
        dates,
        coordinates,
        timezone
      );
    }

    const response = await axios.get(FORECAST_API_URL, {
      params: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        start_date: startDate,
        end_date: endDate,
        daily: DAILY_FORECAST_PARAMS,
        timezone,
        forecast_days: FORECAST_RANGE_DAYS,
      },
    });
    const data = response.data;

    for (const date of dates) {
      const dayIndex = data.daily.time.indexOf(date);
      if (dayIndex >= 0) {
        weatherMap.set(
          date,
          createWeatherDataFromForecast(date, data.daily, dayIndex)
        );
      }
    }

    return weatherMap;
  }

  private async fetchHistoricalClimateData(
    yearMonth: string,
    dates: string[],
    coordinates: Coordinates,
    timezone: string
  ): Promise<Map<string, WeatherData>> {
    const [, month] = yearMonth.split("-");
    const monthNum = Number.parseInt(month);
    const weatherMap = new Map<string, WeatherData>();

    const currentYear = new Date().getFullYear();
    const historicalYear = currentYear - 1;

    const startDate = `${historicalYear}-${month}-01`;
    const endDate = `${historicalYear}-${month}-${getDaysInMonth(historicalYear, monthNum)}`;

    try {
      const response = await axios.get(ARCHIVE_API_URL, {
        params: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          start_date: startDate,
          end_date: endDate,
          daily: DAILY_ARCHIVE_PARAMS,
          timezone,
        },
      });
      const data = response.data;

      for (const date of dates) {
        const dayOfMonth = Number.parseInt(date.split("-")[2]);
        const historicalDate = `${historicalYear}-${month}-${dayOfMonth.toString().padStart(2, "0")}`;
        const dayIndex = data.daily.time.indexOf(historicalDate);

        if (dayIndex >= 0) {
          weatherMap.set(
            date,
            createWeatherDataFromHistorical(date, data.daily, dayIndex)
          );
        } else {
          weatherMap.set(date, createClimateBasedWeatherData(date, monthNum));
        }
      }
    } catch {
      for (const date of dates) {
        weatherMap.set(date, createClimateBasedWeatherData(date, monthNum));
      }
    }

    return weatherMap;
  }
}
