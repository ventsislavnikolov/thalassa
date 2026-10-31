import { describe, expect, it } from "vitest";
import type { PriceResult } from "@/domains/scraping/types";
import { selectResultForEntry, toSnapshot } from "../selection";

function result(overrides: Partial<PriceResult>): PriceResult {
  return {
    averagePerNight: 100,
    currency: "EUR",
    date: "2026-08-01",
    dayOfWeek: "Saturday",
    hotelId: "hotel",
    hotelName: "Hotel",
    isLowestRate: false,
    nights: 2,
    stayTotal: 200,
    ...overrides,
  };
}

describe("selectResultForEntry", () => {
  it("returns null when there are no results", () => {
    expect(selectResultForEntry([])).toBeNull();
  });

  it("picks the cheapest when no room type is tracked", () => {
    const picked = selectResultForEntry([
      result({ roomCode: "std", stayTotal: 300 }),
      result({ roomCode: "dlx", stayTotal: 250 }),
    ]);
    expect(picked?.stayTotal).toBe(250);
  });

  it("prefers a matching room by code", () => {
    const picked = selectResultForEntry(
      [
        result({ roomCode: "std", stayTotal: 300 }),
        result({ roomCode: "dlx", stayTotal: 250 }),
      ],
      "std"
    );
    expect(picked?.roomCode).toBe("std");
  });

  it("matches a tracked room by its name too", () => {
    const named = result({ roomType: "Garden Suite", stayTotal: 400 });
    const picked = selectResultForEntry(
      [result({ roomType: "Double", stayTotal: 150 }), named],
      "Garden Suite"
    );
    expect(picked).toBe(named);
  });

  it("falls back to cheapest when the tracked room is absent", () => {
    const picked = selectResultForEntry(
      [
        result({ roomCode: "std", stayTotal: 300 }),
        result({ roomCode: "dlx", stayTotal: 250 }),
      ],
      "suite"
    );
    expect(picked?.stayTotal).toBe(250);
  });
});

describe("toSnapshot", () => {
  it("marks a missing result as unavailable", () => {
    expect(toSnapshot(null)).toEqual({
      available: false,
      currency: "EUR",
      price: null,
    });
  });

  it("captures price and currency from a result", () => {
    const snapshot = toSnapshot(result({ currency: "USD", stayTotal: 420 }));
    expect(snapshot).toEqual({ available: true, currency: "USD", price: 420 });
  });
});
