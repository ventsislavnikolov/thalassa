# Full Application Refactor - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor Greece Holiday Advisor from monolithic files into a modular domain-driven architecture with AI agent skills, multi-page routing, and improved UI.

**Architecture:** Modular monolith with domain modules (hotels, locations, scraping, weather, analysis). Strategy pattern for scrapers. Co-located skill files. Multi-page Next.js App Router.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4, shadcn/ui, Vitest, Zod, Axios, Cheerio

**Design doc:** `docs/plans/2026-03-03-full-refactor-design.md`

---

## Phase 1: Foundation

### Task 1: Add Vitest and configure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Step 1: Install vitest**

Run: `pnpm add -D vitest @vitejs/plugin-react`

**Step 2: Create vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Step 3: Add test script to package.json**

Add to scripts: `"test": "vitest run"`, `"test:watch": "vitest"`

**Step 4: Verify vitest runs**

Run: `pnpm test`
Expected: "No test files found" (no tests yet, but vitest itself works)

**Step 5: Commit**

```
feat: add vitest test runner
```

---

### Task 2: Create domain directory structure

**Files:**
- Create directories only (empty for now)

**Step 1: Create all domain directories**

```bash
mkdir -p src/domains/hotels/config
mkdir -p src/domains/hotels/__tests__
mkdir -p src/domains/scraping/strategies
mkdir -p src/domains/scraping/parsers
mkdir -p src/domains/scraping/__tests__
mkdir -p src/domains/weather/providers
mkdir -p src/domains/weather/__tests__
mkdir -p src/domains/analysis/__tests__
mkdir -p src/domains/locations/config
mkdir -p src/domains/locations/__tests__
mkdir -p src/components/layout
mkdir -p src/components/hotels
mkdir -p src/components/search
mkdir -p src/components/results
mkdir -p src/components/weather
```

**Step 2: Commit**

```
chore: create domain directory structure
```

---

## Phase 2: Hotels & Locations Domains

### Task 3: Define hotel types

**Files:**
- Create: `src/domains/hotels/types.ts`

**Step 1: Write the types file**

```typescript
// src/domains/hotels/types.ts
export interface HotelConfig {
  id: string;
  slug: string;
  name: string;
  displayName: string;
  baseUrl: string;
  strategyType: "calendar" | "avl";
  locationSlug: string;
  description?: string;
  excludeFromYearSearch?: boolean;
}

export interface RoomType {
  code: string;
  name: string;
}
```

Key differences from current `src/lib/hotels.ts`:
- `slug` added for URL routing (`/hotels/blue-carpet`)
- `strategyType` explicit instead of deriving from `apiEndpoint`
- `locationSlug` links to locations domain
- `excludeFromYearSearch` replaces the Porto Carras special case

**Step 2: Commit**

```
feat(hotels): define hotel config types
```

---

### Task 4: Define location types and configs

**Files:**
- Create: `src/domains/locations/types.ts`
- Create: `src/domains/locations/config/pefkochori.ts`
- Create: `src/domains/locations/config/kavala.ts`
- Create: `src/domains/locations/config/neos-marmaras.ts`
- Create: `src/domains/locations/registry.ts`

**Step 1: Write location types**

```typescript
// src/domains/locations/types.ts
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationConfig {
  slug: string;
  name: string;
  region: string;
  country: string;
  coordinates: Coordinates;
  timezone: string;
}
```

**Step 2: Write location configs**

```typescript
// src/domains/locations/config/pefkochori.ts
import type { LocationConfig } from "../types";

const pefkochori: LocationConfig = {
  slug: "pefkochori",
  name: "Pefkochori",
  region: "Halkidiki",
  country: "Greece",
  coordinates: { latitude: 39.95, longitude: 23.35 },
  timezone: "Europe/Athens",
};

export default pefkochori;
```

```typescript
// src/domains/locations/config/kavala.ts
import type { LocationConfig } from "../types";

const kavala: LocationConfig = {
  slug: "kavala",
  name: "Kavala",
  region: "Eastern Macedonia",
  country: "Greece",
  coordinates: { latitude: 40.05, longitude: 23.55 },
  timezone: "Europe/Athens",
};

export default kavala;
```

```typescript
// src/domains/locations/config/neos-marmaras.ts
import type { LocationConfig } from "../types";

const neosMarmaras: LocationConfig = {
  slug: "neos-marmaras",
  name: "Neos Marmaras",
  region: "Halkidiki",
  country: "Greece",
  coordinates: { latitude: 40.0994, longitude: 23.7778 },
  timezone: "Europe/Athens",
};

export default neosMarmaras;
```

**Step 3: Write location registry**

```typescript
// src/domains/locations/registry.ts
import type { LocationConfig } from "./types";
import kavala from "./config/kavala";
import neosMarmaras from "./config/neos-marmaras";
import pefkochori from "./config/pefkochori";

const locations: LocationConfig[] = [pefkochori, kavala, neosMarmaras];

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
```

**Step 4: Write registry test**

```typescript
// src/domains/locations/__tests__/registry.test.ts
import { describe, expect, it } from "vitest";
import { getAllLocations, getLocation } from "../registry";

describe("locations registry", () => {
  it("returns all locations", () => {
    const locations = getAllLocations();
    expect(locations.length).toBe(3);
    expect(locations.map((l) => l.slug)).toContain("pefkochori");
  });

  it("gets location by slug", () => {
    const location = getLocation("kavala");
    expect(location.name).toBe("Kavala");
    expect(location.coordinates.latitude).toBe(40.05);
  });

  it("throws for unknown slug", () => {
    expect(() => getLocation("nonexistent")).toThrow("Location not found");
  });
});
```

**Step 5: Run tests**

Run: `pnpm test`
Expected: PASS

**Step 6: Commit**

```
feat(locations): add location types, configs, and registry
```

---

### Task 5: Create hotel configs and registry

**Files:**
- Create: `src/domains/hotels/config/blue-carpet.ts`
- Create: `src/domains/hotels/config/cocooning.ts`
- Create: `src/domains/hotels/config/myra.ts`
- Create: `src/domains/hotels/config/potidea-palace.ts`
- Create: `src/domains/hotels/config/porto-carras.ts`
- Create: `src/domains/hotels/config/eagles-palace.ts`
- Create: `src/domains/hotels/config/eagles-villas.ts`
- Create: `src/domains/hotels/config/excelsior.ts`
- Create: `src/domains/hotels/config/olympion-sunset.ts`
- Create: `src/domains/hotels/config/medite-kassandra.ts`
- Create: `src/domains/hotels/registry.ts`

**Step 1: Write all 10 hotel configs**

Each config follows this pattern (showing blue-carpet as example):

```typescript
// src/domains/hotels/config/blue-carpet.ts
import type { HotelConfig } from "../types";

const blueCarpet: HotelConfig = {
  id: "bluecarpet",
  slug: "blue-carpet",
  name: "Blue Carpet Suites",
  displayName: "Blue Carpet Suites",
  baseUrl: "https://bluecarpetsuites.reserve-online.net",
  strategyType: "calendar",
  locationSlug: "pefkochori",
};

export default blueCarpet;
```

