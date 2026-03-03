import { type NextRequest, NextResponse } from "next/server";
import { getLocation } from "@/domains/locations/registry";
import { OpenMeteoProvider } from "@/domains/weather/providers/open-meteo";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locationSlug = searchParams.get("location");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!(locationSlug && from && to)) {
    return NextResponse.json(
      { error: "Missing required params: location, from, to" },
      { status: 400 }
    );
  }

  try {
    const location = getLocation(locationSlug);
    const provider = new OpenMeteoProvider();

    const dates: string[] = [];
    const current = new Date(from);
    const end = new Date(to);
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    const weatherMap = await provider.fetchForecast(
      location.coordinates,
      dates,
      location.timezone
    );

    return NextResponse.json({
      location: locationSlug,
      data: Array.from(weatherMap.values()),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}
