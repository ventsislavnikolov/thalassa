"use client";

import { useState } from "react";
import { format, parse } from "date-fns";
import {
  Star,
  TrendingDown,
  TrendingUp,
  Calendar,
  Download,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
        <CardContent className="flex items-center justify-center h-32">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-2xl font-bold text-green-600">
                {lowestPrice.toFixed(2)} BGN
              </p>
              <p className="text-sm text-muted-foreground">Lowest Price</p>
            </div>
            <TrendingDown className="h-8 w-8 text-green-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-2xl font-bold">
                {averagePrice.toFixed(2)} BGN
              </p>
              <p className="text-sm text-muted-foreground">Average Price</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-2xl font-bold text-red-600">
                {highestPrice.toFixed(2)} BGN
              </p>
              <p className="text-sm text-muted-foreground">Highest Price</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(hotelStats).map(([hotelId, stats]) => (
                <div key={hotelId} className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">{stats.name}</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      Lowest:{" "}
                      <span className="font-medium">
                        {stats.lowest.toFixed(2)} BGN
                      </span>
                    </p>
                    <p>
                      Average:{" "}
                      <span className="font-medium">
                        {stats.average.toFixed(2)} BGN
                      </span>
                    </p>
                    <p>
                      Results:{" "}
                      <span className="font-medium">{stats.count}</span>
                    </p>
                  </div>
                  {stats.savings > 0 && (
                    <Badge variant="secondary" className="mt-2">
                      Save {stats.savings.toFixed(2)} BGN vs other hotels
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
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1 border rounded text-sm"
              >
                <option value="price">Sort by Price</option>
                <option value="date">Sort by Date</option>
                {isMultiHotel && <option value="hotel">Sort by Hotel</option>}
              </select>
              {onExport && (
                <Button variant="outline" size="sm" onClick={onExport}>
                  <Download className="h-4 w-4 mr-2" />
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
                    <TableRow key={`${price.date}-${price.hotelId}-${price.stayTotal}-${index}`}>
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
                      <TableCell>
                        {price.averagePerNight.toFixed(2)} {price.currency}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {price.stayTotal.toFixed(2)} {price.currency}
                        {price.stayTotal === lowestPrice && (
                          <Badge variant="secondary" className="ml-2">
                            Best Price
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {price.isLowestRate ? (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
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
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Showing top 20 results. Use export to see all {prices.length}{" "}
              dates.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Monthly Summary for Year Searches */}
      {prices.length > 30 && (
        <Accordion type="single" collapsible className="w-full">
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
  const hotelGroups = prices.reduce((acc, price) => {
    if (!acc[price.hotelId]) {
      acc[price.hotelId] = {
        name: price.hotelName,
        prices: [],
      };
    }
    acc[price.hotelId].prices.push(price.stayTotal);
    return acc;
  }, {} as Record<string, { name: string; prices: number[] }>);

  const stats = Object.entries(hotelGroups).reduce((acc, [hotelId, data]) => {
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
  }, {} as Record<string, any>);

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
  const monthlyData = prices.reduce((acc, price) => {
    const month = price.date.substring(0, 7); // YYYY-MM
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(price.stayTotal);
    return acc;
  }, {} as Record<string, number[]>);

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {monthlyStats.map(({ month, lowest, highest, average, count }) => {
        const monthName = format(new Date(month + "-01"), "MMMM yyyy");

        return (
          <Card key={month}>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2">{monthName}</h4>
              <div className="space-y-1 text-sm">
                <p>
                  Lowest:{" "}
                  <span className="font-medium text-green-600">
                    {lowest.toFixed(2)} BGN
                  </span>
                </p>
                <p>
                  Average:{" "}
                  <span className="font-medium">{average.toFixed(2)} BGN</span>
                </p>
                <p>
                  Highest:{" "}
                  <span className="font-medium text-red-600">
                    {highest.toFixed(2)} BGN
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
