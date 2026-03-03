# AGENTS.md

This file provides guidance to AI agents (Claude Code, Cursor, etc.) when working with code in this repository.

## Project Overview

This is a modern web application for finding the best hotel prices across 10 hotels in Greece (Halkidiki and Kavala regions). Built with Next.js 15, TypeScript, and shadcn/ui, it uses a **modular domain architecture** with 5 core domains: hotels, locations, scraping, weather, and analysis. The application scrapes hotel prices from reserve-online.net, integrates weather forecasting, and provides combined value recommendations.

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

### UI Components (`src/components/`)

Components are organized by feature area, using shadcn/ui primitives:

- `layout/` - Header, footer, page-container, standard-layout
- `hotels/` - Hotel card and grid components
- `search/` - Hotel selector, date picker, guest selector, search options, search form
- `results/` - Price stats, price table, hotel comparison, monthly summary, export button
- `weather/` - Beach score, weather card, weather grid, weather summary
- `ui/` - shadcn/ui primitives (button, card, input, select, calendar, etc.)

### Pages (`src/app/`)

- `(marketing)/page.tsx` - Homepage with hotel showcase
- `hotels/page.tsx` - Hotels listing page
- `hotels/[slug]/page.tsx` - Hotel detail pages
- `search/page.tsx` - Search form and results page
- `layout.tsx` - Root layout with Mediterranean theme

### API Routes (`src/app/api/`)

- `POST /api/scrape` - Price scraping with Zod validation
- `GET /api/hotels` - All hotel configs
- `GET /api/hotels/[slug]` - Single hotel config
- `GET /api/weather` - Weather data for a location and date range

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
- [`src/components/skill.md`](src/components/skill.md) - Add a UI component

## Testing

99 tests across 5 test files using Vitest:

- `src/domains/hotels/__tests__/registry.test.ts` (6 tests)
- `src/domains/locations/__tests__/registry.test.ts` (3 tests)
- `src/domains/scraping/__tests__/price-parser.test.ts` (31 tests)
- `src/domains/weather/__tests__/scoring.test.ts` (39 tests)
- `src/domains/analysis/__tests__/combined-scorer.test.ts` (20 tests)

Always run `pnpm test` after making changes to verify nothing is broken.
