import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ScrapeAllResult,
  scrapeHotels,
  scrapeHotelsMultiMonth,
} from "@/domains/scraping/engine";
import type { PriceResult } from "@/domains/scraping/types";
import type { WeatherData } from "@/domains/weather/types";
import { POST } from "../route";

const fetchForecast = vi.hoisted(() =>
  vi.fn<
    (
      coordinates: { latitude: number; longitude: number },
      dates: string[],
      timezone: string
    ) => Promise<Map<string, WeatherData>>
  >()
);

vi.mock("@/domains/scraping/engine", () => ({
  scrapeHotels: vi.fn(),
  scrapeHotelsMultiMonth: vi.fn(),
}));
vi.mock("@/domains/weather/providers/open-meteo", () => ({
  OpenMeteoProvider: class {
    fetchForecast = fetchForecast;
  },
}));

const single = vi.mocked(scrapeHotels);
const multi = vi.mocked(scrapeHotelsMultiMonth);

function price(date: string, stayTotal: number): PriceResult {
  return {
    averagePerNight: stayTotal / 5,
    currency: "EUR",
    date,
    dayOfWeek: "Saturday",
    hotelId: "cocooning",
    hotelName: "Cocooning Suites",
    isLowestRate: false,
    nights: 5,
    stayTotal,
  };
}

function weather(date: string): WeatherData {
  return {
    beachConditions: "Perfect beach weather",
    date,
    description: "Clear sky",
    humidity: 50,
    precipitation: 0,
    recommendation: "Go",
    score: 90,
    temperature: { avg: 27, max: 31, min: 23 },
    uvIndex: 7,
    weatherCode: 0,
    windSpeed: 8,
  };
}

function scraped(results: PriceResult[]): ScrapeAllResult {
  return {
    errors: [{ error: "blocked", hotel: "maritima" }],
    results,
    roomOptions: [{ code: "STE", name: "Suite" }],
  };
}

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/scrape", {
      body: JSON.stringify(body),
      method: "POST",
    })
  );
}

const search = { checkin: "2026-07-04", hotelSlugs: ["cocooning"] };

beforeEach(() => {
  single.mockReset();
  multi.mockReset();
  fetchForecast.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/scrape", () => {
  it("rejects an invalid search", async () => {
    const response = await post({ checkin: "4 July", hotelSlugs: [] });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid request");
    expect(body.details.map((d: { path: string[] }) => d.path[0])).toEqual([
      "checkin",
      "hotelSlugs",
    ]);
    expect(single).not.toHaveBeenCalled();
  });

  it("searches one check-in date and keeps only its prices", async () => {
    single.mockResolvedValueOnce(
      scraped([price("2026-07-04", 1000), price("2026-07-05", 900)])
    );

    const response = await post({
      ...search,
      hotelSlugs: ["cocooning", "maritima-villas"],
    });

    expect(response.status).toBe(200);
    expect(single).toHaveBeenCalledWith(["cocooning", "maritima"], {
      adults: 2,
      checkin: "2026-07-04",
      checkout: "2026-07-09",
      children: 0,
      currency: "EUR",
      infants: 0,
      nights: 5,
    });
    const body = await response.json();
    expect(body.results.map((p: PriceResult) => p.date)).toEqual([
      "2026-07-04",
    ]);
    expect(body.meta).toMatchObject({
      errors: [{ error: "blocked", hotel: "maritima" }],
      hotelsSearched: ["cocooning", "maritima"],
      totalResults: 1,
    });
    expect(body.roomOptions).toEqual([{ code: "STE", name: "Suite" }]);
    expect(body.weather).toBeNull();
  });

  it.each([
    [{ searchMode: "multi-month" }, "", 3],
    [{ months: 5, searchMode: "multi-month" }, "", 5],
    [{ searchMode: "year" }, "", 12],
    [{ searchMode: "year" }, "1", 6],
  ])(
    "scans %o months (VERCEL=%s) as %i months",
    async (mode, vercel, months) => {
      vi.stubEnv("VERCEL", vercel);
      multi.mockResolvedValueOnce(scraped([price("2026-08-01", 800)]));

      const response = await post({ ...search, ...mode });

      expect(multi).toHaveBeenCalledWith(
        ["cocooning"],
        expect.objectContaining({ checkin: "2026-07-04" }),
        months
      );
      // Multi-month results are not narrowed to the first check-in date.
      expect((await response.json()).meta.totalResults).toBe(1);
    }
  );

  it("ranks the cheapest dates by weather when asked", async () => {
    const prices = ["01", "02", "03", "04", "05", "06"].map((d, i) =>
      price(`2026-07-${d}`, 1000 + i * 100)
    );
    multi.mockResolvedValueOnce(scraped(prices));
    fetchForecast.mockImplementation((_coordinates, days) =>
      Promise.resolve(new Map(days.map((d) => [d, weather(d)])))
    );

    const response = await post({
      ...search,
      includeWeather: true,
      searchMode: "multi-month",
    });

    const [, dates, timezone] = fetchForecast.mock.calls[0];
    expect(dates).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
      "2026-07-04",
      "2026-07-05",
    ]);
    expect(timezone).toBe("Europe/Athens");
    const body = await response.json();
    expect(body.weather).toHaveLength(5);
    expect(body.weather[0].priceInfo.date).toBe("2026-07-01");
  });

  it("still answers with prices when the weather lookup fails", async () => {
    single.mockResolvedValueOnce(scraped([price("2026-07-04", 1000)]));
    fetchForecast.mockRejectedValueOnce(new Error("Open-Meteo down"));

    const response = await post({ ...search, includeWeather: true });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.weather).toBeNull();
    expect(body.results).toHaveLength(1);
  });

  it("skips the weather lookup when nothing was found", async () => {
    single.mockResolvedValueOnce(scraped([]));

    const response = await post({ ...search, includeWeather: true });

    expect(fetchForecast).not.toHaveBeenCalled();
    expect((await response.json()).weather).toBeNull();
  });

  it("answers 500 when scraping fails", async () => {
    single.mockRejectedValueOnce(new Error("engine crashed"));

    const response = await post(search);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to fetch hotel prices. Please try again.",
    });
  });
});
