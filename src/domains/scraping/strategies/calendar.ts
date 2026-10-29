import axios from "axios";
import { format, parse } from "date-fns";
import type { HotelConfig } from "@/domains/hotels/types";
import { extractRoomOptions, loadHtml } from "../parsers/html-parser";
import { parsePrice } from "../parsers/price-parser";
import type {
  FetchPricesParams,
  PriceResult,
  ScrapeResponse,
  ScrapingStrategy,
  SearchParams,
} from "../types";
import { ScrapingError } from "../types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const REQUEST_TIMEOUT = 30_000;
const ROOM_FETCH_DELAY = 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildFormData(params: SearchParams): URLSearchParams {
  const checkinDate = parse(params.checkin, "yyyy-MM-dd", new Date());

  // biome-ignore assist/source/useSortedKeys: field order mirrors the reserve-online.net calendar form this POST replays
  return new URLSearchParams({
    voucher: "",
    room: params.room || "",
    bk_code: "",
    offerid: "",
    checkin: params.checkin,
    checkout: params.checkout,
    cur_iso: params.currency || "EUR",
    fromd: format(checkinDate, "dd/MM/yyyy"),
    nights: params.nights.toString(),
    rooms: "1",
    adults: params.adults.toString(),
    children: (params.children || 0).toString(),
    infants: (params.infants || 0).toString(),
  });
}

// Regex patterns for "Stay total" / "Общ престой" price extraction
const TOTAL_PRICE_PATTERNS = [
  // US format with comma as thousands separator and dot as decimal
  /(?:Stay total:|Общ престой:)\s*(?:BGN|лв|EUR|€)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?<price>[\d,]+\.\d{2})/iu,
  /(?:Stay total:|Общ престой:).*?(?<price>[\d,]+\.\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)/iu,
  /(?:Stay total:|Общ престой:).*?<b>(?<price>[\d,]+\.\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)?<\/b>/iu,
  // EU format with space as thousands separator and comma as decimal
  /(?:Stay total:|Общ престой:)\s*(?:BGN|лв|EUR|€)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?<price>\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]\d{3})*,\d{2})\b/iu,
  /(?:Stay total:|Общ престой:).*?(?<price>\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]\d{3})*,\d{2})\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)/iu,
  /(?:Stay total:|Общ престой:).*?<b>(?<price>\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]\d{3})*,\d{2})\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)?<\/b>/iu,
  // Numbers without decimal places (like "2,347" or "2 347")
  /(?:Stay total:|Общ престой:)\s*(?:BGN|лв|EUR|€)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?<price>\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000,]\d{3})+)\b/iu,
  /(?:Stay total:|Общ престой:).*?(?<price>\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000,]\d{3})+)\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)/iu,
  /(?:Stay total:|Общ престой:).*?<b>(?<price>\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000,]\d{3})+)\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)?<\/b>/iu,
  // Fallback: simple numbers without separators
  /(?:Stay total:|Общ престой:)\s*(?:BGN|лв|EUR|€)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?<price>\d+)\b/iu,
  /(?:Stay total:|Общ престой:).*?(?<price>\d+)\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)/iu,
  /(?:Stay total:|Общ престой:).*?<b>(?<price>\d+)\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)?<\/b>/iu,
];

// General price patterns for both formats
const GENERAL_PRICE_PATTERNS = [
  /(?:BGN|лв|EUR|€)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?<price>[\d,]+\.\d{2})/iu,
  /(?<price>[\d,]+\.\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)/iu,
  /(?:BGN|лв|EUR|€)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?<price>[\d\s\u00A0\u2000-\u200A\u202F\u205F\u3000]+,\d{2})/iu,
  /(?<price>[\d\s\u00A0\u2000-\u200A\u202F\u205F\u3000]+,\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)/iu,
];

function matchPatterns(
  text: string,
  patterns: RegExp[]
): RegExpMatchArray | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match;
    }
  }
  return null;
}

