"use client";

import { BarChart3, Calendar, Hotel, Moon, Users } from "lucide-react";
import { useState } from "react";
import { PriceResults } from "@/components/price-results";
import { SearchForm } from "@/components/search-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { WeatherAnalysis } from "@/components/weather-analysis";

interface SearchParams {
  checkin: string;
  nights: number;
  adults: number;
  children: number;
  room: string;
  months: number;
  hotelIds: string[];
  includeWeather: boolean;
  isYearSearch: boolean;
}

interface SearchResults {
  prices: any[];
  roomOptions: any[];
  weatherAnalysis: any[] | null;
  searchParams: any;
  meta: {
    totalResults: number;
    monthsChecked: number;
    hotelsSearched: string[];
  };
}

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (params: SearchParams) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch prices");
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!results?.prices) return;

    const csvHeaders = [
      "Date",
      "Day of Week",
      "Hotel",
      "Average Per Night (EUR)",
      "Total Stay (EUR)",
      "Lowest Rate",
      "Nights",
    ];

    const csvRows = results.prices.map((price) => [
      price.date,
      price.dayOfWeek,
      price.hotelName,
      price.averagePerNight.toFixed(2),
      price.stayTotal.toFixed(2),
      price.isLowestRate ? "Yes" : "No",
      price.nights.toString(),
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `pefkohori_hotel_prices_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-display text-4xl tracking-tight">
            Discover Your Perfect Greek Getaway
          </h1>
          <p className="text-lg text-muted-foreground">
            Compare prices across 10 premium hotels in Halkidiki &amp;
            Thessaloniki
          </p>
        </div>

        {/* Search Form */}
        <div className="mb-8">
          <SearchForm loading={loading} onSearch={handleSearch} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-primary border-b-2" />
              <p className="font-medium text-lg">
                Searching for the best prices...
              </p>
              <p className="text-muted-foreground text-sm">
                This may take a few moments
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <div className="animate-fade-in-up space-y-8">
            {/* Search Summary */}
            <div className="rounded-lg bg-card p-4 shadow-warm">
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {results.searchParams.checkin}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                  <Moon className="h-3.5 w-3.5" />
                  {results.searchParams.nights} nights
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                  <Users className="h-3.5 w-3.5" />
                  {results.searchParams.adults} adults
                  {results.searchParams.children > 0 &&
                    `, ${results.searchParams.children} children`}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                  <Hotel className="h-3.5 w-3.5" />
                  {results.meta.hotelsSearched.length} hotel
                  {results.meta.hotelsSearched.length > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {results.meta.totalResults} dates found
                </span>
              </div>
            </div>

            {/* Price Results */}
            {results.prices.length > 0 ? (
              <PriceResults
                isMultiHotel={results.meta.hotelsSearched.length > 1}
                monthsChecked={results.meta.monthsChecked}
                onExport={handleExport}
                prices={results.prices}
                requestedDate={results.searchParams.checkin}
              />
            ) : (
              <Alert>
                <AlertDescription>
                  No prices found for your search criteria. Try adjusting your
                  dates or expanding the search period.
                </AlertDescription>
              </Alert>
            )}

            {/* Weather Analysis */}
            {results.weatherAnalysis && results.weatherAnalysis.length > 0 && (
              <>
                <Separator className="my-8" />
                <WeatherAnalysis analyses={results.weatherAnalysis} />
              </>
            )}

            {/* Room Options */}
            {results.roomOptions.length > 0 && (
              <>
                <Separator className="my-8" />
                <div className="rounded-lg bg-card p-6 shadow-warm">
                  <h3 className="mb-3 font-display text-lg">
                    Available Room Types
                  </h3>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {results.roomOptions.map((room: any) => (
                      <div
                        className="rounded bg-muted p-2 text-sm"
                        key={room.value}
                      >
                        <span className="font-medium">{room.value}</span> -{" "}
                        {room.name}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-muted-foreground text-sm">
          <p>Finding the best vacation deals across Greece</p>
        </footer>
      </div>
    </div>
  );
}
