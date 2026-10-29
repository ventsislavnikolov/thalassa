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
  precipitation_sum: (number | null)[];
  relative_humidity_2m: (number | null)[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  time: string[];
  uv_index_max?: (number | null)[];
  weathercode: (number | null)[];
  windspeed_10m_max: (number | null)[];
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function groupDatesByMonth(dates: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const date of dates) {
    const yearMonth = date.slice(0, 7);
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
  const seaTemperature = estimateSeaTemperature({ airTemp: avgTemp, date });
  const beachConditions = calculateBeachConditions({
    precipitation,
    temperature: avgTemp,
    windSpeed,
  });
  const score = calculateBeachScore({
    precipitation,
    temperature: avgTemp,
    uvIndex,
    windSpeed,
  });
  const recommendation = generateWeatherRecommendation({
    precipitation,
    score,
    temperature: avgTemp,
    windSpeed,
  });

  return {
    beachConditions,
    date,
    description,
    humidity,
    precipitation,
    recommendation,
    score,
    seaTemperature,
    temperature: { avg: avgTemp, max: maxTemp, min: minTemp },
    uvIndex,
    weatherCode,
    windSpeed,
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
  const uvIndex = getUvForMonth(Number.parseInt(date.split("-")[1], 10));
  const weatherCode = dailyData.weathercode[index] ?? 0;

  const description = getWeatherDescription(weatherCode);
  const seaTemperature = estimateSeaTemperature({ airTemp: avgTemp, date });
  const beachConditions = calculateBeachConditions({
    precipitation,
    temperature: avgTemp,
    windSpeed,
  });
  const score = calculateBeachScore({
    precipitation,
    temperature: avgTemp,
    uvIndex,
    windSpeed,
  });
  const recommendation = generateWeatherRecommendation({
    precipitation,
    score,
    temperature: avgTemp,
    windSpeed,
  });

  return {
    beachConditions,
    date,
    description,
    humidity,
    precipitation,
    recommendation: `${recommendation} (Historical estimate)`,
    score,
    seaTemperature,
    temperature: { avg: avgTemp, max: maxTemp, min: minTemp },
    uvIndex,
    weatherCode,
    windSpeed,
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
    airTemp: adjustedAvgTemp,
    date,
  });
  const beachConditions = calculateBeachConditions({
    precipitation,
    temperature: adjustedAvgTemp,
    windSpeed,
  });
  const score = calculateBeachScore({
    precipitation,
    temperature: adjustedAvgTemp,
    uvIndex,
    windSpeed,
  });
  const recommendation = generateWeatherRecommendation({
    precipitation,
    score,
    temperature: adjustedAvgTemp,
    windSpeed,
  });

  return {
    beachConditions,
    date,
    description: precipitation > 2 ? "Light rain" : "Clear sky",
    humidity,
    precipitation,
    recommendation: `${recommendation} (Climate estimate)`,
    score,
    seaTemperature,
    temperature: { avg: adjustedAvgTemp, max: maxTemp, min: minTemp },
    uvIndex,
    weatherCode: precipitation > 2 ? 61 : 0,
    windSpeed,
  };
}

function createFallbackWeatherData(date: string): WeatherData {
  const avgTemp = 25;
  return {
    beachConditions: "Good for beach activities",
    date,
    description: "Clear sky",
    humidity: 60,
    precipitation: 0,
    recommendation: "Good weather conditions expected",
    score: 75,
    seaTemperature: estimateSeaTemperature({ airTemp: avgTemp, date }),
    temperature: { avg: avgTemp, max: 28, min: 22 },
    uvIndex: 7,
    weatherCode: 0,
    windSpeed: 10,
  };
}

async function fetchHistoricalClimateData(
  yearMonth: string,
  dates: string[],
  coordinates: Coordinates,
  timezone: string
): Promise<Map<string, WeatherData>> {
  const [, month] = yearMonth.split("-");
  const monthNum = Number.parseInt(month, 10);
  const weatherMap = new Map<string, WeatherData>();

  const currentYear = new Date().getFullYear();
  const historicalYear = currentYear - 1;

  const startDate = `${historicalYear}-${month}-01`;
  const endDate = `${historicalYear}-${month}-${getDaysInMonth(historicalYear, monthNum)}`;

  try {
    const { data } = await axios.get(ARCHIVE_API_URL, {
      params: {
        daily: DAILY_ARCHIVE_PARAMS,
        end_date: endDate,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        start_date: startDate,
        timezone,
      },
    });

    for (const date of dates) {
      const dayOfMonth = Number.parseInt(date.split("-")[2], 10);
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

async function fetchMonthWeather(
  yearMonth: string,
  dates: string[],
  coordinates: Coordinates,
  timezone: string
): Promise<Map<string, WeatherData>> {
  const [year, month] = yearMonth.split("-");
  const yearNum = Number.parseInt(year, 10);
  const monthNum = Number.parseInt(month, 10);
  const startDate = `${year}-${month}-01`;
  const endDate = `${year}-${month}-${getDaysInMonth(yearNum, monthNum)}`;

  const weatherMap = new Map<string, WeatherData>();

  const now = new Date();
  const maxForecastDate = new Date(
    now.getTime() + FORECAST_RANGE_DAYS * 24 * 60 * 60 * 1000
  );
  const requestStartDate = new Date(startDate);

  if (requestStartDate > maxForecastDate) {
    return fetchHistoricalClimateData(yearMonth, dates, coordinates, timezone);
  }

  const { data } = await axios.get(FORECAST_API_URL, {
    params: {
      daily: DAILY_FORECAST_PARAMS,
      end_date: endDate,
      forecast_days: FORECAST_RANGE_DAYS,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      start_date: startDate,
      timezone,
    },
  });

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

async function fetchMonthWeatherOrFallback(
  yearMonth: string,
  dates: string[],
  coordinates: Coordinates,
  timezone: string
): Promise<Map<string, WeatherData>> {
  try {
    return await fetchMonthWeather(yearMonth, dates, coordinates, timezone);
  } catch {
    return new Map(
      dates.map((date) => [date, createFallbackWeatherData(date)])
    );
  }
}

async function fetchOpenMeteoForecast(
  coordinates: Coordinates,
  dates: string[],
  timezone: string
): Promise<Map<string, WeatherData>> {
  const weatherMap = new Map<string, WeatherData>();
  for (const [yearMonth, monthDates] of groupDatesByMonth(dates)) {
    // biome-ignore lint/performance/noAwaitInLoops: /api/weather accepts any date range, so months are fetched one at a time rather than bursting Open-Meteo with one request per month
    const monthWeather = await fetchMonthWeatherOrFallback(
      yearMonth,
      monthDates,
      coordinates,
      timezone
    );
    for (const [date, weather] of monthWeather) {
      weatherMap.set(date, weather);
    }
  }
  return weatherMap;
}

export class OpenMeteoProvider implements WeatherProvider {
  readonly fetchForecast = fetchOpenMeteoForecast;
}
