// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HotelComparison } from "../hotel-comparison";
import { MonthlySummary } from "../monthly-summary";
import { PriceStats } from "../price-stats";
import { price } from "./fixtures";

const SAVINGS = /Save/u;

describe("PriceStats", () => {
  it("shows the lowest, average and highest stay totals", () => {
    render(
      <PriceStats
        prices={[
          price({ stayTotal: 900 }),
          price({ stayTotal: 1200 }),
          price({ stayTotal: 1500 }),
        ]}
      />
    );

    expect(screen.getByText("900.00 EUR")).toBeTruthy();
    expect(screen.getByText("1200.00 EUR")).toBeTruthy();
    expect(screen.getByText("1500.00 EUR")).toBeTruthy();
  });
});

describe("HotelComparison", () => {
  it("compares each hotel and shows how much the dearer ones cost extra", () => {
    render(
      <HotelComparison
        prices={[
          price({ stayTotal: 1000 }),
          price({ date: "2026-07-05", stayTotal: 1400 }),
          price({
            hotelId: "maritima",
            hotelName: "Maritima Villas",
            stayTotal: 1250,
          }),
        ]}
      />
    );

    const cocooning = screen.getByRole("heading", {
      name: "Cocooning Suites",
    }).parentElement as HTMLElement;
    expect(cocooning.textContent).toContain("Lowest: 1000.00 EUR");
    expect(cocooning.textContent).toContain("Average: 1200.00 EUR");
    expect(cocooning.textContent).toContain("Results: 2");
    expect(within(cocooning).queryByText(SAVINGS)).toBeNull();

    const maritima = screen.getByRole("heading", { name: "Maritima Villas" })
      .parentElement as HTMLElement;
    expect(
      within(maritima).getByText("Save 250.00 EUR vs other hotels")
    ).toBeTruthy();
  });
});

describe("MonthlySummary", () => {
  it("summarises prices per month, in calendar order, when expanded", async () => {
    const user = userEvent.setup();
    render(
      <MonthlySummary
        prices={[
          price({ date: "2026-08-01", stayTotal: 1600 }),
          price({ date: "2026-07-04", stayTotal: 1000 }),
          price({ date: "2026-07-18", stayTotal: 1400 }),
        ]}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Monthly Price Summary" })
    );

    const months = screen.getAllByRole("heading", { level: 4 });
    expect(months.map((m) => m.textContent)).toEqual([
      "July 2026",
      "August 2026",
    ]);
    const july = months[0].parentElement as HTMLElement;
    expect(july.textContent).toContain("Lowest: 1000.00 EUR");
    expect(july.textContent).toContain("Average: 1200.00 EUR");
    expect(july.textContent).toContain("Highest: 1400.00 EUR");
    expect(july.textContent).toContain("2 dates available");
  });
});
