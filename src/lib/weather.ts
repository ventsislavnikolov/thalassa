import axios from "axios";

export interface WeatherData {
  date: string;
  temperature: {
    min: number;
    max: number;
    avg: number;
  };
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

// Pefkohori coordinates (approximate)
const LOCATION = {
  latitude: 39.95,
  longitude: 23.35,
};

export async function getWeatherForDates(
  dates: string[]
): Promise<Map<string, WeatherData>> {
  const weatherMap = new Map<string, WeatherData>();

  // Group dates by year-month to minimize API calls
  const dateGroups = groupDatesByMonth(dates);

  for (const [yearMonth, monthDates] of dateGroups.entries()) {
    try {
      const monthWeather = await fetchMonthWeather(yearMonth, monthDates);
      monthWeather.forEach((weather, date) => {
        weatherMap.set(date, weather);
      });
    } catch (error) {
      console.error(`Error fetching weather for ${yearMonth}:`, error);
      // Add fallback weather data for failed requests
      monthDates.forEach((date) => {
        weatherMap.set(date, createFallbackWeatherData(date));
      });
    }
  }

  return weatherMap;
}

function groupDatesByMonth(dates: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  dates.forEach((date) => {
    const yearMonth = date.substring(0, 7); // YYYY-MM
    if (!groups.has(yearMonth)) {
      groups.set(yearMonth, []);
    }
    groups.get(yearMonth)!.push(date);
  });

  return groups;
}

async function fetchMonthWeather(
  yearMonth: string,
  dates: string[]
): Promise<Map<string, WeatherData>> {
  const [year, month] = yearMonth.split("-");
  const startDate = `${year}-${month}-01`;
  const endDate = `${year}-${month}-${getDaysInMonth(
    parseInt(year),
    parseInt(month)
  )}`;

  const weatherMap = new Map<string, WeatherData>();

  // Check if dates are within forecast range (16 days from now)
  const now = new Date();
  const maxForecastDate = new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000);
  const requestStartDate = new Date(startDate);

  if (requestStartDate > maxForecastDate) {
    // For future dates beyond forecast range, use historical climate data
    return await fetchHistoricalClimateData(yearMonth, dates);
  }

  const url = `https://api.open-meteo.com/v1/forecast`;
  const params = {
    latitude: LOCATION.latitude,
    longitude: LOCATION.longitude,
    start_date: startDate,
    end_date: endDate,
    daily: [
      "temperature_2m_min",
      "temperature_2m_max",
      "precipitation_sum",
      "windspeed_10m_max",
      "relative_humidity_2m",
      "uv_index_max",
      "weathercode",
    ].join(","),
    timezone: "Europe/Athens",
    forecast_days: 16,
  };

  const response = await axios.get(url, { params });
  const data = response.data;

  // Only process the dates we need
  dates.forEach((date) => {
    const dayIndex = data.daily.time.indexOf(date);
    if (dayIndex >= 0) {
      const weatherData = createWeatherData(date, data.daily, dayIndex);
      weatherMap.set(date, weatherData);
    }
  });

  return weatherMap;
}

