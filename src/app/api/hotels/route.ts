import { NextResponse } from "next/server";
import { getAllHotels } from "@/domains/hotels/registry";

export function GET() {
  const hotels = getAllHotels();
  return NextResponse.json(hotels);
}
