"use client";

import {
  BarChart3,
  Calendar,
  ChevronRight,
  Hotel,
  Moon,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
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
          <div
            className="rounded-xl border border-[#1e2a36] bg-[#111820] p-5"
            key={i}
          >
            <Skeleton className="mb-3 h-4 w-24 bg-[#1e2a36]" />
            <Skeleton className="mb-2 h-8 w-32 bg-[#1e2a36]" />
            <Skeleton className="h-3 w-20 bg-[#1e2a36]" />
          </div>
        ))}
      </div>
      {/* Table */}
      <div className="rounded-xl border border-[#1e2a36] bg-[#111820]">
        <div className="border-[#1e2a36] border-b p-5">
          <Skeleton className="h-5 w-40 bg-[#1e2a36]" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            className="flex items-center gap-4 border-[#1e2a36] border-b p-4 last:border-0"
            key={i}
          >
            <Skeleton className="h-4 w-24 bg-[#1e2a36]" />
            <Skeleton className="h-4 w-32 bg-[#1e2a36]" />
            <Skeleton className="ml-auto h-4 w-16 bg-[#1e2a36]" />
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
    <div className="noir-bg min-h-screen">
      {/* ─── Hero header ─── */}
      <section className="relative overflow-hidden pt-12 pb-8">
        {/* Background atmosphere */}
        <div className="pointer-events-none absolute inset-0">
          <div className="noir-grid absolute inset-0 opacity-30" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 30% 0%, oklch(0.48 0.14 260 / 0.08), transparent 50%), radial-gradient(ellipse at 70% 100%, oklch(0.42 0.04 200 / 0.06), transparent 50%)",
            }}
          />
        </div>

        <PageContainer className="relative">
          <div className="mb-2 flex items-center gap-2 text-[#536365] text-sm">
            <span>Home</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-[#A3B2B5]">Price Search</span>
          </div>

          <div className="mt-6 flex items-end justify-between">
            <div>
              <h1 className="mb-2 font-display text-4xl text-[#F5F7F8] tracking-tight lg:text-5xl">
                Search Hotel Prices
              </h1>
              <p className="max-w-lg text-[#536365] text-lg leading-relaxed">
                Compare real-time rates across premium Greek hotels.
                Weather-informed recommendations included.
              </p>
            </div>

            {/* Decorative element */}
            <div className="hidden items-center gap-3 lg:flex">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2A4F58]/15">
                <Search className="h-5 w-5 text-[#738C8A]" />
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2E5BB1]/15">
                <BarChart3 className="h-5 w-5 text-[#2E5BB1]" />
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#738C8A]/15">
                <Sparkles className="h-5 w-5 text-[#738C8A]" />
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* ─── Search Form ─── */}
      <section className="relative pb-12">
        <PageContainer>
          <div ref={formRef}>
            <SearchForm
              defaultHotel={defaultHotel}
              loading={loading}
              onSearch={handleSearch}
            />
          </div>
        </PageContainer>
      </section>

      {/* ─── Results area ─── */}
      <section className="relative pb-20">
        <div className="noir-surface pointer-events-none absolute inset-0" />
        <div className="noir-grid pointer-events-none absolute inset-0 opacity-20" />

        <PageContainer className="relative">
          {/* Error */}
          {error && (
            <div className="mb-6 pt-8">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="pt-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-[#2E5BB1] border-b-2" />
                <p className="font-medium text-[#A3B2B5] text-sm">
                  Searching for the best prices...
                </p>
              </div>
              <ResultsSkeleton />
            </div>
          )}

          {/* Empty state — no search yet */}
          {!(results || loading || error) && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#1e2a36] bg-[#111820]">
                <Search className="h-8 w-8 text-[#293044]" />
              </div>
              <h3 className="mb-2 font-display text-[#A3B2B5] text-xl">
                Ready to search
              </h3>
              <p className="max-w-sm text-[#536365] text-sm">
                Configure your search above and compare prices across all
                tracked hotels in real time.
              </p>
            </div>
          )}

          {/* Results */}
          {results && !loading && (
            <div className="animate-fade-in-up space-y-8 pt-8">
              {/* Search Summary — sticky */}
              {searchContext && (
                <div className="glass-noir sticky top-0 z-10 rounded-xl px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#2E5BB1]/15 px-3 py-1.5 text-[#6B9AE8]">
                      <Calendar className="h-3.5 w-3.5" />
                      {searchContext.checkin}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#2E5BB1]/15 px-3 py-1.5 text-[#6B9AE8]">
                      <Moon className="h-3.5 w-3.5" />
                      {searchContext.nights} nights
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#2A4F58]/15 px-3 py-1.5 text-[#738C8A]">
                      <Users className="h-3.5 w-3.5" />
                      {searchContext.adults} adults
                      {searchContext.children > 0 &&
                        `, ${searchContext.children} children`}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#111820] px-3 py-1.5 text-[#536365]">
                      <Hotel className="h-3.5 w-3.5" />
                      {results.meta.hotelsSearched.length} hotel
                      {results.meta.hotelsSearched.length > 1 ? "s" : ""}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#111820] px-3 py-1.5 text-[#536365]">
                      <BarChart3 className="h-3.5 w-3.5" />
                      {results.meta.totalResults} dates found
                    </span>
                    <Button
                      className="ml-auto border-[#1e2a36] bg-transparent text-[#A3B2B5] hover:bg-[#111820] hover:text-[#F5F7F8]"
                      onClick={handleModifySearch}
                      size="sm"
                      variant="outline"
                    >
                      Modify Search
                    </Button>
                  </div>
                </div>
              )}

              {results.results.length > 0 ? (
                <>
                  <div>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2A4F58]/15">
                        <BarChart3 className="h-4 w-4 text-[#738C8A]" />
                      </div>
                      <div>
                        <h2 className="font-display text-[#F5F7F8] text-xl">
                          Price Overview
                        </h2>
                        <p className="text-[#536365] text-xs">
                          Summary statistics for your search
                        </p>
                      </div>
                    </div>
                    <PriceStats prices={results.results} />
                  </div>

                  {isMultiHotel && <HotelComparison prices={results.results} />}

                  <div>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2E5BB1]/15">
                        <Calendar className="h-4 w-4 text-[#2E5BB1]" />
                      </div>
                      <div>
                        <h2 className="font-display text-[#F5F7F8] text-xl">
                          Detailed Prices
                        </h2>
                        <p className="text-[#536365] text-xs">
                          All available dates and pricing
                        </p>
                      </div>
                    </div>
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
                      <Separator className="border-[#1e2a36]" />
                      <div>
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#738C8A]/15">
                            <Sparkles className="h-4 w-4 text-[#738C8A]" />
                          </div>
                          <div>
                            <h2 className="font-display text-[#F5F7F8] text-xl">
                              Weather Analysis
                            </h2>
                            <p className="text-[#536365] text-xs">
                              Beach suitability and conditions forecast
                            </p>
                          </div>
                        </div>
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
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="noir-bg flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-[#2E5BB1] border-b-2" />
        <p className="text-[#536365] text-sm">Loading search...</p>
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
