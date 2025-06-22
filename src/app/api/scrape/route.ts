import { NextRequest, NextResponse } from "next/server";
import { fetchAllHotels, findLowestPricesAllHotels } from "@/lib/multi-scraper";
import { analyzeTopDeals } from "@/lib/analyzer";
import { SearchParams } from "@/lib/types";
import { format, addDays } from "date-fns";

export async function POST(request: NextRequest) {
  console.log("🚀 Scraping API called");
  
  try {
    const body = await request.json();
    console.log("📝 Request body:", JSON.stringify(body, null, 2));

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

    const monthsToCheck = isYearSearch ? 12 : parseInt(months);
    console.log("🔍 Search params:", searchParams);
    console.log("📅 Months to check:", monthsToCheck);
    console.log("🏨 Hotel IDs:", hotelIds);

    let allPrices: any[] = [];
    let roomOptions: any[] = [];

    if (monthsToCheck === 1) {
      // Single month search
      console.log("🎯 Starting single month search...");
      const responses = await fetchAllHotels(searchParams, hotelIds);
      console.log(`📊 Received ${responses.length} hotel responses`);

      // Get room options from first response
      const firstResponse = responses.find((r) => r.roomOptions.length > 0);
      if (firstResponse) {
        roomOptions = firstResponse.roomOptions;
        console.log(`🏨 Found ${roomOptions.length} room options`);
      }

      allPrices = [];
      responses.forEach((response) => {
        console.log(`💰 Adding ${response.prices.length} prices from ${response.hotelName}`);
        allPrices.push(...response.prices);
      });

      allPrices.sort((a, b) => a.stayTotal - b.stayTotal);
      console.log(`✅ Total prices found: ${allPrices.length}`);
    } else {
      // Multi-month search
      console.log("📅 Starting multi-month search...");
      allPrices = await findLowestPricesAllHotels(
        searchParams,
        monthsToCheck,
        hotelIds
      );
      console.log(`✅ Multi-month search complete: ${allPrices.length} prices found`);
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
