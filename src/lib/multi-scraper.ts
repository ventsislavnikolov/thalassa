/* eslint-disable @typescript-eslint/no-require-imports */
import axios from "axios";
import * as cheerio from "cheerio";
import { addDays, format, parse } from "date-fns";
import { getDefaultHotels, getHotelConfig, type HotelConfig } from "./hotels";
import type {
  CalendarResponse,
  PriceInfo,
  RoomOption,
  SearchParams,
} from "./types";

// Store for last raw HTML (using a Map for state management)
const lastRawHtmlCache = new Map<string, string>();

export async function fetchCalendarData(
  params: SearchParams,
  hotelId: string
): Promise<CalendarResponse> {
  const hotel = getHotelConfig(hotelId);

  // Handle hotels using /avl endpoint (Porto Carras, Eagles Resort)
  if (hotel.apiEndpoint === "/avl") {
    return await fetchAvlEndpointData(params, hotel);
  }

  const formData = buildFormData(params);

  try {
    console.log(`🌐 Fetching data from ${hotel.name} (${hotel.baseUrl})`);

    const response = await axios.post(`${hotel.baseUrl}/calendar`, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 30_000, // Increased timeout to 30 seconds for slower servers
    });

    console.log(`✅ Successfully fetched data from ${hotel.name}`);
    console.log(`📄 Response size: ${response.data.length} characters`);

    lastRawHtmlCache.set(hotelId, response.data);

    // Save raw HTML for debugging (commented out for now)
    if (process.env.NODE_ENV === "development") {
      const fs = await import("fs");
      const path = await import("path");
      const debugDir = path.join(process.cwd(), "debug");
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir);
      }
      const filename = path.join(debugDir, `${hotel.id}-${Date.now()}.html`);
      fs.writeFileSync(filename, response.data);
      console.log(`💾 Saved raw HTML to: ${filename}`);
    }

    return parseCalendarHTML(response.data, params, hotel);
  } catch (error) {
    console.error(`❌ Error fetching ${hotel.name}:`, error);

    // Log more details about the error
    if (axios.isAxiosError(error)) {
      console.error("🔍 Axios error details:", {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        timeout: error.config?.timeout,
      });
    }

    throw new Error(
      `Failed to fetch calendar data for ${hotel.name}: ${error}`
    );
  }
}

// Helper function to add delay between requests
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper function to identify calendar-based hotels (not using /avl endpoint)
function isCalendarHotel(hotelId: string): boolean {
  const calendarHotels = ["bluecarpet", "cocooning", "myra", "potideapalace"];
  return calendarHotels.includes(hotelId);
}

// Fetch calendar data for all room types
export async function fetchCalendarDataAllRooms(
  params: SearchParams,
  hotelId: string
): Promise<CalendarResponse> {
  const hotel = getHotelConfig(hotelId);

  console.log(`🏨 Fetching ALL room types for ${hotel.name}...`);

  // First call: Get room options (without room parameter)
  const initialResponse = await fetchCalendarData(params, hotelId);
  const roomOptions = initialResponse.roomOptions;

  console.log(`📋 Found ${roomOptions.length} room options for ${hotel.name}`);

  // If no room options available, return the initial response
  if (roomOptions.length === 0) {
    console.log(
      `⚠️ No room options found for ${hotel.name}, returning initial response`
    );
    return initialResponse;
  }

  // Fetch prices for each room type
  const allPrices: PriceInfo[] = [];

  for (const room of roomOptions) {
    console.log(
      `🔍 Fetching prices for room type: ${room.name} (${room.value})`
    );

    try {
      // Create params with room parameter
      const roomParams: SearchParams = {
        ...params,
        room: room.value,
      };

      // Fetch prices for this specific room type
      const roomResponse = await fetchCalendarData(roomParams, hotelId);

      // Tag each price with room type information
      const taggedPrices = roomResponse.prices.map((price) => ({
        ...price,
        roomType: room.name,
        roomCode: room.value,
      }));

      console.log(`✅ Found ${taggedPrices.length} prices for ${room.name}`);
      allPrices.push(...taggedPrices);

      // Add delay to avoid overwhelming the server (rate limiting)
      // Skip delay for the last room to save time
      if (room !== roomOptions[roomOptions.length - 1]) {
        await delay(150); // 150ms delay
      }
    } catch (error) {
      console.error(`❌ Error fetching room ${room.name}:`, error);
      // Continue with other rooms even if one fails
    }
  }

  console.log(
    `🎉 Total prices found for ${hotel.name}: ${allPrices.length} (across ${roomOptions.length} room types)`
  );

  return {
    ...initialResponse,
    prices: allPrices,
    roomOptions,
  };
}

