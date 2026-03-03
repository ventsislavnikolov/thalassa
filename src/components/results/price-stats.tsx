import { Calendar, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PriceResult } from "@/domains/scraping/types";

interface PriceStatsProps {
  prices: PriceResult[];
}

export function PriceStats({ prices }: PriceStatsProps) {
  const lowestPrice = Math.min(...prices.map((p) => p.stayTotal));
  const highestPrice = Math.max(...prices.map((p) => p.stayTotal));
  const averagePrice =
    prices.reduce((sum, p) => sum + p.stayTotal, 0) / prices.length;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="font-bold text-2xl text-secondary">
              {lowestPrice.toFixed(2)} EUR
            </p>
            <p className="text-muted-foreground text-sm">Lowest Price</p>
          </div>
          <TrendingDown className="h-8 w-8 text-secondary" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="font-bold text-2xl text-primary">
              {averagePrice.toFixed(2)} EUR
            </p>
            <p className="text-muted-foreground text-sm">Average Price</p>
          </div>
          <Calendar className="h-8 w-8 text-primary" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="font-bold text-2xl text-destructive">
              {highestPrice.toFixed(2)} EUR
            </p>
            <p className="text-muted-foreground text-sm">Highest Price</p>
          </div>
          <TrendingUp className="h-8 w-8 text-destructive" />
        </CardContent>
      </Card>
    </div>
  );
}
