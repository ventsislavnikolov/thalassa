import axios from "axios";
import { addDays, format, parse } from "date-fns";
import type { HotelConfig, RoomType } from "@/domains/hotels/types";
import { loadHtml, unwrapJsonHtml } from "../parsers/html-parser";
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
const MIN_PRICE = 500;
const MAX_PRICE = 50_000;
const MAX_FALLBACK_PRICES = 10;
const WHITESPACE_RUN = /\s+/gu;

// HTML price extraction patterns for fallback parsing
const HTML_PRICE_PATTERNS = [
  /<div class="val">[^<]+<\/div>/giu,
  /\d{1,3}(?:\s\d{3})*,\d{2}\s*(?:лв|€|BGN|EUR)/giu,
  /<td[^>]*>[^<]*\d{1,3}(?:\s\d{3})*,\d{2}[^<]*<\/td>/giu,
];

const EXTRACTION_PATTERNS = [
  /(?<price>\d{1,3}(?:\s\d{3})*,\d{2})\s*(?:лв|€|BGN|EUR)/u,
  /(?<price>\d{1,3}(?:\s\d{3})*,\d{2})/u,
  /(?<price>\d+,\d{2})/u,
];

const FALLBACK_PATTERNS = [
  /\d{1,2}(?:[\s,]\d{3})*,\d{2}\s*(?:лв|€|BGN|EUR)/giu,
  /\d{1,2}(?:[\s,]\d{3})*,\d{2}/giu,
  /\d{4,6}/giu,
];

function isReasonablePrice(price: number): boolean {
  return price >= MIN_PRICE && price <= MAX_PRICE;
}

function buildAvlFormData(params: SearchParams): URLSearchParams {
  const checkinDate = parse(params.checkin, "yyyy-MM-dd", new Date());
  const checkoutDate = addDays(checkinDate, params.nights);

  // biome-ignore assist/source/useSortedKeys: field order mirrors the reserve-online.net booking form this POST replays
  return new URLSearchParams({
    htl_code: "",
    src: "261",
    room: "",
    bk_code: "",
    offerid: "",
    checkin: params.checkin,
    checkout: format(checkoutDate, "yyyy-MM-dd"),
    cur_iso: params.currency || "EUR",
    fromd: format(checkinDate, "dd/MM/yyyy"),
    tod: format(checkoutDate, "dd/MM/yyyy"),
    rooms: "1",
    adults: params.adults.toString(),
    children: (params.children || 0).toString(),
    infants: "0",
    voucher: "",
  });
}

function createPriceResult(
  price: number,
  params: SearchParams,
  hotel: HotelConfig
): PriceResult {
  return {
    averagePerNight: price / params.nights,
    currency: params.currency || "EUR",
    date: params.checkin,
    dayOfWeek: format(parse(params.checkin, "yyyy-MM-dd", new Date()), "EEEE"),
    hotelId: hotel.id,
    hotelName: hotel.name,
    isLowestRate: false,
    nights: params.nights,
    stayTotal: price,
  };
}

function parseDataPriceAttributes(
  actualHtml: string,
  params: SearchParams,
  hotel: HotelConfig
): { prices: PriceResult[]; roomOptions: RoomType[] } {
  const $actual = loadHtml(actualHtml);
  const prices: PriceResult[] = [];
  const roomOptions: RoomType[] = [];

  $actual('tr[data-price][data-status="AVL"]').each((index, elem) => {
    const dataPriceValue = $actual(elem).attr("data-price");
    if (!dataPriceValue) {
      return;
    }

    const priceValue = Number.parseFloat(dataPriceValue);
    if (Number.isNaN(priceValue) || !isReasonablePrice(priceValue)) {
      return;
    }

    const roomCode = $actual(elem).attr("data-room") || `room-${index + 1}`;
    const roomBody = $actual(elem).closest("tbody");
    const roomName =
      roomBody.find("tr.room td.name").first().text().trim() ||
      `Room ${index + 1}`;

    const result = createPriceResult(priceValue, params, hotel);
    result.roomCode = roomCode;
    result.roomType = roomName;
    prices.push(result);

    roomOptions.push({ code: roomCode, name: roomName });
  });

  return { prices, roomOptions };
}

