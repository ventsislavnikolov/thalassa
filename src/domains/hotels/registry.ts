import acroSuites from "./config/acro-suites";
import agaliHotel from "./config/agali-hotel";
import atriumPrestige from "./config/atrium-prestige";
import avaton from "./config/avaton";
import blueCarpet from "./config/blue-carpet";
import cocooning from "./config/cocooning";
import domesNoruz from "./config/domes-noruz";
import domesWhiteCoast from "./config/domes-white-coast";
import eaglesPalace from "./config/eagles-palace";
import eaglesVillas from "./config/eagles-villas";
import ekies from "./config/ekies";
import excelsior from "./config/excelsior";
import fourStonesVillas from "./config/four-stones-villas";
import makedoniaPalace from "./config/makedonia-palace";
import maritimaVillas from "./config/maritima-villas";
import mediteKassandra from "./config/medite-kassandra";
import miraggioThermalSpa from "./config/miraggio-thermal-spa";
import mountAthosResort from "./config/mount-athos-resort";
import myra from "./config/myra";
import nanaGoldenBeach from "./config/nana-golden-beach";
import neemaMaison from "./config/neema-maison";
import olympionSunset from "./config/olympion-sunset";
import palmBoutiqueSuites from "./config/palm-boutique-suites";
import paralosLifestyleBeach from "./config/paralos-lifestyle-beach";
import portoCarras from "./config/porto-carras";
import potideaPalace from "./config/potidea-palace";
import stellaIsland from "./config/stella-island";
import type { HotelConfig } from "./types";

const hotels: HotelConfig[] = [
  acroSuites,
  agaliHotel,
  avaton,
  blueCarpet,
  cocooning,
  domesNoruz,
  domesWhiteCoast,
  myra,
  neemaMaison,
  potideaPalace,
  portoCarras,
  eaglesPalace,
  eaglesVillas,
  ekies,
  excelsior,
  olympionSunset,
  mediteKassandra,
  stellaIsland,
  mountAthosResort,
  miraggioThermalSpa,
  paralosLifestyleBeach,
  atriumPrestige,
  nanaGoldenBeach,
  makedoniaPalace,
  palmBoutiqueSuites,
  maritimaVillas,
  fourStonesVillas,
];

export function getAllHotels(): HotelConfig[] {
  return hotels.filter((h) => !h.hidden);
}

export function getAllHotelIds(): string[] {
  return getAllHotels().map((h) => h.id);
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
  return getAllHotels().filter((h) => h.strategyType === strategyType);
}
