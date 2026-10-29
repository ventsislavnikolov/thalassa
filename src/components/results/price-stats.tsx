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
            <p className="text-secondary text-2xl font-bold">
              {lowestPrice.toFixed(2)} EUR
            </p>
            <p className="text-muted-foreground text-sm">Lowest Price</p>
          </div>
          <TrendingDown className="text-secondary h-8 w-8" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-primary text-2xl font-bold">
              {averagePrice.toFixed(2)} EUR
            </p>
            <p className="text-muted-foreground text-sm">Average Price</p>
          </div>
          <Calendar className="text-primary h-8 w-8" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-destructive text-2xl font-bold">
              {highestPrice.toFixed(2)} EUR
            </p>
            <p className="text-muted-foreground text-sm">Highest Price</p>
          </div>
          <TrendingUp className="text-destructive h-8 w-8" />
        </CardContent>
      </Card>
    </div>
  );
}
