import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAllHotels } from "@/domains/hotels/registry";
import { scrapeHotels } from "@/domains/scraping/engine";
import type { PriceResult } from "@/domains/scraping/types";
import { sendEmail } from "@/domains/tracking/notify";
import {
  addWatchlistEntry,
  deactivateExpired,
  getActiveWatchlistForHotels,
  getAllWatchlist,
  getCronState,
  getLatestSnapshot,
  getPriceStats,
  insertAlertEvent,
  insertSnapshot,
  markAlerted,
  setCronState,
} from "@/domains/tracking/queries";
import type { WatchlistEntry } from "@/domains/tracking/types";
import { GET } from "../scrape/route";

vi.mock("@/domains/scraping/engine");
vi.mock("@/domains/tracking/queries");
vi.mock("@/domains/tracking/notify");

const SECRET = "cron-secret";
const AUTH = `Bearer ${SECRET}`;
const hotelSlugs = getAllHotels().map((h) => h.slug);

function entry(overrides: Partial<WatchlistEntry> = {}): WatchlistEntry {
  return {
    active: true,
    adults: 2,
    alertedAt: null,
    alertPctDrop: null,
    checkinDate: "2026-07-04",
    children: 0,
    createdAt: "2026-06-01T10:00:00Z",
    hotelSlug: "cocooning",
    id: 7,
    nights: 7,
    roomType: null,
    source: "auto",
    targetPrice: null,
    ...overrides,
  };
}

function price(date: string, stayTotal: number): PriceResult {
  return {
    averagePerNight: stayTotal / 7,
    currency: "EUR",
    date,
    dayOfWeek: "Saturday",
    hotelId: "cocooning",
    hotelName: "Cocooning Suites",
    isLowestRate: false,
    nights: 7,
    stayTotal,
  };
}

function call(authorization?: string) {
  return GET(
    new NextRequest("http://localhost/api/cron/scrape", {
      headers: authorization ? { authorization } : {},
    })
  );
}

/** Track one entry whose scrape returns `current` after a stored `previous`. */
function track(
  tracked: WatchlistEntry,
  current: number | null,
  previous: number | null,
  stats = { avg: 1500, count: 1, min: 1400 }
) {
  vi.mocked(getActiveWatchlistForHotels).mockResolvedValue([tracked]);
  vi.mocked(scrapeHotels).mockResolvedValue({
    errors: [],
    results: current === null ? [] : [price(tracked.checkinDate, current)],
    roomOptions: [],
  });
  vi.mocked(getLatestSnapshot).mockResolvedValue(
    previous === null ? null : { available: true, price: previous }
  );
  vi.mocked(getPriceStats).mockResolvedValue(stats);
}

async function run() {
  const response = await call(AUTH);
  expect(response.status).toBe(200);
  return response.json();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-06-01T08:00:00Z"));
  vi.mocked(deactivateExpired).mockResolvedValue(0);
  vi.mocked(getAllWatchlist).mockResolvedValue([]);
  vi.mocked(getActiveWatchlistForHotels).mockResolvedValue([]);
  vi.mocked(getCronState).mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("GET /api/cron/scrape authorization", () => {
  it("refuses everyone when no secret is configured", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await call("Bearer ");

    expect(response.status).toBe(401);
    expect(deactivateExpired).not.toHaveBeenCalled();
  });

  it("refuses a missing or wrong bearer token", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer nope")).status).toBe(401);
  });
});

