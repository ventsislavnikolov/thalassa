import { describe, expect, it } from "vitest";
import {
  DEFAULT_WINDOW,
  generateWindowDates,
  planWatchlistSync,
} from "../rolling-window";
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

describe("generateWindowDates", () => {
  // 2026-08-29 is a Saturday.
  it("returns Saturday check-ins with 7 nights inside 14-90 days", () => {
    const dates = generateWindowDates("2026-08-29", DEFAULT_WINDOW);
    expect(dates.length).toBeGreaterThan(0);
    for (const d of dates) {
      expect(new Date(d.checkinDate).getDay()).toBe(6);
      expect(d.nights).toBe(7);
    }
    expect(dates[0].checkinDate >= "2026-09-12").toBe(true);
    expect((dates.at(-1)?.checkinDate ?? "") <= "2026-11-27").toBe(true);
  });

  it("respects window boundaries inclusively", () => {
    // min boundary: today+14 = 2026-09-12 is itself a Saturday
    const dates = generateWindowDates("2026-08-29", DEFAULT_WINDOW);
    expect(dates[0].checkinDate).toBe("2026-09-12");
    // 11 Saturdays between day 14 and day 90
    expect(dates).toHaveLength(11);
  });

  it("supports multiple weekday targets", () => {
    const dates = generateWindowDates("2026-08-29", {
      ...DEFAULT_WINDOW,
      minDaysAhead: 1,
      maxDaysAhead: 7,
      checkinWeekdays: [
        { weekday: 5, nights: 2 },
        { weekday: 1, nights: 5 },
      ],
    });
    expect(dates.map((d) => d.nights).sort()).toEqual([2, 5]);
  });
});

describe("planWatchlistSync", () => {
  const slugs = ["stella-island", "avaton"];

  it("proposes auto entries for every hotel and window date", () => {
    const plan = planWatchlistSync("2026-08-29", slugs, DEFAULT_WINDOW, []);
    expect(plan.toUpsert).toHaveLength(22);
    expect(plan.toUpsert.every((e) => e.source === "auto")).toBe(true);
    expect(plan.toDeactivateIds).toEqual([]);
  });

  it("skips entries that already exist regardless of source", () => {
    const existing = [
      entry({ checkinDate: "2026-09-12", source: "manual" }),
      entry({ id: 2, checkinDate: "2026-09-19" }),
    ];
    const plan = planWatchlistSync(
      "2026-08-29",
      ["stella-island"],
      DEFAULT_WINDOW,
      existing
    );
    expect(plan.toUpsert).toHaveLength(9);
    expect(
      plan.toUpsert.some(
        (e) => e.checkinDate === "2026-09-12" || e.checkinDate === "2026-09-19"
      )
    ).toBe(false);
  });

  it("deactivates active entries with past check-in dates, any source", () => {
    const existing = [
      entry({ id: 5, checkinDate: "2026-08-15", source: "manual" }),
      entry({ id: 6, checkinDate: "2026-08-22" }),
      entry({ id: 7, checkinDate: "2026-08-01", active: false }),
    ];
    const plan = planWatchlistSync("2026-08-29", [], DEFAULT_WINDOW, existing);
    expect(plan.toDeactivateIds).toEqual([5, 6]);
  });

  it("never deactivates future manual entries", () => {
    const existing = [
      entry({ id: 9, checkinDate: "2026-12-24", source: "manual" }),
    ];
    const plan = planWatchlistSync("2026-08-29", [], DEFAULT_WINDOW, existing);
    expect(plan.toDeactivateIds).toEqual([]);
    expect(plan.toUpsert).toEqual([]);
  });
});