Complete hotel mapping (use this data from current `src/lib/hotels.ts`):

| id | slug | strategyType | locationSlug | baseUrl |
|----|------|-------------|-------------|---------|
| bluecarpet | blue-carpet | calendar | pefkochori | https://bluecarpetsuites.reserve-online.net |
| cocooning | cocooning | calendar | pefkochori | https://cocooningsuites.reserve-online.net |
| myra | myra | calendar | kavala | https://myrahotel.reserve-online.net |
| potideapalace | potidea-palace | calendar | pefkochori | https://potideapalace.reserve-online.net |
| portocarras | porto-carras | avl | neos-marmaras | https://portocarras.reserve-online.net |
| eaglespalace | eagles-palace | avl | pefkochori | https://eaglesresort.reserve-online.net |
| eaglesvillas | eagles-villas | avl | pefkochori | https://eaglesresort.reserve-online.net |
| excelsior | excelsior | avl | pefkochori | https://excelsiorthessaloniki.reserve-online.net |
| olympionsunset | olympion-sunset | avl | pefkochori | https://olympion-sunset.reserve-online.net |
| meditekassandra | medite-kassandra | avl | pefkochori | https://meditekassandraresort.reserve-online.net |

Special cases:
- `portocarras`: add `excludeFromYearSearch: true`
- `eaglespalace`: displayName = "Eagles Palace, Small Luxury Hotels of the World"
- `eaglesvillas`: displayName = "Eagles Villas, Small Luxury Hotels of the World"
- `potideapalace`: displayName = "Potidea Palace Hotel"

**Step 2: Write hotel registry**

```typescript
// src/domains/hotels/registry.ts
import type { HotelConfig } from "./types";
import blueCarpet from "./config/blue-carpet";
import cocooning from "./config/cocooning";
import eaglesPalace from "./config/eagles-palace";
import eaglesVillas from "./config/eagles-villas";
import excelsior from "./config/excelsior";
import mediteKassandra from "./config/medite-kassandra";
import myra from "./config/myra";
import olympionSunset from "./config/olympion-sunset";
import portoCarras from "./config/porto-carras";
import potideaPalace from "./config/potidea-palace";

const hotels: HotelConfig[] = [
  blueCarpet,
  cocooning,
  myra,
  potideaPalace,
  portoCarras,
  eaglesPalace,
  eaglesVillas,
  excelsior,
  olympionSunset,
  mediteKassandra,
];

export function getAllHotels(): HotelConfig[] {
  return hotels;
}

export function getAllHotelIds(): string[] {
  return hotels.map((h) => h.id);
}

export function getHotel(idOrSlug: string): HotelConfig {
  const hotel = hotels.find((h) => h.id === idOrSlug || h.slug === idOrSlug);
  if (!hotel) {
    throw new Error(`Hotel not found: ${idOrSlug}`);
  }
  return hotel;
}

export function getHotelsByStrategy(
  strategyType: "calendar" | "avl"
): HotelConfig[] {
  return hotels.filter((h) => h.strategyType === strategyType);
}
```

**Step 3: Write registry tests**

```typescript
// src/domains/hotels/__tests__/registry.test.ts
import { describe, expect, it } from "vitest";
import { getAllHotels, getHotel, getHotelsByStrategy } from "../registry";

describe("hotels registry", () => {
  it("returns all 10 hotels", () => {
    expect(getAllHotels()).toHaveLength(10);
  });

  it("gets hotel by id", () => {
    const hotel = getHotel("bluecarpet");
    expect(hotel.name).toBe("Blue Carpet Suites");
    expect(hotel.strategyType).toBe("calendar");
  });

  it("gets hotel by slug", () => {
    const hotel = getHotel("blue-carpet");
    expect(hotel.id).toBe("bluecarpet");
  });

  it("throws for unknown hotel", () => {
    expect(() => getHotel("nonexistent")).toThrow("Hotel not found");
  });

  it("filters by strategy type", () => {
    const calendar = getHotelsByStrategy("calendar");
    const avl = getHotelsByStrategy("avl");
    expect(calendar).toHaveLength(4);
    expect(avl).toHaveLength(6);
  });

  it("every hotel has a locationSlug", () => {
    for (const hotel of getAllHotels()) {
      expect(hotel.locationSlug).toBeTruthy();
    }
  });
});
```

**Step 4: Run tests**

Run: `pnpm test`
Expected: PASS

**Step 5: Commit**

```
feat(hotels): add hotel configs and registry with 10 hotels
```

---

## Phase 3: Scraping Domain

### Task 6: Define scraping types and shared search params

**Files:**
- Create: `src/domains/scraping/types.ts`

**Step 1: Write scraping types**

```typescript
// src/domains/scraping/types.ts
import type { HotelConfig, RoomType } from "@/domains/hotels/types";

export interface SearchParams {
  checkin: string; // YYYY-MM-DD
  checkout: string; // YYYY-MM-DD
  nights: number;
  adults: number;
  children?: number;
  infants?: number;
  room?: string;
  currency?: string; // Default: EUR
}

export interface PriceResult {
  date: string;
  dayOfWeek: string;
  averagePerNight: number;
  stayTotal: number;
  isLowestRate: boolean;
  nights: number;
  currency: string;
  hotelId: string;
  hotelName: string;
  roomType?: string;
  roomCode?: string;
}

export interface ScrapeResponse {
  prices: PriceResult[];
  roomOptions: RoomType[];
  hotelId: string;
  hotelName: string;
}

export interface ScrapingStrategy {
  type: "calendar" | "avl";
  fetchPrices(params: {
    hotel: HotelConfig;
    searchParams: SearchParams;
    signal?: AbortSignal;
  }): Promise<ScrapeResponse>;
}

export class ScrapingError extends Error {
  constructor(
    message: string,
    public readonly hotelId: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ScrapingError";
  }
}
```

**Step 2: Commit**

```
feat(scraping): define scraping types and strategy interface
```

---

### Task 7: Build price parser with TDD

**Files:**
- Create: `src/domains/scraping/parsers/price-parser.ts`
- Create: `src/domains/scraping/__tests__/price-parser.test.ts`

This is the core shared utility extracted from the 200+ lines of regex in `multi-scraper.ts`.

**Step 1: Write failing tests**

