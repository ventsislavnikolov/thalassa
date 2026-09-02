/** Which booking engine a hotel's prices are fetched from; see scraping/strategies. */
export type StrategyType = "calendar" | "avl" | "hvd";

export interface HotelConfig {
  baseUrl: string;
  description?: string;
  displayName: string;
  excludeFromYearSearch?: boolean;
  hidden?: boolean;
  id: string;
  image: string;
  locationSlug: string;
  name: string;
  slug: string;
  strategyType: StrategyType;
}

export interface RoomType {
  code: string;
  name: string;
}
