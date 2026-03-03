interface BeachScoreInput {
  temperature: number;
  precipitation: number;
  windSpeed: number;
  uvIndex: number;
}

interface BeachConditionsInput {
  temperature: number;
  precipitation: number;
  windSpeed: number;
}

interface RecommendationInput {
  score: number;
  temperature: number;
  precipitation: number;
  windSpeed: number;
}

interface SeaTemperatureInput {
  date: string;
  airTemp: number;
}

export function calculateBeachScore({
  temperature,
  precipitation,
  windSpeed,
  uvIndex,
}: BeachScoreInput): number {
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

  // UV score (0-10 points)
  if (uvIndex >= 3 && uvIndex <= 8) {
    score += 10;
  } else if (uvIndex >= 1 && uvIndex <= 10) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

export function calculateBeachConditions({
  temperature,
  precipitation,
  windSpeed,
}: BeachConditionsInput): string {
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

export function generateWeatherRecommendation({
  score,
  temperature,
  precipitation,
  windSpeed,
}: RecommendationInput): string {
  if (score >= 90) {
    return "Exceptional beach weather - Perfect day for all outdoor activities!";
  }
  if (score >= 80) {
    return "Excellent conditions - Great day for the beach and water sports!";
  }
  if (score >= 70) {
    return "Very good weather - Ideal for beach activities with minor considerations.";
  }
  if (score >= 60) {
    return "Good conditions - Suitable for beach with some weather variations.";
  }
  if (score >= 50) {
    return "Fair weather - Beach activities possible but be prepared for changing conditions.";
  }
  if (precipitation > 5) {
    return "Rainy day - Consider indoor activities or covered areas.";
  }
  if (temperature < 18) {
    return "Too cold for beach - Better suited for sightseeing or indoor activities.";
  }
  if (windSpeed > 25) {
    return "Very windy - Beach umbrella and wind protection recommended.";
  }
  return "Moderate conditions - Beach activities possible with proper preparation.";
}

const WEATHER_DESCRIPTIONS: Record<number, string> = {
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

export function getWeatherDescription(weatherCode: number): string {
  return WEATHER_DESCRIPTIONS[weatherCode] ?? "Unknown weather";
}

const AEGEAN_SEA_TEMPS: Record<number, number> = {
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

export function estimateSeaTemperature({
  date,
  airTemp,
}: SeaTemperatureInput): number {
  const month = Number.parseInt(date.split("-")[1]);
  const baseSeaTemp = AEGEAN_SEA_TEMPS[month];

  if (baseSeaTemp === undefined) {
    return 20;
  }

  const tempDiff = airTemp - 22;
  return Math.max(15, Math.min(28, baseSeaTemp + tempDiff * 0.3));
}
