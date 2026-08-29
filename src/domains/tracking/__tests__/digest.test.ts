import { describe, expect, it } from "vitest";
import { buildDigest, buildRichAlertEmail, type DigestItem } from "../digest";
import type { WatchlistEntry } from "../types";

function entry(overrides: Partial<WatchlistEntry>): WatchlistEntry {
  return {
    id: 1,
    hotelSlug: "stella-island",
    checkinDate: "2026-10-03",
    nights: 7,
    adults: 2,
    children: 0,
    roomType: null,
    active: true,
    createdAt: "2026-08-29T00:00:00Z",
    targetPrice: null,
    alertPctDrop: null,
    alertedAt: null,
    source: "auto",
    ...overrides,
  };
}

function item(overrides: Partial<DigestItem>): DigestItem {
  return {
    entry: entry({}),
    hotelName: "Stella Island",
    price: 900,
    previousPrice: 1000,
    minPrice: 850,
    avgPrice: 1100,
    reasons: ["Price dropped 10.0%"],
    bookingUrl: "https://stellaisland.reserve-online.net/?checkin=2026-10-03",
    ...overrides,
  };
}

describe("buildDigest", () => {
  it("returns null for an empty list", () => {
    expect(buildDigest([], "2026-08-29")).toBeNull();
  });

  it("includes count and date in the subject", () => {
    const content = buildDigest([item({}), item({})], "2026-08-29");
    expect(content?.subject).toBe("Price digest 2026-08-29: 2 deals spotted");
  });

  it("uses singular wording for one deal", () => {
    const content = buildDigest([item({})], "2026-08-29");
    expect(content?.subject).toContain("1 deal spotted");
  });

  it("renders price context and booking link in both bodies", () => {
    const content = buildDigest([item({})], "2026-08-29");
    for (const body of [content?.text, content?.html]) {
      expect(body).toContain("Stella Island");
      expect(body).toContain("900");
      expect(body).toContain("850");
      expect(body).toContain("1,100");
      expect(body).toContain("reserve-online.net");
    }
  });

  it("sorts items by biggest drop first", () => {
    const content = buildDigest(
      [
        item({ hotelName: "Small Drop", price: 950 }),
        item({ hotelName: "Big Drop", price: 600 }),
      ],
      "2026-08-29"
    );
    const text = content?.text ?? "";
    expect(text.indexOf("Big Drop")).toBeLessThan(text.indexOf("Small Drop"));
  });

  it("escapes HTML in hotel names", () => {
    const content = buildDigest(
      [item({ hotelName: "Hotel <Fancy> & Spa" })],
      "2026-08-29"
    );
    expect(content?.html).toContain("Hotel &lt;Fancy&gt; &amp; Spa");
    expect(content?.html).not.toContain("<Fancy>");
  });
});

describe("buildRichAlertEmail", () => {
  it("builds a single-deal subject with price and date", () => {
    const content = buildRichAlertEmail(item({}));
    expect(content.subject).toBe(
      "Deal alert: Stella Island → EUR 900 for 2026-10-03"
    );
    expect(content.html).toContain("Book now");
    expect(content.text).toContain("Book:");
  });

  it("shows a dash for missing history values", () => {
    const content = buildRichAlertEmail(
      item({ previousPrice: null, minPrice: null, avgPrice: null })
    );
    expect(content.text).toContain("was –");
  });
});
