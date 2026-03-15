import { describe, expect, it } from "vitest";
import { getAllHotels, getHotel, getHotelsByStrategy } from "../registry";

describe("hotels registry", () => {
  it("returns all 10 hotels", () => {
    expect(getAllHotels()).toHaveLength(10);
  });

  it("gets hotel by id", () => {
    const hotel = getHotel("bluecarpet");
    expect(hotel.name).toBe("Blue Carpet Suites");
    expect(hotel.strategyType).toBe("calendar");
  });

  it("gets hotel by slug", () => {
    const hotel = getHotel("blue-carpet");
    expect(hotel.id).toBe("bluecarpet");
  });

  it("throws for unknown hotel", () => {
    expect(() => getHotel("nonexistent")).toThrow("Hotel not found");
  });

  it("filters by strategy type", () => {
    const calendar = getHotelsByStrategy("calendar");
    const avl = getHotelsByStrategy("avl");
    expect(calendar).toHaveLength(4);
    expect(avl).toHaveLength(6);
  });

  it("every hotel has a locationSlug", () => {
    for (const hotel of getAllHotels()) {
      expect(hotel.locationSlug).toBeTruthy();
    }
  });
});
