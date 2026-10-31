import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addWatchlistEntry,
  deactivateExpired,
  deleteWatchlistEntry,
  getActiveWatchlist,
  getActiveWatchlistForHotels,
  getAllWatchlist,
  getCronState,
  getLatestSnapshot,
  getPriceStats,
  getSnapshots,
  getUndigestedAlertEvents,
  insertAlertEvent,
  insertSnapshot,
  markAlerted,
  markEventsDigested,
  setCronState,
  setWatchlistActive,
  updateWatchlistAlerts,
} from "../queries";

interface Query {
  text: string;
  values: unknown[];
}

const queries: Query[] = [];
const results: unknown[][] = [];

vi.mock("../db", () => ({
  getSql:
    () =>
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      queries.push({ text: strings.join("$"), values });
      return Promise.resolve(results.shift() ?? []);
    },
}));

function returns(rows: unknown[]) {
  results.push(rows);
}

const watchlistRow = {
  active: true,
  adults: "2",
  alert_pct_drop: "10",
  alerted_at: null,
  checkin_date: "2026-07-04",
  children: "1",
  created_at: "2026-06-01 10:00:00+00",
  hotel_slug: "cocooning",
  id: "7",
  nights: "7",
  room_type: "STE",
  source: "manual",
  target_price: "1500.00",
};

const watchlistEntry = {
  active: true,
  adults: 2,
  alertedAt: null,
  alertPctDrop: 10,
  checkinDate: "2026-07-04",
  children: 1,
  createdAt: "2026-06-01 10:00:00+00",
  hotelSlug: "cocooning",
  id: 7,
  nights: 7,
  roomType: "STE",
  source: "manual",
  targetPrice: 1500,
};

const snapshotRow = {
  available: true,
  currency: "EUR",
  id: "3",
  price: "1499.50",
  scraped_at: "2026-06-02 08:00:00+00",
  watchlist_id: "7",
};

beforeEach(() => {
  queries.length = 0;
  results.length = 0;
});

describe("watchlist queries", () => {
  it("maps every watchlist row to numbers and camelCase", async () => {
    returns([
      watchlistRow,
      { ...watchlistRow, alert_pct_drop: null, id: 8, target_price: null },
    ]);

    const entries = await getAllWatchlist();

    expect(entries).toEqual([
      watchlistEntry,
      { ...watchlistEntry, alertPctDrop: null, id: 8, targetPrice: null },
    ]);
    expect(queries[0].text).toContain("FROM watchlist ORDER BY created_at");
  });

  it("lists only active entries", async () => {
    returns([watchlistRow]);

    expect(await getActiveWatchlist()).toEqual([watchlistEntry]);
    expect(queries[0].text).toContain("WHERE active = TRUE");
  });

  it("upserts a new entry with defaults for optional fields", async () => {
    returns([watchlistRow]);

    const created = await addWatchlistEntry({
      adults: 2,
      checkinDate: "2026-07-04",
      children: 1,
      hotelSlug: "cocooning",
      nights: 7,
    });

    expect(created).toEqual(watchlistEntry);
    expect(queries[0].text).toContain("ON CONFLICT");
    expect(queries[0].values).toEqual([
      "cocooning",
      "2026-07-04",
      7,
      2,
      1,
      null,
      null,
      null,
      "manual",
    ]);
  });

  it("passes the given room, alerts and source through", async () => {
    returns([watchlistRow]);

    await addWatchlistEntry({
      adults: 2,
      alertPctDrop: 5,
      checkinDate: "2026-07-04",
      children: 0,
      hotelSlug: "cocooning",
      nights: 7,
      roomType: "STE",
      source: "auto",
      targetPrice: 1200,
    });

    expect(queries[0].values.slice(5)).toEqual(["STE", 1200, 5, "auto"]);
  });

  it("reports whether a delete removed a row", async () => {
    returns([{ id: 7 }]);
    returns([]);

    expect(await deleteWatchlistEntry(7)).toBe(true);
    expect(await deleteWatchlistEntry(99)).toBe(false);
    expect(queries[1].values).toEqual([99]);
  });

  it("returns the updated entry, or null when the id is unknown", async () => {
    returns([watchlistRow]);
    returns([]);

    expect(await setWatchlistActive(7, false)).toEqual(watchlistEntry);
    expect(queries[0].values).toEqual([false, 7]);
    expect(await setWatchlistActive(99, true)).toBeNull();
  });

  it("updates alert thresholds, or returns null when the id is unknown", async () => {
    returns([watchlistRow]);
    returns([]);

    expect(
      await updateWatchlistAlerts(7, { alertPctDrop: 10, targetPrice: 1500 })
    ).toEqual(watchlistEntry);
    expect(queries[0].values).toEqual([false, 1500, false, 10, 7]);
    expect(
      await updateWatchlistAlerts(99, { alertPctDrop: null, targetPrice: null })
    ).toBeNull();
    expect(queries[1].values).toEqual([false, null, false, null, 99]);
  });

  it("keeps the alert threshold it is not given", async () => {
    returns([watchlistRow]);
    returns([watchlistRow]);

    await updateWatchlistAlerts(7, { targetPrice: 1200 });
    await updateWatchlistAlerts(7, { alertPctDrop: 15 });

    expect(queries[0].text).toContain(
      "target_price = CASE WHEN $::boolean THEN target_price ELSE $ END"
    );
    expect(queries[0].text).toContain(
      "alert_pct_drop = CASE WHEN $::boolean THEN alert_pct_drop ELSE $ END"
    );
    expect(queries[0].values).toEqual([false, 1200, true, null, 7]);
    expect(queries[1].values).toEqual([true, null, false, 15, 7]);
  });

  it("stamps the alert time", async () => {
    await markAlerted(7);

    expect(queries[0].text).toContain("SET alerted_at = now()");
    expect(queries[0].values).toEqual([7]);
  });

  it("skips the database when no hotels are asked for", async () => {
    expect(await getActiveWatchlistForHotels([])).toEqual([]);
    expect(queries).toEqual([]);
  });

  it("lists active entries for the given hotels", async () => {
    returns([watchlistRow]);

    expect(await getActiveWatchlistForHotels(["cocooning"])).toEqual([
      watchlistEntry,
    ]);
    expect(queries[0].values).toEqual([["cocooning"]]);
  });

  it("counts the entries it deactivated", async () => {
    returns([{ id: 1 }, { id: 2 }]);

    expect(await deactivateExpired("2026-07-01")).toBe(2);
    expect(queries[0].values).toEqual(["2026-07-01"]);
  });
});

