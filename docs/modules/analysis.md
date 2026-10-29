# Analysis

`src/domains/analysis/combined-scorer.ts` combines price and weather into the
recommendation shown with search results.

- `calculateValueScore(price, avgPrice)`: 0-100, twice the percentage discount
  from the average stay price.
- `calculateCombinedScore(weather, value)`: `weather * 0.6 + value * 0.4`.
  Changing this weighting changes what the app recommends everywhere.
- `generateRecommendation()`: text by total score: 80+ highly recommended,
  70+ good choice (weather- or price-led), 60+ acceptable, 50+ consider
  carefully, below 50 not recommended.
- `analyzeDeals(prices, weatherMap, topCount = 5)`: scores the cheapest
  `topCount` dates that have weather data and ranks them.

Change weights or thresholds together with
`__tests__/combined-scorer.test.ts`; the weights must sum to 1.
