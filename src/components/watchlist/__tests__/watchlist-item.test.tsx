// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WatchlistEntry } from "@/domains/tracking/types";
import { WatchlistItem } from "../watchlist-item";
import { entry, snapshot, trend } from "./fixtures";

const fetchMock = vi.fn<typeof fetch>();
const NO_DATA = /No price data yet/u;
const LAST_ALERTED = /^Last alerted /u;
const COCOONING = /Cocooning Suites/u;
const SAVE_FAILED = "Could not save alerts";

function renderItem(tracked: WatchlistEntry = entry()) {
  const handlers = {
    onDelete: vi.fn(),
    onToggle: vi.fn(),
    onUpdate: vi.fn(),
  };
  render(
    <WatchlistItem entry={tracked} hotelName="Cocooning Suites" {...handlers} />
  );
  return { ...handlers, user: userEvent.setup() };
}

function expand(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole("button", { name: COCOONING }));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WatchlistItem", () => {
  it.each([
    [entry(), "2026-07-04 · 7 nights · 2 adults"],
    [
      entry({ adults: 1, children: 2, nights: 1, roomType: "Sea Suite" }),
      "2026-07-04 · 1 night · 1 adult · 2 children · Sea Suite",
    ],
  ])("describes the stay", (tracked, description) => {
    renderItem(tracked);

    expect(screen.getByText(description)).toBeTruthy();
  });

  it("shows whether it is active and a bell when alerts are set", () => {
    renderItem(entry({ active: false, targetPrice: 1200 }));

    expect(screen.getByText("Paused")).toBeTruthy();
    expect(screen.getByRole("switch")).toHaveProperty("ariaChecked", "false");
    expect(document.querySelector(".lucide-bell")).not.toBeNull();
  });

  it("asks to toggle or remove the entry", async () => {
    const { onDelete, onToggle, user } = renderItem();

    expect(screen.getByText("Active")).toBeTruthy();
    expect(document.querySelector(".lucide-bell")).toBeNull();
    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(onToggle).toHaveBeenCalledWith(entry());
    expect(onDelete).toHaveBeenCalledWith(7);
  });

  it("loads the price history once when expanded", async () => {
    let respond: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        respond = resolve;
      })
    );
    const { user } = renderItem();

    await expand(user);
    expect(screen.getByText("Loading price history…")).toBeTruthy();
    respond(
      Response.json({
        snapshots: [
          snapshot(1, 1500, "2026-06-01T08:00:00Z"),
          snapshot(2, 1300, "2026-06-02T08:00:00Z"),
        ],
        trend: trend(),
      })
    );

    expect(
      await screen.findByRole("img", { name: "Price history chart" })
    ).toBeTruthy();
    expect(screen.getByText("Trending down")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/watchlist/7/history");

    await expand(user);
    expect(screen.queryByText("Trending down")).toBeNull();
    await expand(user);
    expect(screen.getByText("Trending down")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("explains when no prices were recorded yet", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ snapshots: [], trend: trend({ hasData: false }) })
    );
    const { user } = renderItem();

    await expand(user);

    expect(await screen.findByText(NO_DATA)).toBeTruthy();
  });

  it.each([
    ["cannot be sent", () => Promise.reject(new Error("offline"))],
    [
      "is rejected",
      () =>
        Promise.resolve(Response.json({ error: "Not found" }, { status: 404 })),
    ],
  ])(
    "still offers deal alerts when the history %s",
    async (_label, respond) => {
      fetchMock.mockImplementationOnce(respond);
      const { user } = renderItem();

      await expand(user);

      expect(await screen.findByText("Deal alerts")).toBeTruthy();
      expect(screen.queryByText("Loading price history…")).toBeNull();
      expect(screen.queryByText(NO_DATA)).toBeNull();
    }
  );

  it("saves new alert thresholds", async () => {
    fetchMock.mockRejectedValueOnce(new Error("no history"));
    const saved = entry({ alertPctDrop: 15, targetPrice: 1200 });
    fetchMock.mockResolvedValueOnce(Response.json(saved));
    const { onUpdate, user } = renderItem();
    await expand(user);

    expect(
      screen.getByText(
        "No alerts sent yet. Emailed once when a threshold is crossed."
      )
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Target price (€)"), {
      target: { value: "1200" },
    });
    fireEvent.change(screen.getByLabelText("% drop"), {
      target: { value: "15" },
    });
    await user.click(screen.getByRole("button", { name: "Save alerts" }));

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/watchlist/7");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({
      alertPctDrop: 15,
      targetPrice: 1200,
    });
    expect(onUpdate).toHaveBeenCalledWith(saved);
  });

  it("clears blank or invalid thresholds and reports a rejected save", async () => {
    fetchMock.mockRejectedValueOnce(new Error("no history"));
    fetchMock.mockResolvedValueOnce(
      Response.json({ error: "Not found" }, { status: 404 })
    );
    const { onUpdate, user } = renderItem(
      entry({
        alertedAt: "2026-06-05T09:30:00Z",
        alertPctDrop: 10,
        targetPrice: 1500,
      })
    );
    await expand(user);

    expect(screen.getByText(LAST_ALERTED)).toBeTruthy();
    expect(
      screen.getByLabelText<HTMLInputElement>("Target price (€)").value
    ).toBe("1500");
    fireEvent.change(screen.getByLabelText("Target price (€)"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("% drop"), {
      target: { value: "1e999" },
    });
    await user.click(screen.getByRole("button", { name: "Save alerts" }));

    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      alertPctDrop: null,
      targetPrice: null,
    });
    expect(onUpdate).not.toHaveBeenCalled();
    expect(await screen.findByText(SAVE_FAILED)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save alerts" })).toBeTruthy();
  });

  it("reports a save that cannot be sent, and clears it on retry", async () => {
    fetchMock.mockRejectedValueOnce(new Error("no history"));
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const saved = entry({ targetPrice: 1200 });
    fetchMock.mockResolvedValueOnce(Response.json(saved));
    const { onUpdate, user } = renderItem();
    await expand(user);
    fireEvent.change(screen.getByLabelText("Target price (€)"), {
      target: { value: "1200" },
    });

    await user.click(screen.getByRole("button", { name: "Save alerts" }));
    expect(await screen.findByText(SAVE_FAILED)).toBeTruthy();
    expect(onUpdate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Save alerts" }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(saved));
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
  });
});
