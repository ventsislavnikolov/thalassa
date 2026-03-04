"use client";

import { BarChart3, Calendar, Hotel, Moon, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import type { ScrapeApiResponse } from "@/app/api/scrape/types";
import { PageContainer } from "@/components/layout/page-container";
import { ExportButton } from "@/components/results/export-button";
import { HotelComparison } from "@/components/results/hotel-comparison";
import { MonthlySummary } from "@/components/results/monthly-summary";
import { PriceStats } from "@/components/results/price-stats";
import { PriceTable } from "@/components/results/price-table";
import {
  SearchForm,
  type SearchFormParams,
} from "@/components/search/search-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { WeatherGrid } from "@/components/weather/weather-grid";
import { WeatherSummary } from "@/components/weather/weather-summary";

function deriveSearchMode(params: SearchFormParams): string {
  if (params.isYearSearch) return "year";
  if (params.enableMonthsSearch && params.months > 0) return "multi-month";
  return "single";
}

function ResultsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div className="rounded-lg border p-4" key={i}>
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="mb-1 h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      {/* Table */}
      <div className="rounded-lg border">
        <div className="border-b p-4">
          <Skeleton className="h-5 w-40" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            className="flex items-center gap-4 border-b p-4 last:border-0"
            key={i}
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const defaultHotel = searchParams.get("hotel") ?? undefined;
  const formRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScrapeApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchContext, setSearchContext] = useState<SearchFormParams | null>(
    null
  );

  const handleSearch = async (params: SearchFormParams) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setSearchContext(params);

    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkin: params.checkin,
          nights: params.nights,
          adults: params.adults,
          children: params.children,
          hotelSlugs: params.hotelIds,
          searchMode: deriveSearchMode(params),
          months: params.months || undefined,
          includeWeather: params.includeWeather,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch prices");
      }

      const data: ScrapeApiResponse = await response.json();
      setResults(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleModifySearch = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const isMultiHotel =
    results !== null && results.meta.hotelsSearched.length > 1;
  const isMultiMonth =
    searchContext !== null &&
    (searchContext.enableMonthsSearch || searchContext.isYearSearch);

  return (
    <section className="py-8">
      <PageContainer>
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-display text-4xl tracking-tight">
            Search Hotel Prices
          </h1>
          <p className="text-lg text-muted-foreground">
            Find the best deals across premium hotels in Greece
          </p>
        </div>

        <div className="mb-8" ref={formRef}>
          <SearchForm
            defaultHotel={defaultHotel}
            loading={loading}
            onSearch={handleSearch}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Loading */}
        {loading && <ResultsSkeleton />}

        {/* Results */}
        {results && !loading && (
          <div className="animate-fade-in-up space-y-8">
            {/* Search Summary — sticky */}
            {searchContext && (
              <div className="sticky top-0 z-10 -mx-4 border-b bg-card/90 px-4 py-3 backdrop-blur-sm md:-mx-0 md:rounded-lg md:border md:shadow-warm">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-primary">
                    <Calendar className="h-3.5 w-3.5" />
                    {searchContext.checkin}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-primary">
                    <Moon className="h-3.5 w-3.5" />
                    {searchContext.nights} nights
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-secondary">
                    <Users className="h-3.5 w-3.5" />
                    {searchContext.adults} adults
                    {searchContext.children > 0 &&
                      `, ${searchContext.children} children`}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
                    <Hotel className="h-3.5 w-3.5" />
                    {results.meta.hotelsSearched.length} hotel
                    {results.meta.hotelsSearched.length > 1 ? "s" : ""}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {results.meta.totalResults} dates found
                  </span>
                  <Button
                    className="ml-auto"
                    onClick={handleModifySearch}
                    size="sm"
                    variant="ghost"
                  >
                    Modify Search
                  </Button>
                </div>
              </div>
            )}

            {results.results.length > 0 ? (
              <>
                <div>
                  <h2 className="mb-1 font-display text-2xl">Price Overview</h2>
                  <p className="mb-4 text-muted-foreground text-sm">
                    Summary statistics for your search
                  </p>
                  <PriceStats prices={results.results} />
                </div>

                {isMultiHotel && <HotelComparison prices={results.results} />}

                <div>
                  <h2 className="mb-1 font-display text-2xl">
                    Detailed Prices
                  </h2>
                  <p className="mb-4 text-muted-foreground text-sm">
                    All available dates and pricing
                  </p>
                  <PriceTable
                    prices={results.results}
                    showHotel={isMultiHotel}
                  />
                </div>

                {isMultiMonth && <MonthlySummary prices={results.results} />}

                <div className="flex justify-end">
                  <ExportButton
                    filename={`hotel-prices-${searchContext?.checkin ?? "search"}.csv`}
                    prices={results.results}
                  />
                </div>

                {/* Weather */}
                {results.weather && results.weather.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h2 className="mb-1 font-display text-2xl">
                        Weather Analysis
                      </h2>
                      <p className="mb-4 text-muted-foreground text-sm">
                        Beach suitability and conditions forecast
                      </p>
                      <div className="space-y-8">
                        <WeatherSummary analyses={results.weather} />
                        <WeatherGrid analyses={results.weather} />
                      </div>
                    </div>
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
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-primary border-b-2" />
        <p className="text-muted-foreground text-sm">Loading search...</p>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SearchPageContent />
    </Suspense>
  );
}
