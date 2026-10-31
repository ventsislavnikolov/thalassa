import { describe, expect, it } from "vitest";
import { buildDigest, buildRichAlertEmail, type DigestItem } from "../digest";
import type { WatchlistEntry } from "../types";

function entry(overrides: Partial<WatchlistEntry>): WatchlistEntry {
  return {
    active: true,
    adults: 2,
    alertedAt: null,
    alertPctDrop: null,
    checkinDate: "2026-10-03",
    children: 0,
    createdAt: "2026-08-29T00:00:00Z",
    hotelSlug: "stella-island",
    id: 1,
    nights: 7,
    roomType: null,
    source: "auto",
    targetPrice: null,
    ...overrides,
  };
}

function item(overrides: Partial<DigestItem>): DigestItem {
  return {
    avgPrice: 1100,
    bookingUrl: "https://stellaisland.reserve-online.net/?checkin=2026-10-03",
    entry: entry({}),
    hotelName: "Stella Island",
    minPrice: 850,
    previousPrice: 1000,
    price: 900,
    reasons: ["Price dropped 10.0%"],
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

  it("describes a one-night stay with children in singular and plural", () => {
    const content = buildDigest(
      [item({ entry: entry({ adults: 1, children: 2, nights: 1 }) })],
      "2026-08-29"
    );
    expect(content?.text).toContain("2026-10-03, 1 night, 1 adult, 2 children");
    expect(content?.html).toContain("1 night, 1 adult, 2 children");
  });

  it("puts items without a previous price after those with a drop", () => {
    const content = buildDigest(
      [
        item({ hotelName: "New Listing", previousPrice: null }),
        item({ hotelName: "Dropped", previousPrice: 1200 }),
      ],
      "2026-08-29"
    );
    const text = content?.text ?? "";
    expect(text.indexOf("Dropped")).toBeLessThan(text.indexOf("New Listing"));
    expect(text).toContain("was –, low");
  });

  it("leaves out the reasons list when there are none", () => {
    const content = buildDigest([item({ reasons: [] })], "2026-08-29");
    expect(content?.html).not.toContain("<ul");
    expect(content?.text).not.toContain("•");
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
      item({ avgPrice: null, minPrice: null, previousPrice: null })
    );
    expect(content.text).toContain("was –");
  });
});
