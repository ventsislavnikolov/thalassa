import { addDays, format, parse } from "date-fns";
import { getHotel } from "@/domains/hotels/registry";
import type { RoomType } from "@/domains/hotels/types";
import { AvlStrategy } from "./strategies/avl";
import { CalendarStrategy } from "./strategies/calendar";
import type { PriceResult, ScrapingStrategy, SearchParams } from "./types";

export interface ScrapeAllResult {
  results: PriceResult[];
  roomOptions: RoomType[];
  errors: { hotel: string; error: string }[];
}

const calendarStrategy = new CalendarStrategy();
const avlStrategy = new AvlStrategy();

function getStrategy(strategyType: "calendar" | "avl"): ScrapingStrategy {
  return strategyType === "calendar" ? calendarStrategy : avlStrategy;
}

function getHotelTimeout(): number {
  return process.env.VERCEL ? 15_000 : 30_000;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Hotel processing timeout")), ms)
    ),
  ]);
}

export async function scrapeHotels(
  hotelIds: string[],
  searchParams: SearchParams
): Promise<ScrapeAllResult> {
  const results: PriceResult[] = [];
  const allRoomOptions: RoomType[] = [];
  const errors: { hotel: string; error: string }[] = [];
  const hotelTimeout = getHotelTimeout();

  for (const hotelId of hotelIds) {
    try {
      const hotel = getHotel(hotelId);
      const strategy = getStrategy(hotel.strategyType);

      const response = await withTimeout(
        strategy.fetchPrices({ hotel, searchParams }),
        hotelTimeout
      );

      results.push(...response.prices);
      allRoomOptions.push(...response.roomOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push({ hotel: hotelId, error: message });
    }
  }

  return { results, roomOptions: allRoomOptions, errors };
}

export async function scrapeHotelsMultiMonth(
  hotelIds: string[],
  searchParams: SearchParams,
  monthsToCheck: number
): Promise<ScrapeAllResult> {
  const priceMap = new Map<string, PriceResult>();
  const allRoomOptions: RoomType[] = [];
  const errors: { hotel: string; error: string }[] = [];
  const hotelTimeout = getHotelTimeout();
  const daysToSkip = monthsToCheck > 6 ? 25 : 30;

  for (const hotelId of hotelIds) {
    const processHotel = async () => {
      const hotel = getHotel(hotelId);
      const strategy = getStrategy(hotel.strategyType);

      // Fetch initial month
      try {
        const initialResponse = await strategy.fetchPrices({
          hotel,
          searchParams,
        });

        for (const price of initialResponse.prices) {
          const key = `${price.date}_${hotel.id}_${price.roomCode || "default"}`;
          priceMap.set(key, price);
        }
        allRoomOptions.push(...initialResponse.roomOptions);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        errors.push({ hotel: hotelId, error: message });
      }

      // Fetch additional months
      const startDate = parse(searchParams.checkin, "yyyy-MM-dd", new Date());

      for (let i = 1; i < monthsToCheck; i++) {
        const currentDate = addDays(startDate, i * daysToSkip);
        const monthParams: SearchParams = {
          ...searchParams,
          checkin: format(currentDate, "yyyy-MM-dd"),
          checkout: format(
            addDays(currentDate, searchParams.nights),
            "yyyy-MM-dd"
          ),
        };

        try {
          const response = await strategy.fetchPrices({
            hotel,
            searchParams: monthParams,
          });

          for (const price of response.prices) {
            const key = `${price.date}_${hotel.id}_${price.roomCode || "default"}`;
            if (!priceMap.has(key)) {
              priceMap.set(key, price);
            }
          }
        } catch {
          // Continue with next month even if one fails
        }

        // Rate limiting for long searches
        if (monthsToCheck > 6) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    };

    try {
      await withTimeout(processHotel(), hotelTimeout);
    } catch {
      errors.push({ hotel: hotelId, error: "Hotel processing timeout" });
    }
  }

  const sortedResults = Array.from(priceMap.values()).sort(
    (a, b) => a.stayTotal - b.stayTotal
  );

  return { results: sortedResults, roomOptions: allRoomOptions, errors };
}
