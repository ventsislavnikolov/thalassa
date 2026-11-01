import { describe, expect, it } from "vitest";
import { requireDefined } from "../assert";

describe("requireDefined", () => {
  it("returns a defined value, falsy ones included", () => {
    expect(requireDefined("cocooning", "a slug")).toBe("cocooning");
    expect(requireDefined(0, "a price")).toBe(0);
    expect(requireDefined(null, "a price")).toBeNull();
  });

  it("names the missing value in the error", () => {
    expect(() => requireDefined(undefined, "the first row")).toThrow(
      "Expected the first row to be defined"
    );
  });
});
