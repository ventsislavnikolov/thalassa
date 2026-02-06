"use client";

import { format, parse } from "date-fns";
import {
  Calendar,
  Download,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PriceInfo {
  date: string;
  dayOfWeek: string;
  averagePerNight: number;
  stayTotal: number;
  isLowestRate: boolean;
  nights: number;
  currency: string;
  hotelId: string;
  hotelName: string;
  roomType?: string;
  roomCode?: string;
}

interface PriceResultsProps {
  prices: PriceInfo[];
  isMultiHotel: boolean;
  onExport?: () => void;
  requestedDate?: string;
  monthsChecked?: number;
}

export function PriceResults({
  prices,
  isMultiHotel,
  onExport,
  requestedDate, // eslint-disable-line @typescript-eslint/no-unused-vars
  monthsChecked, // eslint-disable-line @typescript-eslint/no-unused-vars
}: PriceResultsProps) {
  const [sortBy, setSortBy] = useState<"date" | "price" | "hotel">("price");

  if (!prices || prices.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center">
          <p className="text-muted-foreground">
            No prices found for your search criteria.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedPrices = [...prices].sort((a, b) => {
    switch (sortBy) {
      case "date":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "hotel":
        return a.hotelName.localeCompare(b.hotelName);
      case "price":
      default:
        return a.stayTotal - b.stayTotal;
    }
  });

  const displayPrices = sortedPrices.slice(0, 20);
  const lowestPrice = Math.min(...prices.map((p) => p.stayTotal));
  const highestPrice = Math.max(...prices.map((p) => p.stayTotal));
  const averagePrice =
    prices.reduce((sum, p) => sum + p.stayTotal, 0) / prices.length;

  // Hotel comparison data
  const hotelStats = isMultiHotel ? getHotelComparisonStats(prices) : null;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="font-bold text-2xl text-green-600">
                {lowestPrice.toFixed(2)} EUR
              </p>
              <p className="text-muted-foreground text-sm">Lowest Price</p>
            </div>
            <TrendingDown className="h-8 w-8 text-green-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="font-bold text-2xl">
                {averagePrice.toFixed(2)} EUR
              </p>
              <p className="text-muted-foreground text-sm">Average Price</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="font-bold text-2xl text-red-600">
                {highestPrice.toFixed(2)} EUR
              </p>
              <p className="text-muted-foreground text-sm">Highest Price</p>
            </div>
            <TrendingUp className="h-8 w-8 text-red-600" />
          </CardContent>
        </Card>
      </div>

      {/* Hotel Comparison */}
      {hotelStats && (
        <Card>
          <CardHeader>
            <CardTitle>Hotel Comparison</CardTitle>
            <CardDescription>
              Price comparison across selected hotels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Object.entries(hotelStats).map(([hotelId, stats]) => (
                <div className="rounded-lg border p-4" key={hotelId}>
                  <h3 className="mb-2 font-semibold">{stats.name}</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      Lowest:{" "}
                      <span className="font-medium">
                        {stats.lowest.toFixed(2)} EUR
                      </span>
                    </p>
                    <p>
                      Average:{" "}
                      <span className="font-medium">
                        {stats.average.toFixed(2)} EUR
                      </span>
                    </p>
                    <p>
                      Results:{" "}
                      <span className="font-medium">{stats.count}</span>
                    </p>
                  </div>
                  {stats.savings > 0 && (
                    <Badge className="mt-2" variant="secondary">
                      Save {stats.savings.toFixed(2)} EUR vs other hotels
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Best Prices Found</CardTitle>
              <CardDescription>
                Showing top {displayPrices.length} results from {prices.length}{" "}
                total dates
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <select
                className="rounded border px-3 py-1 text-sm"
                onChange={(e) => setSortBy(e.target.value as any)}
                value={sortBy}
              >
                <option value="price">Sort by Price</option>
                <option value="date">Sort by Date</option>
                {isMultiHotel && <option value="hotel">Sort by Hotel</option>}
              </select>
              {onExport && (
                <Button onClick={onExport} size="sm" variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  {isMultiHotel && <TableHead>Hotel</TableHead>}
                  <TableHead>Room Type</TableHead>
                  <TableHead>Per Night</TableHead>
                  <TableHead>Total Stay</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayPrices.map((price, index) => {
                  const dateObj = parse(price.date, "yyyy-MM-dd", new Date());
                  const formattedDate = format(dateObj, "MMM d, yyyy");

                  return (
                    <TableRow
                      key={`${price.date}-${price.hotelId}-${price.roomCode || "default"}-${index}`}
                    >
                      <TableCell className="font-medium">
                        {formattedDate}
                      </TableCell>
                      <TableCell>{price.dayOfWeek}</TableCell>
                      {isMultiHotel && (
                        <TableCell>
                          <Badge variant="outline">
                            {price.hotelName.replace(" Suites", "")}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-sm">
                        {price.roomType || "Standard Room"}
                      </TableCell>
                      <TableCell>
                        {price.averagePerNight.toFixed(2)} {price.currency}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {price.stayTotal.toFixed(2)} {price.currency}
                        {price.stayTotal === lowestPrice && (
                          <Badge className="ml-2" variant="secondary">
                            Best Price
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {price.isLowestRate ? (
                          <Star className="h-4 w-4 fill-current text-yellow-500" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {prices.length > 20 && (
            <p className="mt-4 text-center text-muted-foreground text-sm">
              Showing top 20 results. Use export to see all {prices.length}{" "}
              dates.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Monthly Summary for Year Searches */}
      {prices.length > 30 && (
        <Accordion className="w-full" collapsible type="single">
          <AccordionItem value="monthly-summary">
            <AccordionTrigger>Monthly Price Summary</AccordionTrigger>
            <AccordionContent>
              <MonthlySummary prices={prices} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

function getHotelComparisonStats(prices: PriceInfo[]) {
  const hotelGroups = prices.reduce(
    (acc, price) => {
      if (!acc[price.hotelId]) {
        acc[price.hotelId] = {
          name: price.hotelName,
          prices: [],
        };
      }
      acc[price.hotelId].prices.push(price.stayTotal);
      return acc;
    },
    {} as Record<string, { name: string; prices: number[] }>
  );

  const stats = Object.entries(hotelGroups).reduce(
    (acc, [hotelId, data]) => {
      const lowest = Math.min(...data.prices);
      const average =
        data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length;

      acc[hotelId] = {
        name: data.name,
        lowest,
        average,
        count: data.prices.length,
        savings: 0,
      };
      return acc;
    },
    {} as Record<string, any>
  );

  // Calculate savings compared to other hotels
  const globalLowest = Math.min(...Object.values(stats).map((s) => s.lowest));
  Object.values(stats).forEach((stat) => {
    if (stat.lowest > globalLowest) {
      stat.savings = stat.lowest - globalLowest;
    }
  });

  return stats;
}

function MonthlySummary({ prices }: { prices: PriceInfo[] }) {
  const monthlyData = prices.reduce(
    (acc, price) => {
      const month = price.date.substring(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(price.stayTotal);
      return acc;
    },
    {} as Record<string, number[]>
  );

  const monthlyStats = Object.entries(monthlyData)
    .map(([month, prices]) => ({
      month,
      lowest: Math.min(...prices),
      highest: Math.max(...prices),
      average: prices.reduce((sum, p) => sum + p, 0) / prices.length,
      count: prices.length,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {monthlyStats.map(({ month, lowest, highest, average, count }) => {
        const monthName = format(new Date(month + "-01"), "MMMM yyyy");

        return (
          <Card key={month}>
            <CardContent className="p-4">
              <h4 className="mb-2 font-semibold">{monthName}</h4>
              <div className="space-y-1 text-sm">
                <p>
                  Lowest:{" "}
                  <span className="font-medium text-green-600">
                    {lowest.toFixed(2)} EUR
                  </span>
                </p>
                <p>
                  Average:{" "}
                  <span className="font-medium">{average.toFixed(2)} EUR</span>
                </p>
                <p>
                  Highest:{" "}
                  <span className="font-medium text-red-600">
                    {highest.toFixed(2)} EUR
                  </span>
                </p>
                <p className="text-muted-foreground">{count} dates available</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
