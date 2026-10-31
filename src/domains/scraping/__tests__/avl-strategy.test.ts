import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HotelConfig } from "@/domains/hotels/types";
import { AvlStrategy } from "../strategies/avl";
import { ScrapingError, type SearchParams } from "../types";

vi.mock("axios", () => ({ default: { post: vi.fn() } }));

const post = vi.mocked(axios.post);

const hotel: HotelConfig = {
  baseUrl: "https://example.reserve-online.net",
  displayName: "Example Resort",
  id: "example",
  image: "/images/hotels/example.jpg",
  locationSlug: "pefkochori",
  name: "Example Resort",
  slug: "example-resort",
  strategyType: "avl",
};

const searchParams: SearchParams = {
  adults: 2,
  checkin: "2026-07-04",
  checkout: "2026-07-11",
  nights: 7,
};

const strategy = new AvlStrategy();

// Responses under 300 characters are treated as "no availability".
const PADDING = `<!-- ${"x".repeat(300)} -->`;

function respond(data: unknown) {
  post.mockResolvedValueOnce({ data });
}

function fetchPrices(params: SearchParams = searchParams) {
  return strategy.fetchPrices({ hotel, searchParams: params });
}

beforeEach(() => {
  post.mockReset();
});

describe("AvlStrategy", () => {
  it("posts the booking form for the whole stay", async () => {
    respond("");

    await fetchPrices({ ...searchParams, children: 1, currency: "BGN" });

    const [url, body] = post.mock.calls[0];
    expect(url).toBe("https://example.reserve-online.net/avl");
    const form = body as URLSearchParams;
    expect(form.get("checkin")).toBe("2026-07-04");
    expect(form.get("checkout")).toBe("2026-07-11");
    expect(form.get("fromd")).toBe("04/07/2026");
    expect(form.get("tod")).toBe("11/07/2026");
    expect(form.get("adults")).toBe("2");
    expect(form.get("children")).toBe("1");
    expect(form.get("cur_iso")).toBe("BGN");
  });

  it("defaults to EUR and no children", async () => {
    respond("");

    await fetchPrices();

    const form = post.mock.calls[0][1] as URLSearchParams;
    expect(form.get("children")).toBe("0");
    expect(form.get("cur_iso")).toBe("EUR");
  });

  it("returns nothing for a short no-availability response", async () => {
    respond("<p>No rooms</p>");

    const result = await fetchPrices();

    expect(result).toEqual({
      hotelId: "example",
      hotelName: "Example Resort",
      prices: [],
      roomOptions: [],
    });
  });

  it("reads stay totals from available rows with data-price", async () => {
    respond(`${PADDING}
      <table>
        <tbody>
          <tr class="room"><td class="name"> Deluxe Suite </td></tr>
          <tr data-price="1400.50" data-status="AVL" data-room="DLX"></tr>
        </tbody>
        <tbody>
          <tr data-price="2100" data-status="AVL"></tr>
        </tbody>
        <tbody>
          <tr data-price="900" data-status="REQ" data-room="ONREQUEST"></tr>
          <tr data-price="120" data-status="AVL" data-room="TOO_CHEAP"></tr>
          <tr data-price="90000" data-status="AVL" data-room="TOO_DEAR"></tr>
          <tr data-price="n/a" data-status="AVL" data-room="NOT_A_NUMBER"></tr>
          <tr data-price="" data-status="AVL" data-room="EMPTY"></tr>
        </tbody>
      </table>`);

    const result = await fetchPrices();

    expect(result.prices).toEqual([
      {
        averagePerNight: 200.071_428_571_428_58,
        currency: "EUR",
        date: "2026-07-04",
        dayOfWeek: "Saturday",
        hotelId: "example",
        hotelName: "Example Resort",
        isLowestRate: false,
        nights: 7,
        roomCode: "DLX",
        roomType: "Deluxe Suite",
        stayTotal: 1400.5,
      },
      expect.objectContaining({
        roomCode: "room-2",
        roomType: "Room 2",
        stayTotal: 2100,
      }),
    ]);
    expect(result.roomOptions).toEqual([
      { code: "DLX", name: "Deluxe Suite" },
      { code: "room-2", name: "Room 2" },
    ]);
  });

  it("unwraps a JSON response before parsing it", async () => {
    respond({
      demand: 1,
      html: `${PADDING}<table><tbody><tr data-price="1500" data-status="AVL" data-room="A"></tr></tbody></table>`,
    });

    const result = await fetchPrices();

    expect(result.prices.map((p) => p.stayTotal)).toEqual([1500]);
  });

  it("falls back to prices printed in the page", async () => {
    respond(`${PADDING}
      <div class="val">1 234,56 €</div>
      <div class="val">1,85 €</div>
      <div class="val">0,10 €</div>`);

    const result = await fetchPrices();

    // "1,85" is read in thousands; "0,10" is implausible either way.
    expect(result.prices.map((p) => p.stayTotal)).toEqual([1234.56, 1850]);
    expect(result.roomOptions).toEqual([
      { code: "room-1", name: "Room 1" },
      { code: "room-2", name: "Room 2" },
    ]);
  });

  it("tries the next printed-price pattern when one finds nothing plausible", async () => {
    respond(`${PADDING}
      <div class="val">no price</div>
      <span>Total 2 450,00 лв</span>`);

    const result = await fetchPrices();

    expect(result.prices.map((p) => p.stayTotal)).toEqual([2450]);
  });

  it("uses bare numbers as a last resort, at most ten", async () => {
    const numbers = Array.from({ length: 12 }, (_, i) => 1000 + i).join(" ");
    respond(`${PADDING}<p>${numbers}</p>`);

    const result = await fetchPrices();

    expect(result.prices).toHaveLength(10);
    expect(result.prices[0].stayTotal).toBe(1000);
  });

  it("returns no prices when the page has no plausible amount", async () => {
    respond(`${PADDING}<p>Fully booked</p>`);

    const result = await fetchPrices();

    expect(result.prices).toEqual([]);
  });

  it("wraps request failures in a ScrapingError", async () => {
    const cause = new Error("socket hang up");
    post.mockRejectedValueOnce(cause);

    const error = await fetchPrices().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ScrapingError);
    expect(error).toMatchObject({
      cause,
      hotelId: "example",
      message: "Failed to fetch AVL data for Example Resort",
      name: "ScrapingError",
    });
  });
});
