# Full Application Refactor - Design Document

**Date:** 2026-03-03
**Status:** Approved
**Scope:** Complete refactor of Greece Holiday Advisor into a modular, skill-driven architecture

## Context

The application is a public-facing hotel price comparison tool for Mediterranean hotels on reserve-online.net. Built incrementally by different AI models, the codebase has grown to ~3,000+ lines across 6 monolithic files with no tests, no skills, and inconsistent patterns. This refactor modernizes everything.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Modular Monolith | Simple deployment, clear boundaries, skills co-located with code |
| Audience | Public-facing product | Professional UX, polished branding |
| Data sources | reserve-online.net only | Easy to add new hotels on this platform |
| Geography | Mediterranean-wide | Greece first, architected for Turkey, Croatia, Spain etc. |
| Scraper pattern | Strategy pattern | One interface, separate implementations per endpoint type |
| Persistence | Stateless (scrape-on-demand) | No database, no infrastructure cost |
| Routing | Multi-page with hotel detail pages | Homepage, /hotels/[slug], /search, /search/results |
| Homepage | Hotel showcase + search | Cards for each hotel, quick search bar |

---

## 1. Domain Structure

```
src/domains/
├── hotels/
│   ├── config/              # One file per hotel (auto-discovered)
│   │   ├── blue-carpet.ts
│   │   ├── cocooning.ts
│   │   ├── myra.ts
│   │   ├── potidea-palace.ts
│   │   ├── porto-carras.ts
│   │   ├── eagles-palace.ts
│   │   ├── eagles-villas.ts
│   │   ├── excelsior.ts
│   │   ├── olympion-sunset.ts
│   │   └── medite-kassandra.ts
│   ├── types.ts             # HotelConfig, RoomType interfaces
│   ├── registry.ts          # Auto-discovers hotel configs via import.meta.glob
│   └── skill.md             # Skills: add-hotel, add-room-type
│
├── scraping/
│   ├── strategies/
│   │   ├── calendar.ts      # CalendarScraper (/calendar endpoints)
│   │   ├── avl.ts           # AvlScraper (/avl endpoints)
│   │   └── types.ts         # ScrapingStrategy interface
│   ├── engine.ts            # Orchestrator: parallel execution, aggregation, rate limiting
│   ├── parsers/
│   │   ├── price-parser.ts  # US/EU format normalization
│   │   └── html-parser.ts   # Common HTML extraction utilities
│   └── skill.md             # Skill: add-scraping-strategy
│
├── weather/
│   ├── providers/
│   │   ├── open-meteo.ts    # Open-Meteo forecast + historical API
│   │   └── types.ts         # WeatherProvider interface
│   ├── scoring.ts           # Beach suitability algorithm (0-100)
│   ├── climate-data.ts      # Historical climate baselines by month
│   └── skill.md             # Skills: modify-weather-scoring, add-weather-provider
│
├── analysis/
│   ├── combined-scorer.ts   # Price + weather combined scoring (60/40 default)
│   ├── recommendation.ts    # Text recommendation generator
│   └── skill.md             # Skill: modify-analysis-weights
│
└── locations/
    ├── config/              # One file per location (auto-discovered)
    │   ├── pefkochori.ts    # 39.95N, 23.35E
    │   ├── kavala.ts        # 40.05N, 23.55E
    │   ├── neos-marmaras.ts # 40.0994N, 23.7778E
    │   └── ...
    ├── types.ts             # Location, Region interfaces
    ├── registry.ts          # Auto-discovers locations
    └── skill.md             # Skills: add-location, add-region
```

### Auto-Registration Pattern

Hotels and locations use file-based discovery. Adding a new hotel = creating one config file. No index file edits required.

```typescript
// hotels/registry.ts
const modules = import.meta.glob('./config/*.ts', { eager: true })
export const hotels: HotelConfig[] = Object.values(modules)
  .map(m => (m as { default: HotelConfig }).default)
```

---

## 2. Routing & Pages

```
src/app/
├── (marketing)/
│   ├── page.tsx              # Homepage: hero + hotel showcase grid + quick search
│   └── layout.tsx            # Marketing layout with nav + footer
│
├── hotels/
│   ├── page.tsx              # All hotels listing
│   └── [slug]/
│       └── page.tsx          # Hotel detail: gallery, description, room types, weather, CTA
│
├── search/
│   ├── page.tsx              # Full search form
│   └── results/
│       └── page.tsx          # Results: price table, stats, comparison, weather, export
│
├── api/
│   ├── hotels/
│   │   ├── route.ts          # GET all hotels
│   │   └── [slug]/route.ts   # GET single hotel
│   ├── scrape/route.ts       # POST price scraping
│   └── weather/route.ts      # GET weather for location (standalone)
│
├── layout.tsx                # Root layout (fonts, theme)
└── globals.css               # Mediterranean theme tokens
```

