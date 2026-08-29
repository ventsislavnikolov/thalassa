import type { WatchlistEntry } from "./types";

export interface DealAlertInput {
  /** Percent-drop-vs-previous threshold (null = disabled). */
  alertPctDrop: number | null;
  /** New available price just scraped. */
  current: number;
  /** Previous stored available price, or null if none / previously unavailable. */
  previous: number | null;
  /** Target-price threshold (null = disabled). */
  targetPrice: number | null;
}

export interface DealAlertResult {
  dropPct: number | null;
  fired: boolean;
  hitPctDrop: boolean;
  hitTarget: boolean;
  reasons: string[];
}

/**
 * Decide whether a price change should fire a deal alert. Edge-triggered: the
 * target alert fires only on the snapshot that crosses from above (or unknown)
 * to at-or-below the target, and the percent-drop alert fires only when the
 * step down from the previous snapshot meets the threshold. Because the cron
 * stores a snapshot only when the price changes, this fires once per crossing
 * rather than every run.
 */
export function evaluateDealAlert(input: DealAlertInput): DealAlertResult {
  const { current, previous, targetPrice, alertPctDrop } = input;
  const reasons: string[] = [];

  const hitTarget =
    targetPrice !== null &&
    current <= targetPrice &&
    (previous === null || previous > targetPrice);
  if (hitTarget) {
    reasons.push(
      `Price ${current.toLocaleString()} is at or below your target ${targetPrice?.toLocaleString()}`
    );
  }

  const dropPct =
    previous !== null && previous > 0
      ? ((previous - current) / previous) * 100
      : null;

  const hitPctDrop =
    alertPctDrop !== null && dropPct !== null && dropPct >= alertPctDrop;
  if (hitPctDrop && dropPct !== null) {
    reasons.push(
      `Price dropped ${dropPct.toFixed(1)}% (from ${previous?.toLocaleString()} to ${current.toLocaleString()}), at or beyond your ${alertPctDrop}% threshold`
    );
  }

  return {
    fired: hitTarget || hitPctDrop,
    hitTarget,
    hitPctDrop,
    dropPct,
    reasons,
  };
}

/** Auto-alert defaults for entries with no explicit thresholds. */
export const AUTO_DROP_PCT = 10;
export const INSTANT_DROP_PCT = 25;
export const MIN_SNAPSHOTS_FOR_LOW = 3;

export interface AutoAlertInput {
  current: number;
  /** Lowest available price ever stored for this entry (null = none). */
  historicalMin: number | null;
  previous: number | null;
  /** Number of prior available snapshots (guards the new-low signal). */
  priorSnapshotCount: number;
}

export interface AutoAlertResult {
  dropPct: number | null;
  fired: boolean;
  hitNewLow: boolean;
  hitPctDrop: boolean;
  /** True when the drop is large enough to warrant an immediate email. */
  instant: boolean;
  reasons: string[];
}

/**
 * Default alerting for auto-tracked entries: fires on a >=10% step down from
 * the previous snapshot, or on a new historical low once enough snapshots
 * exist to make "low" meaningful. Drops of >=25% are flagged for an instant
 * email on top of the daily digest.
 */
export function evaluateAutoAlert(input: AutoAlertInput): AutoAlertResult {
  const { current, previous, historicalMin, priorSnapshotCount } = input;
  const reasons: string[] = [];

  const dropPct =
    previous !== null && previous > 0
      ? ((previous - current) / previous) * 100
      : null;

  const hitPctDrop = dropPct !== null && dropPct >= AUTO_DROP_PCT;
  if (hitPctDrop && dropPct !== null) {
    reasons.push(
      `Price dropped ${dropPct.toFixed(1)}% (from ${previous?.toLocaleString()} to ${current.toLocaleString()})`
    );
  }

  const hitNewLow =
    historicalMin !== null &&
    priorSnapshotCount >= MIN_SNAPSHOTS_FOR_LOW &&
    current < historicalMin;
  if (hitNewLow) {
    reasons.push(
      `New lowest price: ${current.toLocaleString()} (previous low ${historicalMin?.toLocaleString()})`
    );
  }

  return {
    fired: hitPctDrop || hitNewLow,
    hitPctDrop,
    hitNewLow,
    dropPct,
    instant: dropPct !== null && dropPct >= INSTANT_DROP_PCT,
    reasons,
  };
}

/**
 * Entries with explicit thresholds use the edge-triggered custom path with
 * immediate emails; everything else falls back to auto defaults + digest.
 */
export function resolveAlertMode(entry: WatchlistEntry): "custom" | "auto" {
  return entry.targetPrice !== null || entry.alertPctDrop !== null
    ? "custom"
    : "auto";
}
