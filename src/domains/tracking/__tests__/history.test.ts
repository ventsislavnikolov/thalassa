import { describe, expect, it } from "vitest";
import { computePriceTrend } from "../history";
import type { PriceSnapshot } from "../types";

let seq = 0;
function snap(price: number | null, available = price !== null): PriceSnapshot {
  seq += 1;
  return {
    id: seq,
    watchlistId: 1,
    price,
    currency: "EUR",
    available,
    scrapedAt: `2026-07-0${seq}T00:00:00Z`,
  };
}

describe("computePriceTrend", () => {
  it("returns an empty trend when there are no priced snapshots", () => {
    expect(computePriceTrend([]).hasData).toBe(false);
    expect(computePriceTrend([snap(null, false)]).hasData).toBe(false);
  });

  it("computes low, high, first, and current", () => {
    const trend = computePriceTrend([snap(200), snap(150), snap(180)]);
    expect(trend.hasData).toBe(true);
    expect(trend.first).toBe(200);
    expect(trend.low).toBe(150);
    expect(trend.high).toBe(200);
    expect(trend.current).toBe(180);
  });

  it("computes percentage changes vs low and first", () => {
    const trend = computePriceTrend([snap(200), snap(150), snap(180)]);
    // current 180 vs low 150 -> +20%
    expect(trend.changeFromLowPct).toBeCloseTo(20);
    // current 180 vs first 200 -> -10%
    expect(trend.changeFromFirstPct).toBeCloseTo(-10);
  });

  it("flags when the current price is at the historical low", () => {
    const trend = computePriceTrend([snap(200), snap(150)]);
    expect(trend.isAtLow).toBe(true);
    expect(trend.direction).toBe("down");
  });

  it("detects an upward move against the previous point", () => {
    const trend = computePriceTrend([snap(150), snap(200)]);
    expect(trend.direction).toBe("up");
    expect(trend.isAtLow).toBe(false);
  });

  it("treats a currently-unavailable latest snapshot as no current price", () => {
    const trend = computePriceTrend([snap(200), snap(150), snap(null, false)]);
    expect(trend.currentAvailable).toBe(false);
    expect(trend.current).toBeNull();
    expect(trend.changeFromLowPct).toBeNull();
    expect(trend.low).toBe(150);
  });
});
