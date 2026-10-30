// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceHistoryChart } from "../price-history-chart";
import { PriceTrendStats } from "../price-trend-stats";
import { snapshot, trend } from "./fixtures";

const NO_POINTS = /No price points recorded yet/u;
const HISTORICAL_LOW = /historical low/u;
const TRENDING = /Trending/u;

describe("PriceHistoryChart", () => {
  it("explains that there are no price points yet", () => {
    render(
      <PriceHistoryChart
        snapshots={[snapshot(1, null, "2026-06-01T08:00:00Z")]}
      />
    );

    expect(screen.getByText(NO_POINTS)).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows the single price until it changes", () => {
    render(
      <PriceHistoryChart
        snapshots={[
          snapshot(1, 1200, "2026-06-01T08:00:00Z"),
          snapshot(2, null, "2026-06-02T08:00:00Z"),
        ]}
      />
    );

    expect(
      screen.getByText(
        "One data point so far: EUR 1,200. The chart appears once the price changes."
      )
    ).toBeTruthy();
  });

  it("charts every available price and marks the lowest and latest", () => {
    const { container } = render(
      <PriceHistoryChart
        snapshots={[
          snapshot(1, 1500, "2026-06-01T08:00:00Z"),
          snapshot(2, 1100, "2026-06-02T08:00:00Z"),
          snapshot(3, null, "2026-06-03T08:00:00Z"),
          snapshot(4, 1300, "2026-06-04T08:00:00Z"),
        ]}
      />
    );

    expect(
      screen.getByRole("img", { name: "Price history chart" })
    ).toBeTruthy();
    const titles = [...container.querySelectorAll("title")].map(
      (t) => t.textContent
    );
    expect(titles).toHaveLength(5);
    expect(titles).toContain("Lowest: 1,100");
    expect(titles).toContain("Latest: 1,300");
    const line = container.querySelectorAll("path")[1].getAttribute("d");
    // Highest price at the top (y=18), lowest at the bottom (y=142).
    expect(line).toBe("M 10.0 18.0 L 203.3 142.0 L 590.0 80.0");
  });

  it("draws a flat line when price and time never change", () => {
    const { container } = render(
      <PriceHistoryChart
        snapshots={[
          snapshot(1, 1200, "2026-06-01T08:00:00Z"),
          snapshot(2, 1200, "2026-06-01T08:00:00Z"),
        ]}
      />
    );

    expect(container.querySelectorAll("path")[1].getAttribute("d")).toBe(
      "M 10.0 142.0 L 10.0 142.0"
    );
  });
});

describe("PriceTrendStats", () => {
  it("renders nothing without data", () => {
    const { container } = render(
      <PriceTrendStats trend={trend({ hasData: false })} />
    );

    expect(container.innerHTML).toBe("");
  });

  it("summarises the current price against its history", () => {
    render(<PriceTrendStats trend={trend()} />);

    expect(screen.getByText("EUR 1,300")).toBeTruthy();
    expect(screen.getByText("EUR 1,200")).toBeTruthy();
    expect(screen.getByText("EUR 1,500")).toBeTruthy();
    expect(screen.getByText("EUR 1,450")).toBeTruthy();
    expect(screen.getByText("+8.3%")).toBeTruthy();
    expect(screen.getByText("Trending down")).toBeTruthy();
    expect(screen.getByText("3 points")).toBeTruthy();
  });

  it("celebrates a price at its historical low", () => {
    render(
      <PriceTrendStats
        trend={trend({ direction: "up", isAtLow: true, pointCount: 1 })}
      />
    );

    expect(screen.getByText("At historical low")).toBeTruthy();
    expect(screen.getByText("Trending up")).toBeTruthy();
    expect(screen.getByText("1 point")).toBeTruthy();
  });

  it("flags an unavailable stay and leaves out the trend", () => {
    render(
      <PriceTrendStats
        trend={trend({
          changeFromLowPct: null,
          current: null,
          currentAvailable: false,
          direction: "flat",
          first: null,
        })}
      />
    );

    expect(screen.getByText("Unavailable")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.queryByText(HISTORICAL_LOW)).toBeNull();
    expect(screen.queryByText(TRENDING)).toBeNull();
  });
});