describe("GET /api/cron/scrape bookkeeping", () => {
  it("expires past stays and fills the rolling window", async () => {
    vi.mocked(deactivateExpired).mockResolvedValueOnce(3);
    vi.mocked(addWatchlistEntry)
      .mockRejectedValueOnce(new Error("duplicate key"))
      .mockRejectedValueOnce("not an error");

    const summary = await run();

    expect(deactivateExpired).toHaveBeenCalledWith("2026-06-01");
    const upserts = vi.mocked(addWatchlistEntry).mock.calls;
    // Saturdays 14-90 days ahead of 2026-06-01, for every visible hotel.
    expect(upserts).toHaveLength(hotelSlugs.length * 11);
    expect(upserts[0][0]).toEqual({
      adults: 2,
      checkinDate: "2026-06-20",
      children: 0,
      hotelSlug: hotelSlugs[0],
      nights: 7,
      source: "auto",
    });
    expect(summary.deactivated).toBe(3);
    expect(summary.upserted).toBe(upserts.length - 2);
    expect(summary.errors).toEqual([
      { error: "duplicate key", watchlistId: null },
      { error: "Unknown error", watchlistId: null },
    ]);
  });

  it("scrapes the next six hotels round-robin and saves the cursor", async () => {
    vi.mocked(getCronState).mockResolvedValueOnce({
      hotelOffset: hotelSlugs.length - 2,
    });

    const summary = await run();

    const expected = [...hotelSlugs.slice(-2), ...hotelSlugs.slice(0, 4)];
    expect(summary.hotels).toEqual(expected);
    expect(summary.cursor).toBe(4);
    expect(setCronState).toHaveBeenCalledWith("scrape_cursor", {
      hotelOffset: 4,
    });
    expect(getActiveWatchlistForHotels).toHaveBeenCalledWith(expected);
  });

  it("starts at the first hotel without a saved cursor", async () => {
    const summary = await run();

    expect(summary.hotels).toEqual(hotelSlugs.slice(0, 6));
  });
});

describe("GET /api/cron/scrape batching", () => {
  it("scrapes a calendar hotel once from its earliest tracked date", async () => {
    vi.mocked(getActiveWatchlistForHotels).mockResolvedValue([
      entry({ checkinDate: "2026-07-18", id: 1 }),
      entry({ checkinDate: "2026-07-04", id: 2 }),
    ]);
    vi.mocked(scrapeHotels).mockResolvedValue({
      errors: [],
      results: [price("2026-07-04", 1200), price("2026-07-18", 1300)],
      roomOptions: [],
    });
    vi.mocked(getPriceStats).mockResolvedValue({
      avg: null,
      count: 0,
      min: null,
    });

    const summary = await run();

    expect(scrapeHotels).toHaveBeenCalledTimes(1);
    expect(scrapeHotels).toHaveBeenCalledWith(["cocooning"], {
      adults: 2,
      checkin: "2026-07-04",
      checkout: "2026-07-11",
      children: 0,
      currency: "EUR",
      infants: 0,
      nights: 7,
    });
    expect(vi.mocked(insertSnapshot).mock.calls).toEqual([
      [1, { available: true, currency: "EUR", price: 1300 }],
      [2, { available: true, currency: "EUR", price: 1200 }],
    ]);
    expect(summary).toMatchObject({ changed: 2, checked: 2 });
  });

  it("scrapes other hotels per date, nearest four dates per run", async () => {
    const dates = [
      "2026-08-08",
      "2026-07-04",
      "2026-07-25",
      "2026-08-01",
      "2026-07-11",
      "2026-07-18",
    ];
    vi.mocked(getActiveWatchlistForHotels).mockResolvedValue(
      dates.map((checkinDate, i) =>
        entry({ checkinDate, hotelSlug: "maritima-villas", id: i + 1 })
      )
    );
    vi.mocked(scrapeHotels).mockResolvedValue({
      errors: [],
      results: [],
      roomOptions: [],
    });

    const summary = await run();

    const checkins = vi
      .mocked(scrapeHotels)
      .mock.calls.map(([ids, params]) => [ids[0], params.checkin]);
    expect(checkins.sort()).toEqual([
      ["maritima", "2026-07-04"],
      ["maritima", "2026-07-11"],
      ["maritima", "2026-07-18"],
      ["maritima", "2026-07-25"],
    ]);
    expect(summary.checked).toBe(4);
  });
});