```typescript
// src/domains/scraping/__tests__/price-parser.test.ts
import { describe, expect, it } from "vitest";
import { parsePrice, PriceFormat } from "../parsers/price-parser";

describe("parsePrice", () => {
  describe("US format (comma=thousands, dot=decimal)", () => {
    it("parses standard US price", () => {
      expect(parsePrice("5,106.67")).toBe(5106.67);
    });

    it("parses US price without thousands separator", () => {
      expect(parsePrice("106.67")).toBe(106.67);
    });

    it("parses large US price", () => {
      expect(parsePrice("12,345.00")).toBe(12345.0);
    });
  });

  describe("EU format (space=thousands, comma=decimal)", () => {
    it("parses standard EU price with regular space", () => {
      expect(parsePrice("1 382,77")).toBe(1382.77);
    });

    it("parses EU price with non-breaking space", () => {
      expect(parsePrice("1\u00A0382,77")).toBe(1382.77);
    });

    it("parses EU price with narrow no-break space", () => {
      expect(parsePrice("2\u202F464,35")).toBe(2464.35);
    });

    it("parses EU price without thousands separator", () => {
      expect(parsePrice("382,77")).toBe(382.77);
    });
  });

  describe("ambiguous formats", () => {
    it("handles number with both comma and dot (US: comma first)", () => {
      expect(parsePrice("1,382.77")).toBe(1382.77);
    });

    it("handles number with both dot and comma (EU: dot first)", () => {
      expect(parsePrice("1.382,77")).toBe(1382.77);
    });

    it("handles whole number string", () => {
      expect(parsePrice("2347")).toBe(2347);
    });

    it("handles comma as thousands only (3 digits after)", () => {
      expect(parsePrice("2,347")).toBe(2347);
    });
  });

  describe("edge cases", () => {
    it("returns null for empty string", () => {
      expect(parsePrice("")).toBeNull();
    });

    it("returns null for non-numeric", () => {
      expect(parsePrice("abc")).toBeNull();
    });

    it("handles currency symbols mixed in", () => {
      expect(parsePrice("EUR 1,382.77")).toBe(1382.77);
    });

    it("handles trailing currency", () => {
      expect(parsePrice("1 382,77 €")).toBe(1382.77);
    });
  });
});

describe("PriceFormat.detectFormat", () => {
  it("detects US format", () => {
    expect(PriceFormat.detect("5,106.67")).toBe("us");
  });

  it("detects EU format", () => {
    expect(PriceFormat.detect("1 382,77")).toBe("eu");
  });

  it("detects plain number", () => {
    expect(PriceFormat.detect("2347")).toBe("plain");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL (module not found)

**Step 3: Implement price parser**

```typescript
// src/domains/scraping/parsers/price-parser.ts
const UNICODE_WHITESPACE = /[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;
const CURRENCY_SYMBOLS = /(?:BGN|лв|EUR|€)/gi;

type Format = "us" | "eu" | "plain";

export const PriceFormat = {
  detect(value: string): Format {
    const cleaned = value.replace(CURRENCY_SYMBOLS, "").trim();

    const hasComma = cleaned.includes(",");
    const hasDot = cleaned.includes(".");
    const hasSpace = UNICODE_WHITESPACE.test(cleaned.replace(/^\s+|\s+$/g, ""));

    if (hasComma && hasDot) {
      const commaIdx = cleaned.indexOf(",");
      const dotIdx = cleaned.indexOf(".");
      return commaIdx < dotIdx ? "us" : "eu";
    }

    if (hasSpace && hasComma) return "eu";

    if (hasComma && !hasDot) {
      const afterComma = cleaned.split(",").pop() ?? "";
      return afterComma.length === 2 ? "eu" : "us";
    }

    if (hasDot) return "us";

    return "plain";
  },
};

export function parsePrice(raw: string): number | null {
  if (!raw || raw.trim().length === 0) return null;

  // Strip currency symbols and trim
  let cleaned = raw.replace(CURRENCY_SYMBOLS, "").trim();
  if (cleaned.length === 0) return null;

  const format = PriceFormat.detect(cleaned);

  switch (format) {
    case "us":
      // Remove comma thousands separators, keep dot decimal
      cleaned = cleaned.replace(UNICODE_WHITESPACE, "").replace(/,/g, "");
      break;
    case "eu":
      // Remove space thousands separators, remove dot thousands, replace comma decimal with dot
      cleaned = cleaned
        .replace(UNICODE_WHITESPACE, "")
        .replace(/\./g, "")
        .replace(",", ".");
      break;
    case "plain":
      cleaned = cleaned.replace(UNICODE_WHITESPACE, "");
      break;
  }

  const value = Number.parseFloat(cleaned);
  return Number.isNaN(value) ? null : value;
}
```

**Step 4: Run tests**

Run: `pnpm test`
Expected: PASS

**Step 5: Commit**

```
feat(scraping): add price parser with US/EU format support
```

---

### Task 8: Build HTML parser utilities

**Files:**
- Create: `src/domains/scraping/parsers/html-parser.ts`

**Step 1: Write shared HTML parsing utilities**

```typescript
// src/domains/scraping/parsers/html-parser.ts
import * as cheerio from "cheerio";
import type { RoomType } from "@/domains/hotels/types";

export function loadHtml(html: string): cheerio.CheerioAPI {
  return cheerio.load(html);
}

export function extractRoomOptions($: cheerio.CheerioAPI): RoomType[] {
  const rooms: RoomType[] = [];

  // Method 1: Select dropdown
  $('select[name="room"] option').each((_, el) => {
    const $option = $(el);
    const code = $option.attr("value");
    const name = $option.text().trim();
    if (code && !$option.hasClass("empty")) {
      rooms.push({ code, name });
    }
  });

  if (rooms.length > 0) return rooms;

  // Method 2: tr.room elements with data-room attributes
  const roomMap = new Map<string, string>();
  $("tr.room").each((_, roomRow) => {
    const $roomRow = $(roomRow);
    const roomName = $roomRow.find("td.name").first().text().trim();
    let $currentRow = $roomRow.next("tr");
    while ($currentRow.length > 0 && !$currentRow.hasClass("room")) {
      const roomCode = $currentRow.attr("data-room");
      if (roomCode && roomName) {
        roomMap.set(roomCode, roomName);
        break;
      }
      $currentRow = $currentRow.next("tr");
    }
  });

  for (const [code, name] of roomMap) {
    rooms.push({ code, name });
  }

  return rooms;
}

export function unwrapJsonHtml(html: string): string {
  if (
    html.trim().startsWith("{") &&
    html.includes('"demand"') &&
    html.includes('"html"')
  ) {
    try {
      const jsonData = JSON.parse(html);
      if (jsonData.html) return jsonData.html;
    } catch {
      // Not JSON, return original
    }
  }
  return html;
}
```

**Step 2: Commit**

```
feat(scraping): add shared HTML parser utilities
```

---

### Task 9: Implement calendar scraping strategy

**Files:**
- Create: `src/domains/scraping/strategies/calendar.ts`

**Step 1: Implement CalendarStrategy**

Extract the calendar-specific logic from `src/lib/multi-scraper.ts:16-713` (the `fetchCalendarData` and `parseCalendarHTML` functions). Key changes:
- Implements `ScrapingStrategy` interface
- Uses `parsePrice()` from the price parser instead of inline regex
- Uses `extractRoomOptions()` from html-parser
- Removes all `console.log` debugging (replace with structured errors)
- Removes the 2.34 edge case debugging
- Includes multi-room fetching (currently in `fetchCalendarDataAllRooms`)

The strategy must:
1. Build form data from SearchParams
2. POST to `{hotel.baseUrl}/calendar`
3. Parse response HTML with Cheerio
4. Extract room options
5. For each room option, re-fetch with room param (150ms delay between)
6. Extract prices from `.calendar .avl` cells using `parsePrice()`
7. Determine if price is "stay total" or "per night" from context
8. Return `ScrapeResponse`

Port the exact price extraction logic from `multi-scraper.ts:473-700` but use `parsePrice()` for the actual number conversion instead of the inline format detection block at lines 574-612.

Keep the same form data structure from `buildFormData()` at lines 367-387.
Keep the same User-Agent header.
Keep 30s timeout.

**Step 2: Commit**

```
feat(scraping): implement calendar scraping strategy
```

---

### Task 10: Implement AVL scraping strategy

**Files:**
- Create: `src/domains/scraping/strategies/avl.ts`

**Step 1: Implement AvlStrategy**

Extract from `src/lib/multi-scraper.ts:715-1149` (the `fetchAvlEndpointData` and `parseAvlEndpointHTML` functions). Key changes:
- Implements `ScrapingStrategy` interface
- Uses `parsePrice()` for number conversion
- Uses `unwrapJsonHtml()` from html-parser
- Removes debug HTML file saving
- Removes excessive console.log debugging

The strategy must:
1. Build form data (different from calendar - includes `htl_code`, `src`, `fromd`, `tod` params)
2. POST to `{hotel.baseUrl}/avl`
3. Unwrap JSON wrapper if present (`{"demand":false,"html":"..."}`)
4. Priority: Extract `data-price` attributes from `tr[data-price]` elements
5. Fallback: Parse prices from HTML text patterns using `parsePrice()`
6. Filter prices to reasonable range (500-50000 EUR)
7. Return `ScrapeResponse`

Port the exact form data from `fetchAvlEndpointData` at lines 726-742.
Port the data-price extraction from lines 874-919.
Port the fallback patterns from lines 930-1101 but simplify using `parsePrice()`.

**Step 2: Commit**

```
feat(scraping): implement AVL scraping strategy
```

---

### Task 11: Build scraping engine (orchestrator)

**Files:**
- Create: `src/domains/scraping/engine.ts`

**Step 1: Implement the orchestrator**

```typescript
// src/domains/scraping/engine.ts
import type { HotelConfig } from "@/domains/hotels/types";
import { getHotel } from "@/domains/hotels/registry";
import type { PriceResult, SearchParams, ScrapeResponse, ScrapingStrategy } from "./types";
import { ScrapingError } from "./types";
import { CalendarStrategy } from "./strategies/calendar";
import { AvlStrategy } from "./strategies/avl";
import { addDays, format } from "date-fns";

const strategies: Record<string, ScrapingStrategy> = {
  calendar: new CalendarStrategy(),
  avl: new AvlStrategy(),
};

function getStrategy(hotel: HotelConfig): ScrapingStrategy {
  const strategy = strategies[hotel.strategyType];
  if (!strategy) {
    throw new ScrapingError(
      `No strategy for type: ${hotel.strategyType}`,
      hotel.id
    );
  }
  return strategy;
}

const HOTEL_TIMEOUT = process.env.VERCEL ? 15_000 : 30_000;

export interface ScrapeAllResult {
  results: PriceResult[];
  roomOptions: { code: string; name: string }[];
  errors: { hotel: string; error: string }[];
}

export async function scrapeHotels(
  hotelIds: string[],
  searchParams: SearchParams
): Promise<ScrapeAllResult> {
  const results: PriceResult[] = [];
  const allRoomOptions: { code: string; name: string }[] = [];
  const errors: { hotel: string; error: string }[] = [];

  for (const hotelId of hotelIds) {
    try {
      const hotel = getHotel(hotelId);
      const strategy = getStrategy(hotel);

      const response = await Promise.race([
        strategy.fetchPrices({ hotel, searchParams }),
        timeout(HOTEL_TIMEOUT, hotel.id),
      ]);

      results.push(...response.prices);
      if (response.roomOptions.length > 0 && allRoomOptions.length === 0) {
        allRoomOptions.push(...response.roomOptions);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ hotel: hotelId, error: message });
    }
  }

  results.sort((a, b) => a.stayTotal - b.stayTotal);
  return { results, roomOptions: allRoomOptions, errors };
}

