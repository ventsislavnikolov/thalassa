import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HotelConfig } from "@/domains/hotels/types";
import { scrapeHotels, scrapeHotelsMultiMonth } from "../engine";
import type {
  FetchPricesParams,
  PriceResult,
  ScrapeResponse,
  SearchParams,
} from "../types";

const fetchPrices = vi.hoisted(() =>
  vi.fn<(params: FetchPricesParams) => Promise<ScrapeResponse>>()
);

vi.mock("../strategies/avl", () => ({
  AvlStrategy: class {
    fetchPrices = fetchPrices;
    type = "avl";
  },
}));
vi.mock("../strategies/calendar", () => ({
  CalendarStrategy: class {
    fetchPrices = fetchPrices;
    type = "calendar";
  },
}));
vi.mock("../strategies/hvd", () => ({
  HvdStrategy: class {
    fetchPrices = fetchPrices;
    type = "hvd";
  },
}));

const searchParams: SearchParams = {
  adults: 2,
  checkin: "2026-07-01",
  checkout: "2026-07-08",
  nights: 7,
};

function price(
  hotel: HotelConfig,
  date: string,
  stayTotal: number,
  roomCode?: string
): PriceResult {
  return {
    averagePerNight: stayTotal / 7,
    currency: "EUR",
    date,
    dayOfWeek: "Wednesday",
    hotelId: hotel.id,
    hotelName: hotel.name,
    isLowestRate: false,
    nights: 7,
    roomCode,
    stayTotal,
  };
}

function response(
  hotel: HotelConfig,
  prices: PriceResult[],
  roomOptions: ScrapeResponse["roomOptions"] = []
): ScrapeResponse {
  return { hotelId: hotel.id, hotelName: hotel.name, prices, roomOptions };
}

