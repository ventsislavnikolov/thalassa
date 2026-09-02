import type { HotelConfig } from "./types";

export interface BookingStay {
  adults: number;
  checkin: string; // YYYY-MM-DD
  checkout: string; // YYYY-MM-DD
  children?: number;
}

// The HVD engine requires an age per child; callers only carry a count.
const DEFAULT_CHILD_AGE = 8;

/**
 * Search page of the HVD Hotels booking engine (reservations.hvdhotels.com).
 * Doubles as the scrape URL: prices are server-rendered on this page.
 */
export function buildHvdSearchUrl(
  hotel: HotelConfig,
  stay: BookingStay
): string {
  const children = stay.children ?? 0;
  const guests = JSON.stringify([
    {
      adults: stay.adults,
      children,
      children_ages: Array.from({ length: children }, () => DEFAULT_CHILD_AGE),
    },
  ]);
  const query = new URLSearchParams({
    lng: "en-GB",
    currency: "EUR",
    dates: `${stay.checkin}~${stay.checkout}`,
    guests,
  });
  return `${hotel.baseUrl}/search/?${query.toString()}`;
}

/** Deep link into the hotel's own booking engine for the given stay. */
export function buildBookingUrl(hotel: HotelConfig, stay: BookingStay): string {
  if (hotel.strategyType === "hvd") {
    return buildHvdSearchUrl(hotel, stay);
  }
  return `${hotel.baseUrl}/?checkin=${stay.checkin}&checkout=${stay.checkout}&adults=${stay.adults}`;
}
