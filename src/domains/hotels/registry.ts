import blueCarpet from "./config/blue-carpet";
import cocooning from "./config/cocooning";
import eaglesPalace from "./config/eagles-palace";
import eaglesVillas from "./config/eagles-villas";
import excelsior from "./config/excelsior";
import mediteKassandra from "./config/medite-kassandra";
import myra from "./config/myra";
import olympionSunset from "./config/olympion-sunset";
import portoCarras from "./config/porto-carras";
import potideaPalace from "./config/potidea-palace";
import type { HotelConfig } from "./types";

const hotels: HotelConfig[] = [
  blueCarpet,
  cocooning,
  myra,
  potideaPalace,
  portoCarras,
  eaglesPalace,
  eaglesVillas,
  excelsior,
  olympionSunset,
  mediteKassandra,
];

export function getAllHotels(): HotelConfig[] {
  return hotels;
}

export function getAllHotelIds(): string[] {
  return hotels.map((h) => h.id);
}

export function getHotel(idOrSlug: string): HotelConfig {
  const hotel = hotels.find((h) => h.id === idOrSlug || h.slug === idOrSlug);
  if (!hotel) {
    throw new Error(`Hotel not found: ${idOrSlug}`);
  }
  return hotel;
}

export function getHotelsByStrategy(
  strategyType: "calendar" | "avl"
): HotelConfig[] {
  return hotels.filter((h) => h.strategyType === strategyType);
}
