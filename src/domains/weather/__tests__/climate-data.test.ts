import { describe, expect, it } from "vitest";
import { getClimateForMonth, getUvForMonth } from "../climate-data";

describe("getClimateForMonth", () => {
  it("returns the averages for the month", () => {
    expect(getClimateForMonth(1)).toEqual({
      maxTemp: 12,
      minTemp: 5,
      precipitation: 8,
      windSpeed: 15,
    });
  });

  it("falls back to July for an unknown month", () => {
    expect(getClimateForMonth(13)).toEqual(getClimateForMonth(7));
  });
});

describe("getUvForMonth", () => {
  it("returns the typical UV index for the month", () => {
    expect(getUvForMonth(7)).toBe(10);
    expect(getUvForMonth(12)).toBe(2);
  });

  it("falls back to a moderate index for an unknown month", () => {
    expect(getUvForMonth(0)).toBe(5);
  });
});
