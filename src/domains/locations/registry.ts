import amoudara from "./config/amoudara";
import analipsi from "./config/analipsi";
import crete from "./config/crete";
import fourka from "./config/fourka";
import hanioti from "./config/hanioti";
import ierissos from "./config/ierissos";
import kavala from "./config/kavala";
import milos from "./config/milos";
import neaMoudania from "./config/nea-moudania";
import neaRoda from "./config/nea-roda";
import neosMarmaras from "./config/neos-marmaras";
import ouranoupolis from "./config/ouranoupolis";
import paliouri from "./config/paliouri";
import paxos from "./config/paxos";
import pefkochori from "./config/pefkochori";
import santorini from "./config/santorini";
import thessaloniki from "./config/thessaloniki";
import vourvourou from "./config/vourvourou";
import type { LocationConfig } from "./types";

const locations: LocationConfig[] = [
  amoudara,
  analipsi,
  crete,
  pefkochori,
  fourka,
  hanioti,
  ierissos,
  neaMoudania,
  kavala,
  milos,
  neaRoda,
  neosMarmaras,
  ouranoupolis,
  paliouri,
  paxos,
  santorini,
  thessaloniki,
  vourvourou,
];

export function getAllLocations(): LocationConfig[] {
  return locations;
}

export function getLocation(slug: string): LocationConfig {
  const location = locations.find((l) => l.slug === slug);
  if (!location) {
    throw new Error(`Location not found: ${slug}`);
  }
  return location;
}
