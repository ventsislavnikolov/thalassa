import { addDays, format } from "date-fns";
import { type NextRequest, NextResponse } from "next/server";
import { getHotel } from "@/domains/hotels/registry";
import { buildDigest, type DigestItem } from "@/domains/tracking/digest";
import { sendEmail } from "@/domains/tracking/notify";
import {
  getAllWatchlist,
  getPriceStats,
  getUndigestedAlertEvents,
  markEventsDigested,
} from "@/domains/tracking/queries";
import type { WatchlistEntry } from "@/domains/tracking/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function bookingUrl(entry: WatchlistEntry): string {
  const hotel = getHotel(entry.hotelSlug);
  const checkout = format(
    addDays(new Date(entry.checkinDate), entry.nights),
    "yyyy-MM-dd"
  );
  return `${hotel.baseUrl}/?checkin=${entry.checkinDate}&checkout=${checkout}&adults=${entry.adults}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await getUndigestedAlertEvents();
  if (events.length === 0) {
    return NextResponse.json({ sent: false, events: 0 });
  }

  const watchlist = await getAllWatchlist();
  const byId = new Map(watchlist.map((entry) => [entry.id, entry]));

  const items: DigestItem[] = [];
  for (const event of events) {
    const entry = byId.get(event.watchlistId);
    if (!entry) {
      continue;
    }
    const stats = await getPriceStats(entry.id);
    items.push({
      entry,
      hotelName: getHotel(entry.hotelSlug).displayName,
      price: event.price,
      previousPrice: event.previousPrice,
      minPrice: event.minPrice ?? stats.min,
      avgPrice: stats.avg,
      reasons: event.reasons,
      bookingUrl: bookingUrl(entry),
    });
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const content = buildDigest(items, today);
  if (!content) {
    await markEventsDigested(events.map((e) => e.id));
    return NextResponse.json({ sent: false, events: events.length });
  }

  const status = await sendEmail(content);
  if (status === "failed") {
    return NextResponse.json(
      { sent: false, events: events.length, error: "Email failed to send" },
      { status: 500 }
    );
  }
  // "skipped" (Resend not configured) still clears the queue so events don't
  // pile up forever; snapshots remain the durable record.
  await markEventsDigested(events.map((e) => e.id));
  return NextResponse.json({ sent: status === "sent", events: events.length });
}