export async function fetchAllHotels(
  params: SearchParams,
  hotelIds?: string[]
): Promise<CalendarResponse[]> {
  const hotels = hotelIds ? hotelIds.map(getHotelConfig) : getDefaultHotels();
  const responses: CalendarResponse[] = [];

  for (const hotel of hotels) {
    try {
      console.log(`🚀 Starting fetch for ${hotel.name}...`);

      // Use multi-room fetcher for calendar-based hotels
      const response = isCalendarHotel(hotel.id)
        ? await fetchCalendarDataAllRooms(params, hotel.id)
        : await fetchCalendarData(params, hotel.id);

      console.log(
        `✅ Successfully processed ${hotel.name}: ${response.prices.length} prices found`
      );
      responses.push(response);
    } catch (error) {
      console.error(`❌ Error fetching ${hotel.name}:`, error);
      // Add empty response to maintain order
      responses.push({
        month: "",
        year: 0,
        prices: [],
        roomOptions: [],
        hotelId: hotel.id,
        hotelName: hotel.name,
      });
    }
  }

  return responses;
}

export async function findLowestPricesAllHotels(
  params: SearchParams,
  monthsToCheck = 3,
  hotelIds?: string[]
): Promise<PriceInfo[]> {
  const hotels = hotelIds ? hotelIds.map(getHotelConfig) : getDefaultHotels();
  const priceMap = new Map<string, PriceInfo>(); // date + hotel as key

  console.log(
    `Scanning ${monthsToCheck} months across ${hotels.length} hotels...`
  );

  // Set timeout for each hotel processing
  const hotelTimeout = process.env.VERCEL ? 15_000 : 30_000; // 15s on Vercel, 30s locally

  for (const hotel of hotels) {
    console.log(`\n${hotel.displayName}:`);
    console.log(`🔍 Starting scraping for ${hotel.name} (${hotel.baseUrl})`);

    // Wrap hotel processing with timeout
    const processHotel = async () => {
      // First, get prices from the initial search
      try {
        console.log(`📅 Fetching initial month for ${hotel.name}...`);

        // Use multi-room fetcher for calendar-based hotels
        const initialResponse = isCalendarHotel(hotel.id)
          ? await fetchCalendarDataAllRooms(params, hotel.id)
          : await fetchCalendarData(params, hotel.id);

        console.log(
          `✅ Initial month fetched for ${hotel.name}, found ${initialResponse.prices.length} prices`
        );

        initialResponse.prices.forEach((price) => {
          // Include room code in key to support multiple rooms per date
          const key = `${price.date}_${hotel.id}_${price.roomCode || "default"}`;
          priceMap.set(key, price);
        });
      } catch (error) {
        console.error(
          `❌ Error fetching initial month for ${hotel.name}:`,
          error
        );
        console.error("🔍 Error details:", {
          message: error instanceof Error ? error.message : "Unknown error",
          hotelId: hotel.id,
          hotelName: hotel.name,
          baseUrl: hotel.baseUrl,
        });
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
          console.log(
            `📅 Fetching month ${i + 1}/${monthsToCheck} for ${hotel.name} (${
              searchParams.checkin
            })...`
          );

          // Use multi-room fetcher for calendar-based hotels
          const response = isCalendarHotel(hotel.id)
            ? await fetchCalendarDataAllRooms(searchParams, hotel.id)
            : await fetchCalendarData(searchParams, hotel.id);

          let newPrices = 0;
          response.prices.forEach((price) => {
            // Include room code in key to support multiple rooms per date
            const key = `${price.date}_${hotel.id}_${price.roomCode || "default"}`;
            if (!priceMap.has(key)) {
              priceMap.set(key, price);
              newPrices++;
            }
          });

          console.log(
            `✅ Month ${i + 1} fetched successfully for ${hotel.name}, found ${
              response.prices.length
            } prices (${newPrices} new)`
          );
        } catch (error) {
          console.error(
            `❌ Error fetching month ${i + 1} for ${hotel.name}:`,
            error
          );
          console.error(`🔍 Month ${i + 1} error details:`, {
            message: error instanceof Error ? error.message : "Unknown error",
            checkin: searchParams.checkin,
            hotelId: hotel.id,
            hotelName: hotel.name,
          });
        }

        // Add a small delay to avoid hammering the server
        if (monthsToCheck > 6) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    };

    // Process hotel with timeout
    try {
      await Promise.race([
        processHotel(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Hotel processing timeout")),
            hotelTimeout
          )
        ),
      ]);
    } catch (error) {
      console.error(
        `⏱️ Hotel processing timed out or failed for ${hotel.name}:`,
        error
      );
      continue; // Skip to next hotel
    }

    console.log(`🏁 Completed scraping for ${hotel.name}`);
  }

  console.log("\n✅ Complete!");
  console.log(`Found prices for ${priceMap.size} date-hotel combinations\n`);

  // Convert map to array and sort by total price
  const sortedPrices = Array.from(priceMap.values()).sort(
    (a, b) => a.stayTotal - b.stayTotal
  );

  // Debug logging for lowest prices
  console.log("🔍 SORTED PRICE DEBUGGING:");
  console.log(`   Total prices found: ${sortedPrices.length}`);
  if (sortedPrices.length > 0) {
    const lowestPrice = sortedPrices[0];
    console.log(
      `   Lowest price: ${lowestPrice.stayTotal} BGN (${lowestPrice.hotelName} on ${lowestPrice.date})`
    );

    // Check if 2.34 is in the top 5 lowest prices
    const top5 = sortedPrices.slice(0, 5);
    const has234 = top5.find((p) => p.stayTotal === 2.34);
    if (has234) {
      console.log("🎯 FOUND 2.34 IN TOP 5 LOWEST PRICES:");
      console.log(`   Hotel: ${has234.hotelName}`);
      console.log(`   Date: ${has234.date}`);
      console.log(`   Stay total: ${has234.stayTotal}`);
      console.log(`   Average per night: ${has234.averagePerNight}`);
    }
  }

  return sortedPrices;
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

  console.log(`🔍 Parsing HTML for ${hotel.name}`);
  console.log(`📏 HTML length: ${html.length} characters`);

  // Extract month and year
  const monthYearText = $(".calendar-controls h2").text().trim();
  const [month, year] = monthYearText.split(" ");
  console.log(`📅 Month/Year: ${monthYearText}`);

  // Extract room options - try both methods
  // Method 1: Check for select dropdown (used by some hotels)
  $('select[name="room"] option').each((_, el) => {
    const $option = $(el);
    const value = $option.attr("value");
    const name = $option.text().trim();
    if (value && !$option.hasClass("empty")) {
      roomOptions.push({ value, name });
    }
  });

  // Method 2: Extract from tr.room elements and data-room attributes (used by Cocooning, etc.)
  if (roomOptions.length === 0) {
    const roomMap = new Map<string, string>();

    // Find all tr.room elements to get room names
    $('tr.room').each((_, roomRow) => {
      const $roomRow = $(roomRow);
      const roomName = $roomRow.find('td.name').first().text().trim();

      // Find the next tr with data-room attribute (could be immediate sibling or further down)
      let $currentRow = $roomRow.next('tr');
      while ($currentRow.length > 0 && !$currentRow.hasClass('room')) {
        const roomCode = $currentRow.attr('data-room');
        if (roomCode && roomName) {
          roomMap.set(roomCode, roomName);
          break; // Found the room code, move to next room
        }
        $currentRow = $currentRow.next('tr');
      }
    });

    console.log(`   Room map has ${roomMap.size} entries: ${Array.from(roomMap.keys()).join(', ')}`);

    // Convert map to array
    roomMap.forEach((name, value) => {
      roomOptions.push({ value, name });
    });
  }

  console.log(`🏨 Found ${roomOptions.length} room options`);

  // Check if calendar exists
  const calendarCount = $(".calendar").length;
  const availableCells = $(".calendar .avl").length;
  console.log(
    `📊 Calendar elements: ${calendarCount}, Available cells: ${availableCells}`
  );

  // Save first available cell HTML for debugging
  if (availableCells > 0) {
    const firstAvailableCell = $(".calendar .avl").first();
    console.log("🔍 First available cell sample:");
    console.log(
      "   HTML:",
      firstAvailableCell.html()?.slice(0, 500) || "NO HTML"
    );
    console.log("   Attributes:", {
      "data-date": firstAvailableCell.attr("data-date"),
      "data-title": firstAvailableCell.attr("data-title"),
      class: firstAvailableCell.attr("class"),
    });
  }

  // Extract price data
  $(".calendar .avl").each((_, el) => {
    const $cell = $(el);
    const date = $cell.attr("data-date");
    const title = $cell.attr("data-title") || "";
    const cellHtml = $cell.html() || "";

    if (date) {
      // const cellHtml = $cell.html() || "";
      const cellText = $cell.text() || "";

      // Minimal debug logging - only for problematic dates
      if (
        date === "2025-10-10" ||
        cellText.includes("2.34") ||
        cellHtml.includes("2.34")
      ) {
        console.log(`📅 Processing cell for ${date}`);
        console.log(`   Title: ${title}`);
        console.log(`   Text: ${cellText.slice(0, 100)}...`);
        console.log(`   HTML: ${cellHtml.slice(0, 200)}...`);
      }

      // Updated regex patterns to handle both US and European number formats
      // US format: "Stay total:BGN 5,106.67" (comma = thousands, dot = decimal)
      // European format: "Общ престой:лв 1 382,77" (space = thousands, comma = decimal)
      // Handle various Unicode whitespace characters for better compatibility
      const totalPricePatterns = [
        // US format with comma as thousands separator and dot as decimal
        /(?:Stay total:|Общ престой:)\s*(?:BGN|лв)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*([\d,]+\.\d{2})/i,
        /(?:Stay total:|Общ престой:).*?([\d,]+\.\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв)/i,
        /(?:Stay total:|Общ престой:).*?<b>([\d,]+\.\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв)?<\/b>/i,
        // European format with space as thousands separator and comma as decimal (must be exactly 2 digits after comma)
        /(?:Stay total:|Общ престой:)\s*(?:BGN|лв)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]\d{3})*,\d{2})\b/i,
        /(?:Stay total:|Общ престой:).*?(\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]\d{3})*,\d{2})\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв)/i,
        /(?:Stay total:|Общ престой:).*?<b>(\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]\d{3})*,\d{2})\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв)?<\/b>/i,
        // Handle numbers without decimal places (like "2,347" or "2 347" in HTML) - must be 3 digits after separator
        /(?:Stay total:|Общ престой:)\s*(?:BGN|лв)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000,]\d{3})+)\b/i,
        /(?:Stay total:|Общ престой:).*?(\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000,]\d{3})+)\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв)/i,
        /(?:Stay total:|Общ престой:).*?<b>(\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000,]\d{3})+)\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв)?<\/b>/i,
        // Fallback: simple numbers without separators
        /(?:Stay total:|Общ престой:)\s*(?:BGN|лв)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(\d+)\b/i,
        /(?:Stay total:|Общ престой:).*?(\d+)\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв)/i,
        /(?:Stay total:|Общ престой:).*?<b>(\d+)\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв)?<\/b>/i,
      ];

      // Pattern 2: General patterns for both formats
      const generalPricePatterns = [
        // US format
        /(?:BGN|лв)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*([\d,]+\.\d{2})/i,
        /([\d,]+\.\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв)/i,
        // European format
        /(?:BGN|лв)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*([\d\s\u00A0\u2000-\u200A\u202F\u205F\u3000]+,\d{2})/i,
        /([\d\s\u00A0\u2000-\u200A\u202F\u205F\u3000]+,\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв)/i,
      ];

      // Try to match total price first
      let totalPriceMatch = null;
      for (const pattern of totalPricePatterns) {
        totalPriceMatch = cellText.match(pattern);
        if (totalPriceMatch) break;
      }

      // Try to match any price in title
      let perNightMatch = null;
      for (const pattern of generalPricePatterns) {
        perNightMatch = title.match(pattern);
        if (perNightMatch) break;
      }

      // Use total price if available, otherwise use per-night price
      let priceMatch = totalPriceMatch || perNightMatch;

      // If still no match, try any price pattern in the cell text
      if (!priceMatch) {
        for (const pattern of generalPricePatterns) {
          priceMatch = cellText.match(pattern);
          if (priceMatch) break;
        }
      }

      // Only log price match for problematic dates
      if (
        date === "2025-10-10" ||
        cellText.includes("2.34") ||
        cellHtml.includes("2.34") ||
        (priceMatch && priceMatch[0].includes("2.34"))
      ) {
        console.log(
          `   Price match: ${priceMatch ? priceMatch[0] : "NO MATCH"}`
        );
        console.log("   ---");
      }

      if (priceMatch) {
        // Price is in index 1 because index 0 is the full match
        let priceString = priceMatch[1];

        // Remove all Unicode whitespace characters (including regular spaces, non-breaking spaces, etc.)
        const allWhitespace = /[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;

        // Determine format based on pattern
        if (priceString.includes(",") && priceString.includes(".")) {
          // Could be either format - determine by position
          const commaIndex = priceString.indexOf(",");
          const dotIndex = priceString.indexOf(".");

          if (commaIndex < dotIndex) {
            // US format: "5,106.67" (comma = thousands, dot = decimal)
            priceString = priceString.replace(/,/g, "");
            // Already has dot as decimal separator
          } else {
            // European format: "1.382,77" (dot = thousands, comma = decimal)
            priceString = priceString.replace(/\./g, "").replace(",", ".");
          }
        } else if (priceString.includes(",") && !priceString.includes(".")) {
          // European format with comma as decimal: "1 382,77" or "2 464,35" or "2,34"
          // OR thousands separator without decimal: "2,347"
          const commaIndex = priceString.lastIndexOf(",");
          const afterComma = priceString.substring(commaIndex + 1);

          if (afterComma.length === 2 && /^\d{2}$/.test(afterComma)) {
            // This looks like a decimal separator (2 digits after comma)
            priceString = priceString
              .replace(allWhitespace, "")
              .replace(",", ".");
          } else {
            // This is likely a thousands separator (like "2,347")
            // Remove comma and treat as whole number
            priceString = priceString
              .replace(allWhitespace, "")
              .replace(",", "");
          }
        } else if (priceString.includes(".") && !priceString.includes(",")) {
          // US format with dot as decimal: "5106.67"
          priceString = priceString.replace(allWhitespace, "");
          // Already has dot as decimal separator
        } else {
          // No decimal separator, just remove whitespace and treat as whole number
          priceString = priceString.replace(allWhitespace, "");
        }

        const priceValue = Number.parseFloat(priceString);

        // Debug logging for incorrect price parsing
        if (priceValue < 100 && priceMatch[1].length > 4) {
          console.log("🚨 SUSPICIOUS PRICE PARSING:");
          console.log(`   Original matched: "${priceMatch[1]}"`);
          console.log(`   Processed string: "${priceString}"`);
          console.log(`   Final value: ${priceValue}`);
          console.log(`   Hotel: ${hotel.name}`);
          console.log(`   Cell text: ${cellText.slice(0, 200)}...`);
        }

        // Special check for 2.34 value
        if (priceValue === 2.34) {
          console.log("🎯 FOUND 2.34 VALUE:");
          console.log(`   Date: ${date}`);
          console.log(`   Hotel: ${hotel.name}`);
          console.log(`   Original matched: "${priceMatch[1]}"`);
          console.log(`   Processed string: "${priceString}"`);
          console.log(`   Cell text: ${cellText.slice(0, 300)}...`);
          console.log(`   Title: ${title}`);
          console.log(
            `   Total price match: ${totalPriceMatch ? "YES" : "NO"}`
          );
          console.log(`   Per night match: ${perNightMatch ? "YES" : "NO"}`);
        }

        let stayTotal: number;
        let avgPerNight: number;

        // If we found "Общ престой:" it's the total price
        if (totalPriceMatch) {
          stayTotal = priceValue;
          avgPerNight = stayTotal / params.nights;
        } else if (perNightMatch && !totalPriceMatch) {
          // Price from title is per night - need to multiply
          avgPerNight = priceValue;
          stayTotal = avgPerNight * params.nights;
        } else {
          // Assume it's total if no specific match
          stayTotal = priceValue;
          avgPerNight = stayTotal / params.nights;
        }

        const isLowestRate = $cell.find(".fa-star").length > 0;
        const dateObj = parse(date, "yyyy-MM-dd", new Date());
        const dayOfWeek = format(dateObj, "EEEE");

        // Debug logging for suspicious final prices
        if (avgPerNight < 10 || stayTotal < 50) {
          console.log("🚨 SUSPICIOUS FINAL PRICE:");
          console.log(`   Date: ${date}`);
          console.log(`   Hotel: ${hotel.name}`);
          console.log(`   Average per night: ${avgPerNight}`);
          console.log(`   Stay total: ${stayTotal}`);
          console.log(`   Original price value: ${priceValue}`);
          console.log(`   Original matched: "${priceMatch[1]}"`);
          console.log(`   Processed string: "${priceString}"`);
          console.log(
            `   Total price match: ${totalPriceMatch ? "YES" : "NO"}`
          );
          console.log(`   Per night match: ${perNightMatch ? "YES" : "NO"}`);
          console.log(
            `   Cell text contains: ${
              cellText.includes("2.34") ? "YES - HAS 2.34" : "NO"
            }`
          );
          console.log(
            `   Title contains: ${
              title.includes("2.34") ? "YES - HAS 2.34" : "NO"
            }`
          );
        }

        prices.push({
          date,
          dayOfWeek,
          averagePerNight: avgPerNight,
          stayTotal,
          isLowestRate,
          nights: params.nights,
          currency: params.currency || "BGN",
          hotelId: hotel.id,
          hotelName: hotel.name,
        });
      }
    }
  });

  console.log(`✅ Parsing complete: Found ${prices.length} prices`);

  return {
    month,
    year: Number.parseInt(year),
    prices,
    roomOptions,
    hotelId: hotel.id,
    hotelName: hotel.name,
  };
}

