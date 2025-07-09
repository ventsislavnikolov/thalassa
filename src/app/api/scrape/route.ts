import { NextRequest, NextResponse } from "next/server";
import { fetchAllHotels, findLowestPricesAllHotels } from "@/lib/multi-scraper";
import { analyzeTopDeals } from "@/lib/analyzer";
import { SearchParams } from "@/lib/types";
import { format, addDays } from "date-fns";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      checkin,
      nights = 5,
      adults = 2,
      children = 0,
      room = "",
      months = 3,
      hotelIds = ["bluecarpet", "cocooning"],
      includeWeather = false,
      isYearSearch = false,
    } = body;

    // Validate required fields
    if (!checkin) {
      return NextResponse.json(
        { error: "Check-in date is required" },
        { status: 400 }
      );
    }

    const checkoutDate = format(
      addDays(new Date(checkin), nights),
      "yyyy-MM-dd"
    );

    const searchParams: SearchParams = {
      checkin,
      checkout: checkoutDate,
      nights: parseInt(nights),
      adults: parseInt(adults),
      children: parseInt(children),
      infants: 0,
      room,
      currency: "BGN",
    };

    // Limit months to prevent timeouts on Vercel
    const maxMonths = process.env.VERCEL
      ? 6
      : isYearSearch
      ? 12
      : parseInt(months);
    const monthsToCheck = Math.min(
      maxMonths,
      isYearSearch ? 12 : parseInt(months)
    );

    let allPrices: any[] = [];
    let roomOptions: any[] = [];

    if (monthsToCheck === 1) {
      // Single month search
      const responses = await fetchAllHotels(searchParams, hotelIds);

      // Get room options from first response
      const firstResponse = responses.find((r) => r.roomOptions.length > 0);
      if (firstResponse) {
        roomOptions = firstResponse.roomOptions;
      }

      allPrices = [];
      responses.forEach((response) => {
        console.log(
          `💰 Adding ${response.prices.length} prices from ${response.hotelName}`
        );
        allPrices.push(...response.prices);
      });

      allPrices.sort((a, b) => a.stayTotal - b.stayTotal);

      // Debug logging for single-month search
      if (allPrices.length > 0) {
        const lowestPrice = allPrices[0];

        const has234 = allPrices.find((p) => p.stayTotal === 2.34);
        console.log(has234, lowestPrice);
      }
    } else {
      // Multi-month search
      allPrices = await findLowestPricesAllHotels(
        searchParams,
        monthsToCheck,
        hotelIds
      );
    }

    let weatherAnalysis = null;
    if (includeWeather && allPrices.length > 0) {
      weatherAnalysis = await analyzeTopDeals(allPrices, 5);
    }

    return NextResponse.json({
      prices: allPrices,
      roomOptions,
      weatherAnalysis,
      searchParams,
      meta: {
        totalResults: allPrices.length,
        monthsChecked: monthsToCheck,
        hotelsSearched: hotelIds,
      },
    });
  } catch (error) {
    console.error("Scraping error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hotel prices. Please try again." },
      { status: 500 }
    );
  }
}
