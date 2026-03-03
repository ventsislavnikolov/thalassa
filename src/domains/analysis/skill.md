# Analysis Domain Skills

## Skill: Modify Analysis Weights

### When to use

Changing the price vs weather weighting in the combined score that determines the "best deal" recommendations. Currently weighted 40% price / 60% weather.

### Prerequisites

- Understanding of the current scoring in `src/domains/analysis/combined-scorer.ts`
- Desired new weight distribution (must sum to 1.0)

### Steps

1. **Review current scoring** in `src/domains/analysis/combined-scorer.ts`:
   - `calculateValueScore(price, avgPrice)`: converts raw price to 0-100 value score based on discount from average
   - `calculateCombinedScore(weatherScore, valueScore)`: `weatherScore * 0.6 + valueScore * 0.4`
   - `generateRecommendation(totalScore, weatherScore, valueScore)`: text recommendation based on thresholds (80+, 70+, 60+, 50+)
   - `analyzeDeals(prices, weatherMap, topCount)`: orchestrates the full analysis pipeline

2. **Modify weights** in `calculateCombinedScore()`:

```typescript
export function calculateCombinedScore(
  weatherScore: number,
  valueScore: number
): number {
  return weatherScore * <NEW_WEATHER_WEIGHT> + valueScore * <NEW_PRICE_WEIGHT>;
}
```

3. **Update tests** in `src/domains/analysis/__tests__/combined-scorer.test.ts`:
   - Update expected combined score calculations
   - Update recommendation threshold test expectations if thresholds changed
   - Verify edge cases still work (0/0, 100/100, etc.)

4. **Run verification**:

```bash
pnpm test                            # all tests must pass
pnpm test -- --watch combined-scorer # watch mode for iterating
```

### Key files

- `src/domains/analysis/combined-scorer.ts` - scoring functions and deal analysis
- `src/domains/analysis/types.ts` - `CombinedAnalysis` interface
- `src/domains/analysis/__tests__/combined-scorer.test.ts` - 20 tests

### Recommendation thresholds

The `generateRecommendation()` function uses these totalScore thresholds:
- 80+: "HIGHLY RECOMMENDED"
- 70+: "GOOD CHOICE" (weather-biased or price-biased variant)
- 60+: "ACCEPTABLE"
- 50+: "CONSIDER CAREFULLY"
- Below 50: "NOT RECOMMENDED"

If you change weights significantly, consider adjusting these thresholds too.

### Validation

- [ ] Weights sum to 1.0
- [ ] All 20 analysis tests pass
- [ ] Combined scores stay within 0-100 range
- [ ] Recommendation text still makes sense at new thresholds
- [ ] `analyzeDeals()` returns correctly ranked results