### Page Descriptions

- **Homepage `/`**: Mediterranean hero, hotel showcase grid (cards with image/name/location/starting price), quick search bar
- **Hotels `/hotels`**: Filterable grid of all hotels with location badges
- **Hotel Detail `/hotels/[slug]`**: Hero, description, room types, location weather widget, "Check Prices" CTA
- **Search `/search`**: Full search form with hotel selection, dates, guests, advanced options
- **Results `/search/results`**: URL-param-based (shareable), price table with sorting, per-hotel comparison, weather analysis, CSV export

---

## 3. Scraping Architecture

### Strategy Interface

```typescript
interface ScrapingStrategy {
  type: 'calendar' | 'avl'
  fetchPrices(params: {
    hotel: HotelConfig
    searchParams: SearchParams
    signal?: AbortSignal
  }): Promise<PriceResult[]>
  fetchRoomTypes(hotel: HotelConfig): Promise<RoomType[]>
}
```

### Engine Orchestration

1. Receive search request with hotel slugs
2. Resolve each hotel's strategy from its config
3. Execute all strategies in parallel (per-hotel error isolation)
4. Apply rate limiting (150ms between room type requests)
5. Aggregate, deduplicate, sort results
6. Return results + per-hotel errors in meta

### Key Files

- `strategies/calendar.ts`: Handles `/calendar` endpoint HTML parsing, multi-room fetching
- `strategies/avl.ts`: Handles `/avl` endpoint JSON/HTML parsing, data-price attributes
- `parsers/price-parser.ts`: US format (`5,106.67`) and EU format (`1 382,77`) normalization
- `parsers/html-parser.ts`: Common Cheerio utilities for cell extraction
- `engine.ts`: Parallel orchestration, timeout management (30s local / 15s Vercel)

---

## 4. Weather System

### Architecture

- **WeatherProvider interface**: `fetchForecast(location, dateRange) → WeatherData[]`
- **Open-Meteo provider**: Forecast API (0-16 days) + Historical Archive (16+ days) + Climate fallback
- **Beach scoring**: Temperature (0-40), Precipitation (0-30), Wind (0-20), UV (0-10) = 0-100 total
- **Standalone API**: `GET /api/weather?location=pefkochori&from=...&to=...` (decoupled from scraping)

### Location Mapping

Each hotel config references a location slug. Locations have coordinates for weather API calls.

---

## 5. Analysis & Scoring

- **Combined score**: 60% weather + 40% value (configurable via skill)
- **Value score**: Discount % from average price, doubled for impact
- **Recommendations**: Text + category based on combined score thresholds
- **Rankings**: Overall, price-only, weather-only (each result gets all three)

---

## 6. UI Component Architecture

```
src/components/
├── layout/
│   ├── header.tsx            # Navigation + logo
│   ├── footer.tsx            # Footer
│   └── page-container.tsx    # Max-width wrapper
│
├── hotels/
│   ├── hotel-card.tsx        # Showcase card
│   ├── hotel-grid.tsx        # Grid layout
│   ├── hotel-hero.tsx        # Detail page hero
│   └── room-type-list.tsx    # Room types display
│
├── search/
│   ├── search-form.tsx       # Main form (composed from sub-components)
│   ├── hotel-selector.tsx    # Multi-select hotel picker
│   ├── date-picker.tsx       # Date range picker
│   ├── guest-selector.tsx    # Adults/children
│   └── search-options.tsx    # Advanced toggles
│
├── results/
│   ├── price-table.tsx       # Sortable results table
│   ├── price-stats.tsx       # Summary statistics cards
│   ├── hotel-comparison.tsx  # Per-hotel comparison
│   ├── monthly-summary.tsx   # Month-by-month accordion
│   └── export-button.tsx     # CSV export
│
├── weather/
│   ├── weather-card.tsx      # Individual weather deal card
│   ├── weather-grid.tsx      # Top deals grid
│   ├── weather-summary.tsx   # Overall summary
│   └── beach-score.tsx       # Beach suitability badge
│
└── ui/                       # shadcn/ui primitives (kept as-is)
```

