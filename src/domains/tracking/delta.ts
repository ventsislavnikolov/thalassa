import type { SnapshotValue } from "./types";

/**
 * Delta-storage rule: a new snapshot is recorded only when it differs from the
 * latest stored snapshot. A change in availability, or in price, both count.
 * A transition to/from an unavailable (null-price) result is a recordable change.
 */
export function shouldRecordSnapshot(
  latest: SnapshotValue | null,
  incoming: SnapshotValue
): boolean {
  if (!latest) {
    return true;
  }
  if (latest.available !== incoming.available) {
    return true;
  }
  return latest.price !== incoming.price;
}
