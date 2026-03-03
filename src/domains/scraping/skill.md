# Scraping Domain Skills

## Skill: Add a New Scraping Strategy

### When to use

The hotel uses a different booking system endpoint than the existing `/calendar` or `/avl` strategies.

### Prerequisites

- Understanding of the hotel's booking page HTML structure
- The endpoint URL and request format (GET/POST, form data, query params)
- Sample HTML response for developing the parser

### Steps

1. **Create strategy file** at `src/domains/scraping/strategies/<strategy-name>.ts`:

```typescript
import type { HotelConfig } from "@/domains/hotels/types";
import type {
  PriceResult,
  ScrapeResponse,
  ScrapingStrategy,
  SearchParams,
} from "../types";
import { ScrapingError } from "../types";

export class MyNewStrategy implements ScrapingStrategy {
  type = "<strategy-name>" as const;

  async fetchPrices(params: {
    hotel: HotelConfig;
    searchParams: SearchParams;
    signal?: AbortSignal;
  }): Promise<ScrapeResponse> {
    const { hotel, searchParams, signal } = params;

    try {
      // 1. Build request (URL, headers, form data)
      // 2. Fetch HTML from the hotel's booking endpoint
      // 3. Parse HTML to extract PriceResult[]
      // 4. Extract room options if available

      return {
        prices: [],       // PriceResult[]
        roomOptions: [],  // RoomType[]
        hotelId: hotel.id,
        hotelName: hotel.name,
      };
    } catch (error) {
      throw new ScrapingError(
        `Failed to fetch data for ${hotel.name}`,
        hotel.id,
        error
      );
    }
  }
}
```

2. **Add strategy type to `HotelConfig`** in `src/domains/hotels/types.ts`:

```typescript
// Update the strategyType union
strategyType: "calendar" | "avl" | "<strategy-name>";
```

3. **Register in `src/domains/scraping/engine.ts`**:

```typescript
// Add import
import { MyNewStrategy } from "./strategies/<strategy-name>";

// Add instance
const myNewStrategy = new MyNewStrategy();

// Update getStrategy function
function getStrategy(strategyType: "calendar" | "avl" | "<strategy-name>"): ScrapingStrategy {
  if (strategyType === "<strategy-name>") return myNewStrategy;
  return strategyType === "calendar" ? calendarStrategy : avlStrategy;
}
```

4. **Use existing parser utilities** from `src/domains/scraping/parsers/`:
   - `html-parser.ts`: `loadHtml(html)` returns a Cheerio instance, `extractRoomOptions($)` gets room types
   - `price-parser.ts`: `parsePrice(rawValue)` normalizes price strings to numbers

5. **Run verification**:

```bash
pnpm build   # verify no type errors
pnpm test    # verify existing tests still pass
```

### Key interfaces

- `ScrapingStrategy`: must implement `type` and `fetchPrices()`
- `SearchParams`: checkin, checkout, nights, adults, children, currency
- `PriceResult`: date, dayOfWeek, averagePerNight, stayTotal, hotelId, etc.
- `ScrapingError`: wraps errors with hotelId for debugging

### Validation

- [ ] Strategy implements the `ScrapingStrategy` interface
- [ ] Strategy type added to `HotelConfig.strategyType` union
- [ ] Strategy registered in `engine.ts` `getStrategy()` function
- [ ] At least one hotel config uses the new strategy type
- [ ] Manual test: search returns prices for a hotel using the strategy
- [ ] All existing tests pass (`pnpm test`)
