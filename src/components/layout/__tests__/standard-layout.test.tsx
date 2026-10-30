// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PageContainer } from "../page-container";
import { StandardLayout } from "../standard-layout";

describe("StandardLayout", () => {
  it("wraps the page in the site header, main and footer", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2027-03-01T12:00:00Z"));

    render(
      <StandardLayout>
        <p>Page body</p>
      </StandardLayout>
    );
    vi.useRealTimers();

    const nav = screen.getByRole("navigation");
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")])
    ).toEqual([
      ["Home", "/"],
      ["Hotels", "/hotels"],
      ["Search", "/search"],
      ["Watchlist", "/watchlist"],
    ]);
    expect(screen.getByRole("link", { name: "Thalassa" })).toHaveProperty(
      "pathname",
      "/"
    );
    expect(
      within(screen.getByRole("main")).getByText("Page body")
    ).toBeTruthy();
    expect(
      within(screen.getByRole("contentinfo")).getByText(
        "2027 Thalassa. All rights reserved."
      )
    ).toBeTruthy();
  });
});

describe("PageContainer", () => {
  it("adds extra classes after the base ones", () => {
    const { container } = render(
      <PageContainer className="relative">content</PageContainer>
    );

    expect(container.firstElementChild?.className).toBe(
      "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative"
    );
  });

  it("uses only the base classes by default", () => {
    const { container } = render(<PageContainer>content</PageContainer>);

    expect(container.firstElementChild?.className).toBe(
      "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
    );
  });
});
