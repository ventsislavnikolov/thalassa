import { describe, expect, it } from "vitest";
import { evaluateAutoAlert, resolveAlertMode } from "../alerts";
import type { WatchlistEntry } from "../types";

function entry(overrides: Partial<WatchlistEntry>): WatchlistEntry {
  return {
    active: true,
    adults: 2,
    alertedAt: null,
    alertPctDrop: null,
    checkinDate: "2026-10-03",
    children: 0,
    createdAt: "2026-08-29T00:00:00Z",
    hotelSlug: "stella-island",
    id: 1,
    nights: 7,
    roomType: null,
    source: "auto",
    targetPrice: null,
    ...overrides,
  };
}

describe("evaluateAutoAlert", () => {
  it("fires on a drop of exactly 10%", () => {
    const result = evaluateAutoAlert({
      current: 900,
      historicalMin: null,
      previous: 1000,
      priorSnapshotCount: 1,
    });
    expect(result.fired).toBe(true);
    expect(result.hitPctDrop).toBe(true);
    expect(result.instant).toBe(false);
  });

  it("does not fire below the 10% threshold", () => {
    const result = evaluateAutoAlert({
      current: 950,
      historicalMin: null,
      previous: 1000,
      priorSnapshotCount: 1,
    });
    expect(result.fired).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it("flags instant on drops of 25% or more", () => {
    const result = evaluateAutoAlert({
      current: 750,
      historicalMin: null,
      previous: 1000,
      priorSnapshotCount: 1,
    });
    expect(result.fired).toBe(true);
    expect(result.instant).toBe(true);
  });

  it("fires on a new historical low with enough snapshots", () => {
    const result = evaluateAutoAlert({
      current: 800,
      historicalMin: 810,
      previous: 820,
      priorSnapshotCount: 3,
    });
    expect(result.fired).toBe(true);
    expect(result.hitNewLow).toBe(true);
    expect(result.hitPctDrop).toBe(false);
  });

  it("ignores a new low with fewer than 3 prior snapshots", () => {
    const result = evaluateAutoAlert({
      current: 800,
      historicalMin: 810,
      previous: 820,
      priorSnapshotCount: 2,
    });
    expect(result.fired).toBe(false);
  });

  it("handles a null previous price", () => {
    const result = evaluateAutoAlert({
      current: 500,
      historicalMin: null,
      previous: null,
      priorSnapshotCount: 0,
    });
    expect(result.fired).toBe(false);
    expect(result.dropPct).toBeNull();
    expect(result.instant).toBe(false);
  });
});

describe("resolveAlertMode", () => {
  it("is custom when a target price is set", () => {
    expect(resolveAlertMode(entry({ targetPrice: 900 }))).toBe("custom");
  });

  it("is custom when a pct-drop threshold is set", () => {
    expect(resolveAlertMode(entry({ alertPctDrop: 15 }))).toBe("custom");
  });

  it("is auto when no thresholds are set", () => {
    expect(resolveAlertMode(entry({}))).toBe("auto");
  });
});
