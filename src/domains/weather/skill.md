# Weather Domain Skills

## Skill: Add a Weather Provider

### When to use

Adding a new weather data source (e.g., a paid API for better accuracy, a different forecast service).

### Prerequisites

- API documentation for the weather service
- API key or access credentials (if required)
- Understanding of the response format

### Steps

1. **Create provider file** at `src/domains/weather/providers/<provider-name>.ts`:

```typescript
import axios from "axios";
import type { Coordinates } from "@/domains/locations/types";
import {
  calculateBeachConditions,
  calculateBeachScore,
  estimateSeaTemperature,
  generateWeatherRecommendation,
  getWeatherDescription,
} from "../scoring";
import type { WeatherData, WeatherProvider } from "../types";

export class MyProvider implements WeatherProvider {
  async fetchForecast(
    coordinates: Coordinates,
    dates: string[],
    timezone: string
  ): Promise<Map<string, WeatherData>> {
    const weatherMap = new Map<string, WeatherData>();

    // 1. Fetch weather data from the API
    // 2. For each date, create a WeatherData object:
    //    - Use scoring.ts functions for beachScore, conditions, recommendations
    //    - Use estimateSeaTemperature() for sea temp estimation

    for (const date of dates) {
      // ... fetch and transform API data
      const avgTemp = 25; // from API
      const precipitation = 0; // from API
      const windSpeed = 10; // from API
      const uvIndex = 7; // from API

      const score = calculateBeachScore({ temperature: avgTemp, precipitation, windSpeed, uvIndex });

      weatherMap.set(date, {
        date,
        temperature: { min: 22, max: 28, avg: avgTemp },
        precipitation,
        windSpeed,
        humidity: 60,
        uvIndex,
        weatherCode: 0,
        description: getWeatherDescription(0),
        seaTemperature: estimateSeaTemperature({ date, airTemp: avgTemp }),
        beachConditions: calculateBeachConditions({ temperature: avgTemp, precipitation, windSpeed }),
        recommendation: generateWeatherRecommendation({ score, temperature: avgTemp, precipitation, windSpeed }),
        score,
      });
    }

    return weatherMap;
  }
}
```

2. **Use the provider** in the weather API route (`src/app/api/weather/route.ts`) by replacing or adding alongside the `OpenMeteoProvider`.

### Validation

- [ ] Provider implements the `WeatherProvider` interface
- [ ] Returns a `Map<string, WeatherData>` for all requested dates
- [ ] Uses scoring functions from `scoring.ts` for consistency
- [ ] Handles API errors gracefully with fallback data
- [ ] All existing tests pass (`pnpm test`)

---

## Skill: Modify Weather Scoring

### When to use

Tuning the beach suitability scoring algorithm (temperature thresholds, precipitation weight, wind penalties, etc.).

### Prerequisites

- Understanding of the current scoring in `src/domains/weather/scoring.ts`
- Desired changes to thresholds or weights

### Steps

1. **Review current scoring** in `src/domains/weather/scoring.ts`:
   - `calculateBeachScore()`: 0-100 score from temperature (0-40pts), precipitation (0-30pts), wind (0-20pts), UV (0-10pts)
   - `calculateBeachConditions()`: text description of beach suitability
   - `generateWeatherRecommendation()`: recommendation text based on score and weather
   - `estimateSeaTemperature()`: Aegean sea temp estimate based on month + air temp

2. **Modify the scoring function(s)** in `src/domains/weather/scoring.ts`.

3. **Update tests** in `src/domains/weather/__tests__/scoring.test.ts`:
   - Tests cover specific threshold boundaries (e.g., temp 22-30 = 40pts)
   - Update expected values to match new thresholds
   - Add new test cases for any new scoring rules

4. **Run verification**:

```bash
pnpm test                          # all tests must pass
pnpm test -- --watch scoring       # watch mode for iterating
```

### Key files

- `src/domains/weather/scoring.ts` - all scoring functions
- `src/domains/weather/__tests__/scoring.test.ts` - 39 tests covering all scoring scenarios
- `src/domains/weather/climate-data.ts` - monthly climate averages for Halkidiki

### Validation

- [ ] Scoring changes are reflected in updated test expectations
- [ ] All 39+ scoring tests pass
- [ ] Score always stays within 0-100 range
- [ ] Edge cases tested (extreme temps, zero precipitation, high wind)
