import type { WatchlistEntry } from "./types";

export interface DigestItem {
  avgPrice: number | null;
  bookingUrl: string;
  entry: WatchlistEntry;
  hotelName: string;
  minPrice: number | null;
  previousPrice: number | null;
  price: number;
  reasons: string[];
}

export interface EmailContent {
  html: string;
  subject: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(amount: number | null): string {
  return amount === null ? "–" : `EUR ${amount.toLocaleString()}`;
}

function dropPct(item: DigestItem): number | null {
  if (item.previousPrice === null || item.previousPrice <= 0) {
    return null;
  }
  return ((item.previousPrice - item.price) / item.previousPrice) * 100;
}

function stayLine(entry: WatchlistEntry): string {
  return `${entry.checkinDate}, ${entry.nights} night${entry.nights === 1 ? "" : "s"}, ${entry.adults} adult${entry.adults === 1 ? "" : "s"}${entry.children > 0 ? `, ${entry.children} children` : ""}`;
}

function itemText(item: DigestItem): string {
  const drop = dropPct(item);
  const lines = [
    `${item.hotelName} — ${money(item.price)} (${stayLine(item.entry)})`,
    `  was ${money(item.previousPrice)}${drop === null ? "" : ` (-${drop.toFixed(1)}%)`}, low ${money(item.minPrice)}, avg ${money(item.avgPrice)}`,
    ...item.reasons.map((r) => `  • ${r}`),
    `  Book: ${item.bookingUrl}`,
  ];
  return lines.join("\n");
}

function itemHtml(item: DigestItem): string {
  const drop = dropPct(item);
  const reasons = item.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("");
  return `<div style="margin:0 0 20px 0;padding:16px;border:1px solid #e2e8f0;border-radius:8px">
<h3 style="margin:0 0 4px 0">${escapeHtml(item.hotelName)}</h3>
<p style="margin:0 0 8px 0;color:#64748b">${escapeHtml(stayLine(item.entry))}</p>
<p style="margin:0 0 8px 0;font-size:18px"><strong>${money(item.price)}</strong>${
    drop === null
      ? ""
      : ` <span style="color:#16a34a">▼ ${drop.toFixed(1)}%</span>`
  }</p>
<p style="margin:0 0 8px 0;color:#64748b">Was ${money(item.previousPrice)} · Low ${money(item.minPrice)} · Avg ${money(item.avgPrice)}</p>
${reasons ? `<ul style="margin:0 0 8px 0;padding-left:20px">${reasons}</ul>` : ""}
<a href="${escapeHtml(item.bookingUrl)}" style="color:#2563eb">Book now</a>
</div>`;
}

/** Build the daily digest email; null when there is nothing to report. */
export function buildDigest(
  items: DigestItem[],
  date: string
): EmailContent | null {
  if (items.length === 0) {
    return null;
  }
  const sorted = [...items].sort(
    (a, b) => (dropPct(b) ?? -1) - (dropPct(a) ?? -1)
  );
  const subject = `Price digest ${date}: ${items.length} deal${items.length === 1 ? "" : "s"} spotted`;
  const text = [
    `Price changes worth a look (${date}):`,
    "",
    ...sorted.map(itemText),
  ].join("\n\n");
  const html = `<h2 style="margin:0 0 16px 0">Price changes worth a look</h2>
<p style="margin:0 0 16px 0;color:#64748b">${escapeHtml(date)}</p>
${sorted.map(itemHtml).join("\n")}`;
  return { subject, text, html };
}

/** Rich single-deal email for instant/custom alerts. */
export function buildRichAlertEmail(item: DigestItem): EmailContent {
  const subject = `Deal alert: ${item.hotelName} → ${money(item.price)} for ${item.entry.checkinDate}`;
  return {
    subject,
    text: itemText(item),
    html: itemHtml(item),
  };
}