export async function scrapeHotelsMultiMonth(
  hotelIds: string[],
  searchParams: SearchParams,
  monthsToCheck: number
): Promise<ScrapeAllResult> {
  const allErrors: { hotel: string; error: string }[] = [];
  const priceMap = new Map<string, PriceResult>();
  const allRoomOptions: { code: string; name: string }[] = [];

  const daysToSkip = monthsToCheck > 6 ? 25 : 30;

  for (const hotelId of hotelIds) {
    try {
      const hotel = getHotel(hotelId);
      const strategy = getStrategy(hotel);

      await Promise.race([
        (async () => {
          // Initial month
          const initial = await strategy.fetchPrices({ hotel, searchParams });
          for (const price of initial.prices) {
            const key = `${price.date}_${hotel.id}_${price.roomCode || "default"}`;
            priceMap.set(key, price);
          }
          if (initial.roomOptions.length > 0 && allRoomOptions.length === 0) {
            allRoomOptions.push(...initial.roomOptions);
          }

          // Additional months
          const startDate = new Date(searchParams.checkin);
          for (let i = 1; i < monthsToCheck; i++) {
            const currentDate = addDays(startDate, i * daysToSkip);
            const monthParams: SearchParams = {
              ...searchParams,
              checkin: format(currentDate, "yyyy-MM-dd"),
              checkout: format(
                addDays(currentDate, searchParams.nights),
                "yyyy-MM-dd"
              ),
            };
            try {
              const response = await strategy.fetchPrices({
                hotel,
                searchParams: monthParams,
              });
              for (const price of response.prices) {
                const key = `${price.date}_${hotel.id}_${price.roomCode || "default"}`;
                if (!priceMap.has(key)) {
                  priceMap.set(key, price);
                }
              }
            } catch {
              // Continue with other months
            }
            if (monthsToCheck > 6) {
              await delay(100);
            }
          }
        })(),
        timeout(HOTEL_TIMEOUT, hotelId),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      allErrors.push({ hotel: hotelId, error: message });
    }
  }

  const sorted = Array.from(priceMap.values()).sort(
    (a, b) => a.stayTotal - b.stayTotal
  );

  return { results: sorted, roomOptions: allRoomOptions, errors: allErrors };
}

function timeout(ms: number, hotelId: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new ScrapingError("Timeout", hotelId)), ms)
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**Step 2: Commit**

```
feat(scraping): add scraping engine with multi-hotel orchestration
```

---

## Phase 4: Weather Domain

### Task 12: Define weather types

**Files:**
- Create: `src/domains/weather/types.ts`

**Step 1: Write weather types**

```typescript
// src/domains/weather/types.ts
import type { Coordinates } from "@/domains/locations/types";

export interface WeatherData {
  date: string;
  temperature: { min: number; max: number; avg: number };
  precipitation: number;
  windSpeed: number;
  humidity: number;
  uvIndex: number;
  weatherCode: number;
  description: string;
  seaTemperature?: number;
  beachConditions: string;
  recommendation: string;
  score: number;
}

export interface WeatherProvider {
  fetchForecast(
    coordinates: Coordinates,
    dates: string[],
    timezone: string
  ): Promise<Map<string, WeatherData>>;
}
```

**Step 2: Commit**

```
feat(weather): define weather types and provider interface
```

---

### Task 13: Build beach scoring with TDD

**Files:**
- Create: `src/domains/weather/__tests__/scoring.test.ts`
- Create: `src/domains/weather/scoring.ts`

**Step 1: Write failing tests**

```typescript
// src/domains/weather/__tests__/scoring.test.ts
import { describe, expect, it } from "vitest";
import {
  calculateBeachScore,
  calculateBeachConditions,
  getWeatherDescription,
  estimateSeaTemperature,
} from "../scoring";

describe("calculateBeachScore", () => {
  it("returns perfect score for ideal conditions", () => {
    const score = calculateBeachScore({
      temperature: 26,
      precipitation: 0,
      windSpeed: 8,
      uvIndex: 6,
    });
    expect(score).toBe(100);
  });

  it("returns low score for rainy cold windy day", () => {
    const score = calculateBeachScore({
      temperature: 15,
      precipitation: 10,
      windSpeed: 30,
      uvIndex: 2,
    });
    expect(score).toBeLessThan(20);
  });

  it("clamps between 0 and 100", () => {
    const score = calculateBeachScore({
      temperature: 26,
      precipitation: 0,
      windSpeed: 5,
      uvIndex: 5,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("calculateBeachConditions", () => {
  it("returns rainy for heavy rain", () => {
    expect(
      calculateBeachConditions({ temperature: 25, precipitation: 6, windSpeed: 10 })
    ).toContain("Rainy");
  });

  it("returns perfect for ideal conditions", () => {
    expect(
      calculateBeachConditions({ temperature: 27, precipitation: 0, windSpeed: 10 })
    ).toContain("Perfect");
  });

  it("returns too cold below 18", () => {
    expect(
      calculateBeachConditions({ temperature: 15, precipitation: 0, windSpeed: 10 })
    ).toContain("cold");
  });
});

describe("getWeatherDescription", () => {
  it("returns Clear sky for code 0", () => {
    expect(getWeatherDescription(0)).toBe("Clear sky");
  });

  it("returns Thunderstorm for code 95", () => {
    expect(getWeatherDescription(95)).toBe("Thunderstorm");
  });
});

describe("estimateSeaTemperature", () => {
  it("returns warm temp for summer month", () => {
    const temp = estimateSeaTemperature("2026-07-15", 30);
    expect(temp).toBeGreaterThan(20);
  });

  it("returns cool temp for winter month", () => {
    const temp = estimateSeaTemperature("2026-01-15", 10);
    expect(temp).toBeLessThan(20);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL

**Step 3: Implement scoring**

Extract from `src/lib/weather.ts` lines 520-636. These are pure functions, port them exactly but with cleaner signatures:

```typescript
// src/domains/weather/scoring.ts

interface BeachScoreInput {
  temperature: number;
  precipitation: number;
  windSpeed: number;
  uvIndex: number;
}

interface BeachConditionsInput {
  temperature: number;
  precipitation: number;
  windSpeed: number;
}

export function calculateBeachScore(input: BeachScoreInput): number {
  // Port exact logic from weather.ts:552-603
}

export function calculateBeachConditions(input: BeachConditionsInput): string {
  // Port exact logic from weather.ts:520-550
}

export function generateWeatherRecommendation(
  score: number,
  temperature: number,
  precipitation: number,
  windSpeed: number
): string {
  // Port exact logic from weather.ts:605-636
}

export function getWeatherDescription(weatherCode: number): string {
  // Port exact logic from weather.ts:469-492
}

export function estimateSeaTemperature(date: string, airTemp: number): number {
  // Port exact logic from weather.ts:494-518
}
```

**Step 4: Run tests**

Run: `pnpm test`
Expected: PASS

**Step 5: Commit**

```
feat(weather): add beach scoring algorithm with tests
```

---

### Task 14: Extract climate data

**Files:**
- Create: `src/domains/weather/climate-data.ts`

**Step 1: Write climate data module**

Extract from `src/lib/weather.ts` lines 250-271 (the `climateData` record):

```typescript
// src/domains/weather/climate-data.ts
export interface MonthlyClimate {
  minTemp: number;
  maxTemp: number;
  precipitation: number;
  windSpeed: number;
}

// Chalkidiki region monthly climate averages
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
  1: 2, 2: 3, 3: 4, 4: 6, 5: 8, 6: 9,
  7: 10, 8: 9, 9: 7, 10: 5, 11: 3, 12: 2,
};

