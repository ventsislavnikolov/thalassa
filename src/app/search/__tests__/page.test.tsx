// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getHotel } from "@/domains/hotels/registry";
import SearchPage from "../page";
import { analysis, price, scrapeResponse } from "./fixtures";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.params,
}));

const fetchMock = vi.fn<typeof fetch>();
let scrape: () => Promise<Response>;

const NO_PRICES = /No prices found for your search criteria/u;

function scrapeBody() {
  const call = fetchMock.mock.calls.find(([url]) => url === "/api/scrape");
  return JSON.parse(String(call?.[1]?.body));
}

async function search(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Search Prices" }));
}

async function renderPage(query = "hotel=cocooning") {
  navigation.params = new URLSearchParams(query);
  const user = userEvent.setup();
  render(<SearchPage />);
  await screen.findByText("Find the best rates across 2 hotels");
  return user;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 5, 10, 12));
  scrape = () => Promise.resolve(Response.json(scrapeResponse([])));
  fetchMock.mockReset();
  fetchMock.mockImplementation((input) =>
    String(input) === "/api/hotels"
      ? Promise.resolve(
          Response.json([getHotel("cocooning"), getHotel("bluecarpet")])
        )
      : scrape()
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("SearchPage", () => {
  it("waits for a first search", async () => {
    await renderPage();

    expect(screen.getByText("Ready to search")).toBeTruthy();
    expect(screen.getByText("1 selected")).toBeTruthy();
  });

  it("shows progress, then the prices found for one hotel", async () => {
    let respond: (response: Response) => void = () => undefined;
    scrape = () =>
      new Promise((resolve) => {
        respond = resolve;
      });
    const user = await renderPage();

    await search(user);
    expect(screen.getByText("Searching for the best prices...")).toBeTruthy();
    expect(scrapeBody()).toEqual({
      adults: 2,
      checkin: "2026-06-10",
      children: 0,
      hotelSlugs: ["cocooning"],
      includeWeather: false,
      nights: 5,
      searchMode: "single",
    });
    respond(
      Response.json(
        scrapeResponse([
          price({ date: "2026-06-10", stayTotal: 1100 }),
          price({ date: "2026-06-10", roomType: "Suite", stayTotal: 1400 }),
        ])
      )
    );

    expect(await screen.findByText("Price Overview")).toBeTruthy();
    expect(screen.getByText("2026-06-10")).toBeTruthy();
    expect(screen.getByText("5 nights")).toBeTruthy();
    expect(screen.getByText("2 adults")).toBeTruthy();
    expect(screen.getByText("1 hotel")).toBeTruthy();
    expect(screen.getByText("2 dates found")).toBeTruthy();
    expect(screen.getByText("Best Prices Found")).toBeTruthy();
    expect(screen.queryByText("Hotel Comparison")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Monthly Price Summary" })
    ).toBeNull();
    expect(
      screen.queryByText("Weather Analysis", { selector: "h2" })
    ).toBeNull();
    expect(screen.queryByText("Ready to search")).toBeNull();
  });

  it("compares hotels, months and weather for a broad search", async () => {
    const results = [
      price({ date: "2026-07-04", stayTotal: 1000 }),
      price({
        date: "2026-08-01",
        hotelId: "bluecarpet",
        hotelName: "Blue Carpet Suites",
        stayTotal: 1300,
      }),
    ];
    scrape = () =>
      Promise.resolve(
        Response.json(
          scrapeResponse(results, {
            meta: {
              errors: [],
              hotelsSearched: ["cocooning", "bluecarpet"],
              searchDuration: 900,
              totalResults: 2,
            },
            weather: [analysis(results[0])],
          })
        )
      );
    const user = await renderPage("");

    await user.click(screen.getByRole("switch", { name: "Year-long Search" }));
    await user.click(screen.getByRole("switch", { name: "Weather Analysis" }));
    await user.click(screen.getByRole("button", { name: "Select All" }));
    await search(user);

    expect(await screen.findByText("Hotel Comparison")).toBeTruthy();
    expect(scrapeBody()).toMatchObject({
      hotelSlugs: ["cocooning", "bluecarpet"],
      includeWeather: true,
      months: 12,
      searchMode: "year",
    });
    expect(screen.getByText("2 hotels")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Monthly Price Summary" })
    ).toBeTruthy();
    expect(screen.getByText("Vacation Planning Summary")).toBeTruthy();
    expect(
      screen.getByText("Weather Analysis", { selector: "h2" })
    ).toBeTruthy();
  });

  it("asks the API for a multi-month search", async () => {
    scrape = () => Promise.resolve(Response.json(scrapeResponse([price()])));
    const user = await renderPage();

    await user.click(
      screen.getByRole("switch", { name: "Multi-Month Search" })
    );
    await search(user);

    await screen.findByText("Price Overview");
    expect(scrapeBody()).toMatchObject({
      months: 3,
      searchMode: "multi-month",
    });
    expect(
      screen.getByRole("button", { name: "Monthly Price Summary" })
    ).toBeTruthy();
  });

  it("lists children in the summary", async () => {
    scrape = () => Promise.resolve(Response.json(scrapeResponse([price()])));
    const user = await renderPage();

    await user.clear(screen.getByLabelText("Children"));
    await user.type(screen.getByLabelText("Children"), "2");
    await search(user);

    expect(await screen.findByText("2 adults, 2 children")).toBeTruthy();
  });

  it("says so when nothing was found", async () => {
    const user = await renderPage();

    await search(user);

    expect(await screen.findByText(NO_PRICES)).toBeTruthy();
    expect(screen.getByText("0 dates found")).toBeTruthy();
  });

  it.each([
    [
      "the API's error",
      () =>
        Promise.resolve(
          Response.json({ error: "Invalid request" }, { status: 400 })
        ),
      "Invalid request",
    ],
    [
      "a generic error",
      () => Promise.resolve(Response.json({}, { status: 500 })),
      "Failed to fetch prices",
    ],
    [
      "an unexpected failure",
      () => Promise.reject("socket closed"),
      "An unexpected error occurred",
    ],
  ])("shows %s when the search fails", async (_label, respond, message) => {
    scrape = respond;
    const user = await renderPage();

    await search(user);

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByText("Ready to search")).toBeNull();
  });

  it("scrolls back to the form to modify the search", async () => {
    scrape = () => Promise.resolve(Response.json(scrapeResponse([price()])));
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
    const user = await renderPage();
    await search(user);

    await user.click(
      await screen.findByRole("button", { name: "Modify Search" })
    );

    await waitFor(() =>
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" })
    );
    scrollIntoView.mockRestore();
  });
});