beforeEach(() => {
  fetchPrices.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("scrapeHotels", () => {
  it("keeps the cheapest price per date and room, sorted by stay total", async () => {
    fetchPrices.mockImplementation(({ hotel }) =>
      Promise.resolve(
        hotel.id === "cocooning"
          ? response(
              hotel,
              [
                price(hotel, "2026-07-01", 1500),
                price(hotel, "2026-07-01", 1200),
                price(hotel, "2026-07-01", 1300),
                price(hotel, "2026-07-02", 1100, "STE"),
              ],
              [{ code: "STE", name: "Suite" }]
            )
          : response(hotel, [price(hotel, "2026-07-01", 900)])
      )
    );

    const result = await scrapeHotels(
      ["cocooning", "maritima", "reinadelmar"],
      searchParams
    );

    expect(
      result.results.map((p) => [p.hotelId, p.date, p.roomCode, p.stayTotal])
    ).toEqual([
      ["maritima", "2026-07-01", undefined, 900],
      ["reinadelmar", "2026-07-01", undefined, 900],
      ["cocooning", "2026-07-02", "STE", 1100],
      ["cocooning", "2026-07-01", undefined, 1200],
    ]);
    expect(result.roomOptions).toEqual([{ code: "STE", name: "Suite" }]);
    expect(result.errors).toEqual([]);
    expect(fetchPrices).toHaveBeenCalledWith(
      expect.objectContaining({ searchParams })
    );
  });

  it("records a failing hotel and goes on with the rest", async () => {
    fetchPrices
      .mockRejectedValueOnce(new Error("blocked"))
      .mockRejectedValueOnce("not an error")
      .mockImplementationOnce(({ hotel }) =>
        Promise.resolve(response(hotel, [price(hotel, "2026-07-01", 1000)]))
      );

    const result = await scrapeHotels(
      ["cocooning", "maritima", "nope", "reinadelmar"],
      searchParams
    );

    expect(result.errors).toEqual([
      { error: "blocked", hotel: "cocooning" },
      { error: "Unknown error", hotel: "maritima" },
      { error: "Hotel not found: nope", hotel: "nope" },
    ]);
    expect(result.results.map((p) => p.hotelId)).toEqual(["reinadelmar"]);
  });

  it("gives up on a hotel after 15 seconds on Vercel", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VERCEL", "1");
    fetchPrices.mockReturnValue(new Promise(() => undefined));

    const pending = scrapeHotels(["cocooning"], searchParams);
    await vi.advanceTimersByTimeAsync(14_999);
    let settled = false;
    pending.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect((await pending).errors).toEqual([
      { error: "Hotel processing timeout", hotel: "cocooning" },
    ]);
  });

  it("allows 30 seconds per hotel elsewhere", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VERCEL", "");
    fetchPrices.mockReturnValue(new Promise(() => undefined));

    const pending = scrapeHotels(["cocooning"], searchParams);
    let settled = false;
    pending.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(29_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect((await pending).errors).toHaveLength(1);
  });
});

describe("scrapeHotelsMultiMonth", () => {
  it("adds later months without replacing prices already found", async () => {
    fetchPrices.mockImplementation(({ hotel, searchParams: params }) => {
      if (params.checkin === "2026-07-01") {
        return Promise.resolve(
          response(
            hotel,
            [
              price(hotel, "2026-07-01", 1400),
              price(hotel, "2026-07-01", 1300),
              price(hotel, "2026-07-01", 1350),
            ],
            [{ code: "DBL", name: "Double" }]
          )
        );
      }
      return Promise.resolve(
        response(hotel, [
          price(hotel, "2026-07-01", 100),
          price(hotel, params.checkin, 2000),
        ])
      );
    });

    const result = await scrapeHotelsMultiMonth(["cocooning"], searchParams, 3);

    const checkins = fetchPrices.mock.calls.map(([params]) => [
      params.searchParams.checkin,
      params.searchParams.checkout,
    ]);
    expect(checkins).toEqual([
      ["2026-07-01", "2026-07-08"],
      ["2026-07-31", "2026-08-07"],
      ["2026-08-30", "2026-09-06"],
    ]);
    expect(result.results.map((p) => [p.date, p.stayTotal])).toEqual([
      ["2026-07-01", 1300],
      ["2026-07-31", 2000],
      ["2026-08-30", 2000],
    ]);
    expect(result.roomOptions).toEqual([{ code: "DBL", name: "Double" }]);
    expect(result.errors).toEqual([]);
  });

  it("steps 25 days and pauses between months on long searches", async () => {
    vi.useFakeTimers();
    fetchPrices.mockImplementation(({ hotel }) =>
      Promise.resolve(response(hotel, []))
    );

    const pending = scrapeHotelsMultiMonth(["maritima"], searchParams, 7);
    await vi.advanceTimersByTimeAsync(599);
    expect(fetchPrices).toHaveBeenCalledTimes(7);
    let settled = false;
    pending.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;

    expect(fetchPrices.mock.calls[1][0].searchParams.checkin).toBe(
      "2026-07-26"
    );
  });

  it("records a failed first month and skips failed later months", async () => {
    fetchPrices
      .mockRejectedValueOnce(new Error("first month down"))
      .mockRejectedValueOnce(new Error("second month down"))
      .mockImplementationOnce(({ hotel, searchParams: params }) =>
        Promise.resolve(response(hotel, [price(hotel, params.checkin, 1800)]))
      );

    const result = await scrapeHotelsMultiMonth(["cocooning"], searchParams, 3);

    expect(result.errors).toEqual([
      { error: "first month down", hotel: "cocooning" },
    ]);
    expect(result.results.map((p) => p.date)).toEqual(["2026-08-30"]);
  });

  it("drops a hotel that runs past its time budget", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VERCEL", "1");
    fetchPrices.mockReturnValue(new Promise(() => undefined));

    const pending = scrapeHotelsMultiMonth(["cocooning"], searchParams, 2);
    await vi.advanceTimersByTimeAsync(15_000);

    expect(await pending).toEqual({
      errors: [{ error: "Hotel processing timeout", hotel: "cocooning" }],
      results: [],
      roomOptions: [],
    });
  });
});
