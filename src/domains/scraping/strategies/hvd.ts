import axios from "axios";
import { format, parse } from "date-fns";
import { buildHvdSearchUrl } from "@/domains/hotels/booking-url";
import type { HotelConfig, RoomType } from "@/domains/hotels/types";
import { loadHtml } from "../parsers/html-parser";
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
const WHITESPACE_RUN = /\s+/gu;
const TRAILING_AMOUNT = /(?<amount>[\d.]+)$/u;

function parseCardPrice(text: string): number | null {
  const match = text.replace(WHITESPACE_RUN, "").match(TRAILING_AMOUNT);
  if (!match) {
    return null;
  }
  const value = Number.parseFloat(match[1]);
  return Number.isNaN(value) || value <= 0 ? null : value;
}

/**
 * The HVD search page renders one card per room type with a "prices starting
 * at" total for the whole stay; rooms without availability render no price.
 */
export function parseHvdHtml(
  html: string,
  params: SearchParams,
  hotel: HotelConfig
): ScrapeResponse {
  const $ = loadHtml(html);
  const prices: PriceResult[] = [];
  const roomOptions: RoomType[] = [];
  const dayOfWeek = format(
    parse(params.checkin, "yyyy-MM-dd", new Date()),
    "EEEE"
  );

  $('div[ref^="roomCardItem"]').each((_, card) => {
    const $card = $(card);
    const roomCode = ($card.attr("ref") ?? "").replace("roomCardItem", "");
    const roomName = $card.find(".title").first().text().trim();
    // ".price.discount" is the struck-through pre-discount amount; the plain
    // ".price" element is the amount actually charged.
    const priceText = $card
      .find(".price__holder .price")
      .not(".discount")
      .first()
      .text();
    const stayTotal = parseCardPrice(priceText);
    if (!(roomCode && roomName) || stayTotal === null) {
      return;
    }

    prices.push({
      averagePerNight: stayTotal / params.nights,
      currency: params.currency || "EUR",
      date: params.checkin,
      dayOfWeek,
      hotelId: hotel.id,
      hotelName: hotel.name,
      isLowestRate: false,
      nights: params.nights,
      roomCode,
      roomType: roomName,
      stayTotal,
    });
    roomOptions.push({ code: roomCode, name: roomName });
  });

  return { hotelId: hotel.id, hotelName: hotel.name, prices, roomOptions };
}

async function fetchHvdPrices({
  hotel,
  searchParams,
  signal,
}: FetchPricesParams): Promise<ScrapeResponse> {
  try {
    const response = await axios.get<string>(
      buildHvdSearchUrl(hotel, searchParams),
      {
        headers: { "User-Agent": USER_AGENT },
        responseType: "text",
        signal,
        timeout: REQUEST_TIMEOUT,
      }
    );
    return parseHvdHtml(response.data, searchParams, hotel);
  } catch (error) {
    throw new ScrapingError(`Failed to fetch HVD data for ${hotel.name}`, {
      cause: error,
      hotelId: hotel.id,
    });
  }
}

export class HvdStrategy implements ScrapingStrategy {
  readonly fetchPrices = fetchHvdPrices;
  type = "hvd" as const;
}
