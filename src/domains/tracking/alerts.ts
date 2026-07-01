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
