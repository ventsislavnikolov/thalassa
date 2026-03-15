"use client";

import { format, parse } from "date-fns";
import { Download, Star } from "lucide-react";
import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PriceResult } from "@/domains/scraping/types";

type SortKey = "date" | "price" | "hotel";

interface PriceTableProps {
  prices: PriceResult[];
  showHotel?: boolean;
  onExport?: () => void;
}

export function PriceTable({
  prices,
  showHotel = false,
  onExport,
}: PriceTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>("price");

  const lowestPrice = Math.min(...prices.map((p) => p.stayTotal));

  const sortedPrices = [...prices].sort((a, b) => {
    switch (sortBy) {
      case "date":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "hotel":
        return a.hotelName.localeCompare(b.hotelName);
      default:
        return a.stayTotal - b.stayTotal;
    }
  });

  const displayPrices = sortedPrices.slice(0, 20);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display">Best Prices Found</CardTitle>
            <CardDescription>
              Showing top {displayPrices.length} results from {prices.length}{" "}
              total dates
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select
              onValueChange={(v) => setSortBy(v as SortKey)}
              value={sortBy}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Sort by Price</SelectItem>
                <SelectItem value="date">Sort by Date</SelectItem>
                {showHotel && (
                  <SelectItem value="hotel">Sort by Hotel</SelectItem>
                )}
              </SelectContent>
            </Select>
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
                {showHotel && <TableHead>Hotel</TableHead>}
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
                    key={`${price.date}-${price.hotelId}-${price.roomCode ?? "default"}-${index}`}
                  >
                    <TableCell className="font-medium">
                      {formattedDate}
                    </TableCell>
                    <TableCell>{price.dayOfWeek}</TableCell>
                    {showHotel && (
                      <TableCell>
                        <Badge variant="outline">
                          {price.hotelName.replace(" Suites", "")}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-sm">
                      {price.roomType ?? "Standard Room"}
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
            Showing top 20 results. Use export to see all {prices.length} dates.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
