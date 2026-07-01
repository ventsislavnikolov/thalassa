# AGENTS.md

This file provides guidance to AI agents (Claude Code, Cursor, etc.) when working with code in this repository.

## Project Overview

This is a modern web application for finding the best hotel prices across 10 hotels in Greece (Halkidiki and Kavala regions). Built with Next.js 15, TypeScript, and shadcn/ui, it uses a **modular domain architecture** with 6 core domains: hotels, locations, scraping, weather, analysis, and tracking. The application scrapes hotel prices from reserve-online.net, integrates weather forecasting, and provides combined value recommendations.

## Key Commands

### Development

- `pnpm install` - Install dependencies
- `pnpm dev` - Start the Next.js development server
- `pnpm build` - Build the application for production
- `pnpm start` - Start the production server

### Testing

- `pnpm test` - Run all tests (vitest)
- `pnpm test -- --watch` - Run tests in watch mode

### Code Quality

- `npx ultracite check` - Check for lint and format issues (Biome)
- `npx ultracite fix` - Auto-fix lint and format issues
- `pnpm lint` - Run ESLint

## Architecture

### Domain Structure (`src/domains/`)

Each domain is self-contained with types, configs, logic, and tests:

1. **Hotels** (`src/domains/hotels/`)
   - `types.ts` - `HotelConfig`, `RoomType` interfaces
   - `config/` - Individual hotel configs (10 hotels)
   - `registry.ts` - Hotel lookup functions (`getAllHotels`, `getHotel`, `getHotelsByStrategy`)
   - `__tests__/` - Registry tests

2. **Locations** (`src/domains/locations/`)
   - `types.ts` - `LocationConfig`, `Coordinates` interfaces
   - `config/` - Location configs (Pefkochori, Kavala, Neos Marmaras)
   - `registry.ts` - Location lookup functions
   - `__tests__/` - Registry tests

3. **Scraping** (`src/domains/scraping/`)
   - `types.ts` - `SearchParams`, `PriceResult`, `ScrapingStrategy` interface, `ScrapingError`
   - `strategies/calendar.ts` - Calendar endpoint strategy (HTML scraping)
   - `strategies/avl.ts` - AVL endpoint strategy (JSON API)
   - `parsers/price-parser.ts` - Price string normalization (EU/US formats)
   - `parsers/html-parser.ts` - Cheerio HTML utilities
   - `engine.ts` - Orchestrates scraping across hotels with timeouts
   - `__tests__/` - Price parser tests (31 cases)

4. **Weather** (`src/domains/weather/`)
   - `types.ts` - `WeatherData`, `WeatherProvider` interface
   - `scoring.ts` - Beach score, conditions, recommendations, sea temp estimation
   - `climate-data.ts` - Monthly climate averages for Halkidiki
   - `providers/open-meteo.ts` - Open-Meteo API provider (forecast + historical)
   - `__tests__/` - Scoring tests (39 cases)

5. **Analysis** (`src/domains/analysis/`)
   - `types.ts` - `CombinedAnalysis` interface
   - `combined-scorer.ts` - Value scoring, combined score (60% weather / 40% price), deal analysis
   - `__tests__/` - Combined scorer tests (20 cases)

6. **Tracking** (`src/domains/tracking/`)
   - `types.ts` - `WatchlistEntry`, `PriceSnapshot`, input/value interfaces
   - `db.ts` - Lazy Neon Postgres client (`getSql()`, reads `DATABASE_URL`)
   - `queries.ts` - Query layer: watchlist CRUD + snapshot read/insert
   - `delta.ts` - `shouldRecordSnapshot()` delta-storage rule (pure)
   - `selection.ts` - Map scrape results to a stored snapshot (pure)
   - `history.ts` - `computePriceTrend()` current-vs-history stats (pure)
   - `schema.sql` - `watchlist` + `price_snapshots` tables and index
   - `__tests__/` - Delta (6) + selection (5) + history (6) tests

### UI Components (`src/components/`)

Components are organized by feature area, using shadcn/ui primitives:

- `layout/` - Header, footer, page-container, standard-layout
- `hotels/` - Hotel card and grid components
- `search/` - Hotel selector, date picker, guest selector, search options, search form
- `results/` - Price stats, price table, hotel comparison, monthly summary, export button
- `weather/` - Beach score, weather card, weather grid, weather summary
- `watchlist/` - Watchlist manager, item row, price history chart + trend stats
- `ui/` - shadcn/ui primitives (button, card, input, select, calendar, etc.)

