import { type NextRequest, NextResponse } from "next/server";
import { getHotel } from "@/domains/hotels/registry";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const hotel = getHotel(slug);
    return NextResponse.json(hotel);
  } catch {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }
}
