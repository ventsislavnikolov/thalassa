import { addDays, format } from "date-fns";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { analyzeDeals } from "@/domains/analysis/combined-scorer";
import { getHotel } from "@/domains/hotels/registry";
import { getLocation } from "@/domains/locations/registry";
import {
  type ScrapeAllResult,
  scrapeHotels,
  scrapeHotelsMultiMonth,
} from "@/domains/scraping/engine";
import type { SearchParams } from "@/domains/scraping/types";
import { OpenMeteoProvider } from "@/domains/weather/providers/open-meteo";

const requestSchema = z.object({
  checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nights: z.number().min(1).max(30).default(5),
  adults: z.number().min(1).max(8).default(2),
  children: z.number().min(0).max(6).default(0),
  hotelSlugs: z.array(z.string()).min(1),
  searchMode: z.enum(["single", "multi-month", "year"]).default("single"),
  months: z.number().min(1).max(12).optional(),
  includeWeather: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      checkin,
      nights,
      adults,
      children,
      hotelSlugs,
      searchMode,
      months,
      includeWeather,
    } = parsed.data;

    const hotelIds = hotelSlugs.map((s) => getHotel(s).id);

    const checkoutDate = format(
      addDays(new Date(checkin), nights),
      "yyyy-MM-dd"
    );
    const searchParams: SearchParams = {
      checkin,
      checkout: checkoutDate,
      nights,
      adults,
      children,
      infants: 0,
      currency: "EUR",
    };

    let result: ScrapeAllResult;

    if (searchMode === "single") {
      result = await scrapeHotels(hotelIds, searchParams);
      result.results = result.results.filter((p) => p.date === checkin);
    } else {
      const maxMonths = process.env.VERCEL ? 6 : 12;
      const monthsToCheck = Math.min(
        searchMode === "year" ? 12 : (months ?? 3),
        maxMonths
      );
      result = await scrapeHotelsMultiMonth(
        hotelIds,
        searchParams,
        monthsToCheck
      );
    }

    let weather = null;
    if (includeWeather && result.results.length > 0) {
      try {
        const provider = new OpenMeteoProvider();
        const topPrices = result.results.slice(0, 5);
        const dates = topPrices.map((p) => p.date);

        const firstHotel = getHotel(hotelIds[0]);
        const location = getLocation(firstHotel.locationSlug);

        const weatherMap = await provider.fetchForecast(
          location.coordinates,
          dates,
          location.timezone
        );
        weather = analyzeDeals(result.results, weatherMap, 5);
      } catch {
        // Weather failure is non-fatal
      }
    }

    return NextResponse.json({
      results: result.results,
      roomOptions: result.roomOptions,
      weather,
      meta: {
        totalResults: result.results.length,
        hotelsSearched: hotelIds,
        searchDuration: Date.now() - startTime,
        errors: result.errors,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch hotel prices. Please try again." },
      { status: 500 }
    );
  }
}
