import { describe, expect, it } from "vitest";
import { shouldRecordSnapshot } from "../delta";
import type { SnapshotValue } from "../types";

const available = (price: number): SnapshotValue => ({
  price,
  available: true,
});
const unavailable: SnapshotValue = { price: null, available: false };

describe("shouldRecordSnapshot", () => {
  it("records the first snapshot when there is no history", () => {
    expect(shouldRecordSnapshot(null, available(100))).toBe(true);
    expect(shouldRecordSnapshot(null, unavailable)).toBe(true);
  });

  it("skips an identical available price", () => {
    expect(shouldRecordSnapshot(available(100), available(100))).toBe(false);
  });

  it("records a price change", () => {
    expect(shouldRecordSnapshot(available(100), available(90))).toBe(true);
  });

  it("records a transition to unavailable", () => {
    expect(shouldRecordSnapshot(available(100), unavailable)).toBe(true);
  });

  it("records a transition back to available", () => {
    expect(shouldRecordSnapshot(unavailable, available(120))).toBe(true);
  });

  it("skips an unchanged unavailable result", () => {
    expect(shouldRecordSnapshot(unavailable, unavailable)).toBe(false);
  });
});
