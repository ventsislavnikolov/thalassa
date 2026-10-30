import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/domains/tracking/notify";
import {
  getAllWatchlist,
  getPriceStats,
  getUndigestedAlertEvents,
  markEventsDigested,
} from "@/domains/tracking/queries";
import type { AlertEvent, WatchlistEntry } from "@/domains/tracking/types";
import { GET } from "../digest/route";

vi.mock("@/domains/tracking/queries");
vi.mock("@/domains/tracking/notify");

const SECRET = "cron-secret";

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
  source: "auto",
  targetPrice: null,
};

function event(overrides: Partial<AlertEvent> = {}): AlertEvent {
  return {
    createdAt: "2026-06-10T08:00:00Z",
    digestedAt: null,
    id: 1,
    minPrice: 1100,
    previousPrice: 1400,
    price: 1150,
    reasons: ["Price dropped 17.9% (from 1,400 to 1,150)"],
    watchlistId: 7,
    ...overrides,
  };
}

function call(authorization?: string) {
  return GET(
    new NextRequest("http://localhost/api/cron/digest", {
      headers: authorization ? { authorization } : {},
    })
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-06-10T18:00:00Z"));
  vi.mocked(getAllWatchlist).mockResolvedValue([entry]);
  vi.mocked(getPriceStats).mockResolvedValue({
    avg: 1300,
    count: 5,
    min: 1050,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("GET /api/cron/digest", () => {
  it("refuses everyone when no secret is configured", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await call("Bearer ");

    expect(response.status).toBe(401);
    expect(getUndigestedAlertEvents).not.toHaveBeenCalled();
  });

  it("refuses a wrong bearer token", async () => {
    const response = await call("Bearer guess");

    expect(response.status).toBe(401);
  });

  it("does nothing when no events are waiting", async () => {
    vi.mocked(getUndigestedAlertEvents).mockResolvedValueOnce([]);

    const response = await call(`Bearer ${SECRET}`);

    expect(await response.json()).toEqual({ events: 0, sent: false });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("emails one digest for the waiting events and clears them", async () => {
    vi.mocked(getUndigestedAlertEvents).mockResolvedValueOnce([
      event(),
      event({ id: 2, minPrice: null, watchlistId: 404 }),
    ]);
    vi.mocked(sendEmail).mockResolvedValueOnce("sent");

    const response = await call(`Bearer ${SECRET}`);

    expect(await response.json()).toEqual({ events: 2, sent: true });
    const [content] = vi.mocked(sendEmail).mock.calls[0];
    expect(content.subject).toBe("Price digest 2026-06-10: 1 deal spotted");
    expect(content.text).toContain("Cocooning Suites");
    expect(content.text).toContain("low EUR 1,100");
    expect(content.text).toContain("avg EUR 1,300");
    expect(content.text).toContain(
      "https://cocooningsuites.reserve-online.net/?checkin=2026-07-04&checkout=2026-07-11&adults=2"
    );
    // Events for deleted entries are cleared with the rest.
    expect(markEventsDigested).toHaveBeenCalledWith([1, 2]);
  });

  it("falls back to the stored low when the event has none", async () => {
    vi.mocked(getUndigestedAlertEvents).mockResolvedValueOnce([
      event({ minPrice: null }),
    ]);
    vi.mocked(sendEmail).mockResolvedValueOnce("sent");

    await call(`Bearer ${SECRET}`);

    const [content] = vi.mocked(sendEmail).mock.calls[0];
    expect(content.text).toContain("low EUR 1,050");
  });

  it("clears events whose entries are all gone without emailing", async () => {
    vi.mocked(getUndigestedAlertEvents).mockResolvedValueOnce([
      event({ watchlistId: 404 }),
    ]);

    const response = await call(`Bearer ${SECRET}`);

    expect(await response.json()).toEqual({ events: 1, sent: false });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(markEventsDigested).toHaveBeenCalledWith([1]);
  });

  it("clears the queue when email is not configured", async () => {
    vi.mocked(getUndigestedAlertEvents).mockResolvedValueOnce([event()]);
    vi.mocked(sendEmail).mockResolvedValueOnce("skipped");

    const response = await call(`Bearer ${SECRET}`);

    expect(await response.json()).toEqual({ events: 1, sent: false });
    expect(markEventsDigested).toHaveBeenCalledWith([1]);
  });

  it("keeps the events for the next run when the email fails", async () => {
    vi.mocked(getUndigestedAlertEvents).mockResolvedValueOnce([event()]);
    vi.mocked(sendEmail).mockResolvedValueOnce("failed");

    const response = await call(`Bearer ${SECRET}`);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Email failed to send",
      events: 1,
      sent: false,
    });
    expect(markEventsDigested).not.toHaveBeenCalled();
  });
});
