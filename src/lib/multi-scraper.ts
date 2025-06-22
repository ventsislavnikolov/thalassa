import axios from "axios";
import * as cheerio from "cheerio";
import { format, parse, addDays } from "date-fns";
import { SearchParams, PriceInfo, RoomOption, CalendarResponse } from "./types";
import { HotelConfig, getHotelConfig, getDefaultHotels } from "./hotels";

// Store for last raw HTML (using a Map for state management)
const lastRawHtmlCache = new Map<string, string>();

export async function fetchCalendarData(
  params: SearchParams,
  hotelId: string
): Promise<CalendarResponse> {
  const hotel = getHotelConfig(hotelId);
  const formData = buildFormData(params);

  try {
    const response = await axios.post(`${hotel.baseUrl}/calendar`, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    lastRawHtmlCache.set(hotelId, response.data);
    return parseCalendarHTML(response.data, params, hotel);
  } catch (error) {
    throw new Error(
      `Failed to fetch calendar data for ${hotel.name}: ${error}`
    );
  }
}

export async function fetchAllHotels(
  params: SearchParams,
  hotelIds?: string[]
): Promise<CalendarResponse[]> {
  const hotels = hotelIds ? hotelIds.map(getHotelConfig) : getDefaultHotels();
  const responses: CalendarResponse[] = [];

  for (const hotel of hotels) {
    try {
      const response = await fetchCalendarData(params, hotel.id);
      responses.push(response);
    } catch (error) {
      console.error(`Error fetching ${hotel.name}:`, error);
    }
  }

  return responses;
}

export async function findLowestPricesAllHotels(
  params: SearchParams,
  monthsToCheck: number = 3,
  hotelIds?: string[]
): Promise<PriceInfo[]> {
  const hotels = hotelIds ? hotelIds.map(getHotelConfig) : getDefaultHotels();
  const priceMap = new Map<string, PriceInfo>(); // date + hotel as key

  console.log(
    `Scanning ${monthsToCheck} months across ${hotels.length} hotels...`
  );

  for (const hotel of hotels) {
    console.log(`\n${hotel.displayName}:`);

    // First, get prices from the initial search
    try {
      const initialResponse = await fetchCalendarData(params, hotel.id);
      initialResponse.prices.forEach((price) => {
        const key = `${price.date}_${hotel.id}`;
        priceMap.set(key, price);
      });
    } catch (error) {
      console.error(`\nError fetching initial month for ${hotel.name}:`, error);
    }

    // Then check additional months
    const startDate = parse(params.checkin, "yyyy-MM-dd", new Date());
    const daysToSkip = monthsToCheck > 6 ? 25 : 30;

    for (let i = 1; i < monthsToCheck; i++) {
      const currentDate = addDays(startDate, i * daysToSkip);
      const searchParams: SearchParams = {
        ...params,
        checkin: format(currentDate, "yyyy-MM-dd"),
        checkout: format(addDays(currentDate, params.nights), "yyyy-MM-dd"),
      };

      try {
        const response = await fetchCalendarData(searchParams, hotel.id);
        response.prices.forEach((price) => {
          const key = `${price.date}_${hotel.id}`;
          if (!priceMap.has(key)) {
            priceMap.set(key, price);
          }
        });
        console.log(`Month ${i + 1} fetched successfully for ${hotel.name}`);
      } catch (error) {
        console.error(
          `Error fetching month ${i + 1} for ${hotel.name}:`,
          error
        );
      }

      // Add a small delay to avoid hammering the server
      if (monthsToCheck > 6) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  console.log("\n✅ Complete!");
  console.log(`Found prices for ${priceMap.size} date-hotel combinations\n`);

  // Convert map to array and sort by total price
  return Array.from(priceMap.values()).sort(
    (a, b) => a.stayTotal - b.stayTotal
  );
}

function buildFormData(params: SearchParams): URLSearchParams {
  const checkinDate = parse(params.checkin, "yyyy-MM-dd", new Date());

  const formData = new URLSearchParams({
    voucher: "",
    room: params.room || "",
    bk_code: "",
    offerid: "",
    checkin: params.checkin,
    checkout: params.checkout,
    cur_iso: params.currency || "BGN",
    fromd: format(checkinDate, "dd/MM/yyyy"),
    nights: params.nights.toString(),
    rooms: "1",
    adults: params.adults.toString(),
    children: (params.children || 0).toString(),
    infants: (params.infants || 0).toString(),
  });

  return formData;
}

function parseCalendarHTML(
  html: string,
  params: SearchParams,
  hotel: HotelConfig
): CalendarResponse {
  const $ = cheerio.load(html);
  const prices: PriceInfo[] = [];
  const roomOptions: RoomOption[] = [];

  // Extract month and year
  const monthYearText = $(".calendar-controls h2").text().trim();
  const [month, year] = monthYearText.split(" ");

  // Extract room options
  $('select[name="room"] option').each((_, el) => {
    const $option = $(el);
    const value = $option.attr("value");
    const name = $option.text().trim();
    if (value && !$option.hasClass("empty")) {
      roomOptions.push({ value, name });
    }
  });

  // Extract price data
  $(".calendar .avl").each((_, el) => {
    const $cell = $(el);
    const date = $cell.attr("data-date");
    const title = $cell.attr("data-title") || "";

    if (date) {
      // Extract price from title attribute - handle both BGN and лв (Bulgarian lev)
      const priceMatch = title.match(/([\d\s,]+\.?\d*)\s*(BGN|лв)/);
      // Extract total from the cell's HTML content
      const cellHtml = $cell.html() || "";
      const totalMatch = cellHtml.match(/([\d\s,]+\.?\d*)\s*(BGN|лв)/g);

      if (priceMatch) {
        // Price is in index 1 because index 0 is the full match
        const avgPerNight = parseFloat(
          priceMatch[1].replace(/[\s]/g, "").replace(",", ".")
        );

        // For total, we'll calculate it if we can't find it
        let stayTotal = avgPerNight * params.nights;

        if (totalMatch && totalMatch.length > 0) {
          // Get the last amount which should be the total
          const lastTotal = totalMatch[totalMatch.length - 1];
          stayTotal = parseFloat(
            lastTotal
              .replace(/\s*(BGN|лв)\s*/g, "")
              .replace(/[\s]/g, "")
              .replace(",", ".")
          );
        }

        const isLowestRate = $cell.find(".fa-star").length > 0;
        const dateObj = parse(date, "yyyy-MM-dd", new Date());
        const dayOfWeek = format(dateObj, "EEEE");

        prices.push({
          date,
          dayOfWeek,
          averagePerNight: avgPerNight,
          stayTotal: stayTotal,
          isLowestRate,
          nights: params.nights,
          currency: params.currency || "BGN",
          hotelId: hotel.id,
          hotelName: hotel.name,
        });
      }
    }
  });

  return {
    month,
    year: parseInt(year),
    prices,
    roomOptions,
    hotelId: hotel.id,
    hotelName: hotel.name,
  };
}

export function getLastRawHtml(hotelId: string): string {
  return lastRawHtmlCache.get(hotelId) || "";
}
