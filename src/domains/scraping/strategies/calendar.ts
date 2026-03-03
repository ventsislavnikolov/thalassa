import axios from "axios";
import { format, parse } from "date-fns";
import type { HotelConfig } from "@/domains/hotels/types";
import { extractRoomOptions, loadHtml } from "../parsers/html-parser";
import { parsePrice } from "../parsers/price-parser";
import type {
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
  /(?:Stay total:|Общ престой:)\s*(?:BGN|лв|EUR|€)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*([\d,]+\.\d{2})/i,
  /(?:Stay total:|Общ престой:).*?([\d,]+\.\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)/i,
  /(?:Stay total:|Общ престой:).*?<b>([\d,]+\.\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)?<\/b>/i,
  // EU format with space as thousands separator and comma as decimal
  /(?:Stay total:|Общ престой:)\s*(?:BGN|лв|EUR|€)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]\d{3})*,\d{2})\b/i,
  /(?:Stay total:|Общ престой:).*?(\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]\d{3})*,\d{2})\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)/i,
  /(?:Stay total:|Общ престой:).*?<b>(\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]\d{3})*,\d{2})\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)?<\/b>/i,
  // Numbers without decimal places (like "2,347" or "2 347")
  /(?:Stay total:|Общ престой:)\s*(?:BGN|лв|EUR|€)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000,]\d{3})+)\b/i,
  /(?:Stay total:|Общ престой:).*?(\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000,]\d{3})+)\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)/i,
  /(?:Stay total:|Общ престой:).*?<b>(\d{1,3}(?:[\s\u00A0\u2000-\u200A\u202F\u205F\u3000,]\d{3})+)\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)?<\/b>/i,
  // Fallback: simple numbers without separators
  /(?:Stay total:|Общ престой:)\s*(?:BGN|лв|EUR|€)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(\d+)\b/i,
  /(?:Stay total:|Общ престой:).*?(\d+)\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)/i,
  /(?:Stay total:|Общ престой:).*?<b>(\d+)\b[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)?<\/b>/i,
];

// General price patterns for both formats
const GENERAL_PRICE_PATTERNS = [
  /(?:BGN|лв|EUR|€)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*([\d,]+\.\d{2})/i,
  /([\d,]+\.\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)/i,
  /(?:BGN|лв|EUR|€)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*([\d\s\u00A0\u2000-\u200A\u202F\u205F\u3000]+,\d{2})/i,
  /([\d\s\u00A0\u2000-\u200A\u202F\u205F\u3000]+,\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв|EUR|€)/i,
];

function matchPatterns(
  text: string,
  patterns: RegExp[]
): RegExpMatchArray | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
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

    if (!date) return;

    const cellText = $cell.text() || "";

    const totalPriceMatch = matchPatterns(cellText, TOTAL_PRICE_PATTERNS);
    const perNightMatch = matchPatterns(title, GENERAL_PRICE_PATTERNS);

    let priceMatch = totalPriceMatch || perNightMatch;

    if (!priceMatch) {
      priceMatch = matchPatterns(cellText, GENERAL_PRICE_PATTERNS);
    }

    if (!priceMatch) return;

    const priceValue = parsePrice(priceMatch[1]);
    if (priceValue === null) return;

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
      date,
      dayOfWeek,
      averagePerNight: avgPerNight,
      stayTotal,
      isLowestRate,
      nights: searchParams.nights,
      currency: searchParams.currency || "EUR",
      hotelId: hotel.id,
      hotelName: hotel.name,
    });
  });

  return {
    prices,
    roomOptions,
    hotelId: hotel.id,
    hotelName: hotel.name,
  };
}

export class CalendarStrategy implements ScrapingStrategy {
  type = "calendar" as const;

  async fetchPrices(params: {
    hotel: HotelConfig;
    searchParams: SearchParams;
    signal?: AbortSignal;
  }): Promise<ScrapeResponse> {
    const { hotel } = params;
    const initial = await this.fetchSingle(params);
    const { roomOptions } = initial;

    if (roomOptions.length === 0) return initial;

    const allPrices: PriceResult[] = [];

    for (const room of roomOptions) {
      try {
        const roomParams = {
          ...params,
          searchParams: { ...params.searchParams, room: room.code },
        };
        const response = await this.fetchSingle(roomParams);
        const tagged = response.prices.map((p) => ({
          ...p,
          roomType: room.name,
          roomCode: room.code,
        }));
        allPrices.push(...tagged);

        if (room !== roomOptions[roomOptions.length - 1]) {
          await delay(ROOM_FETCH_DELAY);
        }
      } catch {
        // Continue with other rooms even if one fails
      }
    }

    return {
      prices: allPrices,
      roomOptions,
      hotelId: hotel.id,
      hotelName: hotel.name,
    };
  }

  private async fetchSingle(params: {
    hotel: HotelConfig;
    searchParams: SearchParams;
    signal?: AbortSignal;
  }): Promise<ScrapeResponse> {
    const { hotel, searchParams, signal } = params;
    const formData = buildFormData(searchParams);

    try {
      const response = await axios.post(`${hotel.baseUrl}/calendar`, formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        timeout: REQUEST_TIMEOUT,
        signal,
      });

      return parseCalendarHtml(response.data, searchParams, hotel);
    } catch (error) {
      throw new ScrapingError(
        `Failed to fetch calendar data for ${hotel.name}`,
        hotel.id,
        error
      );
    }
  }
}
