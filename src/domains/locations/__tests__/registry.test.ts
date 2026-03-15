import { describe, expect, it } from "vitest";
import { getAllLocations, getLocation } from "../registry";

describe("locations registry", () => {
  it("returns all locations", () => {
    const locations = getAllLocations();
    expect(locations.length).toBe(4);
    expect(locations.map((l) => l.slug)).toContain("pefkochori");
  });

  it("gets location by slug", () => {
    const location = getLocation("kavala");
    expect(location.name).toBe("Kavala");
    expect(location.coordinates.latitude).toBe(40.05);
  });

  it("throws for unknown slug", () => {
    expect(() => getLocation("nonexistent")).toThrow("Location not found");
  });
});