async function fetchAvlEndpointData(
  params: SearchParams,
  hotel: HotelConfig
): Promise<CalendarResponse> {
  try {
    console.log(`🌐 Fetching ${hotel.name} data from ${hotel.baseUrl}/avl`);

    // Parse checkin date and calculate checkout date
    const checkinDate = parse(params.checkin, "yyyy-MM-dd", new Date());
    const checkoutDate = addDays(checkinDate, params.nights);

    const formData = new URLSearchParams({
      htl_code: "",
      src: "261",
      room: "",
      bk_code: "",
      offerid: "",
      checkin: params.checkin,
      checkout: format(checkoutDate, "yyyy-MM-dd"),
      cur_iso: params.currency || "BGN",
      fromd: format(checkinDate, "dd/MM/yyyy"),
      tod: format(checkoutDate, "dd/MM/yyyy"),
      rooms: "1",
      adults: params.adults.toString(),
      children: (params.children || 0).toString(),
      infants: "0",
      voucher: "",
    });

    console.log(
      `📋 Form data for ${hotel.name}:`,
      Object.fromEntries(formData)
    );

    const response = await axios.post(`${hotel.baseUrl}/avl`, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 30_000,
    });

    console.log(`✅ Successfully fetched ${hotel.name} data`);

    // Ensure response.data is a string
    const html =
      typeof response.data === "string"
        ? response.data
        : JSON.stringify(response.data);
    console.log("📄 Response type:", typeof response.data);
    console.log("📏 HTML length:", html.length);

    return parseAvlEndpointHTML(html, params, hotel);
  } catch (error) {
    console.error(`❌ Error fetching ${hotel.name}:`, error);
    if (axios.isAxiosError(error)) {
      console.error("🔍 Error details:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        data: error.response?.data,
      });
    }
    throw new Error(`Failed to fetch ${hotel.name} data: ${error}`);
  }
}

