import fourka from "./config/fourka";
import hanioti from "./config/hanioti";
import kavala from "./config/kavala";
import milos from "./config/milos";
import neaMoudania from "./config/nea-moudania";
import neaRoda from "./config/nea-roda";
import neosMarmaras from "./config/neos-marmaras";
import ouranoupolis from "./config/ouranoupolis";
import paxos from "./config/paxos";
import pefkochori from "./config/pefkochori";
import santorini from "./config/santorini";
import thessaloniki from "./config/thessaloniki";
import vourvourou from "./config/vourvourou";
import type { LocationConfig } from "./types";

const locations: LocationConfig[] = [
  pefkochori,
  fourka,
  hanioti,
  neaMoudania,
  kavala,
  milos,
  neaRoda,
  neosMarmaras,
  ouranoupolis,
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
