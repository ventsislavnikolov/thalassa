import type { CombinedAnalysis } from "@/domains/analysis/types";
import type { PriceResult } from "@/domains/scraping/types";

export interface ScrapeApiResponse {
  meta: {
    totalResults: number;
    hotelsSearched: string[];
    searchDuration: number;
    errors: string[];
  };
  results: PriceResult[];
  roomOptions: { code: string; name: string }[];
  weather: CombinedAnalysis[] | null;
}
