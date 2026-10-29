# Weather

`src/domains/weather/` turns a forecast into a 0-100 beach score per date.

## Files

- `providers/open-meteo.ts`: `OpenMeteoProvider`, the only provider. Used by
  `GET /api/weather` and by `POST /api/scrape` when weather is requested.
- `scoring.ts`: `calculateBeachScore()`, `calculateBeachConditions()`,
  `generateWeatherRecommendation()`, `getWeatherDescription()` and
  `estimateSeaTemperature()`.
- `climate-data.ts`: monthly Halkidiki climate averages and UV by month. Sea
  temperature is estimated from these, never measured.

## Beach score

`calculateBeachScore()` adds four parts, clamped to 0-100:

| Part | Points | Best band |
| --- | --- | --- |
| Temperature | 0-40 | 22-30 °C |
| Precipitation | 0-30 | 0 mm |
| Wind | 0-20 | up to 10 km/h |
| UV | 0-10 | index 3-8 |

Change the bands in `scoring.ts` together with
`__tests__/scoring.test.ts`, which pins every boundary.

## Adding a provider

Implement `WeatherProvider` from `types.ts`:
`fetchForecast(coordinates, dates, timezone)` returns a
`Map<date, WeatherData>`. Build each `WeatherData` with the functions in
`scoring.ts` so scores stay comparable, then use the provider in the two API
routes above.
