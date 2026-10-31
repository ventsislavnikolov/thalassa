// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getHotel } from "@/domains/hotels/registry";
import { HotelGrid } from "../hotel-grid";

describe("HotelGrid", () => {
  it("shows a card per hotel linking to its details", () => {
    render(
      <HotelGrid hotels={[getHotel("bluecarpet"), getHotel("cocooning")]} />
    );

    const links = screen.getAllByRole("link", { name: "View Details" });
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/hotels/blue-carpet",
      "/hotels/cocooning",
    ]);
    expect(screen.getByText("Blue Carpet Suites")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Cocooning Suites" })).toBeTruthy();
    expect(screen.getAllByText("calendar")).toHaveLength(2);
  });
});
