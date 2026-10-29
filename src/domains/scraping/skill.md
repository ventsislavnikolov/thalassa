# Scraping Domain Skills

## Skill: Add a New Scraping Strategy

### When to use

The hotel uses a different booking system than the existing strategies (`calendar`, `avl`, `hvd`).

### Prerequisites

- Understanding of the hotel's booking page HTML structure
- The endpoint URL and request format (GET/POST, form data, query params)
- Sample HTML response for developing the parser

### Steps

1. **Create strategy file** at `src/domains/scraping/strategies/<strategy-name>.ts`:

```typescript
import type {
  FetchPricesParams,
  ScrapeResponse,
  ScrapingStrategy,
} from "../types";
import { ScrapingError } from "../types";

async function fetchMyNewPrices({
  hotel,
  searchParams,
  signal,
}: FetchPricesParams): Promise<ScrapeResponse> {
  try {
    // 1. Build request (URL, headers, form data)
    // 2. Fetch HTML from the hotel's booking endpoint
    // 3. Parse HTML to extract PriceResult[]
    // 4. Extract room options if available

    return {
      hotelId: hotel.id,
      hotelName: hotel.name,
      prices: [], // PriceResult[]
      roomOptions: [], // RoomType[]
    };
  } catch (error) {
    throw new ScrapingError(`Failed to fetch data for ${hotel.name}`, {
      cause: error,
      hotelId: hotel.id,
    });
  }
}

export class MyNewStrategy implements ScrapingStrategy {
  readonly fetchPrices = fetchMyNewPrices;
  type = "<strategy-name>" as const;
}
```

2. **Add strategy type to `HotelConfig`** in `src/domains/hotels/types.ts`:

```typescript
// Update the strategyType union
export type StrategyType = "calendar" | "avl" | "hvd" | "<strategy-name>";
```

3. **Register in `src/domains/scraping/engine.ts`**:

```typescript
// Add import
import { MyNewStrategy } from "./strategies/<strategy-name>";

// Add instance
const myNewStrategy = new MyNewStrategy();

// Update getStrategy function
const strategies: Record<StrategyType, ScrapingStrategy> = {
  calendar: calendarStrategy, avl: avlStrategy, hvd: hvdStrategy,
  "<strategy-name>": myNewStrategy,
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
- `ScrapingError`: wraps errors with hotelId (and the original error as `cause`) for debugging

### Validation

- [ ] Strategy implements the `ScrapingStrategy` interface
- [ ] Strategy type added to `HotelConfig.strategyType` union
- [ ] Strategy registered in `engine.ts` `getStrategy()` function
- [ ] At least one hotel config uses the new strategy type
- [ ] Manual test: search returns prices for a hotel using the strategy
- [ ] All existing tests pass (`pnpm test`)
