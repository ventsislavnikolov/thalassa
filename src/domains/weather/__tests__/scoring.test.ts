import { describe, expect, it } from "vitest";
import {
  calculateBeachConditions,
  calculateBeachScore,
  estimateSeaTemperature,
  generateWeatherRecommendation,
  getWeatherDescription,
} from "../scoring";

describe("calculateBeachScore", () => {
  it("returns 100 for perfect beach conditions", () => {
    const score = calculateBeachScore({
      precipitation: 0,
      temperature: 26,
      uvIndex: 5,
      windSpeed: 8,
    });
    expect(score).toBe(100);
  });

  it("returns high score for good conditions", () => {
    const score = calculateBeachScore({
      precipitation: 0.5,
      temperature: 25,
      uvIndex: 7,
      windSpeed: 12,
    });
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it("returns low score for bad conditions", () => {
    const score = calculateBeachScore({
      precipitation: 10,
      temperature: 10,
      uvIndex: 0,
      windSpeed: 30,
    });
    expect(score).toBeLessThanOrEqual(10);
  });

  it("penalizes heavy rain", () => {
    const dryScore = calculateBeachScore({
      precipitation: 0,
      temperature: 26,
      uvIndex: 5,
      windSpeed: 8,
    });
    const rainyScore = calculateBeachScore({
      precipitation: 8,
      temperature: 26,
      uvIndex: 5,
      windSpeed: 8,
    });
    expect(rainyScore).toBeLessThan(dryScore);
  });

  it("penalizes strong wind", () => {
    const calmScore = calculateBeachScore({
      precipitation: 0,
      temperature: 26,
      uvIndex: 5,
      windSpeed: 8,
    });
    const windyScore = calculateBeachScore({
      precipitation: 0,
      temperature: 26,
      uvIndex: 5,
      windSpeed: 30,
    });
    expect(windyScore).toBeLessThan(calmScore);
  });

  it("gives partial temperature score for warm but not ideal temps", () => {
    const score = calculateBeachScore({
      precipitation: 0,
      temperature: 21,
      uvIndex: 5,
      windSpeed: 8,
    });
    // temp 21 in 20-32 range = 30, precip 0 = 30, wind 8 = 20, uv 5 = 10
    expect(score).toBe(90);
  });

  it("gives minimal temperature score for extreme cold", () => {
    const score = calculateBeachScore({
      precipitation: 0,
      temperature: 5,
      uvIndex: 5,
      windSpeed: 8,
    });
    expect(score).toBe(65);
  });

  it("scores each band edge between ideal and worst", () => {
    // 18-20 °C, 3-5 mm rain, 20-25 km/h wind, UV 9: the lowest non-zero bands.
    const score = calculateBeachScore({
      precipitation: 4,
      temperature: 19,
      uvIndex: 9,
      windSpeed: 22,
    });
    expect(score).toBe(20 + 5 + 5 + 5);
  });

  it("gives the middle rain and wind bands their points", () => {
    const score = calculateBeachScore({
      precipitation: 2,
      temperature: 26,
      uvIndex: 5,
      windSpeed: 18,
    });
    expect(score).toBe(40 + 15 + 10 + 10);
  });

  it("gives no rain, wind or UV points beyond the last band", () => {
    const score = calculateBeachScore({
      precipitation: 6,
      temperature: 26,
      uvIndex: 0,
      windSpeed: 30,
    });
    expect(score).toBe(40);
  });

  it("clamps score to 0-100 range", () => {
    const score = calculateBeachScore({
      precipitation: 0,
      temperature: 26,
      uvIndex: 6,
      windSpeed: 5,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("gives partial UV score for high UV", () => {
    const moderateUv = calculateBeachScore({
      precipitation: 0,
      temperature: 26,
      uvIndex: 5,
      windSpeed: 8,
    });
    const highUv = calculateBeachScore({
      precipitation: 0,
      temperature: 26,
      uvIndex: 10,
      windSpeed: 8,
    });
    expect(highUv).toBeLessThanOrEqual(moderateUv);
  });
});

describe("calculateBeachConditions", () => {
  it("returns rainy conditions text for heavy rain", () => {
    const result = calculateBeachConditions({
      precipitation: 6,
      temperature: 25,
      windSpeed: 10,
    });
    expect(result).toContain("Rainy");
  });

  it("returns cold conditions text for low temperature", () => {
    const result = calculateBeachConditions({
      precipitation: 0,
      temperature: 15,
      windSpeed: 10,
    });
    expect(result.toLowerCase()).toContain("cold");
  });

  it("returns windy conditions text for strong wind", () => {
    const result = calculateBeachConditions({
      precipitation: 0,
      temperature: 25,
      windSpeed: 30,
    });
    expect(result.toLowerCase()).toContain("windy");
  });

  it("returns hot conditions text for very high temperature", () => {
    const result = calculateBeachConditions({
      precipitation: 0,
      temperature: 37,
      windSpeed: 10,
    });
    expect(result.toLowerCase()).toContain("hot");
  });

  it("returns perfect beach weather for ideal conditions", () => {
    const result = calculateBeachConditions({
      precipitation: 0,
      temperature: 27,
      windSpeed: 10,
    });
    expect(result).toContain("Perfect");
  });

  it("returns good for beach for good conditions", () => {
    const result = calculateBeachConditions({
      precipitation: 1,
      temperature: 23,
      windSpeed: 18,
    });
    expect(result.toLowerCase()).toContain("good");
  });

  it("returns fair conditions for marginal weather", () => {
    const result = calculateBeachConditions({
      precipitation: 3,
      temperature: 20,
      windSpeed: 22,
    });
    expect(result.toLowerCase()).toContain("fair");
  });
});

describe("generateWeatherRecommendation", () => {
  it("returns exceptional for score >= 90", () => {
    const result = generateWeatherRecommendation({
      precipitation: 0,
      score: 95,
      temperature: 27,
      windSpeed: 8,
    });
    expect(result).toContain("Exceptional");
  });

  it("returns excellent for score >= 80", () => {
    const result = generateWeatherRecommendation({
      precipitation: 0,
      score: 85,
      temperature: 25,
      windSpeed: 10,
    });
    expect(result).toContain("Excellent");
  });

  it("returns very good for score >= 70", () => {
    const result = generateWeatherRecommendation({
      precipitation: 1,
      score: 75,
      temperature: 24,
      windSpeed: 12,
    });
    expect(result).toContain("Very good");
  });

  it("returns good for score >= 60", () => {
    const result = generateWeatherRecommendation({
      precipitation: 2,
      score: 65,
      temperature: 22,
      windSpeed: 15,
    });
    expect(result).toContain("Good");
  });

  it("returns fair for score >= 50", () => {
    const result = generateWeatherRecommendation({
      precipitation: 3,
      score: 55,
      temperature: 20,
      windSpeed: 18,
    });
    expect(result).toContain("Fair");
  });

  it("returns rainy recommendation for heavy precipitation", () => {
    const result = generateWeatherRecommendation({
      precipitation: 8,
      score: 30,
      temperature: 22,
      windSpeed: 10,
    });
    expect(result).toContain("Rainy");
  });

  it("returns cold recommendation for low temperature", () => {
    const result = generateWeatherRecommendation({
      precipitation: 0,
      score: 30,
      temperature: 12,
      windSpeed: 10,
    });
    expect(result.toLowerCase()).toContain("cold");
  });

  it("returns windy recommendation for strong wind", () => {
    const result = generateWeatherRecommendation({
      precipitation: 0,
      score: 30,
      temperature: 25,
      windSpeed: 30,
    });
    expect(result.toLowerCase()).toContain("windy");
  });

  it("returns moderate recommendation as default", () => {
    const result = generateWeatherRecommendation({
      precipitation: 3,
      score: 30,
      temperature: 20,
      windSpeed: 20,
    });
    expect(result).toContain("Moderate");
  });
});

describe("getWeatherDescription", () => {
  it("returns 'Clear sky' for code 0", () => {
    expect(getWeatherDescription(0)).toBe("Clear sky");
  });

  it("returns 'Thunderstorm' for code 95", () => {
    expect(getWeatherDescription(95)).toBe("Thunderstorm");
  });

  it("returns 'Partly cloudy' for code 2", () => {
    expect(getWeatherDescription(2)).toBe("Partly cloudy");
  });

  it("returns 'Heavy rain' for code 65", () => {
    expect(getWeatherDescription(65)).toBe("Heavy rain");
  });

  it("returns 'Unknown weather' for unrecognized code", () => {
    expect(getWeatherDescription(999)).toBe("Unknown weather");
  });

  it("returns 'Fog' for code 45", () => {
    expect(getWeatherDescription(45)).toBe("Fog");
  });

  it("returns 'Slight snow' for code 71", () => {
    expect(getWeatherDescription(71)).toBe("Slight snow");
  });
});

describe("estimateSeaTemperature", () => {
  it("returns warm temperature for summer months", () => {
    const temp = estimateSeaTemperature({ airTemp: 28, date: "2025-07-15" });
    expect(temp).toBeGreaterThanOrEqual(24);
    expect(temp).toBeLessThanOrEqual(28);
  });

  it("returns cool temperature for winter months", () => {
    const temp = estimateSeaTemperature({ airTemp: 10, date: "2025-01-15" });
    expect(temp).toBeGreaterThanOrEqual(15);
    expect(temp).toBeLessThanOrEqual(16);
  });

  it("adjusts based on air temperature", () => {
    const coolAir = estimateSeaTemperature({ airTemp: 20, date: "2025-07-15" });
    const warmAir = estimateSeaTemperature({ airTemp: 30, date: "2025-07-15" });
    expect(warmAir).toBeGreaterThan(coolAir);
  });

  it("clamps to minimum of 15", () => {
    const temp = estimateSeaTemperature({ airTemp: -5, date: "2025-01-15" });
    expect(temp).toBeGreaterThanOrEqual(15);
  });

  it("clamps to maximum of 28", () => {
    const temp = estimateSeaTemperature({ airTemp: 45, date: "2025-08-15" });
    expect(temp).toBeLessThanOrEqual(28);
  });

  it("returns reasonable temperature for spring", () => {
    const temp = estimateSeaTemperature({ airTemp: 20, date: "2025-04-15" });
    expect(temp).toBeGreaterThanOrEqual(15);
    expect(temp).toBeLessThanOrEqual(22);
  });

  it("defaults to 20 for invalid month", () => {
    const temp = estimateSeaTemperature({ airTemp: 22, date: "2025-13-15" });
    expect(temp).toBe(20);
  });
});
