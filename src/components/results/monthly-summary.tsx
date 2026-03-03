import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import type { PriceResult } from "@/domains/scraping/types";

interface MonthlySummaryProps {
  prices: PriceResult[];
}

export function MonthlySummary({ prices }: MonthlySummaryProps) {
  const monthlyData: Record<string, number[]> = {};

  for (const price of prices) {
    const month = price.date.substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = [];
    }
    monthlyData[month].push(price.stayTotal);
  }

  const monthlyStats = Object.entries(monthlyData)
    .map(([month, totals]) => ({
      month,
      lowest: Math.min(...totals),
      highest: Math.max(...totals),
      average: totals.reduce((sum, p) => sum + p, 0) / totals.length,
      count: totals.length,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return (
    <Accordion className="w-full" collapsible type="single">
      <AccordionItem value="monthly-summary">
        <AccordionTrigger className="font-display">
          Monthly Price Summary
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {monthlyStats.map(({ month, lowest, highest, average, count }) => {
              const monthName = format(new Date(`${month}-01`), "MMMM yyyy");

              return (
                <Card key={month}>
                  <CardContent className="p-4">
                    <h4 className="mb-2 font-display font-semibold">
                      {monthName}
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        Lowest:{" "}
                        <span className="font-medium text-secondary">
                          {lowest.toFixed(2)} EUR
                        </span>
                      </p>
                      <p>
                        Average:{" "}
                        <span className="font-medium">
                          {average.toFixed(2)} EUR
                        </span>
                      </p>
                      <p>
                        Highest:{" "}
                        <span className="font-medium text-destructive">
                          {highest.toFixed(2)} EUR
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        {count} dates available
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
