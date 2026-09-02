import { describe, expect, it } from "vitest";
import { buildBookingUrl, buildHvdSearchUrl } from "../booking-url";
import { getHotel } from "../registry";

const stay = { adults: 2, checkin: "2026-09-06", checkout: "2026-09-12" };

describe("buildBookingUrl", () => {
  it("builds a reserve-online query for calendar/avl hotels", () => {
    expect(buildBookingUrl(getHotel("ekies"), stay)).toBe(
      "https://ekies.reserve-online.net/?checkin=2026-09-06&checkout=2026-09-12&adults=2"
    );
  });

  it("builds an HVD search page URL for hvd hotels", () => {
    const url = new URL(buildBookingUrl(getHotel("reinadelmar"), stay));
    expect(url.origin + url.pathname).toBe(
      "https://reservations.hvdhotels.com/hvd-reina-del-mar/search/"
    );
    expect(url.searchParams.get("dates")).toBe("2026-09-06~2026-09-12");
    expect(url.searchParams.get("currency")).toBe("EUR");
    expect(JSON.parse(url.searchParams.get("guests") ?? "")).toEqual([
      { adults: 2, children: 0, children_ages: [] },
    ]);
  });
});

describe("buildHvdSearchUrl", () => {
  it("fills a default age for every child", () => {
    const url = new URL(
      buildHvdSearchUrl(getHotel("reinadelmar"), { ...stay, children: 2 })
    );
    expect(JSON.parse(url.searchParams.get("guests") ?? "")).toEqual([
      { adults: 2, children: 2, children_ages: [8, 8] },
    ]);
  });
});
