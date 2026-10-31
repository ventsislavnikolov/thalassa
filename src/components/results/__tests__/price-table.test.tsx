// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PriceTable } from "../price-table";
import { price } from "./fixtures";

const prices = [
  price({ date: "2026-07-10", dayOfWeek: "Friday", stayTotal: 1300 }),
  price({
    date: "2026-07-04",
    hotelId: "maritima",
    hotelName: "Maritima Villas",
    isLowestRate: true,
    roomCode: "STE",
    roomType: "Sea Suite",
    stayTotal: 900,
  }),
  price({ date: "2026-07-06", hotelName: "Agali Hotel", stayTotal: 1500 }),
];

function dates() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);
}

describe("PriceTable", () => {
  it("lists prices cheapest first and marks the best price", () => {
    render(<PriceTable prices={prices} />);

    expect(dates()).toEqual(["Jul 4, 2026", "Jul 10, 2026", "Jul 6, 2026"]);
    const [best, , last] = screen.getAllByRole("row").slice(1);
    expect(within(best).getByText("Best Price")).toBeTruthy();
    expect(within(best).getByText("Sea Suite")).toBeTruthy();
    expect(within(best).getByText("200.00 EUR")).toBeTruthy();
    const rating = (row: HTMLElement) =>
      within(row).getAllByRole("cell")[5].textContent;
    // The lowest-rate star is an icon; other rows show a dash.
    expect(rating(best)).toBe("");
    expect(rating(last)).toBe("-");
    expect(within(last).getByText("Standard Room")).toBeTruthy();
    expect(within(last).queryByText("Best Price")).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Hotel" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Export CSV" })).toBeNull();
    expect(
      screen.getByText("Showing top 3 results from 3 total dates")
    ).toBeTruthy();
  });

  it("re-sorts by date or by hotel name", async () => {
    const user = userEvent.setup();
    render(<PriceTable prices={prices} showHotel />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Sort by Date" }));
    expect(dates()).toEqual(["Jul 4, 2026", "Jul 6, 2026", "Jul 10, 2026"]);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Sort by Hotel" }));
    const hotels = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell")[2].textContent);
    // " Suites" is dropped from hotel badges.
    expect(hotels).toEqual(["Agali Hotel", "Cocooning", "Maritima Villas"]);
  });

  it("offers an export button when given a handler", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(<PriceTable onExport={onExport} prices={prices} />);

    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("shows only the 20 cheapest of a long list", () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      price({
        date: `2026-07-${String(i + 1).padStart(2, "0")}`,
        stayTotal: 1000 + i,
      })
    );
    render(<PriceTable prices={many} />);

    expect(screen.getAllByRole("row")).toHaveLength(21);
    expect(
      screen.getByText(
        "Showing top 20 results. Use export to see all 25 dates."
      )
    ).toBeTruthy();
  });
});