### Pages (`src/app/`)

- `(marketing)/page.tsx` - Homepage with hotel showcase
- `hotels/page.tsx` - Hotels listing page
- `hotels/[slug]/page.tsx` - Hotel detail pages
- `search/page.tsx` - Search form and results page
- `watchlist/page.tsx` - Manage tracked stays (add/remove/pause combos)
- `layout.tsx` - Root layout with Mediterranean theme

### API Routes (`src/app/api/`)

- `POST /api/scrape` - Price scraping with Zod validation
- `GET /api/hotels` - All hotel configs
- `GET /api/hotels/[slug]` - Single hotel config
- `GET /api/weather` - Weather data for a location and date range
- `GET /api/watchlist` - List tracked stays; `POST` to add (Zod-validated)
- `DELETE /api/watchlist/[id]` - Remove a tracked stay; `PATCH` toggles `active`
- `GET /api/watchlist/[id]/history` - Snapshots + computed price trend for a stay
- `GET /api/cron/scrape` - Scheduled scraper (Bearer `CRON_SECRET`); delta-stores
  a snapshot per active watchlist row only when the price changes

### Environment Variables

- `DATABASE_URL` - Neon Postgres connection string (tracking domain)
- `CRON_SECRET` - Bearer token guarding `GET /api/cron/scrape`

See `.env.example`. The external cron (cron-job.org, `0 */2 * * *`) calls the
scrape route every 2 hours.

### Key Features

- **Multi-Hotel Support**: 10 hotels across 3 locations with two scraping strategies
- **Weather Integration**: Beach suitability scoring (0-100) with temperature, precipitation, wind, UV analysis
- **Smart Recommendations**: Combined price + weather scoring (60/40 weighting)
- **Export Functionality**: CSV download of search results
- **Responsive Design**: Mobile-first Mediterranean theme with DM Sans typography
- **Real-time Search**: Live price fetching with progress indicators

### External Dependencies

- `next` - React framework with App Router
- `react` - UI library
- `typescript` - Type safety
- `tailwindcss` - CSS framework
- `shadcn/ui` - UI component library
- `axios` - HTTP client for scraping
- `cheerio` - HTML parsing
- `date-fns` - Date manipulation
- `lucide-react` - Icon library
- `zod` - Schema validation
- `vitest` - Test framework

## API Integration

The application scrapes hotel data from reserve-online.net using two strategies:

- **Calendar strategy** (`/calendar` endpoint): HTML scraping with Cheerio
- **AVL strategy** (`/avl` endpoint): JSON API responses

Weather data comes from the **Open-Meteo API** (forecast + historical archive).

### Search Parameters

- Hotel selection (single or multiple from 10 hotels)
- Check-in date and number of nights
- Adults and children count
- Room type preferences
- Search scope (single month, multi-month, or full year)
- Weather analysis toggle

## Skills

Each domain includes a `skill.md` file with step-by-step instructions for common extension tasks:

- [`src/domains/hotels/skill.md`](src/domains/hotels/skill.md) - Add a new hotel
- [`src/domains/locations/skill.md`](src/domains/locations/skill.md) - Add a new location
- [`src/domains/scraping/skill.md`](src/domains/scraping/skill.md) - Add a new scraping strategy
- [`src/domains/weather/skill.md`](src/domains/weather/skill.md) - Add a weather provider or modify scoring
- [`src/domains/analysis/skill.md`](src/domains/analysis/skill.md) - Modify analysis weights
- [`src/domains/tracking/skill.md`](src/domains/tracking/skill.md) - Schema, queries, delta rule, cron wiring
- [`src/components/skill.md`](src/components/skill.md) - Add a UI component

## Testing

117 tests across 8 test files using Vitest:

- `src/domains/hotels/__tests__/registry.test.ts` (6 tests)
- `src/domains/locations/__tests__/registry.test.ts` (3 tests)
- `src/domains/scraping/__tests__/price-parser.test.ts` (31 tests)
- `src/domains/weather/__tests__/scoring.test.ts` (39 tests)
- `src/domains/analysis/__tests__/combined-scorer.test.ts` (20 tests)
- `src/domains/tracking/__tests__/delta.test.ts` (6 tests)
- `src/domains/tracking/__tests__/selection.test.ts` (5 tests)
- `src/domains/tracking/__tests__/history.test.ts` (6 tests)

Always run `pnpm test` after making changes to verify nothing is broken.