describe("snapshot queries", () => {
  it("returns null when an entry has no snapshot yet", async () => {
    returns([]);

    expect(await getLatestSnapshot(7)).toBeNull();
  });

  it("returns the latest price, or null for an unavailable one", async () => {
    returns([{ available: true, price: "1200.00" }]);
    returns([{ available: false, price: null }]);

    expect(await getLatestSnapshot(7)).toEqual({
      available: true,
      price: 1200,
    });
    expect(await getLatestSnapshot(7)).toEqual({
      available: false,
      price: null,
    });
  });

  it("stores a snapshot and maps the stored row", async () => {
    returns([snapshotRow]);

    const stored = await insertSnapshot(7, {
      available: true,
      currency: "EUR",
      price: 1499.5,
    });

    expect(stored).toEqual({
      available: true,
      currency: "EUR",
      id: 3,
      price: 1499.5,
      scrapedAt: "2026-06-02 08:00:00+00",
      watchlistId: 7,
    });
    expect(queries[0].values).toEqual([7, 1499.5, "EUR", true]);
  });

  it("lists snapshots oldest first with a default limit of 500", async () => {
    returns([snapshotRow, { ...snapshotRow, id: 4, price: null }]);

    const snapshots = await getSnapshots(7);

    expect(snapshots.map((s) => [s.id, s.price])).toEqual([
      [3, 1499.5],
      [4, null],
    ]);
    expect(queries[0].values).toEqual([7, 500]);
  });

  it("converts price stats to numbers", async () => {
    returns([{ avg: "1250.5", count: "4", min: "1100" }]);
    returns([{ avg: null, count: 0, min: null }]);

    expect(await getPriceStats(7)).toEqual({
      avg: 1250.5,
      count: 4,
      min: 1100,
    });
    expect(await getPriceStats(8)).toEqual({ avg: null, count: 0, min: null });
  });
});

describe("cron state", () => {
  it("returns the stored value, or null when the key is new", async () => {
    returns([{ value: { cursor: 3 } }]);
    returns([]);

    expect(await getCronState("scrape")).toEqual({ cursor: 3 });
    expect(await getCronState("missing")).toBeNull();
  });

  it("stores the value as JSON", async () => {
    await setCronState("scrape", { cursor: 4 });

    expect(queries[0].values).toEqual(["scrape", '{"cursor":4}']);
  });
});

describe("alert events", () => {
  it("records an alert event", async () => {
    await insertAlertEvent({
      minPrice: 1100,
      previousPrice: 1300,
      price: 1150,
      reasons: ["Price dropped 11.5%"],
      watchlistId: 7,
    });

    expect(queries[0].values).toEqual([
      7,
      1150,
      1300,
      1100,
      ["Price dropped 11.5%"],
    ]);
  });

  it("maps undigested events", async () => {
    returns([
      {
        created_at: "2026-06-02 08:00:00+00",
        digested_at: null,
        id: "5",
        min_price: "1100",
        previous_price: "1300",
        price: "1150",
        reasons: ["Price dropped 11.5%"],
        watchlist_id: "7",
      },
      {
        created_at: "2026-06-03 08:00:00+00",
        digested_at: null,
        id: 6,
        min_price: null,
        previous_price: null,
        price: "900",
        reasons: [],
        watchlist_id: 8,
      },
    ]);

    expect(await getUndigestedAlertEvents()).toEqual([
      {
        createdAt: "2026-06-02 08:00:00+00",
        digestedAt: null,
        id: 5,
        minPrice: 1100,
        previousPrice: 1300,
        price: 1150,
        reasons: ["Price dropped 11.5%"],
        watchlistId: 7,
      },
      {
        createdAt: "2026-06-03 08:00:00+00",
        digestedAt: null,
        id: 6,
        minPrice: null,
        previousPrice: null,
        price: 900,
        reasons: [],
        watchlistId: 8,
      },
    ]);
  });

  it("marks events digested, skipping the database for none", async () => {
    await markEventsDigested([]);
    expect(queries).toEqual([]);

    await markEventsDigested([5, 6]);
    expect(queries[0].values).toEqual([[5, 6]]);
  });
});
