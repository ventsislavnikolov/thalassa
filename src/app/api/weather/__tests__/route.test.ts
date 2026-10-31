import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WeatherData } from "@/domains/weather/types";
import { GET } from "../route";

const fetchForecast = vi.hoisted(() =>
  vi.fn<
    (
      coordinates: { latitude: number; longitude: number },
      dates: string[],
      timezone: string
    ) => Promise<Map<string, WeatherData>>
  >()
);

vi.mock("@/domains/weather/providers/open-meteo", () => ({
  OpenMeteoProvider: class {
    fetchForecast = fetchForecast;
  },
}));

function day(date: string): WeatherData {
  return {
    beachConditions: "Perfect beach weather",
    date,
    description: "Clear sky",
    humidity: 50,
    precipitation: 0,
    recommendation: "Go",
    score: 95,
    temperature: { avg: 27, max: 31, min: 23 },
    uvIndex: 8,
    weatherCode: 0,
    windSpeed: 9,
  };
}

function get(query: string) {
  return GET(new NextRequest(`http://localhost/api/weather?${query}`));
}

beforeEach(() => {
  fetchForecast.mockReset();
});

describe("GET /api/weather", () => {
  it.each([
    "from=2026-07-01&to=2026-07-03",
    "location=kavala&to=2026-07-03",
    "location=kavala&from=2026-07-01",
  ])("rejects a request missing a parameter (%s)", async (query) => {
    const response = await get(query);

    expect(response.status).toBe(400);
    expect(fetchForecast).not.toHaveBeenCalled();
  });

  it("returns the forecast for every day in the range", async () => {
    fetchForecast.mockImplementation((_coordinates, dates) =>
      Promise.resolve(new Map(dates.map((d) => [d, day(d)])))
    );

    const response = await get("location=kavala&from=2026-07-01&to=2026-07-03");

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.location).toBe("kavala");
    expect(body.data.map((d: WeatherData) => d.date)).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ]);
    const [coordinates, , timezone] = fetchForecast.mock.calls[0];
    expect(coordinates).toEqual({
      latitude: expect.any(Number),
      longitude: expect.any(Number),
    });
    expect(timezone).toBe("Europe/Athens");
  });

  it("answers 500 for an unknown location", async () => {
    const response = await get(
      "location=atlantis&from=2026-07-01&to=2026-07-01"
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to fetch weather data",
    });
  });

  it("answers 500 when the forecast fails", async () => {
    fetchForecast.mockRejectedValueOnce(new Error("down"));

    const response = await get("location=kavala&from=2026-07-01&to=2026-07-01");

    expect(response.status).toBe(500);
  });
});