function parseAvlEndpointHTML(
  html: string,
  params: SearchParams,
  hotel: HotelConfig
): CalendarResponse {
  const $ = cheerio.load(html);
  const prices: PriceInfo[] = [];
  const roomOptions: RoomOption[] = [];

  console.log(`🔍 Parsing ${hotel.name} HTML`);
  console.log(`📏 HTML length: ${html.length} characters`);

  // Debug: Save HTML for inspection
  if (process.env.NODE_ENV === "development") {
    try {
      const fs = require("fs");
      const path = require("path");
      const debugDir = path.join(process.cwd(), "debug");
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir);
      }
      const filename = path.join(debugDir, `${hotel.id}-${Date.now()}.html`);
      fs.writeFileSync(filename, String(html));
      console.log(`💾 Saved ${hotel.name} HTML to: ${filename}`);
    } catch (error) {
      console.log("⚠️ Could not save debug HTML:", error);
    }
  }

  // Log first 500 characters of HTML to understand structure
  console.log("📄 HTML preview:", html.substring(0, 500));

  // Check if this is an error page or no availability message
  const pageTitle = $("title").text().trim();
  const bodyText = $("body").text().trim();

  console.log(`📰 Page title: "${pageTitle}"`);
  console.log("📝 Body text preview:", bodyText.substring(0, 200));

  // Method 1: Look for any table rows with room data
  const tableRows = $("table tr, .room-row, .accommodation-row, [data-rate]");
  console.log(`📊 Found ${tableRows.length} table rows`);

  // Method 2: Look for any price containers
  const priceContainers = $(
    '.price, .rate, .cost, [class*="price"], [class*="rate"]'
  );
  console.log(`💰 Found ${priceContainers.length} price containers`);

  // Method 3: Look for specific Porto Carras structure
  const roomBlocks = $(".room-item, .accommodation-item, .hotel-room");
  console.log(`🏨 Found ${roomBlocks.length} room blocks`);

  // Parse the actual HTML from the JSON response
  // Handle both {"demand":false,"html":"..."} and {"demand": false, "html": "..."}
  let actualHtml = html;
  if (
    html.trim().startsWith("{") &&
    html.includes('"demand"') &&
    html.includes('"html"')
  ) {
    try {
      const jsonData = JSON.parse(html);
      if (jsonData.html) {
        actualHtml = jsonData.html;
        console.log(
          `📦 Parsed HTML from JSON wrapper (demand: ${jsonData.demand})`
        );
      }
    } catch (error) {
      console.log("⚠️ Could not parse JSON, using raw HTML:", error);
    }
  }

  // Re-parse with actual HTML
  const $actual = cheerio.load(actualHtml);

  // Method 4: Look for actual table structure
  const rooms = $actual(".data.rmtbl tr.room, .data.rmtbl .room-item");
  console.log(`🏨 Found ${rooms.length} room rows`);

  // Method 5: Look for specific Porto Carras table structure
  const roomRows = $actual(".data.rmtbl tr");
  console.log(`📋 Found ${roomRows.length} table rows total`);

  // PRIORITY STRATEGY: Parse data-price attributes from <tr> tags
  // This is the most reliable source as it contains clean price values
  let foundPrices = 0;
  const dataAttributePrices: number[] = [];

  $actual("tr[data-price]").each((i, elem) => {
    const dataPriceValue = $actual(elem).attr("data-price");
    if (dataPriceValue) {
      const priceValue = Number.parseFloat(dataPriceValue);
      if (!isNaN(priceValue) && priceValue >= 500 && priceValue <= 50_000) {
        dataAttributePrices.push(priceValue);
        console.log(
          `💎 Found data-price attribute: ${dataPriceValue} -> ${priceValue} BGN`
        );
      }
    }
  });

  // If we found data-price attributes, use those (they're the most reliable)
  if (dataAttributePrices.length > 0) {
    console.log(
      `✅ Using ${dataAttributePrices.length} prices from data-price attributes`
    );
    dataAttributePrices.forEach((priceValue, index) => {
      const roomName = `Room ${index + 1}`;

      prices.push({
        date: params.checkin,
        dayOfWeek: format(
          parse(params.checkin, "yyyy-MM-dd", new Date()),
          "EEEE"
        ),
        averagePerNight: priceValue / params.nights,
        stayTotal: priceValue,
        isLowestRate: false,
        nights: params.nights,
        currency: "BGN",
        hotelId: hotel.id,
        hotelName: hotel.name,
      });

      roomOptions.push({
        value: roomName.toLowerCase().replace(/\s+/g, "-"),
        name: roomName,
      });

      foundPrices++;
      console.log(
        `✅ Added price from data-price: ${priceValue} BGN for ${hotel.name}`
      );
    });
  }

  // FALLBACK STRATEGY: Parse prices from HTML text patterns
  // Only use this if data-price attributes weren't found
  if (foundPrices === 0) {
    console.log(
      "🔄 No data-price attributes found, falling back to HTML text parsing"
    );

    // Parse prices from the actual HTML structure
    // Look for price patterns in the HTML
    const pricePatterns = [
      // Pattern 1: <div class="val">2 845,73 лв / 1 455 €</div>
      /<div class="val">([^<]+)<\/div>/gi,
      // Pattern 2: Look for BGN prices in any format
      /(\d{1,3}(?:\s\d{3})*,\d{2})\s*лв/gi,
      // Pattern 3: Look for prices in table cells
      /<td[^>]*>([^<]*\d{1,3}(?:\s\d{3})*,\d{2}[^<]*)<\/td>/gi,
    ];

    for (const pattern of pricePatterns) {
      const matches = actualHtml.match(pattern);
      if (matches && matches.length > 0) {
        console.log(
          `🔍 Found ${matches.length} matches with pattern: ${pattern.source}`
        );

        matches.forEach((match) => {
          // Extract price from the match
          let priceMatch = null;

          // Try different extraction patterns
          const extractionPatterns = [
            /(\d{1,3}(?:\s\d{3})*,\d{2})\s*лв/,
            /(\d{1,3}(?:\s\d{3})*,\d{2})/,
            /(\d+,\d{2})/,
          ];

          for (const extractPattern of extractionPatterns) {
            priceMatch = match.match(extractPattern);
            if (priceMatch) break;
          }

          if (priceMatch) {
            // Remove spaces and replace comma with dot: "2 845,73" -> "2845.73"
            const priceValue = Number.parseFloat(
              priceMatch[1].replace(/\s/g, "").replace(",", ".")
            );

            console.log(
              `💰 Extracted price: ${priceMatch[1]} -> ${priceValue}`
            );

            // Check if this is a reasonable price for luxury resorts
            // Try both original value and multiplied by 1000 (in case it's in thousands)
            const pricesToTry = [priceValue, priceValue * 1000];
            let priceAdded = false;

            for (const testPrice of pricesToTry) {
              if (testPrice >= 500 && testPrice <= 50_000) {
                const roomName = `Room ${foundPrices + 1}`;

                prices.push({
                  date: params.checkin,
                  dayOfWeek: format(
                    parse(params.checkin, "yyyy-MM-dd", new Date()),
                    "EEEE"
                  ),
                  averagePerNight: testPrice / params.nights,
                  stayTotal: testPrice,
                  isLowestRate: false,
                  nights: params.nights,
                  currency: "BGN",
                  hotelId: hotel.id,
                  hotelName: hotel.name,
                });

                roomOptions.push({
                  value: roomName.toLowerCase().replace(/\s+/g, "-"),
                  name: roomName,
                });

                foundPrices++;
                console.log(
                  `✅ Added price: ${testPrice} BGN for ${hotel.name} (${priceValue === testPrice ? "original" : "x1000"})`
                );
                priceAdded = true;
                break; // Found a valid price, stop trying other values
              }
            }

            if (!priceAdded) {
              console.log(
                `⚠️ Price ${priceValue} outside realistic range (500-50000) for both original and x1000 values`
              );
            }
          }
        });

        if (foundPrices > 0) break; // Stop after first successful pattern
      }
    }

    // Nested fallback strategy: Look for prices in different HTML structures
    if (foundPrices === 0) {
      console.log(
        "🔍 No prices found with primary strategy, trying fallback parsing..."
      );

      // Look for any price-like patterns in the HTML
      const fallbackPatterns = [
        /(\d{1,2}(?:[\s,]\d{3})*,\d{2})\s*лв/gi,
        /(\d{1,2}(?:[\s,]\d{3})*,\d{2})/gi,
        /(\d{4,6})/gi,
      ];

      for (const pattern of fallbackPatterns) {
        const matches = actualHtml.match(pattern);
        if (matches && matches.length > 0) {
          console.log(
            `🔍 Found ${matches.length} fallback matches with pattern: ${pattern.source}`
          );

          matches.forEach((match) => {
            if (foundPrices >= 10) return; // Limit to prevent too many results

            let priceString = match;
            console.log(`🔍 Processing fallback match: "${priceString}"`);

            // Clean up the price string
            if (priceString.includes(" ")) {
              priceString = priceString.replace(/\s/g, "").replace(",", ".");
            } else if (
              priceString.includes(",") &&
              !priceString.includes(".")
            ) {
              priceString = priceString.replace(",", ".");
            }

            const priceValue = Number.parseFloat(priceString);
            console.log(`💰 Parsed fallback price: ${priceValue}`);

            // Try both original value and multiplied by 1000
            const pricesToTry = [priceValue, priceValue * 1000];

            for (const testPrice of pricesToTry) {
              if (testPrice >= 500 && testPrice <= 50_000) {
                const roomName = `Room ${foundPrices + 1}`;

                prices.push({
                  date: params.checkin,
                  dayOfWeek: format(
                    parse(params.checkin, "yyyy-MM-dd", new Date()),
                    "EEEE"
                  ),
                  averagePerNight: testPrice / params.nights,
                  stayTotal: testPrice,
                  isLowestRate: false,
                  nights: params.nights,
                  currency: "BGN",
                  hotelId: hotel.id,
                  hotelName: hotel.name,
                });

                roomOptions.push({
                  value: roomName.toLowerCase().replace(/\s+/g, "-"),
                  name: roomName,
                });

                foundPrices++;
                console.log(
                  `✅ Added fallback price: ${testPrice} BGN for ${hotel.name} (${priceValue === testPrice ? "original" : "x1000"})`
                );
                break; // Found a valid price, move to next match
              }
            }
          });

          if (foundPrices > 0) break; // Found prices, stop trying other patterns
        }
      }
    }
  } // End of fallback HTML text parsing strategy

  if (foundPrices === 0) {
    console.log(
      `⚠️ No prices found with any strategy - ${hotel.name} may have no availability`
    );
    console.log("🔍 HTML sample for debugging:", actualHtml.substring(0, 1000));
  }

  // If we have very short HTML (262 chars), it's likely an error/no availability page
  if (html.length < 300) {
    console.log("📄 Short response - likely error/no availability page");
    return {
      month: format(parse(params.checkin, "yyyy-MM-dd", new Date()), "MMMM"),
      year: Number.parseInt(
        format(parse(params.checkin, "yyyy-MM-dd", new Date()), "yyyy")
      ),
      prices: [],
      roomOptions: [],
      hotelId: hotel.id,
      hotelName: hotel.name,
    };
  }

  // NO FALLBACKS - prices already parsed above from <div class="val"> containers

  console.log(
    `✅ Parsed ${prices.length} prices and ${roomOptions.length} room options from ${hotel.name}`
  );

  if (prices.length === 0) {
    console.log("⚠️ No prices found - this might indicate:");
    console.log("   1. No availability for selected dates");
    console.log("   2. Different HTML structure than expected");
    console.log("   3. Form data parameters are incorrect");
  }

  return {
    month: format(parse(params.checkin, "yyyy-MM-dd", new Date()), "MMMM"),
    year: Number.parseInt(
      format(parse(params.checkin, "yyyy-MM-dd", new Date()), "yyyy")
    ),
    prices,
    roomOptions,
    hotelId: hotel.id,
    hotelName: hotel.name,
  };
}

export function getLastRawHtml(hotelId: string): string {
  return lastRawHtmlCache.get(hotelId) || "";
}
