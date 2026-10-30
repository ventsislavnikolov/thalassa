import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HotelConfig } from "@/domains/hotels/types";
import { CalendarStrategy } from "../strategies/calendar";
import { ScrapingError, type SearchParams } from "../types";

vi.mock("axios", () => ({ default: { post: vi.fn() } }));

const post = vi.mocked(axios.post);

const hotel: HotelConfig = {
  baseUrl: "https://example.reserve-online.net",
  displayName: "Example Suites",
  id: "example",
  image: "/images/hotels/example.jpg",
  locationSlug: "pefkochori",
  name: "Example Suites",
  slug: "example-suites",
  strategyType: "calendar",
};

const searchParams: SearchParams = {
  adults: 2,
  checkin: "2026-07-04",
  checkout: "2026-07-09",
  nights: 5,
};

const strategy = new CalendarStrategy();

function calendar(cells: string, extra = ""): string {
  return `${extra}<div class="calendar">${cells}</div>`;
}

function respond(html: string) {
  post.mockResolvedValueOnce({ data: html });
}

function fetchPrices(params: SearchParams = searchParams) {
  return strategy.fetchPrices({ hotel, searchParams: params });
}

beforeEach(() => {
  post.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CalendarStrategy", () => {
  it("posts the calendar form for the stay", async () => {
    respond(calendar(""));

    await fetchPrices({
      ...searchParams,
      children: 1,
      currency: "BGN",
      infants: 1,
      room: "DBL",
    });

    const [url, body] = post.mock.calls[0];
    expect(url).toBe("https://example.reserve-online.net/calendar");
    const form = body as URLSearchParams;
    expect(Object.fromEntries(form)).toMatchObject({
      adults: "2",
      checkin: "2026-07-04",
      checkout: "2026-07-09",
      children: "1",
      cur_iso: "BGN",
      fromd: "04/07/2026",
      infants: "1",
      nights: "5",
      room: "DBL",
    });
  });

  it("defaults the optional form fields", async () => {
    respond(calendar(""));

    await fetchPrices();

    const form = post.mock.calls[0][1] as URLSearchParams;
    expect(Object.fromEntries(form)).toMatchObject({
      children: "0",
      cur_iso: "EUR",
      infants: "0",
      room: "",
    });
  });

  it("reads stay totals, per-night titles and plain amounts per day", async () => {
    respond(
      calendar(`
        <div class="avl" data-date="2026-07-04">Stay total: EUR 1,250.00 <i class="fa-star"></i></div>
        <div class="avl" data-date="2026-07-05" data-title="€ 200.00 per night">Sat</div>
        <div class="avl" data-date="2026-07-06">from 900,50 лв</div>
        <div class="avl" data-date="2026-07-07">Sold out</div>
        <div class="avl">Stay total: EUR 999.00</div>`)
    );

    const result = await fetchPrices();

    expect(result.prices).toEqual([
      {
        averagePerNight: 250,
        currency: "EUR",
        date: "2026-07-04",
        dayOfWeek: "Saturday",
        hotelId: "example",
        hotelName: "Example Suites",
        isLowestRate: true,
        nights: 5,
        stayTotal: 1250,
      },
      expect.objectContaining({
        averagePerNight: 200,
        date: "2026-07-05",
        dayOfWeek: "Sunday",
        isLowestRate: false,
        stayTotal: 1000,
      }),
      expect.objectContaining({
        averagePerNight: 180.1,
        date: "2026-07-06",
        stayTotal: 900.5,
      }),
    ]);
    expect(result.roomOptions).toEqual([]);
  });

  it.each([
    ["Stay total: € 2 347,00", 2347],
    ["Общ престой: 1 980,40 лв", 1980.4],
    ["Stay total: EUR 2,347", 2347],
    ["Stay total: EUR 1500", 1500],
  ])("parses the stay total in %s", async (text, expected) => {
    respond(calendar(`<div class="avl" data-date="2026-07-04">${text}</div>`));

    const result = await fetchPrices();

    expect(result.prices[0].stayTotal).toBe(expected);
  });

  it("fetches each room in turn and tags its prices", async () => {
    vi.useFakeTimers();
    const rooms = `
      <select name="room">
        <option value="DBL">Double</option>
        <option value="STE">Suite</option>
        <option value="VIL">Villa</option>
      </select>`;
    respond(calendar("", rooms));
    respond(
      calendar(
        '<div class="avl" data-date="2026-07-04">Stay total: EUR 1,000.00</div>'
      )
    );
    post.mockRejectedValueOnce(new Error("suite page failed"));
    respond(
      calendar(
        '<div class="avl" data-date="2026-07-04">Stay total: EUR 3,000.00</div>'
      )
    );

    const pending = fetchPrices();
    await vi.runAllTimersAsync();
    const result = await pending;

    const roomsRequested = post.mock.calls.map(
      ([, body]) => (body as URLSearchParams).get("room") ?? ""
    );
    expect(roomsRequested).toEqual(["", "DBL", "STE", "VIL"]);
    expect(
      result.prices.map((p) => [p.roomCode, p.roomType, p.stayTotal])
    ).toEqual([
      ["DBL", "Double", 1000],
      ["VIL", "Villa", 3000],
    ]);
    expect(result.roomOptions).toHaveLength(3);
  });

  it("wraps request failures in a ScrapingError", async () => {
    const cause = new Error("ECONNRESET");
    post.mockRejectedValueOnce(cause);

    const error = await fetchPrices().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ScrapingError);
    expect(error).toMatchObject({
      cause,
      hotelId: "example",
      message: "Failed to fetch calendar data for Example Suites",
    });
  });
});
