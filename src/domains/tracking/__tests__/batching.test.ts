import { describe, expect, it } from "vitest";
import type { PriceResult } from "@/domains/scraping/types";
import {
  groupEntriesForScraping,
  matchResultsToEntries,
  runWithConcurrency,
  selectHotelsForRun,
} from "../batching";
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

function result(overrides: Partial<PriceResult>): PriceResult {
  return {
    averagePerNight: 100,
    currency: "EUR",
    date: "2026-10-03",
    dayOfWeek: "Saturday",
    hotelId: "stella-island",
    hotelName: "Stella Island",
    isLowestRate: true,
    nights: 7,
    stayTotal: 700,
    ...overrides,
  } as PriceResult;
}

describe("groupEntriesForScraping", () => {
  it("groups entries by hotel and occupancy, tracking earliest check-in", () => {
    const batches = groupEntriesForScraping([
      entry({ checkinDate: "2026-10-10", id: 1 }),
      entry({ checkinDate: "2026-10-03", id: 2 }),
      entry({ hotelSlug: "avaton", id: 3 }),
      entry({ adults: 4, id: 4 }),
    ]);
    expect(batches).toHaveLength(3);
    const stella = batches.find(
      (b) => b.hotelSlug === "stella-island" && b.adults === 2
    );
    expect(stella?.entries.map((e) => e.id)).toEqual([1, 2]);
    expect(stella?.checkin).toBe("2026-10-03");
  });
});

describe("selectHotelsForRun", () => {
  const slugs = ["a", "b", "c", "d", "e"];

  it("selects a slice and advances the offset", () => {
    expect(selectHotelsForRun(slugs, 0, 2)).toEqual({
      nextOffset: 2,
      selected: ["a", "b"],
    });
  });

  it("wraps around the end of the list", () => {
    expect(selectHotelsForRun(slugs, 4, 2)).toEqual({
      nextOffset: 1,
      selected: ["e", "a"],
    });
  });

  it("caps the slice at the list length", () => {
    expect(selectHotelsForRun(slugs, 1, 10).selected).toHaveLength(5);
  });

  it("handles an empty list", () => {
    expect(selectHotelsForRun([], 3, 2)).toEqual({
      nextOffset: 0,
      selected: [],
    });
  });
});

describe("matchResultsToEntries", () => {
  it("matches multi-date results to entries by check-in date", () => {
    const batch = groupEntriesForScraping([
      entry({ checkinDate: "2026-10-03", id: 1 }),
      entry({ checkinDate: "2026-10-10", id: 2 }),
      entry({ checkinDate: "2026-10-17", id: 3 }),
    ])[0];
    const matched = matchResultsToEntries(
      [
        result({ date: "2026-10-03", stayTotal: 700 }),
        result({ date: "2026-10-10", stayTotal: 900 }),
      ],
      batch
    );
    expect(matched[0].snapshot).toEqual({
      available: true,
      currency: "EUR",
      price: 700,
    });
    expect(matched[1].snapshot.price).toBe(900);
    expect(matched[2].snapshot).toEqual({
      available: false,
      currency: "EUR",
      price: null,
    });
  });

  it("delegates room-type preference to selection", () => {
    const batch = groupEntriesForScraping([
      entry({ id: 1, roomType: "SUITE" }),
    ])[0];
    const matched = matchResultsToEntries(
      [
        result({ roomCode: "STD", stayTotal: 500 }),
        result({ roomCode: "SUITE", stayTotal: 800 }),
      ],
      batch
    );
    expect(matched[0].snapshot.price).toBe(800);
  });
});

describe("runWithConcurrency", () => {
  it("runs all tasks and preserves order", async () => {
    const results = await runWithConcurrency(
      [1, 2, 3, 4].map((n) => () => Promise.resolve(n * 10)),
      2
    );
    expect(results).toEqual([10, 20, 30, 40]);
  });

  it("resolves rejected tasks to null", async () => {
    const results = await runWithConcurrency(
      [() => Promise.resolve("ok"), () => Promise.reject(new Error("boom"))],
      1
    );
    expect(results).toEqual(["ok", null]);
  });

  it("never exceeds the concurrency limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const task = () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          inFlight -= 1;
          resolve();
        }, 5);
      });
    };
    await runWithConcurrency(
      Array.from({ length: 8 }, () => task),
      3
    );
    expect(peak).toBeLessThanOrEqual(3);
  });
});
