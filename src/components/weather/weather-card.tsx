import { format, parse } from "date-fns";
import { Cloud, Droplets, Sun, Thermometer, Waves, Wind } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CombinedAnalysis } from "@/domains/analysis/types";
import { cn } from "@/lib/utils";
import { BeachScore } from "./beach-score";

interface WeatherCardProps {
  analysis: CombinedAnalysis;
  rank: number;
}

function getWeatherIcon(description: string) {
  if (description.includes("clear") || description.includes("sun")) {
    return <Sun className="h-5 w-5 text-yellow-500" />;
  }
  if (description.includes("cloud")) {
    return <Cloud className="text-muted-foreground h-5 w-5" />;
  }
  if (description.includes("rain") || description.includes("drizzle")) {
    return <Droplets className="h-5 w-5 text-teal-500" />;
  }
  return <Sun className="h-5 w-5 text-yellow-500" />;
}

function getScoreColor(score: number) {
  if (score >= 80) {
    return "text-secondary";
  }
  if (score >= 60) {
    return "text-amber-600";
  }
  return "text-destructive";
}

function getRankBadge(rank: number) {
  if (rank === 1) {
    return (
      <Badge className="bg-primary/10 text-primary border-0">Best Choice</Badge>
    );
  }
  if (rank <= 3) {
    return <Badge variant="secondary">Great Option</Badge>;
  }
  return <Badge variant="outline">Good Alternative</Badge>;
}

export function WeatherCard({ analysis, rank }: WeatherCardProps) {
  const { priceInfo, weatherData } = analysis;
  const dateObj = parse(priceInfo.date, "yyyy-MM-dd", new Date());
  const formattedDate = format(dateObj, "EEEE, MMMM d, yyyy");

  return (
    <Card className={cn(rank === 1 && "border-primary border-2")}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-display flex items-center gap-2">
              <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-sm">
                {rank}
              </span>
              {formattedDate}
            </CardTitle>
            <CardDescription>
              {priceInfo.hotelName} - {priceInfo.dayOfWeek}
            </CardDescription>
          </div>
          {getRankBadge(rank)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-muted flex items-center justify-between rounded-lg p-3">
          <div>
            <p className="text-muted-foreground text-sm">Total Stay Price</p>
            <p className="text-2xl font-bold">
              {priceInfo.stayTotal.toFixed(2)} {priceInfo.currency}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-sm">Per Night</p>
            <p className="text-lg font-semibold">
              {priceInfo.averagePerNight.toFixed(2)} {priceInfo.currency}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="flex items-center gap-2">
            <Thermometer className="text-primary h-4 w-4" />
            <div>
              <p className="text-muted-foreground text-xs">Temperature</p>
              <p className="text-sm font-medium">
                {weatherData.temperature.min}° - {weatherData.temperature.max}
                °C
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-teal-500" />
            <div>
              <p className="text-muted-foreground text-xs">Sea Temp</p>
              <p className="text-sm font-medium">
                {weatherData.seaTemperature ?? 0}°C
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-teal-500" />
            <div>
              <p className="text-muted-foreground text-xs">Rain</p>
              <p className="text-sm font-medium">
                {weatherData.precipitation.toFixed(1)}mm
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="text-muted-foreground h-4 w-4" />
            <div>
              <p className="text-muted-foreground text-xs">Wind</p>
              <p className="text-sm font-medium">{weatherData.windSpeed}km/h</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border p-3">
          {getWeatherIcon(weatherData.description)}
          <div className="flex-1">
            <p className="font-medium">{weatherData.description}</p>
            <p className="text-muted-foreground text-sm">
              {weatherData.beachConditions}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-sm">Beach Score</p>
            <BeachScore score={weatherData.score} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t pt-2">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">Price Rank</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                #{analysis.priceRank}
              </span>
              <Progress
                className="h-2 flex-1"
                value={(6 - analysis.priceRank) * 20}
              />
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">Weather Rank</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                #{analysis.weatherRank}
              </span>
              <Progress
                className="h-2 flex-1"
                value={(6 - analysis.weatherRank) * 20}
              />
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">Overall Score</p>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-sm font-bold",
                  getScoreColor(analysis.totalScore)
                )}
              >
                {analysis.totalScore.toFixed(1)}
              </span>
              <Progress className="h-2 flex-1" value={analysis.totalScore} />
            </div>
          </div>
        </div>

        <div className="bg-muted rounded-lg p-3">
          <p className="text-sm">{weatherData.recommendation}</p>
        </div>
      </CardContent>
    </Card>
  );
}
