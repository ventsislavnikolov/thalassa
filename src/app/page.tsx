"use client";

import { useState } from "react";
import { SearchForm } from "@/components/search-form";
import { PriceResults } from "@/components/price-results";
import { WeatherAnalysis } from "@/components/weather-analysis";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

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

    // Convert results to CSV
    const csvHeaders = [
      "Date",
      "Day of Week",
      "Hotel",
      "Average Per Night (BGN)",
      "Total Stay (BGN)",
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

    // Create and download file
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🏖️ Greece Hotels Price Finder
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Find the best deals at Blue Carpet Suites, Cocooning Suites, and
            Myrto Suites in Greece
          </p>
        </div>

        {/* Search Form */}
        <div className="mb-8">
          <SearchForm onSearch={handleSearch} loading={loading} />
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg font-medium">
                Searching for the best prices...
              </p>
              <p className="text-sm text-muted-foreground">
                This may take a few moments
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <div className="space-y-8">
            {/* Search Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>📅 Check-in: {results.searchParams.checkin}</span>
                <span>🛏️ {results.searchParams.nights} nights</span>
                <span>👥 {results.searchParams.adults} adults</span>
                {results.searchParams.children > 0 && (
                  <span>👶 {results.searchParams.children} children</span>
                )}
                <span>
                  🏨 {results.meta.hotelsSearched.length} hotel
                  {results.meta.hotelsSearched.length > 1 ? "s" : ""}
                </span>
                <span>📊 {results.meta.totalResults} dates found</span>
              </div>
            </div>

            {/* Price Results */}
            {results.prices.length > 0 ? (
              <PriceResults
                prices={results.prices}
                isMultiHotel={results.meta.hotelsSearched.length > 1}
                onExport={handleExport}
                requestedDate={results.searchParams.checkin}
                monthsChecked={results.meta.monthsChecked}
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
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-3">
                    Available Room Types
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {results.roomOptions.map((room: any) => (
                      <div
                        key={room.value}
                        className="text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded"
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
        <footer className="mt-16 text-center text-sm text-gray-500">
          <p>Built with ❤️ for finding the best vacation deals in Greece</p>
        </footer>
      </div>
    </div>
  );
}