async function fetchHistoricalClimateData(
  yearMonth: string,
  dates: string[]
): Promise<Map<string, WeatherData>> {
  const [year, month] = yearMonth.split("-");
  console.log(year, month);
  const monthNum = parseInt(month);
  const weatherMap = new Map<string, WeatherData>();

  // Use historical weather data from previous years to estimate future weather
  const currentYear = new Date().getFullYear();
  const historicalYear = currentYear - 1; // Use last year's data as baseline

  const startDate = `${historicalYear}-${month}-01`;
  const endDate = `${historicalYear}-${month}-${getDaysInMonth(
    historicalYear,
    monthNum
  )}`;

  try {
    const url = `https://archive-api.open-meteo.com/v1/archive`;
    const params = {
      latitude: LOCATION.latitude,
      longitude: LOCATION.longitude,
      start_date: startDate,
      end_date: endDate,
      daily: [
        "temperature_2m_min",
        "temperature_2m_max",
        "precipitation_sum",
        "windspeed_10m_max",
        "relative_humidity_2m",
        "weathercode",
      ].join(","),
      timezone: "Europe/Athens",
    };

    const response = await axios.get(url, { params });
    const data = response.data;

    // Map historical data to requested future dates
    dates.forEach((date) => {
      const dayOfMonth = parseInt(date.split("-")[2]);
      const historicalDate = `${historicalYear}-${month}-${dayOfMonth
        .toString()
        .padStart(2, "0")}`;
      const dayIndex = data.daily.time.indexOf(historicalDate);

      if (dayIndex >= 0) {
        const weatherData = createWeatherDataFromHistorical(
          date,
          data.daily,
          dayIndex
        );
        weatherMap.set(date, weatherData);
      } else {
        // Fallback to climate-based estimate
        weatherMap.set(date, createClimateBasedWeatherData(date, monthNum));
      }
    });
  } catch {
    // If historical API fails, use climate-based estimates
    dates.forEach((date) => {
      weatherMap.set(date, createClimateBasedWeatherData(date, monthNum));
    });
  }

  return weatherMap;
}

function createClimateBasedWeatherData(
  date: string,
  month: number
): WeatherData {
  // Climate averages for Pefkohori/Chalkidiki region by month
  const climateData: Record<
    number,
    {
      minTemp: number;
      maxTemp: number;
      precipitation: number;
      windSpeed: number;
    }
  > = {
    1: { minTemp: 5, maxTemp: 12, precipitation: 8, windSpeed: 15 },
    2: { minTemp: 6, maxTemp: 14, precipitation: 6, windSpeed: 14 },
    3: { minTemp: 8, maxTemp: 17, precipitation: 5, windSpeed: 13 },
    4: { minTemp: 12, maxTemp: 21, precipitation: 3, windSpeed: 12 },
    5: { minTemp: 17, maxTemp: 26, precipitation: 2, windSpeed: 11 },
    6: { minTemp: 22, maxTemp: 31, precipitation: 1, windSpeed: 10 },
    7: { minTemp: 24, maxTemp: 33, precipitation: 0.5, windSpeed: 10 },
    8: { minTemp: 24, maxTemp: 33, precipitation: 0.5, windSpeed: 10 },
    9: { minTemp: 20, maxTemp: 28, precipitation: 2, windSpeed: 11 },
    10: { minTemp: 15, maxTemp: 23, precipitation: 4, windSpeed: 12 },
    11: { minTemp: 10, maxTemp: 18, precipitation: 6, windSpeed: 13 },
    12: { minTemp: 7, maxTemp: 14, precipitation: 8, windSpeed: 14 },
  };

  const climate = climateData[month] || climateData[7]; // Default to July if invalid month

  // Add some variation to make it realistic
  const tempVariation = (Math.random() - 0.5) * 4; // ±2°C variation
  const precipVariation = Math.random() * climate.precipitation;
  const windVariation = (Math.random() - 0.5) * 4; // ±2 km/h variation

  const minTemp = Math.round(climate.minTemp + tempVariation);
  const maxTemp = Math.round(climate.maxTemp + tempVariation);
  const precipitation = Math.max(0, Math.round(precipVariation * 10) / 10);
  const windSpeed = Math.max(5, Math.round(climate.windSpeed + windVariation));

  const adjustedAvgTemp = (minTemp + maxTemp) / 2;
  const uvIndex = month >= 4 && month <= 9 ? 7 : 4; // Higher UV in summer months
  const humidity = month >= 11 || month <= 3 ? 70 : 60; // Higher humidity in winter

  const seaTemperature = estimateSeaTemperature(date, adjustedAvgTemp);
  const beachConditions = calculateBeachConditions(
    adjustedAvgTemp,
    precipitation,
    windSpeed
  );
  const score = calculateBeachScore(
    adjustedAvgTemp,
    precipitation,
    windSpeed,
    uvIndex
  );
  const recommendation = generateWeatherRecommendation(
    score,
    adjustedAvgTemp,
    precipitation,
    windSpeed
  );

  return {
    date,
    temperature: {
      min: minTemp,
      max: maxTemp,
      avg: adjustedAvgTemp,
    },
    precipitation,
    windSpeed,
    humidity,
    uvIndex,
    weatherCode: precipitation > 2 ? 61 : 0, // Light rain if precipitation, clear otherwise
    description: precipitation > 2 ? "Light rain" : "Clear sky",
    seaTemperature,
    beachConditions,
    recommendation: `${recommendation} (Climate estimate)`,
    score,
  };
}