export function getClimateForMonth(month: number): MonthlyClimate {
  return CHALKIDIKI_CLIMATE[month] ?? CHALKIDIKI_CLIMATE[7];
}

export function getUvForMonth(month: number): number {
  return UV_BY_MONTH[month] ?? 5;
}
```

**Step 2: Commit**

```
feat(weather): extract climate data constants
```

---

### Task 15: Implement Open-Meteo weather provider

**Files:**
- Create: `src/domains/weather/providers/open-meteo.ts`

**Step 1: Implement provider**

Port from `src/lib/weather.ts` the entire fetch logic (lines 65-375). Key changes:
- Implements `WeatherProvider` interface
- Uses scoring functions from `scoring.ts`
- Uses climate data from `climate-data.ts`
- Takes `Coordinates` and `timezone` directly (no hotel ID lookup)
- No console.log debugging

The provider must handle three date ranges:
1. **Forecast** (within 16 days): Open-Meteo forecast API
2. **Historical** (beyond 16 days): Archive API with previous year's data
3. **Climate fallback**: Monthly averages if archive fails

Port these functions from `weather.ts`:
- `fetchMonthWeather()` -> forecast logic
- `fetchHistoricalClimateData()` -> historical logic
- `createClimateBasedWeatherData()` -> fallback logic
- `createWeatherData()` / `createWeatherDataFromHistorical()` -> data mappers
- `groupDatesByMonth()` -> date grouping
- `createFallbackWeatherData()` -> error fallback

**Step 2: Commit**

```
feat(weather): implement Open-Meteo weather provider
```

---

## Phase 5: Analysis Domain

### Task 16: Build combined scorer with TDD

**Files:**
- Create: `src/domains/analysis/__tests__/combined-scorer.test.ts`
- Create: `src/domains/analysis/combined-scorer.ts`
- Create: `src/domains/analysis/types.ts`

**Step 1: Write analysis types**

```typescript
// src/domains/analysis/types.ts
import type { PriceResult } from "@/domains/scraping/types";
import type { WeatherData } from "@/domains/weather/types";

export interface CombinedAnalysis {
  priceInfo: PriceResult;
  weatherData: WeatherData;
  totalScore: number;
  valueScore: number;
  recommendation: string;
  priceRank: number;
  weatherRank: number;
  overallRank: number;
}
```

**Step 2: Write failing tests**

```typescript
// src/domains/analysis/__tests__/combined-scorer.test.ts
import { describe, expect, it } from "vitest";
import { calculateValueScore, calculateCombinedScore } from "../combined-scorer";

