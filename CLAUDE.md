# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern web application for finding the best hotel prices at Blue Carpet Suites and Cocooning Suites in Pefkohori, Greece. Built with Next.js 15, TypeScript, and shadcn/ui, it provides a comprehensive hotel price comparison tool with weather analysis.

## Key Commands

### Development
- `pnpm install` - Install dependencies
- `pnpm dev` - Start the Next.js development server
- `pnpm build` - Build the application for production
- `pnpm start` - Start the production server

### Code Quality
- `pnpm lint` - Run ESLint on all files
- `pnpm lint:fix` - Auto-fix linting issues

## Architecture

### Web Application Structure

1. **Frontend Components** (`src/components/`)
   - `search-form.tsx` - Main search interface with hotel selection, date picker, and options
   - `price-results.tsx` - Display price tables, hotel comparisons, and export functionality
   - `weather-analysis.tsx` - Weather analysis cards with beach suitability scoring
   - `ui/` - shadcn/ui components (buttons, cards, forms, etc.)

2. **API Routes** (`src/app/api/`)
   - `scrape/route.ts` - Main scraping endpoint that processes search requests
   - `hotels/route.ts` - Returns available hotel configurations

3. **Scraper Logic** (`src/lib/`)
   - `multi-scraper.ts` - Multi-hotel scraping engine for both properties
   - `weather.ts` - Weather data integration with Open-Meteo API
   - `analyzer.ts` - Combines price and weather data for recommendations
   - `types.ts` - TypeScript interfaces and type definitions
   - `hotels.ts` - Hotel configuration and management

4. **Main Application** (`src/app/`)
   - `page.tsx` - Main application page with search form and results
   - `layout.tsx` - Root layout with global styles
   - `globals.css` - Global CSS including Tailwind styles

### Key Features

- **Multi-Hotel Support**: Search Blue Carpet Suites, Cocooning Suites, or both
- **Weather Integration**: Beach suitability scoring with temperature, precipitation, wind analysis
- **Smart Recommendations**: Combined price + weather scoring (60/40 weighting)
- **Export Functionality**: CSV download of search results
- **Responsive Design**: Mobile-first design that works on all devices
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

## API Integration

The application scrapes hotel data from:
- **Blue Carpet Suites**: `https://bluecarpetsuites.reserve-online.net/calendar`
- **Cocooning Suites**: `https://cocooningsuites.reserve-online.net/calendar`
- **Weather API**: Open-Meteo API for weather forecasting

### Search Parameters
- Hotel selection (single or multiple)
- Check-in date and number of nights
- Adults and children count
- Room type preferences
- Search scope (months or full year)
- Weather analysis toggle