// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analysis, price, scrapeResponse } from "../../__tests__/fixtures";
import ResultsPage from "../page";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.params,
}));

const fetchMock = vi.fn<typeof fetch>();
const NO_PRICES = /No prices found for your search criteria/u;

function show(query: string) {
  navigation.params = new URLSearchParams(query);
  return render(<ResultsPage />);
}

function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(Response.json(body, { status }));
}

function requestBody(call = 0) {
  return JSON.parse(String(fetchMock.mock.calls[call][1]?.body));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ResultsPage", () => {
  it.each(["hotels=cocooning", "checkin=2026-07-04"])(
    "asks for a new search without both a date and hotels (%s)",
    (query) => {
      show(query);

      expect(screen.getByText("No Search Parameters")).toBeTruthy();
      expect(
        screen.getByRole("link", { name: "Go to Search" }).getAttribute("href")
      ).toBe("/search");
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it("searches with defaults for the parameters left out", async () => {
    respond(scrapeResponse([price()]));
    show("checkin=2026-07-04&hotels=cocooning");

    expect(screen.getByText("Searching for the best prices...")).toBeTruthy();
    expect(await screen.findByText("Best Prices Found")).toBeTruthy();
    expect(requestBody()).toEqual({
      adults: 2,
      checkin: "2026-07-04",
      children: 0,
      hotelSlugs: ["cocooning"],
      includeWeather: false,
      nights: 5,
      searchMode: "single",
    });
    expect(screen.getByText("2 adults")).toBeTruthy();
    expect(screen.getByText("1 hotel")).toBeTruthy();
    expect(screen.queryByText("Hotel Comparison")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Monthly Price Summary" })
    ).toBeNull();
    expect(screen.queryByText("Vacation Planning Summary")).toBeNull();
  });

  it.each(["multi-month", "year"])(
    "shows every view for a %s search across hotels",
    async (mode) => {
      const results = [
        price(),
        price({
          date: "2026-08-01",
          hotelId: "bluecarpet",
          hotelName: "Blue Carpet Suites",
          stayTotal: 1400,
        }),
      ];
      respond(
        scrapeResponse(results, {
          meta: {
            errors: [],
            hotelsSearched: ["cocooning", "bluecarpet"],
            searchDuration: 800,
            totalResults: 2,
          },
          weather: [analysis(results[0])],
        })
      );
      show(
        `checkin=2026-07-04&hotels=cocooning,bluecarpet&adults=3&children=1&nights=7&months=4&mode=${mode}&weather=true`
      );

      expect(await screen.findByText("Hotel Comparison")).toBeTruthy();
      expect(requestBody()).toEqual({
        adults: 3,
        checkin: "2026-07-04",
        children: 1,
        hotelSlugs: ["cocooning", "bluecarpet"],
        includeWeather: true,
        months: 4,
        nights: 7,
        searchMode: mode,
      });
      expect(screen.getByText("3 adults, 1 children")).toBeTruthy();
      expect(screen.getByText("7 nights")).toBeTruthy();
      expect(screen.getByText("2 hotels")).toBeTruthy();
      expect(
        screen.getByRole("button", { name: "Monthly Price Summary" })
      ).toBeTruthy();
      expect(screen.getByText("Vacation Planning Summary")).toBeTruthy();
    }
  );

  it("says so when nothing was found", async () => {
    respond(scrapeResponse([]));
    show("checkin=2026-07-04&hotels=cocooning");

    expect(await screen.findByText(NO_PRICES)).toBeTruthy();
  });

  it.each([
    [{ error: "Invalid request" }, 400, "Invalid request"],
    [{}, 500, "Failed to fetch prices"],
  ])("shows a failed search (%o, %i)", async (body, status, message) => {
    respond(body, status);
    show("checkin=2026-07-04&hotels=cocooning");

    expect(await screen.findByText(message)).toBeTruthy();
  });

  it("shows an unexpected failure", async () => {
    fetchMock.mockRejectedValueOnce("socket closed");
    show("checkin=2026-07-04&hotels=cocooning");

    expect(
      await screen.findByText("An unexpected error occurred")
    ).toBeTruthy();
  });

  it("drops an outdated search when the parameters change", async () => {
    fetchMock.mockImplementationOnce(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError"))
          );
        })
    );
    respond(scrapeResponse([price({ stayTotal: 777 })]));
    const { rerender } = show("checkin=2026-07-04&hotels=cocooning");

    navigation.params = new URLSearchParams(
      "checkin=2026-07-11&hotels=cocooning"
    );
    rerender(<ResultsPage />);

    expect(await screen.findByText("Best Prices Found")).toBeTruthy();
    expect(requestBody(1).checkin).toBe("2026-07-11");
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    await waitFor(() =>
      expect(screen.queryByText("Searching for the best prices...")).toBeNull()
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