interface TextPrices {
  prices: PriceResult[];
  roomOptions: RoomType[];
}

function extractTextPrice(text: string): number | null {
  for (const pattern of EXTRACTION_PATTERNS) {
    const priceMatch = text.match(pattern);
    if (priceMatch) {
      return parsePrice(priceMatch[1]);
    }
  }
  return null;
}

/** Records the price, or the price read in thousands, if either is plausible. */
function addReasonablePrice(
  found: TextPrices,
  priceValue: number,
  params: SearchParams,
  hotel: HotelConfig
): void {
  const price = [priceValue, priceValue * 1000].find(isReasonablePrice);
  if (price === undefined) {
    return;
  }
  const roomName = `Room ${found.prices.length + 1}`;
  found.prices.push(createPriceResult(price, params, hotel));
  found.roomOptions.push({
    code: roomName.toLowerCase().replace(WHITESPACE_RUN, "-"),
    name: roomName,
  });
}

function collectPatternPrices(
  actualHtml: string,
  found: TextPrices,
  params: SearchParams,
  hotel: HotelConfig
): void {
  for (const pattern of HTML_PRICE_PATTERNS) {
    for (const match of actualHtml.match(pattern) ?? []) {
      const priceValue = extractTextPrice(match);
      if (priceValue !== null) {
        addReasonablePrice(found, priceValue, params, hotel);
      }
    }
    if (found.prices.length > 0) {
      return;
    }
  }
}

/** Nested fallback: look for prices in different HTML structures. */
function collectFallbackPrices(
  actualHtml: string,
  found: TextPrices,
  params: SearchParams,
  hotel: HotelConfig
): void {
  for (const pattern of FALLBACK_PATTERNS) {
    for (const match of actualHtml.match(pattern) ?? []) {
      if (found.prices.length >= MAX_FALLBACK_PRICES) {
        break;
      }
      const priceValue = parsePrice(match);
      if (priceValue !== null) {
        addReasonablePrice(found, priceValue, params, hotel);
      }
    }
    if (found.prices.length > 0) {
      return;
    }
  }
}

function parseHtmlTextPrices(
  actualHtml: string,
  params: SearchParams,
  hotel: HotelConfig
): TextPrices {
  const found: TextPrices = { prices: [], roomOptions: [] };
  collectPatternPrices(actualHtml, found, params, hotel);
  if (found.prices.length === 0) {
    collectFallbackPrices(actualHtml, found, params, hotel);
  }
  return found;
}

function parseAvlHtml(
  html: string,
  params: SearchParams,
  hotel: HotelConfig
): ScrapeResponse {
  const actualHtml = unwrapJsonHtml(html);

  // Short response likely means error/no availability
  if (actualHtml.length < 300) {
    return {
      hotelId: hotel.id,
      hotelName: hotel.name,
      prices: [],
      roomOptions: [],
    };
  }

  // Priority: data-price attributes from <tr> tags
  const dataPriceResult = parseDataPriceAttributes(actualHtml, params, hotel);
  if (dataPriceResult.prices.length > 0) {
    return {
      ...dataPriceResult,
      hotelId: hotel.id,
      hotelName: hotel.name,
    };
  }

  // Fallback: HTML text pattern matching
  const textResult = parseHtmlTextPrices(actualHtml, params, hotel);
  return {
    ...textResult,
    hotelId: hotel.id,
    hotelName: hotel.name,
  };
}

async function fetchAvlPrices({
  hotel,
  searchParams,
  signal,
}: FetchPricesParams): Promise<ScrapeResponse> {
  const formData = buildAvlFormData(searchParams);

  try {
    const response = await axios.post(`${hotel.baseUrl}/avl`, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      signal,
      timeout: REQUEST_TIMEOUT,
    });

    const html =
      typeof response.data === "string"
        ? response.data
        : JSON.stringify(response.data);

    return parseAvlHtml(html, searchParams, hotel);
  } catch (error) {
    throw new ScrapingError(`Failed to fetch AVL data for ${hotel.name}`, {
      cause: error,
      hotelId: hotel.id,
    });
  }
}

export class AvlStrategy implements ScrapingStrategy {
  readonly fetchPrices = fetchAvlPrices;
  type = "avl" as const;
}
