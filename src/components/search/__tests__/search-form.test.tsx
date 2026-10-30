// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getHotel } from "@/domains/hotels/registry";
import { SearchForm, type SearchFormParams } from "../search-form";

const hotels = [
  getHotel("bluecarpet"),
  getHotel("cocooning"),
  getHotel("portocarras"),
];
const fetchMock = vi.fn<typeof fetch>();
const JUNE_27 = /June 27th, 2026/u;

function serveHotels() {
  fetchMock.mockResolvedValue(Response.json(hotels));
}

async function renderForm(
  props: Partial<Parameters<typeof SearchForm>[0]> = {}
) {
  const onSearch = vi.fn<(params: SearchFormParams) => void>();
  render(<SearchForm onSearch={onSearch} {...props} />);
  await screen.findByText("Find the best rates across 3 hotels");
  return { onSearch, user: userEvent.setup() };
}

function lastSearch(onSearch: ReturnType<typeof vi.fn>) {
  return onSearch.mock.lastCall?.[0] as SearchFormParams;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 5, 10, 12));
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("SearchForm", () => {
  it("searches today for five nights, two adults and every hotel by default", async () => {
    serveHotels();
    const { onSearch, user } = await renderForm();

    expect(fetchMock).toHaveBeenCalledWith("/api/hotels");
    expect(screen.getByText("26 selected")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Search Prices" }));

    expect(onSearch).toHaveBeenCalledWith({
      adults: 2,
      checkin: "2026-06-10",
      children: 0,
      enableMonthsSearch: false,
      hotelIds: expect.arrayContaining(["bluecarpet", "reinadelmar"]),
      includeWeather: false,
      isYearSearch: false,
      months: 0,
      nights: 5,
      room: "standard",
      weatherLocation: "pefkochori",
    });
    expect(lastSearch(onSearch).hotelIds).not.toContain("excelsior");
  });

  it("still works when the hotel list cannot be loaded", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const onSearch = vi.fn();
    render(<SearchForm defaultHotel="cocooning" onSearch={onSearch} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(
      screen.getByText("Find the best rates across 15 hotels")
    ).toBeTruthy();
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Search Prices" })
        .closest("form") as HTMLFormElement
    );
    expect(lastSearch(onSearch).hotelIds).toEqual(["cocooning"]);
  });

  it("passes the chosen date, nights, guests and hotels", async () => {
    serveHotels();
    const { onSearch, user } = await renderForm({ defaultHotel: "cocooning" });

    await user.click(screen.getByRole("button", { name: "June 10th, 2026" }));
    await user.click(screen.getByRole("button", { name: JUNE_27 }));
    fireEvent.change(screen.getByLabelText("Nights"), {
      target: { value: "7" },
    });
    fireEvent.change(screen.getByLabelText("Adults"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Children"), {
      target: { value: "1" },
    });
    await user.click(
      screen.getByRole("button", { name: "Blue Carpet Suites" })
    );
    await user.click(screen.getByRole("button", { name: "Search Prices" }));

    expect(lastSearch(onSearch)).toMatchObject({
      adults: 3,
      checkin: "2026-06-27",
      children: 1,
      hotelIds: ["cocooning", "bluecarpet"],
      nights: 7,
    });
  });

  it("treats a cleared nights field as zero", async () => {
    serveHotels();
    const { onSearch, user } = await renderForm({ defaultHotel: "cocooning" });

    const nights = screen.getByLabelText<HTMLInputElement>("Nights");
    fireEvent.change(nights, { target: { value: "" } });
    expect(nights.value).toBe("");
    await user.click(screen.getByRole("button", { name: "Search Prices" }));

    expect(lastSearch(onSearch).nights).toBe(0);
  });

  it("searches several months, defaulting to three", async () => {
    serveHotels();
    const { onSearch, user } = await renderForm({ defaultHotel: "cocooning" });

    await user.click(
      screen.getByRole("switch", { name: "Multi-Month Search" })
    );
    expect(screen.getByRole("combobox").textContent).toBe("3 months");
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "6 months" }));
    await user.click(screen.getByRole("button", { name: "Search Prices" }));
    expect(lastSearch(onSearch)).toMatchObject({
      enableMonthsSearch: true,
      months: 6,
    });

    await user.click(
      screen.getByRole("switch", { name: "Multi-Month Search" })
    );
    expect(screen.queryByRole("combobox")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Search Prices" }));
    expect(lastSearch(onSearch)).toMatchObject({
      enableMonthsSearch: false,
      months: 0,
    });
  });

  it("searches the whole year, hiding the month options", async () => {
    serveHotels();
    const { onSearch, user } = await renderForm({ defaultHotel: "cocooning" });

    await user.click(screen.getByRole("switch", { name: "Year-long Search" }));
    expect(
      screen.queryByRole("switch", { name: "Multi-Month Search" })
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Search Prices" }));
    expect(lastSearch(onSearch)).toMatchObject({
      enableMonthsSearch: true,
      isYearSearch: true,
      months: 12,
    });

    await user.click(screen.getByRole("switch", { name: "Year-long Search" }));
    await user.click(screen.getByRole("button", { name: "Search Prices" }));
    expect(lastSearch(onSearch)).toMatchObject({
      isYearSearch: false,
      months: 0,
    });
  });

  it("adds weather for a chosen location", async () => {
    serveHotels();
    const { onSearch, user } = await renderForm({ defaultHotel: "cocooning" });

    await user.click(screen.getByRole("switch", { name: "Weather Analysis" }));
    await user.click(screen.getByRole("combobox"));
    await user.click(
      screen.getByRole("option", { name: "Kavala (Myra Hotel)" })
    );
    await user.click(screen.getByRole("button", { name: "Search Prices" }));

    expect(lastSearch(onSearch)).toMatchObject({
      includeWeather: true,
      weatherLocation: "kavala",
    });
  });

  it("does not offer a year-long search for Porto Carras alone", async () => {
    serveHotels();
    await renderForm({ defaultHotel: "portocarras" });

    expect(
      screen.getByText("Year-long search not available for Porto Carras")
    ).toBeTruthy();
    expect(
      screen.getByRole("switch", { name: "Year-long Search" })
    ).toHaveProperty("disabled", true);
  });

  it("drops a year-long search when only Porto Carras is left", async () => {
    serveHotels();
    const { onSearch, user } = await renderForm({ defaultHotel: "cocooning" });

    await user.click(screen.getByRole("switch", { name: "Year-long Search" }));
    await user.click(screen.getByRole("button", { name: "Porto Carras" }));
    await user.click(screen.getByRole("button", { name: "Cocooning Suites" }));
    await user.click(screen.getByRole("button", { name: "Search Prices" }));

    expect(lastSearch(onSearch)).toMatchObject({
      hotelIds: ["portocarras"],
      isYearSearch: false,
      months: 3,
    });
  });

  it("asks for at least one hotel before searching", async () => {
    serveHotels();
    const { user } = await renderForm({ defaultHotel: "cocooning" });

    await user.click(screen.getByRole("button", { name: "Cocooning Suites" }));

    expect(
      screen.getByText("Please select at least one hotel to search")
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Search Prices" })
    ).toHaveProperty("disabled", true);
  });

  it("shows progress while a search runs", async () => {
    serveHotels();
    await renderForm({ loading: true });

    const button = screen.getByRole("button", { name: "Searching..." });
    expect(button).toHaveProperty("disabled", true);
  });
});
