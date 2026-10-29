import { addDays, format } from "date-fns";
import { type NextRequest, NextResponse } from "next/server";
import { buildBookingUrl } from "@/domains/hotels/booking-url";
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
  const checkout = format(
    addDays(new Date(entry.checkinDate), entry.nights),
    "yyyy-MM-dd"
  );
  return buildBookingUrl(getHotel(entry.hotelSlug), {
    adults: entry.adults,
    checkin: entry.checkinDate,
    checkout,
  });
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await getUndigestedAlertEvents();
  if (events.length === 0) {
    return NextResponse.json({ events: 0, sent: false });
  }

  const watchlist = await getAllWatchlist();
  const byId = new Map(watchlist.map((entry) => [entry.id, entry]));

  const watched = events.flatMap((event) => {
    const entry = byId.get(event.watchlistId);
    return entry ? [{ entry, event }] : [];
  });
  const items: DigestItem[] = await Promise.all(
    watched.map(async ({ entry, event }) => {
      const stats = await getPriceStats(entry.id);
      return {
        avgPrice: stats.avg,
        bookingUrl: bookingUrl(entry),
        entry,
        hotelName: getHotel(entry.hotelSlug).displayName,
        minPrice: event.minPrice ?? stats.min,
        previousPrice: event.previousPrice,
        price: event.price,
        reasons: event.reasons,
      };
    })
  );

  const today = format(new Date(), "yyyy-MM-dd");
  const content = buildDigest(items, today);
  if (!content) {
    await markEventsDigested(events.map((e) => e.id));
    return NextResponse.json({ events: events.length, sent: false });
  }

  const status = await sendEmail(content);
  if (status === "failed") {
    return NextResponse.json(
      { error: "Email failed to send", events: events.length, sent: false },
      { status: 500 }
    );
  }
  // "skipped" (Resend not configured) still clears the queue so events don't
  // pile up forever; snapshots remain the durable record.
  await markEventsDigested(events.map((e) => e.id));
  return NextResponse.json({ events: events.length, sent: status === "sent" });
}
