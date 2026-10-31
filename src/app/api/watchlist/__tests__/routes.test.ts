import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addWatchlistEntry,
  deleteWatchlistEntry,
  getAllWatchlist,
  getSnapshots,
  setWatchlistActive,
  updateWatchlistAlerts,
} from "@/domains/tracking/queries";
import type { PriceSnapshot, WatchlistEntry } from "@/domains/tracking/types";
import { GET as getHistory } from "../[id]/history/route";
import { DELETE, PATCH } from "../[id]/route";
import { GET, POST } from "../route";

vi.mock("@/domains/tracking/queries");

const entry: WatchlistEntry = {
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
  source: "manual",
  targetPrice: null,
};

function idParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(method: string, body: unknown) {
  return new NextRequest("http://localhost/api/watchlist", {
    body: typeof body === "string" ? body : JSON.stringify(body),
    method,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/watchlist", () => {
  it("lists every entry", async () => {
    vi.mocked(getAllWatchlist).mockResolvedValueOnce([entry]);

    const response = await GET();

    expect(await response.json()).toEqual([entry]);
  });
});

describe("POST /api/watchlist", () => {
  const valid = {
    adults: 2,
    checkinDate: "2026-07-04",
    hotelSlug: "cocooning",
    nights: 7,
  };

  it("adds an entry with optional fields defaulted", async () => {
    vi.mocked(addWatchlistEntry).mockResolvedValueOnce(entry);

    const response = await POST(jsonRequest("POST", valid));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(entry);
    expect(addWatchlistEntry).toHaveBeenCalledWith({
      adults: 2,
      alertPctDrop: null,
      checkinDate: "2026-07-04",
      children: 0,
      hotelSlug: "cocooning",
      nights: 7,
      roomType: null,
      targetPrice: null,
    });
  });

  it("stores the hotel's slug when given its id", async () => {
    vi.mocked(addWatchlistEntry).mockResolvedValueOnce(entry);

    await POST(
      jsonRequest("POST", {
        ...valid,
        alertPctDrop: 15,
        children: 1,
        hotelSlug: "maritima",
        roomType: "STE",
        targetPrice: 1500,
      })
    );

    expect(addWatchlistEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        alertPctDrop: 15,
        children: 1,
        hotelSlug: "maritima-villas",
        roomType: "STE",
        targetPrice: 1500,
      })
    );
  });

  it("rejects an unknown hotel", async () => {
    const response = await POST(
      jsonRequest("POST", { ...valid, hotelSlug: "atlantis" })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Unknown hotel: atlantis" });
    expect(addWatchlistEntry).not.toHaveBeenCalled();
  });

  it.each([
    ["a body that is not JSON", "{oops"],
    ["a malformed date", { ...valid, checkinDate: "04/07/2026" }],
    ["too many adults", { ...valid, adults: 9 }],
    ["a negative target price", { ...valid, targetPrice: -1 }],
  ])("rejects %s", async (_label, body) => {
    const response = await POST(jsonRequest("POST", body));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Invalid request");
  });
});

describe("DELETE /api/watchlist/[id]", () => {
  const request = new NextRequest("http://localhost/api/watchlist/7");

  it.each(["abc", "0", "-3", "1.5"])("rejects the id %s", async (id) => {
    const response = await DELETE(request, idParams(id));

    expect(response.status).toBe(400);
    expect(deleteWatchlistEntry).not.toHaveBeenCalled();
  });

  it("deletes the entry", async () => {
    vi.mocked(deleteWatchlistEntry).mockResolvedValueOnce(true);

    const response = await DELETE(request, idParams("7"));

    expect(await response.json()).toEqual({ deleted: true, id: 7 });
    expect(deleteWatchlistEntry).toHaveBeenCalledWith(7);
  });

  it("answers 404 when nothing was deleted", async () => {
    vi.mocked(deleteWatchlistEntry).mockResolvedValueOnce(false);

    const response = await DELETE(request, idParams("8"));

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/watchlist/[id]", () => {
  it("rejects an invalid id", async () => {
    const response = await PATCH(
      jsonRequest("PATCH", { active: false }),
      idParams("x")
    );

    expect(response.status).toBe(400);
  });

  it.each([
    ["an empty update", {}],
    ["a body that is not JSON", "nope"],
    ["an out-of-range drop", { alertPctDrop: 95 }],
  ])("rejects %s", async (_label, body) => {
    const response = await PATCH(jsonRequest("PATCH", body), idParams("7"));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Invalid request");
  });

  it("pauses an entry", async () => {
    const paused = { ...entry, active: false };
    vi.mocked(setWatchlistActive).mockResolvedValueOnce(paused);

    const response = await PATCH(
      jsonRequest("PATCH", { active: false }),
      idParams("7")
    );

    expect(await response.json()).toEqual(paused);
    expect(setWatchlistActive).toHaveBeenCalledWith(7, false);
    expect(updateWatchlistAlerts).not.toHaveBeenCalled();
  });

  it("sets both alert thresholds", async () => {
    const alerted = { ...entry, alertPctDrop: 10, targetPrice: 1200 };
    vi.mocked(updateWatchlistAlerts).mockResolvedValueOnce(alerted);

    const response = await PATCH(
      jsonRequest("PATCH", { alertPctDrop: 10, targetPrice: 1200 }),
      idParams("7")
    );

    expect(await response.json()).toEqual(alerted);
    expect(updateWatchlistAlerts).toHaveBeenCalledWith(7, 1200, 10);
    expect(setWatchlistActive).not.toHaveBeenCalled();
  });

  it("clears both thresholds with nulls", async () => {
    vi.mocked(updateWatchlistAlerts).mockResolvedValueOnce(entry);

    await PATCH(
      jsonRequest("PATCH", { alertPctDrop: null, targetPrice: null }),
      idParams("7")
    );

    expect(updateWatchlistAlerts).toHaveBeenCalledWith(7, null, null);
  });

  it("answers 404 for an unknown entry", async () => {
    vi.mocked(setWatchlistActive).mockResolvedValueOnce(null);

    const response = await PATCH(
      jsonRequest("PATCH", { active: true }),
      idParams("99")
    );

    expect(response.status).toBe(404);
  });
});

describe("GET /api/watchlist/[id]/history", () => {
  const request = new Request("http://localhost/api/watchlist/7/history");

  it("rejects an invalid id", async () => {
    const response = await getHistory(request, idParams("0"));

    expect(response.status).toBe(400);
    expect(getSnapshots).not.toHaveBeenCalled();
  });

  it("returns the snapshots with their trend", async () => {
    const snapshots: PriceSnapshot[] = [
      {
        available: true,
        currency: "EUR",
        id: 1,
        price: 1500,
        scrapedAt: "2026-06-01T08:00:00Z",
        watchlistId: 7,
      },
      {
        available: true,
        currency: "EUR",
        id: 2,
        price: 1200,
        scrapedAt: "2026-06-02T08:00:00Z",
        watchlistId: 7,
      },
    ];
    vi.mocked(getSnapshots).mockResolvedValueOnce(snapshots);

    const response = await getHistory(request, idParams("7"));

    const body = await response.json();
    expect(getSnapshots).toHaveBeenCalledWith(7);
    expect(body.snapshots).toEqual(snapshots);
    expect(body.trend).toMatchObject({
      current: 1200,
      direction: "down",
      high: 1500,
      isAtLow: true,
      low: 1200,
    });
  });
});
