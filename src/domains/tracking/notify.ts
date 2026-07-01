import type { DealAlertResult } from "./alerts";
import type { NewPriceSnapshot, WatchlistEntry } from "./types";

interface ResendConfig {
  apiKey: string;
  from: string;
  to: string;
}

function getConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_EMAIL_FROM;
  const to = process.env.ALERT_EMAIL_TO;
  if (!(apiKey && from && to)) {
    return null;
  }
  return { apiKey, from, to };
}

function buildSubject(
  entry: WatchlistEntry,
  snapshot: NewPriceSnapshot
): string {
  return `Deal alert: ${entry.hotelSlug} → ${snapshot.currency} ${snapshot.price} for ${entry.checkinDate}`;
}

function buildBody(
  entry: WatchlistEntry,
  snapshot: NewPriceSnapshot,
  result: DealAlertResult
): string {
  const stay = `${entry.checkinDate}, ${entry.nights} night${
    entry.nights === 1 ? "" : "s"
  }, ${entry.adults} adult${entry.adults === 1 ? "" : "s"}${
    entry.children > 0 ? `, ${entry.children} children` : ""
  }${entry.roomType ? `, ${entry.roomType}` : ""}`;

  return [
    `${entry.hotelSlug} is now ${snapshot.currency} ${snapshot.price}.`,
    "",
    `Stay: ${stay}`,
    "",
    ...result.reasons.map((r) => `• ${r}`),
  ].join("\n");
}

export type AlertSendResult = "sent" | "skipped" | "failed";

/**
 * Send a deal-alert email via the Resend REST API.
 * - "skipped": RESEND_API_KEY / ALERT_EMAIL_FROM / ALERT_EMAIL_TO not set, so
 *   alerts are disabled (the cron still records prices). Not an error.
 * - "failed": configured but the Resend request errored.
 * - "sent": delivered to Resend.
 */
export async function sendDealAlert(
  entry: WatchlistEntry,
  snapshot: NewPriceSnapshot,
  result: DealAlertResult
): Promise<AlertSendResult> {
  const config = getConfig();
  if (!config) {
    return "skipped";
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: config.to,
        subject: buildSubject(entry, snapshot),
        text: buildBody(entry, snapshot, result),
      }),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
