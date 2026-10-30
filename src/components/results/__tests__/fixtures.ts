import type { PriceResult } from "@/domains/scraping/types";

export function price(overrides: Partial<PriceResult> = {}): PriceResult {
  return {
    averagePerNight: 200,
    currency: "EUR",
    date: "2026-07-04",
    dayOfWeek: "Saturday",
    hotelId: "cocooning",
    hotelName: "Cocooning Suites",
    isLowestRate: false,
    nights: 5,
    stayTotal: 1000,
    ...overrides,
  };
}
