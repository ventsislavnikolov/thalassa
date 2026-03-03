import { format, parse } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CombinedAnalysis } from "@/domains/analysis/types";

interface WeatherSummaryProps {
  analyses: CombinedAnalysis[];
}

export function WeatherSummary({ analyses }: WeatherSummaryProps) {
  const sorted = [...analyses].sort((a, b) => a.overallRank - b.overallRank);

  const bestOverall = sorted[0];
  const bestWeatherScore = Math.max(
    ...analyses.map((a) => a.weatherData.score)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">
          Vacation Planning Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4 text-center">
              <h4 className="font-semibold text-secondary">Best Value</h4>
              <p className="font-bold text-2xl">
                {bestOverall?.priceInfo.stayTotal.toFixed(2) ?? "0"} EUR
              </p>
              <p className="text-muted-foreground text-sm">
                {bestOverall
                  ? format(
                      parse(
                        bestOverall.priceInfo.date,
                        "yyyy-MM-dd",
                        new Date()
                      ),
                      "MMM d"
                    )
                  : "N/A"}
              </p>
            </div>

            <div className="rounded-lg border p-4 text-center">
              <h4 className="font-semibold text-primary">Best Weather</h4>
              <p className="font-bold text-2xl">{bestWeatherScore}/100</p>
              <p className="text-muted-foreground text-sm">Beach Score</p>
            </div>

            <div className="rounded-lg border p-4 text-center">
              <h4 className="font-semibold text-amber-600">Best Overall</h4>
              <p className="font-bold text-2xl">
                {bestOverall?.totalScore.toFixed(1) ?? "0"}/100
              </p>
              <p className="text-muted-foreground text-sm">Combined Score</p>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="mb-2 font-semibold">Recommendation</h4>
            <p className="text-sm">
              {bestOverall?.recommendation ??
                "Based on our analysis, the top-ranked dates offer the best combination of affordable pricing and favorable weather conditions for your beach vacation in Greece."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
