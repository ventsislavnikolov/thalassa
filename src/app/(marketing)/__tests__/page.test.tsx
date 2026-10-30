// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getAllHotels } from "@/domains/hotels/registry";
import HomePage from "../page";

const hotelCount = getAllHotels().length;

function hotelCard(name: string): HTMLElement {
  return screen
    .getByRole("heading", { level: 3, name })
    .closest("a") as HTMLElement;
}

describe("HomePage", () => {
  it("links a card for every hotel to its details", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: `Compare ${hotelCount} Hotels` })
    ).toBeTruthy();
    expect(
      screen.getByText(`Live prices from ${hotelCount} hotels`)
    ).toBeTruthy();
    for (const hotel of getAllHotels()) {
      expect(hotelCard(hotel.displayName).getAttribute("href")).toBe(
        `/hotels/${hotel.slug}`
      );
    }
  });

  it.each([
    ["Maritima Villas Resort", "Villa", "Paliouri"],
    ["Blue Carpet Suites", "Suites", "Pefkochori"],
    ["Eagles Palace", "Palace", "Ouranoupolis"],
    ["Neema Maison", "Boutique", "Santorini"],
    ["Mount Athos Resort Chalkidiki", "Resort", "Ierissos"],
    ["Myra Hotel", "Hotel", "Kavala"],
  ])("labels %s as %s in %s", (name, type, location) => {
    render(<HomePage />);

    const card = hotelCard(name);
    expect(within(card).getByText(type)).toBeTruthy();
    expect(within(card).getByText(location)).toBeTruthy();
  });

  it.each([
    ["Kavala", ["kavala"]],
    ["Greek Islands", ["santorini", "milos", "paxos"]],
    ["Bulgarian Black Sea", ["obzor"]],
  ])("counts the hotels in %s", (region, slugs) => {
    render(<HomePage />);

    const count = getAllHotels().filter((h) =>
      slugs.includes(h.locationSlug)
    ).length;
    const tile = screen.getByRole("heading", { level: 3, name: region })
      .parentElement as HTMLElement;
    expect(
      within(tile).getByText(count === 1 ? "1 hotel" : `${count} hotels`)
    ).toBeTruthy();
  });
});