describe("GET /api/cron/scrape snapshots", () => {
  it("stores nothing when the price has not changed", async () => {
    track(entry(), 1500, 1500);

    const summary = await run();

    expect(insertSnapshot).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ changed: 0, checked: 1 });
  });

  it("records a sold-out stay without alerting", async () => {
    track(entry({ targetPrice: 2000 }), null, 1500);

    const summary = await run();

    expect(insertSnapshot).toHaveBeenCalledWith(7, {
      available: false,
      currency: "EUR",
      price: null,
    });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(insertAlertEvent).not.toHaveBeenCalled();
    expect(summary.changed).toBe(1);
  });

  it("compares against no previous price after a sold-out snapshot", async () => {
    track(entry(), 900, null, { avg: 1500, count: 5, min: 1400 });
    vi.mocked(getLatestSnapshot).mockResolvedValue({
      available: false,
      price: null,
    });

    await run();

    // Only the new-low signal can fire without a previous price.
    expect(insertAlertEvent).toHaveBeenCalledWith(
      expect.objectContaining({ previousPrice: null, price: 900 })
    );
  });

  it("reports an entry whose update fails and carries on", async () => {
    track(entry(), 1500, null);
    vi.mocked(getLatestSnapshot)
      .mockRejectedValueOnce(new Error("connection reset"))
      .mockRejectedValueOnce("odd failure");
    vi.mocked(getActiveWatchlistForHotels).mockResolvedValue([
      entry({ id: 1 }),
      entry({ id: 2, nights: 5 }),
    ]);

    const summary = await run();

    expect(summary.errors).toEqual([
      { error: "connection reset", watchlistId: 1 },
      { error: "Unknown error", watchlistId: 2 },
    ]);
  });
});

describe("GET /api/cron/scrape custom alerts", () => {
  const custom = entry({ targetPrice: 1450 });

  it("emails and marks the entry when the target is crossed", async () => {
    track(custom, 1400, 1500);
    vi.mocked(sendEmail).mockResolvedValue("sent");

    const summary = await run();

    const [email] = vi.mocked(sendEmail).mock.calls[0];
    expect(email.subject).toBe(
      "Deal alert: Cocooning Suites → EUR 1,400 for 2026-07-04"
    );
    expect(email.text).toContain("at or below your target 1,450");
    expect(markAlerted).toHaveBeenCalledWith(7);
    expect(insertAlertEvent).not.toHaveBeenCalled();
    expect(summary.alerted).toBe(1);
  });

  it("does not email when no threshold is crossed", async () => {
    track(custom, 1480, 1500);

    const summary = await run();

    expect(sendEmail).not.toHaveBeenCalled();
    expect(summary.alerted).toBe(0);
  });

  it("reports a failed email without marking the entry", async () => {
    track(custom, 1400, 1500);
    vi.mocked(sendEmail).mockResolvedValue("failed");

    const summary = await run();

    expect(markAlerted).not.toHaveBeenCalled();
    expect(summary.errors).toEqual([
      {
        error: "Deal alert fired but the email failed to send",
        watchlistId: 7,
      },
    ]);
  });

  it("neither marks nor reports when email is not configured", async () => {
    track(custom, 1400, 1500);
    vi.mocked(sendEmail).mockResolvedValue("skipped");

    const summary = await run();

    expect(markAlerted).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ alerted: 0, errors: [] });
  });
});

describe("GET /api/cron/scrape auto alerts", () => {
  it("queues a digest event for a 10% drop without emailing", async () => {
    track(entry(), 1350, 1500, { avg: 1500, count: 2, min: 1400 });

    const summary = await run();

    expect(insertAlertEvent).toHaveBeenCalledWith({
      minPrice: 1400,
      previousPrice: 1500,
      price: 1350,
      reasons: ["Price dropped 10.0% (from 1,500 to 1,350)"],
      watchlistId: 7,
    });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(summary.eventsQueued).toBe(1);
  });

  it("does nothing for a small move", async () => {
    track(entry(), 1450, 1500);

    const summary = await run();

    expect(insertAlertEvent).not.toHaveBeenCalled();
    expect(summary.eventsQueued).toBe(0);
  });

  it("also emails at once for a drop of 25% or more", async () => {
    track(entry(), 1000, 1500);
    vi.mocked(sendEmail).mockResolvedValue("sent");

    const summary = await run();

    expect(insertAlertEvent).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(markAlerted).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ alerted: 1, eventsQueued: 1 });
  });

  it("reports a failed instant email", async () => {
    track(entry(), 1000, 1500);
    vi.mocked(sendEmail).mockResolvedValue("failed");

    const summary = await run();

    expect(summary.errors).toEqual([
      {
        error: "Instant alert fired but the email failed to send",
        watchlistId: 7,
      },
    ]);
    expect(summary.eventsQueued).toBe(1);
  });

  it("counts nothing when the instant email is skipped", async () => {
    track(entry(), 1000, 1500);
    vi.mocked(sendEmail).mockResolvedValue("skipped");

    const summary = await run();

    expect(summary).toMatchObject({ alerted: 0, errors: [], eventsQueued: 1 });
  });
});
