# 🏖️ Greece Hotels Price Finder

A modern web application for finding the best hotel prices at Blue Carpet Suites and Cocooning Suites in Greece. Built with Next.js 15, TypeScript, and shadcn/ui.

## Features

- 🔍 **Hotel Selection**: Choose between Blue Carpet Suites, Cocooning Suites, or both
- 📅 **Date Picker**: Select check-in dates with an intuitive calendar interface
- 🛏️ **Flexible Search**: Configure nights, adults, children, and room types
- 📊 **Time Range Options**: Search single months, multiple months, or entire year
- 🌤️ **Weather Integration**: Optional weather analysis for top price dates
- 💾 **CSV Export**: Download search results for offline analysis
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- 🎨 **Modern UI**: Beautiful interface with dark mode support

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **APIs**: Custom scraping endpoints
- **Weather Data**: Open-Meteo API
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm/yarn

### Installation

1. **Install pnpm** (if not already installed):

   ```bash
   npm install -g pnpm
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Start development server**:

   ```bash
   pnpm dev
   ```

4. **Open your browser**:
   ```
   http://localhost:3000
   ```

### Building for Production

```bash
pnpm build
pnpm start
```

## How to Use

### 1. Hotel Selection

- Choose individual hotels (Blue Carpet or Cocooning) or search both
- Each hotel checkbox enables/disables that property in the search

### 2. Search Configuration

- **Check-in Date**: Use the calendar picker to select your arrival date
- **Nights**: Specify how many nights you'll be staying (1-30)
- **Guests**: Set number of adults (1-8) and children (0-6)
- **Room Type**: Choose specific room types or leave blank for all options

### 3. Search Scope

- **Single/Multi-Month**: Search 1-12 months from your check-in date
- **Year Search**: Toggle to search the entire year for best deals
- **Weather Analysis**: Enable to get weather forecasts for top price dates

### 4. Results

- **Price Table**: View sorted results with hotel comparison
- **Hotel Comparison**: Side-by-side price analysis when searching multiple hotels
- **Monthly Summary**: For year searches, see price ranges by month
- **Weather Cards**: Detailed weather analysis with beach suitability scores

### 5. Export Options

- **CSV Download**: Export all results for spreadsheet analysis
- **Data Includes**: Dates, prices, hotels, weather scores, and recommendations

## API Endpoints

### `POST /api/scrape`

Main scraping endpoint that accepts search parameters and returns price data.

### `GET /api/hotels`

Returns available hotel configurations.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── scrape/route.ts     # Main scraping API
│   │   └── hotels/route.ts     # Hotels configuration API
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main page component
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── search-form.tsx         # Search form component
│   ├── price-results.tsx       # Price display component
│   └── weather-analysis.tsx    # Weather analysis component
└── lib/
    ├── multi-scraper.ts        # Multi-hotel scraping engine
    ├── analyzer.ts             # Price + weather analysis
    ├── weather.ts              # Weather API integration
    ├── hotels.ts               # Hotel configurations
    ├── types.ts                # TypeScript interfaces
    └── utils.ts                # Utility functions
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Deploy automatically

### Other Platforms

1. Build the project: `pnpm build`
2. Deploy the `.next` folder
3. Ensure Node.js 18+ runtime

## Development

### Adding Components

```bash
pnpm dlx shadcn@latest add [component-name]
```

### Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm lint:fix     # Auto-fix linting issues
pnpm type-check   # Run TypeScript checks
pnpm clean        # Clean build cache
pnpm setup        # Install deps + build
```

### Package Management

This project uses **pnpm** for faster, more efficient package management:

- 📦 **Disk efficient**: Shared packages across projects
- ⚡ **Faster installs**: Parallel dependency resolution
- 🔒 **Strict**: Prevents phantom dependencies
- 🎯 **Compatible**: Works with npm/yarn projects

---

Built with ❤️ for finding the best vacation deals in Greece 🇬🇷
