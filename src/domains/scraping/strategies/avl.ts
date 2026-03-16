import axios from "axios";
import { addDays, format, parse } from "date-fns";
import type { HotelConfig, RoomType } from "@/domains/hotels/types";
import { loadHtml, unwrapJsonHtml } from "../parsers/html-parser";
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
const MIN_PRICE = 500;
const MAX_PRICE = 50_000;

// HTML price extraction patterns for fallback parsing
const HTML_PRICE_PATTERNS = [
  /<div class="val">([^<]+)<\/div>/gi,
  /(\d{1,3}(?:\s\d{3})*,\d{2})\s*(?:лв|€|BGN|EUR)/gi,
  /<td[^>]*>([^<]*\d{1,3}(?:\s\d{3})*,\d{2}[^<]*)<\/td>/gi,
];

const EXTRACTION_PATTERNS = [
  /(\d{1,3}(?:\s\d{3})*,\d{2})\s*(?:лв|€|BGN|EUR)/,
  /(\d{1,3}(?:\s\d{3})*,\d{2})/,
  /(\d+,\d{2})/,
];

const FALLBACK_PATTERNS = [
  /(\d{1,2}(?:[\s,]\d{3})*,\d{2})\s*(?:лв|€|BGN|EUR)/gi,
  /(\d{1,2}(?:[\s,]\d{3})*,\d{2})/gi,
  /(\d{4,6})/gi,
];

function isReasonablePrice(price: number): boolean {
  return price >= MIN_PRICE && price <= MAX_PRICE;
}

function buildAvlFormData(
  params: SearchParams,
  hotel: HotelConfig
): URLSearchParams {
  const checkinDate = parse(params.checkin, "yyyy-MM-dd", new Date());
  const checkoutDate = addDays(checkinDate, params.nights);

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
    date: params.checkin,
    dayOfWeek: format(parse(params.checkin, "yyyy-MM-dd", new Date()), "EEEE"),
    averagePerNight: price / params.nights,
    stayTotal: price,
    isLowestRate: false,
    nights: params.nights,
    currency: params.currency || "EUR",
    hotelId: hotel.id,
    hotelName: hotel.name,
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
    if (!dataPriceValue) return;

    const priceValue = Number.parseFloat(dataPriceValue);
    if (Number.isNaN(priceValue) || !isReasonablePrice(priceValue)) return;

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

function parseHtmlTextPrices(
  actualHtml: string,
  params: SearchParams,
  hotel: HotelConfig
): { prices: PriceResult[]; roomOptions: RoomType[] } {
  const prices: PriceResult[] = [];
  const roomOptions: RoomType[] = [];
  let foundPrices = 0;

  for (const pattern of HTML_PRICE_PATTERNS) {
    const matches = actualHtml.match(pattern);
    if (!(matches && matches.length > 0)) continue;

    for (const match of matches) {
      let priceMatch: RegExpMatchArray | null = null;
      for (const extractPattern of EXTRACTION_PATTERNS) {
        priceMatch = match.match(extractPattern);
        if (priceMatch) break;
      }

      if (!priceMatch) continue;

      const priceValue = parsePrice(priceMatch[1]);
      if (priceValue === null) continue;

      const pricesToTry = [priceValue, priceValue * 1000];
      for (const testPrice of pricesToTry) {
        if (isReasonablePrice(testPrice)) {
          const roomName = `Room ${foundPrices + 1}`;
          prices.push(createPriceResult(testPrice, params, hotel));
          roomOptions.push({
            code: roomName.toLowerCase().replace(/\s+/g, "-"),
            name: roomName,
          });
          foundPrices++;
          break;
        }
      }
    }

    if (foundPrices > 0) break;
  }

  // Nested fallback: look for prices in different HTML structures
  if (foundPrices === 0) {
    for (const pattern of FALLBACK_PATTERNS) {
      const matches = actualHtml.match(pattern);
      if (!(matches && matches.length > 0)) continue;

      for (const match of matches) {
        if (foundPrices >= 10) break;

        const priceValue = parsePrice(match);
        if (priceValue === null) continue;

        const pricesToTry = [priceValue, priceValue * 1000];
        for (const testPrice of pricesToTry) {
          if (isReasonablePrice(testPrice)) {
            const roomName = `Room ${foundPrices + 1}`;
            prices.push(createPriceResult(testPrice, params, hotel));
            roomOptions.push({
              code: roomName.toLowerCase().replace(/\s+/g, "-"),
              name: roomName,
            });
            foundPrices++;
            break;
          }
        }
      }

      if (foundPrices > 0) break;
    }
  }

  return { prices, roomOptions };
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
      prices: [],
      roomOptions: [],
      hotelId: hotel.id,
      hotelName: hotel.name,
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

export class AvlStrategy implements ScrapingStrategy {
  type = "avl" as const;

  async fetchPrices(params: {
    hotel: HotelConfig;
    searchParams: SearchParams;
    signal?: AbortSignal;
  }): Promise<ScrapeResponse> {
    const { hotel, searchParams, signal } = params;
    const formData = buildAvlFormData(searchParams, hotel);

    try {
      const response = await axios.post(`${hotel.baseUrl}/avl`, formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        timeout: REQUEST_TIMEOUT,
        signal,
      });

      const html =
        typeof response.data === "string"
          ? response.data
          : JSON.stringify(response.data);

      return parseAvlHtml(html, searchParams, hotel);
    } catch (error) {
      throw new ScrapingError(
        `Failed to fetch AVL data for ${hotel.name}`,
        hotel.id,
        error
      );
    }
  }
}
