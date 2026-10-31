// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getHotel } from "@/domains/hotels/registry";
import type { WatchlistEntry } from "@/domains/tracking/types";
import { WatchlistManager } from "../watchlist-manager";
import { entry } from "./fixtures";

const fetchMock = vi.fn<typeof fetch>();
const hotels = [getHotel("cocooning"), getHotel("bluecarpet")];
const STAY = /2026-07-04 · 7 nights/u;
const ANY_STAY = /^2026-0\d-0\d · /u;
const COCOONING = /Cocooning Suites/u;
const RETIRED = /^retired-hotel/u;
const ROOM_TYPE = /Room type/u;
const TARGET_PRICE = /Target price/u;
const PCT_DROP = /Alert on % drop/u;

function serve(
  entries: WatchlistEntry[],
  routes: Record<string, () => Promise<Response>> = {}
) {
  fetchMock.mockImplementation((input, init) => {
    const key = `${init?.method ?? "GET"} ${String(input)}`;
    const route = routes[key];
    if (route) {
      return route();
    }
    if (key === "GET /api/hotels") {
      return Promise.resolve(Response.json(hotels));
    }
    if (key === "GET /api/watchlist") {
      return Promise.resolve(Response.json(entries));
    }
    return Promise.reject(new Error(`unexpected ${key}`));
  });
}

async function renderManager() {
  const user = userEvent.setup();
  render(<WatchlistManager />);
  await waitFor(() => expect(screen.queryByText("Loading…")).toBeNull());
  return user;
}

