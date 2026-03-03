import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PriceResult } from "@/domains/scraping/types";

interface HotelComparisonProps {
  prices: PriceResult[];
}

interface HotelStats {
  name: string;
  lowest: number;
  average: number;
  count: number;
  savings: number;
}

function computeHotelStats(prices: PriceResult[]): Record<string, HotelStats> {
  const groups: Record<string, { name: string; totals: number[] }> = {};

  for (const price of prices) {
    if (!groups[price.hotelId]) {
      groups[price.hotelId] = { name: price.hotelName, totals: [] };
    }
    groups[price.hotelId].totals.push(price.stayTotal);
  }

  const stats: Record<string, HotelStats> = {};

  for (const [hotelId, data] of Object.entries(groups)) {
    const lowest = Math.min(...data.totals);
    const average =
      data.totals.reduce((sum, p) => sum + p, 0) / data.totals.length;

    stats[hotelId] = {
      name: data.name,
      lowest,
      average,
      count: data.totals.length,
      savings: 0,
    };
  }

  const globalLowest = Math.min(...Object.values(stats).map((s) => s.lowest));

  for (const stat of Object.values(stats)) {
    if (stat.lowest > globalLowest) {
      stat.savings = stat.lowest - globalLowest;
    }
  }

  return stats;
}

export function HotelComparison({ prices }: HotelComparisonProps) {
  const stats = computeHotelStats(prices);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Hotel Comparison</CardTitle>
        <CardDescription>
          Price comparison across selected hotels
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Object.entries(stats).map(([hotelId, stat]) => (
            <div className="rounded-lg border p-4" key={hotelId}>
              <h3 className="mb-2 font-semibold">{stat.name}</h3>
              <div className="space-y-1 text-sm">
                <p>
                  Lowest:{" "}
                  <span className="font-medium">
                    {stat.lowest.toFixed(2)} EUR
                  </span>
                </p>
                <p>
                  Average:{" "}
                  <span className="font-medium">
                    {stat.average.toFixed(2)} EUR
                  </span>
                </p>
                <p>
                  Results: <span className="font-medium">{stat.count}</span>
                </p>
              </div>
              {stat.savings > 0 && (
                <Badge className="mt-2" variant="secondary">
                  Save {stat.savings.toFixed(2)} EUR vs other hotels
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
