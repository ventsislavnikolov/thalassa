"use client";

import { BarChart3, Calendar, Hotel, Moon, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { ScrapeApiResponse } from "@/app/api/scrape/types";
import { PageContainer } from "@/components/layout/page-container";
import { ExportButton } from "@/components/results/export-button";
import { HotelComparison } from "@/components/results/hotel-comparison";
import { MonthlySummary } from "@/components/results/monthly-summary";
import { PriceStats } from "@/components/results/price-stats";
import { PriceTable } from "@/components/results/price-table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { WeatherGrid } from "@/components/weather/weather-grid";
import { WeatherSummary } from "@/components/weather/weather-summary";

interface ParsedParams {
  adults: number;
  checkin: string;
  children: number;
  hotelSlugs: string[];
  includeWeather: boolean;
  months?: number;
  nights: number;
  searchMode: string;
}

function parseSearchParams(params: URLSearchParams): ParsedParams | null {
  const checkin = params.get("checkin");
  const hotels = params.get("hotels");

  if (!(checkin && hotels)) {
    return null;
  }

  return {
    adults: Number.parseInt(params.get("adults") ?? "2", 10),
    checkin,
    children: Number.parseInt(params.get("children") ?? "0", 10),
    hotelSlugs: hotels.split(","),
    includeWeather: params.get("weather") === "true",
    months: params.get("months")
      ? Number.parseInt(params.get("months") as string, 10)
      : undefined,
    nights: Number.parseInt(params.get("nights") ?? "5", 10),
    searchMode: params.get("mode") ?? "single",
  };
}

function ResultsPageContent() {
  const searchParams = useSearchParams();
  const parsed = useMemo(() => parseSearchParams(searchParams), [searchParams]);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScrapeApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!parsed) {
      return;
    }

    const controller = new AbortController();

    const fetchResults = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/scrape", {
          body: JSON.stringify(parsed),
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch prices");
        }

        const data: ScrapeApiResponse = await response.json();
        setResults(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchResults();

    return () => controller.abort();
  }, [parsed]);

  if (!parsed) {
    return (
      <section className="py-16">
        <PageContainer>
          <div className="mx-auto max-w-lg text-center">
            <h1 className="font-display mb-4 text-3xl">No Search Parameters</h1>
            <p className="text-muted-foreground mb-8">
              Start a new search to find hotel prices.
            </p>
            <Button asChild>
              <Link href="/search">Go to Search</Link>
            </Button>
          </div>
        </PageContainer>
      </section>
    );
  }

  const isMultiHotel = parsed.hotelSlugs.length > 1;
  const isMultiMonth =
    parsed.searchMode === "multi-month" || parsed.searchMode === "year";

  return (
    <section className="py-8">
      <PageContainer>
        <div className="mb-8">
          <h1 className="font-display mb-2 text-3xl">Search Results</h1>
          <Button asChild size="sm" variant="outline">
            <Link href="/search">New Search</Link>
          </Button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2" />
              <p className="text-lg font-medium">
                Searching for the best prices...
              </p>
              <p className="text-muted-foreground text-sm">
                This may take a few moments
              </p>
            </div>
          </div>
        ) : null}

        {/* Error */}
        {error ? (
          <div className="mb-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        {/* Results */}
        {results && !loading && (
          <div className="space-y-8">
            {/* Search Summary */}
            <div className="bg-card shadow-warm rounded-lg p-4">
              <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                <span className="bg-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {parsed.checkin}
                </span>
                <span className="bg-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1">
                  <Moon className="h-3.5 w-3.5" />
                  {parsed.nights} nights
                </span>
                <span className="bg-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1">
                  <Users className="h-3.5 w-3.5" />
                  {parsed.adults} adults
                  {parsed.children > 0 && `, ${parsed.children} children`}
                </span>
                <span className="bg-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1">
                  <Hotel className="h-3.5 w-3.5" />
                  {results.meta.hotelsSearched.length} hotel
                  {results.meta.hotelsSearched.length > 1 ? "s" : ""}
                </span>
                <span className="bg-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {results.meta.totalResults} dates found
                </span>
              </div>
            </div>

            {results.results.length > 0 ? (
              <>
                <PriceStats prices={results.results} />

                {isMultiHotel && <HotelComparison prices={results.results} />}

                <PriceTable prices={results.results} showHotel={isMultiHotel} />

                {isMultiMonth ? (
                  <MonthlySummary prices={results.results} />
                ) : null}

                <div className="flex justify-end">
                  <ExportButton
                    filename={`hotel-prices-${parsed.checkin}.csv`}
                    prices={results.results}
                  />
                </div>

                {/* Weather */}
                {results.weather && results.weather.length > 0 && (
                  <>
                    <Separator />
                    <WeatherSummary analyses={results.weather} />
                    <WeatherGrid analyses={results.weather} />
                  </>
                )}
              </>
            ) : (
              <Alert>
                <AlertDescription>
                  No prices found for your search criteria. Try adjusting your
                  dates or expanding the search period.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </PageContainer>
    </section>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2" />
        <p className="text-muted-foreground text-sm">Loading results...</p>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResultsPageContent />
    </Suspense>
  );
}
