import { describe, expect, it } from "vitest";
import { evaluateDealAlert } from "../alerts";

describe("evaluateDealAlert", () => {
  it("does not fire when no thresholds are set", () => {
    const r = evaluateDealAlert({
      current: 100,
      previous: 200,
      targetPrice: null,
      alertPctDrop: null,
    });
    expect(r.fired).toBe(false);
  });

  it("fires the target alert when crossing at or below the target", () => {
    const r = evaluateDealAlert({
      current: 180,
      previous: 210,
      targetPrice: 200,
      alertPctDrop: null,
    });
    expect(r.hitTarget).toBe(true);
    expect(r.fired).toBe(true);
  });

  it("does not re-fire the target alert once already below", () => {
    const r = evaluateDealAlert({
      current: 170,
      previous: 180, // already below the 200 target
      targetPrice: 200,
      alertPctDrop: null,
    });
    expect(r.hitTarget).toBe(false);
    expect(r.fired).toBe(false);
  });

  it("fires the target alert on the first snapshot when already below", () => {
    const r = evaluateDealAlert({
      current: 150,
      previous: null,
      targetPrice: 200,
      alertPctDrop: null,
    });
    expect(r.hitTarget).toBe(true);
  });

  it("fires the percent-drop alert when the step down meets the threshold", () => {
    const r = evaluateDealAlert({
      current: 180,
      previous: 200, // 10% drop
      targetPrice: null,
      alertPctDrop: 10,
    });
    expect(r.hitPctDrop).toBe(true);
    expect(r.dropPct).toBeCloseTo(10);
    expect(r.fired).toBe(true);
  });

  it("does not fire the percent-drop alert below the threshold", () => {
    const r = evaluateDealAlert({
      current: 190,
      previous: 200, // 5% drop
      targetPrice: null,
      alertPctDrop: 10,
    });
    expect(r.hitPctDrop).toBe(false);
    expect(r.fired).toBe(false);
  });

  it("does not fire the percent-drop alert without a previous price", () => {
    const r = evaluateDealAlert({
      current: 100,
      previous: null,
      targetPrice: null,
      alertPctDrop: 10,
    });
    expect(r.hitPctDrop).toBe(false);
    expect(r.dropPct).toBeNull();
  });

  it("collects a reason per fired trigger", () => {
    const r = evaluateDealAlert({
      current: 150,
      previous: 200, // 25% drop, also below target 180
      targetPrice: 180,
      alertPctDrop: 10,
    });
    expect(r.hitTarget).toBe(true);
    expect(r.hitPctDrop).toBe(true);
    expect(r.reasons).toHaveLength(2);
  });
});
