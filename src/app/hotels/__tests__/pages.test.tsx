// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { getAllHotels } from "@/domains/hotels/registry";
import HotelDetailPage, { generateStaticParams } from "../[slug]/page";
import HotelsPage from "../page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const REGION_AND_COUNTRY = /, Halkidiki, Greece\./u;

function detail(slug: string) {
  return HotelDetailPage({ params: Promise.resolve({ slug }) });
}

describe("HotelsPage", () => {
  it("lists every visible hotel", () => {
    render(<HotelsPage />);

    const count = getAllHotels().length;
    expect(
      screen.getByText(
        `Browse ${count} premium hotels across Greece and Bulgaria`
      )
    ).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "View Details" })).toHaveLength(
      count
    );
  });
});

describe("HotelDetailPage", () => {
  it("pre-renders a page per visible hotel", () => {
    expect(generateStaticParams()).toEqual(
      getAllHotels().map((h) => ({ slug: h.slug }))
    );
  });

  it("shows the hotel, its location and links to search it", async () => {
    render(await detail("blue-carpet"));

    expect(
      screen.getByRole("heading", { level: 1, name: "Blue Carpet Suites" })
    ).toBeTruthy();
    expect(screen.getAllByText("Pefkochori").length).toBeGreaterThan(0);
    expect(screen.getByText(REGION_AND_COUNTRY)).toBeTruthy();
    for (const name of ["Check Prices", "Search Available Dates"]) {
      expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(
        "/search?hotel=blue-carpet"
      );
    }
  });

  it("shows the description when the hotel has one", async () => {
    const described = getAllHotels().find((h) => h.description);
    if (!described?.description) {
      throw new Error("expected at least one hotel with a description");
    }
    render(await detail(described.slug));

    expect(screen.getByText(described.description)).toBeTruthy();
  });

  it("answers not found for an unknown hotel", async () => {
    await expect(detail("atlantis")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });
});
