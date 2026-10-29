import type { PriceSnapshot, PriceTrend } from "./types";

const EMPTY_TREND: PriceTrend = {
  changeFromFirstPct: null,
  changeFromLowPct: null,
  currency: "EUR",
  current: null,
  currentAvailable: false,
  direction: "flat",
  first: null,
  hasData: false,
  high: null,
  isAtLow: false,
  low: null,
  pointCount: 0,
};

function pct(from: number, to: number): number {
  if (from === 0) {
    return 0;
  }
  return ((to - from) / from) * 100;
}

/**
 * Derive current-vs-history stats from a watchlist entry's snapshots. Snapshots
 * are expected in chronological (ascending) order. Unavailable snapshots are
 * excluded from low/high/first, but the most recent snapshot still determines
 * whether the entry is currently available.
 */
export function computePriceTrend(snapshots: PriceSnapshot[]): PriceTrend {
  const priced = snapshots.filter(
    (s): s is PriceSnapshot & { price: number } =>
      s.available && s.price !== null
  );

  if (priced.length === 0) {
    return EMPTY_TREND;
  }

  const latest = snapshots.at(-1);
  const currentAvailable = latest?.available ?? false;
  const current = currentAvailable ? (latest?.price ?? null) : null;

  const prices = priced.map((s) => s.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const first = prices[0];
  const previous = priced.length > 1 ? prices.at(-2) : undefined;

  let direction: PriceTrend["direction"] = "flat";
  if (current !== null && previous !== undefined) {
    if (current < previous) {
      direction = "down";
    } else if (current > previous) {
      direction = "up";
    }
  }

  return {
    changeFromFirstPct: current === null ? null : pct(first, current),
    changeFromLowPct: current === null ? null : pct(low, current),
    currency: priced.at(-1)?.currency ?? "EUR",
    current,
    currentAvailable,
    direction,
    first,
    hasData: true,
    high,
    isAtLow: current !== null && current <= low,
    low,
    pointCount: priced.length,
  };
}
