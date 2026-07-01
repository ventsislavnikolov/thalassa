import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getHotel } from "@/domains/hotels/registry";
import { addWatchlistEntry, getAllWatchlist } from "@/domains/tracking/queries";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  hotelSlug: z.string().min(1),
  checkinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nights: z.number().int().min(1).max(30),
  adults: z.number().int().min(1).max(8),
  children: z.number().int().min(0).max(6).default(0),
  roomType: z.string().min(1).nullish(),
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
      { error: "Invalid request", details: parsed.error.issues },
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
    hotelSlug,
    checkinDate: data.checkinDate,
    nights: data.nights,
    adults: data.adults,
    children: data.children,
    roomType: data.roomType ?? null,
  });

  return NextResponse.json(entry, { status: 201 });
}