function createWeatherDataFromHistorical(
  date: string,
  dailyData: any,
  index: number
): WeatherData {
  const minTemp = dailyData.temperature_2m_min[index] || 20;
  const maxTemp = dailyData.temperature_2m_max[index] || 25;
  const avgTemp = (minTemp + maxTemp) / 2;
  const precipitation = dailyData.precipitation_sum[index] || 0;
  const windSpeed = dailyData.windspeed_10m_max[index] || 10;
  const humidity = dailyData.relative_humidity_2m[index] || 60;
  const uvIndex = estimateUVIndex(date);
  const weatherCode = dailyData.weathercode[index] || 0;

  const description = getWeatherDescription(weatherCode);
  const seaTemperature = estimateSeaTemperature(date, avgTemp);
  const beachConditions = calculateBeachConditions(
    avgTemp,
    precipitation,
    windSpeed
  );
  const score = calculateBeachScore(avgTemp, precipitation, windSpeed, uvIndex);
  const recommendation = generateWeatherRecommendation(
    score,
    avgTemp,
    precipitation,
    windSpeed
  );

  return {
    date,
    temperature: {
      min: minTemp,
      max: maxTemp,
      avg: avgTemp,
    },
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

function estimateUVIndex(date: string): number {
  const month = parseInt(date.split("-")[1]);
  // UV index estimates by month for Greece
  const uvByMonth: Record<number, number> = {
    1: 2,
    2: 3,
    3: 4,
    4: 6,
    5: 8,
    6: 9,
    7: 10,
    8: 9,
    9: 7,
    10: 5,
    11: 3,
    12: 2,
  };
  return uvByMonth[month] || 5;
}

function createWeatherData(
  date: string,
  dailyData: any,
  index: number
): WeatherData {
  const minTemp = dailyData.temperature_2m_min[index] || 20;
  const maxTemp = dailyData.temperature_2m_max[index] || 25;
  const avgTemp = (minTemp + maxTemp) / 2;
  const precipitation = dailyData.precipitation_sum[index] || 0;
  const windSpeed = dailyData.windspeed_10m_max[index] || 10;
  const humidity = dailyData.relative_humidity_2m[index] || 60;
  const uvIndex = dailyData.uv_index_max[index] || 5;
  const weatherCode = dailyData.weathercode[index] || 0;

  const description = getWeatherDescription(weatherCode);
  const seaTemperature = estimateSeaTemperature(date, avgTemp);
  const beachConditions = calculateBeachConditions(
    avgTemp,
    precipitation,
    windSpeed
  );
  const score = calculateBeachScore(avgTemp, precipitation, windSpeed, uvIndex);
  const recommendation = generateWeatherRecommendation(
    score,
    avgTemp,
    precipitation,
    windSpeed
  );

  return {
    date,
    temperature: {
      min: minTemp,
      max: maxTemp,
      avg: avgTemp,
    },
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

function createFallbackWeatherData(date: string): WeatherData {
  // Create reasonable fallback data for Greek summer
  const avgTemp = 25;
  return {
    date,
    temperature: {
      min: 22,
      max: 28,
      avg: avgTemp,
    },
    precipitation: 0,
    windSpeed: 10,
    humidity: 60,
    uvIndex: 7,
    weatherCode: 0,
    description: "Clear sky",
    seaTemperature: estimateSeaTemperature(date, avgTemp),
    beachConditions: "Good for beach activities",
    recommendation: "Good weather conditions expected",
    score: 75,
  };
}

function getWeatherDescription(weatherCode: number): string {
  const descriptions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail",
  };

  return descriptions[weatherCode] || "Unknown weather";
}

function estimateSeaTemperature(date: string, airTemp: number): number {
  const month = parseInt(date.split("-")[1]);

  // Typical sea temperatures for Aegean Sea by month
  const seaTemps: Record<number, number> = {
    1: 15,
    2: 15,
    3: 16,
    4: 18,
    5: 20,
    6: 23,
    7: 25,
    8: 26,
    9: 24,
    10: 22,
    11: 19,
    12: 17,
  };

  const baseSeaTemp = seaTemps[month] || 20;

  // Adjust based on air temperature
  const tempDiff = airTemp - 22; // 22°C as baseline
  return Math.max(15, Math.min(28, baseSeaTemp + tempDiff * 0.3));
}

function calculateBeachConditions(
  temperature: number,
  precipitation: number,
  windSpeed: number
): string {
  if (precipitation > 5) {
    return "Not suitable - Rainy conditions";
  }

  if (temperature < 18) {
    return "Too cold for beach activities";
  }

  if (windSpeed > 25) {
    return "Very windy - Beach activities may be difficult";
  }

  if (temperature > 35) {
    return "Very hot - Seek shade during midday";
  }

  if (temperature >= 25 && precipitation <= 1 && windSpeed <= 15) {
    return "Perfect beach weather";
  }

  if (temperature >= 22 && precipitation <= 2 && windSpeed <= 20) {
    return "Good for beach activities";
  }

  return "Fair conditions for beach activities";
}

function calculateBeachScore(
  temperature: number,
  precipitation: number,
  windSpeed: number,
  uvIndex: number
): number {
  let score = 0;

  // Temperature score (0-40 points)
  if (temperature >= 22 && temperature <= 30) {
    score += 40;
  } else if (temperature >= 20 && temperature <= 32) {
    score += 30;
  } else if (temperature >= 18 && temperature <= 35) {
    score += 20;
  } else {
    score += 5;
  }

  // Precipitation score (0-30 points)
  if (precipitation === 0) {
    score += 30;
  } else if (precipitation <= 1) {
    score += 25;
  } else if (precipitation <= 3) {
    score += 15;
  } else if (precipitation <= 5) {
    score += 5;
  }
  // No points for heavy rain

  // Wind score (0-20 points)
  if (windSpeed <= 10) {
    score += 20;
  } else if (windSpeed <= 15) {
    score += 15;
  } else if (windSpeed <= 20) {
    score += 10;
  } else if (windSpeed <= 25) {
    score += 5;
  }
  // No points for very windy conditions

  // UV score (0-10 points)
  if (uvIndex >= 3 && uvIndex <= 8) {
    score += 10;
  } else if (uvIndex >= 1 && uvIndex <= 10) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

function generateWeatherRecommendation(
  score: number,
  temperature: number,
  precipitation: number,
  windSpeed: number
): string {
  if (score >= 90) {
    return "🌟 Exceptional beach weather - Perfect day for all outdoor activities!";
  } else if (score >= 80) {
    return "☀️ Excellent conditions - Great day for the beach and water sports!";
  } else if (score >= 70) {
    return "🏖️ Very good weather - Ideal for beach activities with minor considerations.";
  } else if (score >= 60) {
    return "👍 Good conditions - Suitable for beach with some weather variations.";
  } else if (score >= 50) {
    return "⚠️ Fair weather - Beach activities possible but be prepared for changing conditions.";
  } else if (precipitation > 5) {
    return "🌧️ Rainy day - Consider indoor activities or covered areas.";
  } else if (temperature < 18) {
    return "🧥 Too cold for beach - Better suited for sightseeing or indoor activities.";
  } else if (windSpeed > 25) {
    return "💨 Very windy - Beach umbrella and wind protection recommended.";
  } else {
    return "🌤️ Moderate conditions - Beach activities possible with proper preparation.";
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