### Design System

- **Theme**: Mediterranean (terracotta primary, olive secondary, warm cream background)
- **Typography**: DM Sans (body) + DM Serif Display (headings)
- **States**: Skeleton loading, empty states, error states per component
- **Responsive**: Mobile-first, md: 2-col, lg: 3-col breakpoints

---

## 7. API Contracts

### POST `/api/scrape`

```typescript
// Request
{
  checkin: string           // YYYY-MM-DD
  nights: number            // 1-30
  adults: number            // 1-8
  children?: number         // 0-6
  hotelSlugs: string[]      // Hotel identifiers
  searchMode: 'single' | 'multi-month' | 'year'
  months?: number           // For multi-month
  includeWeather?: boolean
}

// Response
{
  results: PriceResult[]
  roomOptions: RoomOption[]
  weather?: WeatherAnalysis[]
  meta: {
    totalResults: number
    hotelsSearched: string[]
    searchDuration: number
    errors: { hotel: string; error: string }[]
  }
}
```

### GET `/api/weather`

```typescript
// Query params: location, from, to
// Response
{
  location: string
  data: WeatherData[]
  meta: { source: 'forecast' | 'historical' | 'climate' }
}
```

---

## 8. Skills Catalog

### Domain Skills

| Skill File | Skills | Purpose |
|------------|--------|---------|
| `domains/hotels/skill.md` | add-hotel, add-room-type | Add hotels and room configurations |
| `domains/locations/skill.md` | add-location, add-region | Add geographic locations and regions |
| `domains/scraping/skill.md` | add-scraping-strategy | Support new endpoint types |
| `domains/weather/skill.md` | modify-weather-scoring, add-weather-provider | Customize weather analysis |
| `domains/analysis/skill.md` | modify-analysis-weights | Adjust scoring algorithms |
| `components/skill.md` | add-ui-component, add-ui-theme | Extend UI |

### Skill Format (standard template)

```markdown
# Skill: <Name>

## When to use
<Trigger condition>

## Prerequisites
<What you need before starting>

## Steps
1. <Step with specific file paths>
2. <Step with code template>
...

## Validation
- [ ] <Verification checklist>
```

---

## 9. Error Handling

- **Structured types**: `ScrapingError`, `WeatherError`, `ValidationError`
- **Per-hotel isolation**: One hotel failing returns others + error in meta
- **Graceful degradation**: Weather failure shows prices only; partial results preferred over total failure
- **Zod validation**: API request schemas validated with Zod
- **No console.log in production**: Remove all debugging logs, use structured dev-only logging

---

## 10. Testing Strategy

- **Runner**: Vitest
- **Unit tests**: Price parsing, weather scoring, analysis algorithms, hotel registry
- **Integration tests**: API routes with mocked scrapers
- **Location**: Co-located `__tests__/` directories within each domain
- **No E2E tests** in initial refactor (can add later)

---

## 11. Files to Delete (replaced by new structure)

| Current File | Replaced By |
|-------------|-------------|
| `src/lib/multi-scraper.ts` (1,150 lines) | `domains/scraping/strategies/` + `engine.ts` + `parsers/` |
| `src/lib/weather.ts` (640 lines) | `domains/weather/providers/` + `scoring.ts` + `climate-data.ts` |
| `src/lib/analyzer.ts` (136 lines) | `domains/analysis/combined-scorer.ts` + `recommendation.ts` |
| `src/lib/types.ts` | Distributed into domain `types.ts` files |
| `src/lib/hotels.ts` | `domains/hotels/registry.ts` + `config/*.ts` |
| `src/components/search-form.tsx` (420 lines) | `components/search/*.tsx` (5 focused files) |
| `src/components/price-results.tsx` (417 lines) | `components/results/*.tsx` (5 focused files) |
| `src/components/weather-analysis.tsx` (360 lines) | `components/weather/*.tsx` (4 focused files) |
| `src/app/page.tsx` | `app/(marketing)/page.tsx` + `app/search/` + `app/search/results/` |

---

## 12. Dependencies

### Keep
- next, react, typescript, tailwindcss, shadcn/ui (Radix)
- axios, cheerio, date-fns, zod, lucide-react
- Biome/Ultracite, husky, commitlint

### Add
- vitest (testing)

### Remove
- react-hook-form / @hookform/resolvers (simplify - use native form handling or server actions)

---

## Unresolved Questions

None - all decisions have been made through the brainstorming process.
