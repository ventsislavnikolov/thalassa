export interface HotelConfig {
  id: string;
  slug: string;
  name: string;
  displayName: string;
  baseUrl: string;
  strategyType: "calendar" | "avl";
  locationSlug: string;
  image: string;
  description?: string;
  excludeFromYearSearch?: boolean;
  hidden?: boolean;
}

export interface RoomType {
  code: string;
  name: string;
}
