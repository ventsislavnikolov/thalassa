import { describe, expect, it } from "vitest";
import { PriceFormat, parsePrice } from "../parsers/price-parser";

describe("parsePrice", () => {
  describe("US format (comma=thousands, dot=decimal)", () => {
    it("parses 5,106.67", () => {
      expect(parsePrice("5,106.67")).toBe(5106.67);
    });

    it("parses 1,234.56", () => {
      expect(parsePrice("1,234.56")).toBe(1234.56);
    });

    it("parses 12,345.00", () => {
      expect(parsePrice("12,345.00")).toBe(12_345);
    });

    it("parses 123.45 (no thousands)", () => {
      expect(parsePrice("123.45")).toBe(123.45);
    });
  });

  describe("EU format (space/nbsp=thousands, comma=decimal)", () => {
    it("parses 1 382,77 (regular space)", () => {
      expect(parsePrice("1 382,77")).toBe(1382.77);
    });

    it("parses 1\u00A0382,77 (non-breaking space)", () => {
      expect(parsePrice("1\u00A0382,77")).toBe(1382.77);
    });

    it("parses 2 464,35", () => {
      expect(parsePrice("2 464,35")).toBe(2464.35);
    });

    it("parses 382,77 (no thousands)", () => {
      expect(parsePrice("382,77")).toBe(382.77);
    });
  });

  describe("EU format (dot=thousands, comma=decimal)", () => {
    it("parses 1.382,77", () => {
      expect(parsePrice("1.382,77")).toBe(1382.77);
    });

    it("parses 12.345,67", () => {
      expect(parsePrice("12.345,67")).toBe(12_345.67);
    });
  });

  describe("plain numbers", () => {
    it("parses 2347", () => {
      expect(parsePrice("2347")).toBe(2347);
    });

    it("parses 500", () => {
      expect(parsePrice("500")).toBe(500);
    });

    it("parses 0", () => {
      expect(parsePrice("0")).toBe(0);
    });
  });

  describe("comma as thousands only (3 digits after comma)", () => {
    it("parses 2,347 as 2347", () => {
      expect(parsePrice("2,347")).toBe(2347);
    });

    it("parses 12,500 as 12500", () => {
      expect(parsePrice("12,500")).toBe(12_500);
    });
  });

  describe("currency symbols mixed in", () => {
    it("parses EUR 1,382.77", () => {
      expect(parsePrice("EUR 1,382.77")).toBe(1382.77);
    });

    it("parses 1 382,77 EUR", () => {
      expect(parsePrice("1 382,77 EUR")).toBeCloseTo(1382.77);
    });

    it("parses EUR 500", () => {
      expect(parsePrice("EUR 500")).toBe(500);
    });

    it("strips currency symbol prefix", () => {
      expect(parsePrice("EUR1,234.56")).toBe(1234.56);
    });

    it("strips BGN prefix", () => {
      expect(parsePrice("BGN 5,106.67")).toBe(5106.67);
    });
  });

  describe("edge cases", () => {
    it("returns null for empty string", () => {
      expect(parsePrice("")).toBeNull();
    });

    it("returns null for non-numeric string", () => {
      expect(parsePrice("abc")).toBeNull();
    });

    it("returns null for whitespace only", () => {
      expect(parsePrice("   ")).toBeNull();
    });

    it("returns null for NaN result", () => {
      expect(parsePrice("not-a-number")).toBeNull();
    });
  });
});

describe("PriceFormat.detect", () => {
  it("detects US format (comma before dot)", () => {
    expect(PriceFormat.detect("5,106.67")).toBe("us");
  });

  it("detects EU format (dot before comma)", () => {
    expect(PriceFormat.detect("1.382,77")).toBe("eu");
  });

  it("detects EU format (space thousands, comma decimal)", () => {
    expect(PriceFormat.detect("1 382,77")).toBe("eu");
  });

  it("detects EU format (comma with 2 decimal digits)", () => {
    expect(PriceFormat.detect("382,77")).toBe("eu");
  });

  it("detects plain format (no separators)", () => {
    expect(PriceFormat.detect("2347")).toBe("plain");
  });

  it("detects plain format (dot decimal, no commas)", () => {
    expect(PriceFormat.detect("123.45")).toBe("us");
  });

  it("detects plain for comma as thousands only", () => {
    expect(PriceFormat.detect("2,347")).toBe("plain");
  });
});
