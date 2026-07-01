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
  strategyType: "calendar" | "avl";
}

export interface RoomType {
  code: string;
  name: string;
}
