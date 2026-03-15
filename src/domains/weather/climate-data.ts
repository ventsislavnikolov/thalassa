export interface MonthlyClimate {
  minTemp: number;
  maxTemp: number;
  precipitation: number;
  windSpeed: number;
}

export const CHALKIDIKI_CLIMATE: Record<number, MonthlyClimate> = {
  1: { minTemp: 5, maxTemp: 12, precipitation: 8, windSpeed: 15 },
  2: { minTemp: 6, maxTemp: 14, precipitation: 6, windSpeed: 14 },
  3: { minTemp: 8, maxTemp: 17, precipitation: 5, windSpeed: 13 },
  4: { minTemp: 12, maxTemp: 21, precipitation: 3, windSpeed: 12 },
  5: { minTemp: 17, maxTemp: 26, precipitation: 2, windSpeed: 11 },
  6: { minTemp: 22, maxTemp: 31, precipitation: 1, windSpeed: 10 },
  7: { minTemp: 24, maxTemp: 33, precipitation: 0.5, windSpeed: 10 },
  8: { minTemp: 24, maxTemp: 33, precipitation: 0.5, windSpeed: 10 },
  9: { minTemp: 20, maxTemp: 28, precipitation: 2, windSpeed: 11 },
  10: { minTemp: 15, maxTemp: 23, precipitation: 4, windSpeed: 12 },
  11: { minTemp: 10, maxTemp: 18, precipitation: 6, windSpeed: 13 },
  12: { minTemp: 7, maxTemp: 14, precipitation: 8, windSpeed: 14 },
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