function requests(method: string) {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === method);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WatchlistManager", () => {
  it("lists tracked stays under their hotel names", async () => {
    serve([entry(), entry({ hotelSlug: "retired-hotel", id: 8 })]);
    render(<WatchlistManager />);

    expect(screen.getByText("Loading…")).toBeTruthy();
    expect(await screen.findByRole("button", { name: COCOONING })).toBeTruthy();
    // A hotel no longer in the list falls back to its slug.
    expect(screen.getByRole("button", { name: RETIRED })).toBeTruthy();
  });

  it("invites adding a first stay", async () => {
    serve([]);
    await renderManager();

    expect(
      screen.getByText("No tracked stays yet. Add one above.")
    ).toBeTruthy();
  });

  it("reports a failed load", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await renderManager();

    expect(screen.getByText("Failed to load watchlist")).toBeTruthy();
  });

  it("asks for a hotel and a date before adding", async () => {
    serve([]);
    const user = await renderManager();

    await user.click(screen.getByRole("button", { name: "Add to watchlist" }));

    expect(screen.getByText("Pick a hotel and a check-in date")).toBeTruthy();
    expect(requests("POST")).toEqual([]);
  });

  it("adds a stay and resets the form but keeps the hotel", async () => {
    const created = entry({ id: 9, roomType: "Sea Suite" });
    serve([entry({ id: 9 }), entry({ checkinDate: "2026-08-01", id: 3 })], {
      "POST /api/watchlist": () =>
        Promise.resolve(Response.json(created, { status: 201 })),
    });
    const user = await renderManager();

    await user.click(screen.getByRole("combobox", { name: "Hotel" }));
    await user.click(screen.getByRole("option", { name: "Cocooning Suites" }));
    fireEvent.change(screen.getByLabelText("Check-in"), {
      target: { value: "2026-07-04" },
    });
    fireEvent.change(screen.getByLabelText("Nights"), {
      target: { value: "7" },
    });
    fireEvent.change(screen.getByLabelText("Adults"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Children"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText(ROOM_TYPE), {
      target: { value: " Sea Suite " },
    });
    fireEvent.change(screen.getByLabelText(TARGET_PRICE), {
      target: { value: "1500" },
    });
    fireEvent.change(screen.getByLabelText(PCT_DROP), {
      target: { value: "10" },
    });
    await user.click(screen.getByRole("button", { name: "Add to watchlist" }));

    const [[, init]] = requests("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      adults: 3,
      alertPctDrop: 10,
      checkinDate: "2026-07-04",
      children: 1,
      hotelSlug: "cocooning",
      nights: 7,
      roomType: "Sea Suite",
      targetPrice: 1500,
    });
    // The upserted entry replaces its old row at the top of the list.
    const stays = await screen.findAllByText(STAY);
    expect(stays[0].textContent).toContain("Sea Suite");
    expect(screen.getAllByText(ANY_STAY)).toHaveLength(2);
    expect(screen.getByLabelText<HTMLInputElement>("Check-in").value).toBe("");
    expect(screen.getByLabelText<HTMLInputElement>("Adults").value).toBe("2");
    expect(screen.getByRole("combobox", { name: "Hotel" }).textContent).toBe(
      "Cocooning Suites"
    );
  });

  it("sends empty optional fields as null and reports a failed add", async () => {
    serve([], {
      "POST /api/watchlist": () =>
        Promise.resolve(Response.json({ error: "Invalid" }, { status: 400 })),
    });
    const user = await renderManager();

    await user.click(screen.getByRole("combobox", { name: "Hotel" }));
    await user.click(
      screen.getByRole("option", { name: "Blue Carpet Suites" })
    );
    fireEvent.change(screen.getByLabelText("Check-in"), {
      target: { value: "2026-07-04" },
    });
    await user.click(screen.getByRole("button", { name: "Add to watchlist" }));

    expect(await screen.findByText("Could not add entry")).toBeTruthy();
    const [[, init]] = requests("POST");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      alertPctDrop: null,
      roomType: null,
      targetPrice: null,
    });
    expect(screen.getByLabelText<HTMLInputElement>("Check-in").value).toBe(
      "2026-07-04"
    );
  });

  it("pauses a stay, and resumes it if the request cannot be sent", async () => {
    serve([entry()], {
      "PATCH /api/watchlist/7": () =>
        Promise.resolve(Response.json(entry({ active: false }))),
    });
    const user = await renderManager();

    await user.click(screen.getByRole("switch"));
    expect(await screen.findByText("Paused")).toBeTruthy();
    const [[url, init]] = requests("PATCH");
    expect(url).toBe("/api/watchlist/7");
    expect(JSON.parse(String(init?.body))).toEqual({ active: false });

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await user.click(screen.getByRole("switch"));
    await waitFor(() => expect(screen.getByText("Paused")).toBeTruthy());
  });

  it("resumes a stay when the server rejects the pause", async () => {
    serve([entry()], {
      "PATCH /api/watchlist/7": () =>
        Promise.resolve(Response.json({ error: "Not found" }, { status: 404 })),
    });
    const user = await renderManager();

    await user.click(screen.getByRole("switch"));

    await waitFor(() => expect(requests("PATCH")).toHaveLength(1));
    expect(await screen.findByText("Active")).toBeTruthy();
    expect(screen.getByRole("switch")).toHaveProperty("ariaChecked", "true");
  });

  it("removes a stay", async () => {
    serve([entry()], {
      "DELETE /api/watchlist/7": () =>
        Promise.resolve(Response.json({ deleted: true, id: 7 })),
    });
    const user = await renderManager();

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(
      await screen.findByText("No tracked stays yet. Add one above.")
    ).toBeTruthy();
  });

  it.each([
    ["is rejected", () => Promise.resolve(Response.json({}, { status: 500 }))],
    ["cannot be sent", () => Promise.reject(new Error("offline"))],
  ])("puts a stay back when its removal %s", async (_label, respond) => {
    serve([entry()], { "DELETE /api/watchlist/7": respond });
    const user = await renderManager();

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(await screen.findByRole("button", { name: COCOONING })).toBeTruthy();
    expect(
      screen.queryByText("No tracked stays yet. Add one above.")
    ).toBeNull();
  });

  it("shows saved alert thresholds on the stay", async () => {
    const updated = entry({ targetPrice: 1100 });
    serve([entry()], {
      "GET /api/watchlist/7/history": () => Promise.reject(new Error("none")),
      "PATCH /api/watchlist/7": () => Promise.resolve(Response.json(updated)),
    });
    const user = await renderManager();

    expect(document.querySelector(".lucide-bell")).toBeNull();
    await user.click(screen.getByRole("button", { name: COCOONING }));
    fireEvent.change(screen.getByLabelText("Target price (€)"), {
      target: { value: "1100" },
    });
    await user.click(screen.getByRole("button", { name: "Save alerts" }));

    await waitFor(() =>
      expect(document.querySelector("p .lucide-bell")).not.toBeNull()
    );
  });
});
