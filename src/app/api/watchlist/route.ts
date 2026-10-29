import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getHotel } from "@/domains/hotels/registry";
import { addWatchlistEntry, getAllWatchlist } from "@/domains/tracking/queries";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  adults: z.number().int().min(1).max(8),
  alertPctDrop: z.number().int().min(1).max(90).nullish(),
  checkinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  children: z.number().int().min(0).max(6).default(0),
  hotelSlug: z.string().min(1),
  nights: z.number().int().min(1).max(30),
  roomType: z.string().min(1).nullish(),
  targetPrice: z.number().positive().max(1_000_000).nullish(),
});

export async function GET() {
  const entries = await getAllWatchlist();
  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { details: parsed.error.issues, error: "Invalid request" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  let hotelSlug: string;
  try {
    hotelSlug = getHotel(data.hotelSlug).slug;
  } catch {
    return NextResponse.json(
      { error: `Unknown hotel: ${data.hotelSlug}` },
      { status: 400 }
    );
  }

  const entry = await addWatchlistEntry({
    adults: data.adults,
    alertPctDrop: data.alertPctDrop ?? null,
    checkinDate: data.checkinDate,
    children: data.children,
    hotelSlug,
    nights: data.nights,
    roomType: data.roomType ?? null,
    targetPrice: data.targetPrice ?? null,
  });

  return NextResponse.json(entry, { status: 201 });
}
