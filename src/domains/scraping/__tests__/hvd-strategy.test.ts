import { describe, expect, it } from "vitest";
import type { HotelConfig } from "@/domains/hotels/types";
import { parseHvdHtml } from "../strategies/hvd";
import type { SearchParams } from "../types";

const hotel: HotelConfig = {
  baseUrl: "https://reservations.hvdhotels.com/hvd-reina-del-mar",
  displayName: "HVD Reina Del Mar",
  id: "reinadelmar",
  image: "/images/hotels/reina-del-mar.webp",
  locationSlug: "obzor",
  name: "HVD Reina Del Mar",
  slug: "reina-del-mar",
  strategyType: "hvd",
};

const params: SearchParams = {
  adults: 2,
  checkin: "2026-09-06",
  checkout: "2026-09-12",
  children: 0,
  nights: 6,
};

function card(id: number, title: string, priceHtml: string): string {
  return `
    <div ref="roomCardItem${id}" class="block block__item block__item-available">
      <div class="block__desc-content">
        <div class="title">${title}</div>
        <div class="price__holder">
          <span class="price__lbl"></span>
          ${priceHtml}
          <span class="price__lbl"></span>
        </div>
      </div>
    </div>`;
}

describe("parseHvdHtml", () => {
  it("extracts one stay total per room card", () => {
    const html =
      card(
        4286,
        "Standard double room with park view",
        '<div class="price">€1821.<span class="format-cents">60</span></div>'
      ) +
      card(
        4287,
        "Standard double room with partial sea view",
        '<div class="price">€1966.<span class="format-cents">00</span></div>'
      );

    const { prices, roomOptions } = parseHvdHtml(html, params, hotel);

    expect(prices).toHaveLength(2);
    expect(prices[0]).toMatchObject({
      currency: "EUR",
      date: "2026-09-06",
      dayOfWeek: "Sunday",
      hotelId: "reinadelmar",
      nights: 6,
      roomCode: "4286",
      roomType: "Standard double room with park view",
      stayTotal: 1821.6,
    });
    expect(prices[0].averagePerNight).toBeCloseTo(303.6);
    expect(roomOptions).toEqual([
      { code: "4286", name: "Standard double room with park view" },
      { code: "4287", name: "Standard double room with partial sea view" },
    ]);
  });

  it("uses the discounted price, not the struck-through one", () => {
    const html = card(
      4288,
      "Panoramic sea view",
      `<div class="old-price-and-discount">
         <span class="price discount">€1216.<span class="format-cents">00</span></span>
         <span class="percent">-35%</span>
       </div>
       <div class="price">€790.<span class="format-cents">40</span></div>`
    );

    const { prices } = parseHvdHtml(html, params, hotel);

    expect(prices).toHaveLength(1);
    expect(prices[0].stayTotal).toBe(790.4);
  });

  it("skips room cards without a price and returns empty for no cards", () => {
    const html = card(4292, "Villa River", "");

    expect(parseHvdHtml(html, params, hotel).prices).toEqual([]);
    expect(parseHvdHtml("<main></main>", params, hotel)).toEqual({
      hotelId: "reinadelmar",
      hotelName: "HVD Reina Del Mar",
      prices: [],
      roomOptions: [],
    });
  });
});
