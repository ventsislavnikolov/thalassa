// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CombinedAnalysis } from "@/domains/analysis/types";
import { BeachScore } from "../beach-score";
import { WeatherCard } from "../weather-card";
import { WeatherGrid } from "../weather-grid";
import { WeatherSummary } from "../weather-summary";

const CARD_TITLE = /^Saturday, July \d+, 2026$/u;

function analysis(
  overrides: Partial<CombinedAnalysis> = {},
  weather: Partial<CombinedAnalysis["weatherData"]> = {}
): CombinedAnalysis {
  return {
    overallRank: 1,
    priceInfo: {
      averagePerNight: 200,
      currency: "EUR",
      date: "2026-07-04",
      dayOfWeek: "Saturday",
      hotelId: "cocooning",
      hotelName: "Cocooning Suites",
      isLowestRate: false,
      nights: 5,
      stayTotal: 1000,
    },
    priceRank: 1,
    recommendation: "HIGHLY RECOMMENDED - Excellent value and weather",
    totalScore: 86.4,
    valueScore: 70,
    weatherData: {
      beachConditions: "Perfect beach weather",
      date: "2026-07-04",
      description: "Mainly clear",
      humidity: 55,
      precipitation: 0.25,
      recommendation: "Exceptional beach weather",
      score: 96,
      seaTemperature: 25.5,
      temperature: { avg: 27, max: 31, min: 23 },
      uvIndex: 8,
      weatherCode: 1,
      windSpeed: 9,
      ...weather,
    },
    weatherRank: 2,
    ...overrides,
  };
}

describe("BeachScore", () => {
  it.each([
    [85, "bg-secondary"],
    [70, "bg-amber-500"],
    [50, "bg-amber-500"],
    [49, "bg-destructive"],
  ])("colours a score of %i with %s", (score, colour) => {
    render(<BeachScore score={score} />);

    const badge = screen.getByText(`${score}/100`);
    expect(badge.className).toContain(colour);
  });
});

describe("WeatherCard", () => {
  it("shows the stay price, the forecast and how the date ranks", () => {
    const { container } = render(
      <WeatherCard analysis={analysis()} rank={1} />
    );

    expect(screen.getByText("Saturday, July 4, 2026")).toBeTruthy();
    expect(screen.getByText("Cocooning Suites - Saturday")).toBeTruthy();
    expect(screen.getByText("Best Choice")).toBeTruthy();
    expect(screen.getByText("1000.00 EUR")).toBeTruthy();
    expect(screen.getByText("200.00 EUR")).toBeTruthy();
    expect(screen.getByText("23° - 31°C")).toBeTruthy();
    expect(screen.getByText("25.5°C")).toBeTruthy();
    expect(screen.getByText("0.3mm")).toBeTruthy();
    expect(screen.getByText("9km/h")).toBeTruthy();
    expect(screen.getByText("96/100")).toBeTruthy();
    expect(screen.getByText("#1")).toBeTruthy();
    expect(screen.getByText("#2")).toBeTruthy();
    expect(screen.getByText("86.4").className).toContain("text-secondary");
    expect(screen.getByText("Exceptional beach weather")).toBeTruthy();
    expect(container.querySelector(".lucide-sun")).not.toBeNull();
  });

  it.each([
    [2, "Great Option"],
    [3, "Great Option"],
    [4, "Good Alternative"],
  ])("labels rank %i as %s", (rank, label) => {
    render(<WeatherCard analysis={analysis()} rank={rank} />);

    expect(screen.getByText(label)).toBeTruthy();
  });

  it.each([
    ["Partly cloudy", "lucide-cloud"],
    ["Slight rain", "lucide-droplets"],
    ["Light drizzle", "lucide-droplets"],
    ["Overcast", "lucide-sun"],
  ])("picks an icon for %s", (description, icon) => {
    render(<WeatherCard analysis={analysis({}, { description })} rank={2} />);

    const conditions = screen.getByText(description).closest("div")
      ?.parentElement as HTMLElement;
    expect(conditions.querySelector(`.${icon}`)).not.toBeNull();
  });

  it.each([
    [65, "text-amber-600"],
    [40, "text-destructive"],
  ])("colours an overall score of %i with %s", (totalScore, colour) => {
    render(<WeatherCard analysis={analysis({ totalScore })} rank={2} />);

    expect(screen.getByText(totalScore.toFixed(1)).className).toContain(colour);
  });

  it("shows 0°C when the sea temperature is unknown", () => {
    render(
      <WeatherCard
        analysis={analysis({}, { seaTemperature: undefined })}
        rank={2}
      />
    );

    expect(screen.getByText("0°C")).toBeTruthy();
  });
});

describe("WeatherGrid", () => {
  it("orders the cards by overall rank", () => {
    render(
      <WeatherGrid
        analyses={[
          analysis({
            overallRank: 2,
            priceInfo: { ...analysis().priceInfo, date: "2026-07-11" },
          }),
          analysis({ overallRank: 1 }),
        ]}
      />
    );

    expect(screen.getAllByText(CARD_TITLE).map((h) => h.textContent)).toEqual([
      "1Saturday, July 4, 2026",
      "2Saturday, July 11, 2026",
    ]);
  });
});

describe("WeatherSummary", () => {
  it("highlights the best overall date and the best weather score", () => {
    render(
      <WeatherSummary
        analyses={[
          analysis(
            {
              overallRank: 2,
              priceInfo: { ...analysis().priceInfo, stayTotal: 800 },
              recommendation: "ACCEPTABLE",
              totalScore: 61,
            },
            { score: 99 }
          ),
          analysis(),
        ]}
      />
    );

    const bestValue = screen.getByRole("heading", { name: "Best Value" })
      .parentElement as HTMLElement;
    expect(within(bestValue).getByText("1000.00 EUR")).toBeTruthy();
    expect(within(bestValue).getByText("Jul 4")).toBeTruthy();
    expect(screen.getByText("99/100")).toBeTruthy();
    expect(screen.getByText("86.4/100")).toBeTruthy();
    expect(
      screen.getByText("HIGHLY RECOMMENDED - Excellent value and weather")
    ).toBeTruthy();
  });
});
