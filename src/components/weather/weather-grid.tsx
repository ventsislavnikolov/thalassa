import type { CombinedAnalysis } from "@/domains/analysis/types";
import { WeatherCard } from "./weather-card";

interface WeatherGridProps {
  analyses: CombinedAnalysis[];
}

export function WeatherGrid({ analyses }: WeatherGridProps) {
  const sorted = [...analyses].sort((a, b) => a.overallRank - b.overallRank);

  return (
    <div className="grid gap-6">
      {sorted.map((analysis, index) => (
        <WeatherCard
          analysis={analysis}
          key={analysis.priceInfo.date}
          rank={index + 1}
        />
      ))}
    </div>
  );
}
