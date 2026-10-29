export interface MonthlyClimate {
  maxTemp: number;
  minTemp: number;
  precipitation: number;
  windSpeed: number;
}

export const CHALKIDIKI_CLIMATE: Record<number, MonthlyClimate> = {
  1: { maxTemp: 12, minTemp: 5, precipitation: 8, windSpeed: 15 },
  2: { maxTemp: 14, minTemp: 6, precipitation: 6, windSpeed: 14 },
  3: { maxTemp: 17, minTemp: 8, precipitation: 5, windSpeed: 13 },
  4: { maxTemp: 21, minTemp: 12, precipitation: 3, windSpeed: 12 },
  5: { maxTemp: 26, minTemp: 17, precipitation: 2, windSpeed: 11 },
  6: { maxTemp: 31, minTemp: 22, precipitation: 1, windSpeed: 10 },
  7: { maxTemp: 33, minTemp: 24, precipitation: 0.5, windSpeed: 10 },
  8: { maxTemp: 33, minTemp: 24, precipitation: 0.5, windSpeed: 10 },
  9: { maxTemp: 28, minTemp: 20, precipitation: 2, windSpeed: 11 },
  10: { maxTemp: 23, minTemp: 15, precipitation: 4, windSpeed: 12 },
  11: { maxTemp: 18, minTemp: 10, precipitation: 6, windSpeed: 13 },
  12: { maxTemp: 14, minTemp: 7, precipitation: 8, windSpeed: 14 },
};

export const UV_BY_MONTH: Record<number, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 6,
  5: 8,
  6: 9,
  7: 10,
  8: 9,
  9: 7,
  10: 5,
  11: 3,
  12: 2,
};

export function getClimateForMonth(month: number): MonthlyClimate {
  return CHALKIDIKI_CLIMATE[month] ?? CHALKIDIKI_CLIMATE[7];
}

export function getUvForMonth(month: number): number {
  return UV_BY_MONTH[month] ?? 5;
}
