import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenMeteoProvider } from "../providers/open-meteo";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));

const get = vi.mocked(axios.get);
const provider = new OpenMeteoProvider();
const coordinates = { latitude: 40.0, longitude: 23.5 };
const TIMEZONE = "Europe/Athens";
const HISTORICAL = /\(Historical estimate\)$/u;
const CLIMATE = /\(Climate estimate\)$/u;

function daily(
  time: string[],
  values: Partial<Record<string, (number | null)[]>> = {}
) {
  const fill = (value: number) => time.map(() => value);
  return {
    data: {
      daily: {
        precipitation_sum: fill(0),
        relative_humidity_2m: fill(55),
        temperature_2m_max: fill(30),
        temperature_2m_min: fill(22),
        time,
        uv_index_max: fill(6),
        weathercode: fill(1),
        windspeed_10m_max: fill(8),
        ...values,
      },
    },
  };
}

beforeEach(() => {
  get.mockReset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-07-01T09:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("OpenMeteoProvider", () => {
  it("scores forecast days within the 16-day forecast range", async () => {
    get.mockResolvedValueOnce(daily(["2026-07-01", "2026-07-02"]));

    const weather = await provider.fetchForecast(
      coordinates,
      ["2026-07-02", "2026-07-20"],
      TIMEZONE
    );

    expect(get).toHaveBeenCalledWith("https://api.open-meteo.com/v1/forecast", {
      params: expect.objectContaining({
        end_date: "2026-07-31",
        forecast_days: 16,
        latitude: 40.0,
        longitude: 23.5,
        start_date: "2026-07-01",
        timezone: TIMEZONE,
      }),
    });
    expect(weather.get("2026-07-02")).toEqual({
      beachConditions: "Perfect beach weather",
      date: "2026-07-02",
      description: "Mainly clear",
      humidity: 55,
      precipitation: 0,
      recommendation:
        "Exceptional beach weather - Perfect day for all outdoor activities!",
      score: 100,
      seaTemperature: 26.2,
      temperature: { avg: 26, max: 30, min: 22 },
      uvIndex: 6,
      weatherCode: 1,
      windSpeed: 8,
    });
    // A day the forecast does not cover is left out.
    expect(weather.has("2026-07-20")).toBe(false);
  });

  it("fills missing forecast values with mild defaults", async () => {
    get.mockResolvedValueOnce(
      daily(["2026-07-02"], {
        precipitation_sum: [null],
        relative_humidity_2m: [null],
        temperature_2m_max: [null],
        temperature_2m_min: [null],
        uv_index_max: undefined,
        weathercode: [null],
        windspeed_10m_max: [null],
      })
    );

    const weather = await provider.fetchForecast(
      coordinates,
      ["2026-07-02"],
      TIMEZONE
    );

    expect(weather.get("2026-07-02")).toMatchObject({
      description: "Clear sky",
      humidity: 60,
      precipitation: 0,
      temperature: { avg: 22.5, max: 25, min: 20 },
      uvIndex: 5,
      weatherCode: 0,
      windSpeed: 10,
    });
  });

  it("uses last year's archive for months past the forecast range", async () => {
    get.mockResolvedValueOnce(
      daily(["2025-09-09", "2025-09-10"], { weathercode: [3, 3] })
    );

    const weather = await provider.fetchForecast(
      coordinates,
      ["2026-09-10"],
      TIMEZONE
    );

    expect(get).toHaveBeenCalledWith(
      "https://archive-api.open-meteo.com/v1/archive",
      {
        params: expect.objectContaining({
          end_date: "2025-09-30",
          start_date: "2025-09-01",
        }),
      }
    );
    expect(weather.get("2026-09-10")).toMatchObject({
      description: "Overcast",
      recommendation: expect.stringMatching(HISTORICAL),
      // Archive data has no UV; September's typical index is used.
      uvIndex: 7,
    });
  });

  it("fills missing archive values with mild defaults", async () => {
    get.mockResolvedValueOnce(
      daily(["2025-09-10"], {
        precipitation_sum: [null],
        relative_humidity_2m: [null],
        temperature_2m_max: [null],
        temperature_2m_min: [null],
        weathercode: [null],
        windspeed_10m_max: [null],
      })
    );

    const weather = await provider.fetchForecast(
      coordinates,
      ["2026-09-10"],
      TIMEZONE
    );

    expect(weather.get("2026-09-10")).toMatchObject({
      description: "Clear sky",
      humidity: 60,
      precipitation: 0,
      temperature: { avg: 22.5, max: 25, min: 20 },
      weatherCode: 0,
      windSpeed: 10,
    });
  });

  it("estimates from climate averages when the archive lacks the day", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    get.mockResolvedValueOnce(daily(["2025-08-01"]));

    const weather = await provider.fetchForecast(
      coordinates,
      ["2026-08-31"],
      TIMEZONE
    );

    expect(weather.get("2026-08-31")).toMatchObject({
      description: "Clear sky",
      humidity: 60,
      precipitation: 0.3,
      recommendation: expect.stringMatching(CLIMATE),
      temperature: { avg: 28.5, max: 33, min: 24 },
      uvIndex: 7,
      weatherCode: 0,
      windSpeed: 10,
    });
  });

  it("estimates a wet winter day from climate averages when the archive fails", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    get.mockRejectedValueOnce(new Error("archive down"));

    const weather = await provider.fetchForecast(
      coordinates,
      ["2027-01-15", "2027-01-16"],
      TIMEZONE
    );

    expect(get).toHaveBeenCalledTimes(1);
    expect(weather.get("2027-01-15")).toMatchObject({
      description: "Light rain",
      humidity: 70,
      precipitation: 4,
      uvIndex: 4,
      weatherCode: 61,
    });
    expect(weather.has("2027-01-16")).toBe(true);
  });

  it("falls back to typical summer weather when the forecast fails", async () => {
    get.mockRejectedValueOnce(new Error("forecast down"));

    const weather = await provider.fetchForecast(
      coordinates,
      ["2026-07-05"],
      TIMEZONE
    );

    expect(weather.get("2026-07-05")).toMatchObject({
      beachConditions: "Good for beach activities",
      score: 75,
      temperature: { avg: 25, max: 28, min: 22 },
    });
  });

  it("requests each month once, in order", async () => {
    get
      .mockResolvedValueOnce(daily(["2026-07-10", "2026-07-11"]))
      .mockResolvedValueOnce(daily(["2025-12-01"]));

    const weather = await provider.fetchForecast(
      coordinates,
      ["2026-07-10", "2026-12-01", "2026-07-11"],
      TIMEZONE
    );

    expect(get).toHaveBeenCalledTimes(2);
    expect([...weather.keys()]).toEqual([
      "2026-07-10",
      "2026-07-11",
      "2026-12-01",
    ]);
  });
});