describe("calculateValueScore", () => {
  it("returns high score for big discount", () => {
    // Price 500, average 1000 = 50% discount -> score 100 (capped)
    const score = calculateValueScore(500, 1000);
    expect(score).toBe(100);
  });

  it("returns 0 for price above average", () => {
    const score = calculateValueScore(1200, 1000);
    expect(score).toBe(0);
  });

  it("returns moderate score for small discount", () => {
    // Price 900, average 1000 = 10% discount -> score 20
    const score = calculateValueScore(900, 1000);
    expect(score).toBe(20);
  });
});

describe("calculateCombinedScore", () => {
  it("weights 60% weather + 40% value", () => {
    const score = calculateCombinedScore(80, 50);
    // 80 * 0.6 + 50 * 0.4 = 48 + 20 = 68
    expect(score).toBe(68);
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL

**Step 4: Implement combined scorer**

Port from `src/lib/analyzer.ts`:

```typescript
// src/domains/analysis/combined-scorer.ts
import type { PriceResult } from "@/domains/scraping/types";
import type { WeatherData } from "@/domains/weather/types";
import type { CombinedAnalysis } from "./types";

export function calculateValueScore(price: number, avgPrice: number): number {
  const discount = ((avgPrice - price) / avgPrice) * 100;
  return Math.min(100, Math.max(0, discount * 2));
}

export function calculateCombinedScore(
  weatherScore: number,
  valueScore: number
): number {
  return weatherScore * 0.6 + valueScore * 0.4;
}

export function generateRecommendation(
  totalScore: number,
  weatherScore: number,
  valueScore: number
): string {
  // Port exact logic from analyzer.ts:114-135
  if (totalScore >= 80) return "HIGHLY RECOMMENDED - Excellent value and weather";
  if (totalScore >= 70) {
    return weatherScore > valueScore
      ? "GOOD CHOICE - Great weather compensates for moderate savings"
      : "GOOD CHOICE - Excellent price makes up for average weather";
  }
  if (totalScore >= 60) return "ACCEPTABLE - Decent combination of price and weather";
  if (totalScore >= 50) return "CONSIDER CAREFULLY - Some trade-offs between price and weather";
  return "NOT RECOMMENDED - Poor weather outweighs price savings";
}

export function analyzeDeals(
  prices: PriceResult[],
  weatherMap: Map<string, WeatherData>,
  topCount = 5
): CombinedAnalysis[] {
  const topPrices = prices.slice(0, topCount);
  const avgPrice =
    prices.reduce((sum, p) => sum + p.stayTotal, 0) / prices.length;

  const analyses: CombinedAnalysis[] = topPrices
    .map((priceInfo) => {
      const weatherData = weatherMap.get(priceInfo.date);
      if (!weatherData) return null;

      const valueScore = calculateValueScore(priceInfo.stayTotal, avgPrice);
      const totalScore = calculateCombinedScore(weatherData.score, valueScore);
      const recommendation = generateRecommendation(
        totalScore,
        weatherData.score,
        valueScore
      );

      return {
        priceInfo,
        weatherData,
        totalScore,
        valueScore,
        recommendation,
        priceRank: 0,
        weatherRank: 0,
        overallRank: 0,
      };
    })
    .filter((a): a is CombinedAnalysis => a !== null);

  // Assign rankings
  const byScore = [...analyses].sort((a, b) => b.totalScore - a.totalScore);
  const byPrice = [...analyses].sort(
    (a, b) => a.priceInfo.stayTotal - b.priceInfo.stayTotal
  );
  const byWeather = [...analyses].sort(
    (a, b) => b.weatherData.score - a.weatherData.score
  );

  for (const analysis of byScore) {
    analysis.overallRank = byScore.indexOf(analysis) + 1;
    analysis.priceRank = byPrice.indexOf(analysis) + 1;
    analysis.weatherRank = byWeather.indexOf(analysis) + 1;
  }

  return byScore;
}
```

**Step 5: Run tests**

Run: `pnpm test`
Expected: PASS

**Step 6: Commit**

```
feat(analysis): add combined price+weather scorer with tests
```

---

## Phase 6: API Routes

### Task 17: Rewrite hotels API route

**Files:**
- Modify: `src/app/api/hotels/route.ts`
- Create: `src/app/api/hotels/[slug]/route.ts`

**Step 1: Update hotels list endpoint**

```typescript
// src/app/api/hotels/route.ts
import { NextResponse } from "next/server";
import { getAllHotels } from "@/domains/hotels/registry";

export async function GET() {
  const hotels = getAllHotels();
  return NextResponse.json(hotels);
}
```

**Step 2: Add single hotel endpoint**

```typescript
// src/app/api/hotels/[slug]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getHotel } from "@/domains/hotels/registry";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const hotel = getHotel(slug);
    return NextResponse.json(hotel);
  } catch {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }
}
```

**Step 3: Commit**

```
feat(api): rewrite hotels endpoints using new registry
```

---

### Task 18: Rewrite scrape API route

**Files:**
- Modify: `src/app/api/scrape/route.ts`

**Step 1: Rewrite using new domains**

```typescript
// src/app/api/scrape/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { addDays, format } from "date-fns";
import { scrapeHotels, scrapeHotelsMultiMonth } from "@/domains/scraping/engine";
import type { SearchParams } from "@/domains/scraping/types";
import { getLocation } from "@/domains/locations/registry";
import { getHotel } from "@/domains/hotels/registry";
import { OpenMeteoProvider } from "@/domains/weather/providers/open-meteo";
import { analyzeDeals } from "@/domains/analysis/combined-scorer";

const requestSchema = z.object({
  checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nights: z.number().min(1).max(30).default(5),
  adults: z.number().min(1).max(8).default(2),
  children: z.number().min(0).max(6).default(0),
  hotelSlugs: z.array(z.string()).min(1),
  searchMode: z.enum(["single", "multi-month", "year"]).default("single"),
  months: z.number().min(1).max(12).optional(),
  includeWeather: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { checkin, nights, adults, children, hotelSlugs, searchMode, months, includeWeather } = parsed.data;

    // Resolve hotel IDs from slugs (supports both id and slug)
    const hotelIds = hotelSlugs.map((s) => getHotel(s).id);

    const checkoutDate = format(addDays(new Date(checkin), nights), "yyyy-MM-dd");
    const searchParams: SearchParams = {
      checkin,
      checkout: checkoutDate,
      nights,
      adults,
      children,
      infants: 0,
      currency: "EUR",
    };

    let result;

    if (searchMode === "single") {
      result = await scrapeHotels(hotelIds, searchParams);
      // Filter to exact checkin date
      result.results = result.results.filter((p) => p.date === checkin);
    } else {
      const maxMonths = process.env.VERCEL ? 6 : 12;
      const monthsToCheck = Math.min(
        searchMode === "year" ? 12 : (months ?? 3),
        maxMonths
      );
      result = await scrapeHotelsMultiMonth(hotelIds, searchParams, monthsToCheck);
    }

    let weather = null;
    if (includeWeather && result.results.length > 0) {
      try {
        const provider = new OpenMeteoProvider();
        const topPrices = result.results.slice(0, 5);
        const dates = topPrices.map((p) => p.date);

        // Use location of first hotel for weather
        const firstHotel = getHotel(hotelIds[0]);
        const location = getLocation(firstHotel.locationSlug);

        const weatherMap = await provider.fetchForecast(
          location.coordinates,
          dates,
          location.timezone
        );
        weather = analyzeDeals(result.results, weatherMap, 5);
      } catch {
        // Weather failure is non-fatal
      }
    }

    return NextResponse.json({
      results: result.results,
      roomOptions: result.roomOptions,
      weather,
      meta: {
        totalResults: result.results.length,
        hotelsSearched: hotelIds,
        searchDuration: Date.now() - startTime,
        errors: result.errors,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch hotel prices. Please try again." },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```
feat(api): rewrite scrape endpoint with Zod validation and new domains
```

---

### Task 19: Add standalone weather API route

**Files:**
- Create: `src/app/api/weather/route.ts`

**Step 1: Implement weather endpoint**

```typescript
// src/app/api/weather/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getLocation } from "@/domains/locations/registry";
import { OpenMeteoProvider } from "@/domains/weather/providers/open-meteo";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locationSlug = searchParams.get("location");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!locationSlug || !from || !to) {
    return NextResponse.json(
      { error: "Missing required params: location, from, to" },
      { status: 400 }
    );
  }

  try {
    const location = getLocation(locationSlug);
    const provider = new OpenMeteoProvider();

    // Generate date range
    const dates: string[] = [];
    const current = new Date(from);
    const end = new Date(to);
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    const weatherMap = await provider.fetchForecast(
      location.coordinates,
      dates,
      location.timezone
    );

    return NextResponse.json({
      location: locationSlug,
      data: Array.from(weatherMap.values()),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```
feat(api): add standalone weather endpoint
```

---

## Phase 7: UI Components

### Task 20: Create layout components

**Files:**
- Create: `src/components/layout/header.tsx`
- Create: `src/components/layout/footer.tsx`
- Create: `src/components/layout/page-container.tsx`

**Step 1: Implement layout components**

These are new components. Use the Mediterranean theme. Keep them simple:

- **Header**: Logo text "Greece Holiday Advisor", nav links (Home, Hotels, Search), responsive hamburger on mobile
- **Footer**: Copyright, "Finding the best vacation deals across the Mediterranean", links
- **PageContainer**: Max-width wrapper (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`)

Use existing shadcn/ui components. Use `font-display` class for logo.

**Step 2: Commit**

```
feat(ui): add layout components (header, footer, page-container)
```

---

### Task 21: Create hotel card components

**Files:**
- Create: `src/components/hotels/hotel-card.tsx`
- Create: `src/components/hotels/hotel-grid.tsx`

**Step 1: Implement hotel card**

A card showing: hotel name (serif font), location badge, description placeholder, "View Details" link to `/hotels/[slug]`.

Use `Card` from shadcn/ui. Use `Badge` for location. Add gradient placeholder where hotel image would go.

**Step 2: Implement hotel grid**

Responsive grid: 1 col on mobile, 2 on md, 3 on lg. Takes `HotelConfig[]` as prop.

**Step 3: Commit**

```
feat(ui): add hotel card and grid components
```

---

### Task 22: Refactor search form into sub-components

**Files:**
- Create: `src/components/search/hotel-selector.tsx`
- Create: `src/components/search/date-picker.tsx`
- Create: `src/components/search/guest-selector.tsx`
- Create: `src/components/search/search-options.tsx`
- Create: `src/components/search/search-form.tsx`

Port from current `src/components/search-form.tsx` (420 lines) but split into focused sub-components:

- **HotelSelector**: Multi-select checkboxes for hotels. Takes `hotels: HotelConfig[]`, `selected: string[]`, `onChange`.
- **DatePicker**: Calendar date picker for check-in date. Takes `date`, `onSelect`.
- **GuestSelector**: Adults (1-8) and children (0-6) inputs. Takes `adults`, `children`, `onChange`.
- **SearchOptions**: Advanced toggles (year search, multi-month, weather, location). Takes options state and callbacks.
- **SearchForm**: Composes all sub-components. Manages form state. Calls onSearch callback.

Key change: The form now navigates to `/search/results` with URL params instead of calling an API directly.

**Step 1-5: Implement each sub-component, then the composed form**

**Step 6: Commit**

```
feat(ui): refactor search form into composable sub-components
```

---

### Task 23: Refactor price results into sub-components

**Files:**
- Create: `src/components/results/price-stats.tsx`
- Create: `src/components/results/price-table.tsx`
- Create: `src/components/results/hotel-comparison.tsx`
- Create: `src/components/results/monthly-summary.tsx`
- Create: `src/components/results/export-button.tsx`

Port from current `src/components/price-results.tsx` (417 lines):

- **PriceStats**: 3-card grid showing lowest, average, highest. Takes `prices: PriceResult[]`.
- **PriceTable**: Sortable table with top 20 results. Takes `prices`, `sortBy`, `onSort`.
- **HotelComparison**: Per-hotel stats cards. Takes `prices`.
- **MonthlySummary**: Accordion with month-by-month ranges. Takes `prices`.
- **ExportButton**: CSV download. Takes `prices`, `searchParams`.

**Step 1-5: Implement each**

**Step 6: Commit**

```
feat(ui): refactor price results into sub-components
```

---

### Task 24: Refactor weather analysis into sub-components

**Files:**
- Create: `src/components/weather/weather-card.tsx`
- Create: `src/components/weather/weather-grid.tsx`
- Create: `src/components/weather/weather-summary.tsx`
- Create: `src/components/weather/beach-score.tsx`

Port from current `src/components/weather-analysis.tsx` (360 lines):

- **BeachScore**: Score badge component (0-100) with color gradient. Takes `score: number`.
- **WeatherCard**: Individual deal card with weather metrics, rankings, recommendation. Takes `CombinedAnalysis`.
- **WeatherGrid**: Grid of top 5 weather cards. Takes `analyses: CombinedAnalysis[]`.
- **WeatherSummary**: Best value/weather/overall summary card. Takes `analyses`.

**Step 1-4: Implement each**

**Step 5: Commit**

```
feat(ui): refactor weather analysis into sub-components
```

---

## Phase 8: Pages

### Task 25: Create marketing layout and homepage

**Files:**
- Create: `src/app/(marketing)/layout.tsx`
- Create: `src/app/(marketing)/page.tsx`
- Modify: `src/app/layout.tsx` (keep root layout, remove old page content)

**Step 1: Create marketing layout**

Uses Header + Footer from layout components. Wraps children in PageContainer.

**Step 2: Create homepage**

- Hero section: Mediterranean gradient background, "Find the Best Hotel Deals Across the Mediterranean" heading (serif), subtitle, quick search CTA button linking to `/search`
- Hotel showcase: HotelGrid with all hotels from registry
- Location highlights: cards for Halkidiki, Kavala regions

**Step 3: Commit**

```
feat(pages): add marketing layout and homepage with hotel showcase
```

---

### Task 26: Create hotels listing and detail pages

**Files:**
- Create: `src/app/hotels/page.tsx`
- Create: `src/app/hotels/[slug]/page.tsx`

**Step 1: Hotels listing page**

Server component. Fetches all hotels from registry. Renders HotelGrid. Add heading "Our Hotels".

**Step 2: Hotel detail page**

Server component. Takes `[slug]` param. Fetches hotel config. Shows:
- Hotel hero (gradient placeholder + hotel name)
- Description placeholder
- Location info with weather widget (client component that fetches from `/api/weather`)
- Room types section (fetched from the hotel if available)
- "Check Prices" CTA button linking to `/search?hotel=[slug]`

Generate `generateStaticParams` for static generation of all hotel pages.

**Step 3: Commit**

```
feat(pages): add hotels listing and detail pages
```

---

### Task 27: Create search and results pages

**Files:**
- Create: `src/app/search/page.tsx`
- Create: `src/app/search/results/page.tsx`

**Step 1: Create search page**

Client component. Renders the SearchForm. On submit, navigates to `/search/results?checkin=...&nights=...&hotels=...`.

If URL has `?hotel=slug`, pre-select that hotel.

**Step 2: Create results page**

Client component. Reads search params from URL. Calls `POST /api/scrape`. Shows:
- Loading skeleton
- Error state
- Search summary
- PriceStats
- HotelComparison (if multi-hotel)
- PriceTable
- MonthlySummary (if multi-month)
- WeatherGrid + WeatherSummary (if weather enabled)
- ExportButton

**Step 3: Commit**

```
feat(pages): add search and results pages with URL-based state
```

---

## Phase 9: Cleanup & Skills

### Task 28: Delete old files

**Files:**
- Delete: `src/lib/multi-scraper.ts`
- Delete: `src/lib/weather.ts`
- Delete: `src/lib/analyzer.ts`
- Delete: `src/lib/types.ts`
- Delete: `src/lib/hotels.ts`
- Delete: `src/components/search-form.tsx`
- Delete: `src/components/price-results.tsx`
- Delete: `src/components/weather-analysis.tsx`
- Delete: `src/app/page.tsx` (replaced by marketing page)

**Step 1: Delete files**

Run: `rm src/lib/multi-scraper.ts src/lib/weather.ts src/lib/analyzer.ts src/lib/types.ts src/lib/hotels.ts src/components/search-form.tsx src/components/price-results.tsx src/components/weather-analysis.tsx`

Keep `src/lib/utils.ts` (cn function still used by shadcn/ui components).

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds with no import errors

**Step 3: Commit**

```
refactor: remove legacy monolithic source files
```

---

### Task 29: Write domain skill files

**Files:**
- Create: `src/domains/hotels/skill.md`
- Create: `src/domains/locations/skill.md`
- Create: `src/domains/scraping/skill.md`
- Create: `src/domains/weather/skill.md`
- Create: `src/domains/analysis/skill.md`
- Create: `src/components/skill.md`

**Step 1: Write each skill file**

Each follows the template from the design doc. Include:
- When to use
- Prerequisites
- Exact file paths to create/modify
- Code template with placeholders
- Validation checklist

Example for `hotels/skill.md`:

```markdown
# Hotel Domain Skills

## Skill: Add a New Hotel

### When to use
Adding a new hotel from reserve-online.net to the application.

### Prerequisites
- Hotel's reserve-online.net subdomain (e.g., `newhotel.reserve-online.net`)
- Endpoint type: visit the URL + `/calendar` and `/avl` to determine which works
- Hotel's geographic location (must match an existing location in `src/domains/locations/config/`)

### Steps

1. Create `src/domains/hotels/config/<hotel-slug>.ts`:

```typescript
import type { HotelConfig } from "../types";

const myNewHotel: HotelConfig = {
  id: "<hotel-id>",           // lowercase, no hyphens (e.g., "mynewhotel")
  slug: "<hotel-slug>",       // lowercase with hyphens (e.g., "my-new-hotel")
  name: "<Hotel Name>",
  displayName: "<Hotel Display Name>",
  baseUrl: "https://<subdomain>.reserve-online.net",
  strategyType: "<calendar|avl>",
  locationSlug: "<location-slug>",
};

export default myNewHotel;
```

2. Add import to `src/domains/hotels/registry.ts`:
   - Import the new config
   - Add to the `hotels` array

3. Run `pnpm build` to verify no type errors

### Validation
- [ ] Hotel appears in `GET /api/hotels` response
- [ ] Hotel appears on `/hotels` page
- [ ] Hotel detail page works at `/hotels/<slug>`
- [ ] Search returns prices for the new hotel
- [ ] Weather maps to correct location
```

Write similar skills for:
- **locations/skill.md**: Add a Location, Add a Region
- **scraping/skill.md**: Add a Scraping Strategy
- **weather/skill.md**: Modify Weather Scoring, Add a Weather Provider
- **analysis/skill.md**: Modify Analysis Weights
- **components/skill.md**: Add a UI Component, Add a UI Theme

**Step 2: Commit**

```
docs: add AI agent skills for all domains
```

---

### Task 30: Update AGENTS.md (project instructions)

**Files:**
- Modify: `AGENTS.md`

**Step 1: Update to reflect new architecture**

Update the project overview, file structure, key commands, and architecture sections to match the refactored codebase. Add a Skills section pointing to each domain's skill.md.

Add `"test": "vitest run"` to key commands.
Update the architecture section with the new domain structure.
Remove references to old file paths.

**Step 2: Commit**

```
docs: update AGENTS.md for refactored architecture
```

---

## Phase 10: Verification

### Task 31: Full verification

**Step 1: Run all tests**

Run: `pnpm test`
Expected: All tests pass

**Step 2: Run linter**

Run: `pnpm check`
Expected: No errors (run `pnpm fix` if needed)

**Step 3: Run build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Manual smoke test**

Run: `pnpm dev`
- Visit `/` - Homepage with hotel showcase
- Visit `/hotels` - Hotels listing
- Visit `/hotels/blue-carpet` - Hotel detail page
- Visit `/search` - Search form
- Run a search - Results should display
- Verify CSV export works

**Step 5: Commit any fixes**

```
fix: address verification issues
```

---

## Task Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1. Foundation | 1-2 | Vitest setup, directory structure |
| 2. Hotels & Locations | 3-5 | Types, configs, registries |
| 3. Scraping | 6-11 | Types, parser (TDD), strategies, engine |
| 4. Weather | 12-15 | Types, scoring (TDD), climate data, provider |
| 5. Analysis | 16 | Combined scorer (TDD) |
| 6. API Routes | 17-19 | Hotels, scrape, weather endpoints |
| 7. UI Components | 20-24 | Layout, hotels, search, results, weather |
| 8. Pages | 25-27 | Homepage, hotels, search, results |
| 9. Cleanup & Skills | 28-30 | Delete old files, write skills, update docs |
| 10. Verification | 31 | Tests, lint, build, smoke test |
