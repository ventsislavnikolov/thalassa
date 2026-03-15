import kavala from "./config/kavala";
import neosMarmaras from "./config/neos-marmaras";
import pefkochori from "./config/pefkochori";
import vourvourou from "./config/vourvourou";
import type { LocationConfig } from "./types";

const locations: LocationConfig[] = [
  pefkochori,
  kavala,
  neosMarmaras,
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