function parseCalendarHtml(
  html: string,
  searchParams: SearchParams,
  hotel: HotelConfig
): ScrapeResponse {
  const $ = loadHtml(html);
  const prices: PriceResult[] = [];
  const roomOptions = extractRoomOptions($);

  $(".calendar .avl").each((_, el) => {
    const $cell = $(el);
    const date = $cell.attr("data-date");
    const title = $cell.attr("data-title") || "";

    if (!date) {
      return;
    }

    const cellText = $cell.text() || "";

    const totalPriceMatch = matchPatterns(cellText, TOTAL_PRICE_PATTERNS);
    const perNightMatch = matchPatterns(title, GENERAL_PRICE_PATTERNS);

    let priceMatch = totalPriceMatch || perNightMatch;

    if (!priceMatch) {
      priceMatch = matchPatterns(cellText, GENERAL_PRICE_PATTERNS);
    }

    if (!priceMatch) {
      return;
    }

    const priceValue = parsePrice(priceMatch[1]);
    if (priceValue === null) {
      return;
    }

    let stayTotal: number;
    let avgPerNight: number;

    if (totalPriceMatch) {
      stayTotal = priceValue;
      avgPerNight = stayTotal / searchParams.nights;
    } else if (perNightMatch && !totalPriceMatch) {
      avgPerNight = priceValue;
      stayTotal = avgPerNight * searchParams.nights;
    } else {
      stayTotal = priceValue;
      avgPerNight = stayTotal / searchParams.nights;
    }

    const isLowestRate = $cell.find(".fa-star").length > 0;
    const dateObj = parse(date, "yyyy-MM-dd", new Date());
    const dayOfWeek = format(dateObj, "EEEE");

    prices.push({
      averagePerNight: avgPerNight,
      currency: searchParams.currency || "EUR",
      date,
      dayOfWeek,
      hotelId: hotel.id,
      hotelName: hotel.name,
      isLowestRate,
      nights: searchParams.nights,
      stayTotal,
    });
  });

  return {
    hotelId: hotel.id,
    hotelName: hotel.name,
    prices,
    roomOptions,
  };
}

async function fetchCalendarPage({
  hotel,
  searchParams,
  signal,
}: FetchPricesParams): Promise<ScrapeResponse> {
  const formData = buildFormData(searchParams);

  try {
    const response = await axios.post(`${hotel.baseUrl}/calendar`, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      signal,
      timeout: REQUEST_TIMEOUT,
    });

    return parseCalendarHtml(response.data, searchParams, hotel);
  } catch (error) {
    throw new ScrapingError(`Failed to fetch calendar data for ${hotel.name}`, {
      cause: error,
      hotelId: hotel.id,
    });
  }
}

async function fetchCalendarPrices(
  params: FetchPricesParams
): Promise<ScrapeResponse> {
  const { hotel } = params;
  const initial = await fetchCalendarPage(params);
  const { roomOptions } = initial;

  if (roomOptions.length === 0) {
    return initial;
  }

  const allPrices: PriceResult[] = [];

  for (const room of roomOptions) {
    try {
      const roomParams = {
        ...params,
        searchParams: { ...params.searchParams, room: room.code },
      };
      // biome-ignore lint/performance/noAwaitInLoops: rooms are fetched one at a time, ROOM_FETCH_DELAY apart, to throttle requests to the live booking site
      const response = await fetchCalendarPage(roomParams);
      const tagged = response.prices.map((p) => ({
        ...p,
        roomCode: room.code,
        roomType: room.name,
      }));
      allPrices.push(...tagged);

      if (room !== roomOptions.at(-1)) {
        await delay(ROOM_FETCH_DELAY);
      }
    } catch {
      // Continue with other rooms even if one fails
    }
  }

  return {
    hotelId: hotel.id,
    hotelName: hotel.name,
    prices: allPrices,
    roomOptions,
  };
}

export class CalendarStrategy implements ScrapingStrategy {
  readonly fetchPrices = fetchCalendarPrices;
  type = "calendar" as const;
}
