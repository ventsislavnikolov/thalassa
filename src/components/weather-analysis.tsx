"use client";

import { format, parse } from "date-fns";
import { Cloud, Sun, Droplets, Wind, Thermometer, Waves } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface WeatherData {
  date: string;
  temperature: {
    min: number;
    max: number;
    avg: number;
  };
  precipitation: number;
  windSpeed: number;
  humidity: number;
  uvIndex: number;
  weatherCode: number;
  description: string;
  seaTemperature?: number;
  beachConditions: string;
  recommendation: string;
  score: number;
}

interface VacationAnalysis {
  priceInfo: {
    date: string;
    dayOfWeek: string;
    averagePerNight: number;
    stayTotal: number;
    hotelName: string;
    currency: string;
  };
  weatherData: WeatherData;
  combinedScore: number;
  priceRank: number;
  weatherRank: number;
  overallRank: number;
  recommendation: string;
}

interface WeatherAnalysisProps {
  analyses: VacationAnalysis[];
}

export function WeatherAnalysis({ analyses }: WeatherAnalysisProps) {
  if (!analyses || analyses.length === 0) {
    return null;
  }

  // Sort by overall rank for display
  const sortedAnalyses = [...analyses].sort(
    (a, b) => a.overallRank - b.overallRank
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Weather Analysis for Best Price Dates
          </CardTitle>
          <CardDescription>
            Combining price and weather data to find the perfect vacation dates
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6">
        {sortedAnalyses.map((analysis, index) => {
          const dateObj = parse(
            analysis.priceInfo.date,
            "yyyy-MM-dd",
            new Date()
          );
          const formattedDate = format(dateObj, "EEEE, MMMM d, yyyy");

          return (
            <WeatherCard
              key={analysis.priceInfo.date}
              analysis={analysis}
              formattedDate={formattedDate}
              rank={index + 1}
            />
          );
        })}
      </div>

      {/* Summary and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Vacation Planning Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <h4 className="font-semibold text-green-600">Best Value</h4>
                <p className="text-2xl font-bold">
                  {sortedAnalyses[0]?.priceInfo?.stayTotal?.toFixed(2) || "0"}{" "}
                  BGN
                </p>
                <p className="text-sm text-muted-foreground">
                  {sortedAnalyses[0]?.priceInfo?.date
                    ? format(
                        parse(
                          sortedAnalyses[0].priceInfo.date,
                          "yyyy-MM-dd",
                          new Date()
                        ),
                        "MMM d"
                      )
                    : "N/A"}
                </p>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <h4 className="font-semibold text-blue-600">Best Weather</h4>
                <p className="text-2xl font-bold">
                  {Math.max(...analyses.map((a) => a.weatherData.score))}/100
                </p>
                <p className="text-sm text-muted-foreground">Beach Score</p>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <h4 className="font-semibold text-purple-600">Best Overall</h4>
                <p className="text-2xl font-bold">
                  {sortedAnalyses[0]?.combinedScore?.toFixed(1) || "0"}/100
                </p>
                <p className="text-sm text-muted-foreground">Combined Score</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <h4 className="font-semibold mb-2">💡 Recommendation</h4>
              <p className="text-sm">
                {sortedAnalyses[0]?.recommendation ||
                  "Based on our analysis, the top-ranked dates offer the best combination of affordable pricing and favorable weather conditions for your beach vacation in Pefkohori."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WeatherCard({
  analysis,
  formattedDate,
  rank,
}: {
  analysis: VacationAnalysis;
  formattedDate: string;
  rank: number;
}) {
  const { priceInfo, weatherData } = analysis;

  const getWeatherIcon = (description: string) => {
    if (description.includes("clear") || description.includes("sun"))
      return <Sun className="h-5 w-5 text-yellow-500" />;
    if (description.includes("cloud"))
      return <Cloud className="h-5 w-5 text-gray-500" />;
    if (description.includes("rain") || description.includes("drizzle"))
      return <Droplets className="h-5 w-5 text-blue-500" />;
    return <Sun className="h-5 w-5 text-yellow-500" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getRecommendationBadge = (rank: number) => {
    if (rank === 1)
      return <Badge className="bg-green-100 text-green-800">Best Choice</Badge>;
    if (rank <= 3) return <Badge variant="secondary">Great Option</Badge>;
    return <Badge variant="outline">Good Alternative</Badge>;
  };

  return (
    <Card className={rank === 1 ? "border-green-500 border-2" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">
                {rank}
              </span>
              {formattedDate}
            </CardTitle>
            <CardDescription>
              {priceInfo?.hotelName || "Unknown Hotel"} •{" "}
              {priceInfo?.dayOfWeek || "Unknown Day"}
            </CardDescription>
          </div>
          {getRecommendationBadge(rank)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price Information */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Total Stay Price</p>
            <p className="text-2xl font-bold">
              {priceInfo?.stayTotal?.toFixed(2) || "0"}{" "}
              {priceInfo?.currency || "BGN"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Per Night</p>
            <p className="text-lg font-semibold">
              {priceInfo?.averagePerNight?.toFixed(2) || "0"}{" "}
              {priceInfo?.currency || "BGN"}
            </p>
          </div>
        </div>

        {/* Weather Information */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">Temperature</p>
              <p className="text-sm font-medium">
                {weatherData?.temperature?.min || 0}° -{" "}
                {weatherData?.temperature?.max || 0}°C
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Sea Temp</p>
              <p className="text-sm font-medium">
                {weatherData?.seaTemperature || 0}°C
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Rain</p>
              <p className="text-sm font-medium">
                {weatherData?.precipitation?.toFixed(1) || "0"}mm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-xs text-muted-foreground">Wind</p>
              <p className="text-sm font-medium">
                {weatherData?.windSpeed || 0}km/h
              </p>
            </div>
          </div>
        </div>

        {/* Weather Description */}
        <div className="flex items-center gap-2 p-3 border rounded-lg">
          {getWeatherIcon(weatherData?.description || "")}
          <div className="flex-1">
            <p className="font-medium">
              {weatherData?.description || "Unknown"}
            </p>
            <p className="text-sm text-muted-foreground">
              {weatherData?.beachConditions || "N/A"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Beach Score</p>
            <p
              className={`text-lg font-bold ${getScoreColor(
                weatherData?.score || 0
              )}`}
            >
              {weatherData?.score || 0}/100
            </p>
          </div>
        </div>

        {/* Scores and Rankings */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Price Rank</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                #{analysis.priceRank}
              </span>
              <Progress
                value={(6 - analysis.priceRank) * 20}
                className="flex-1 h-2"
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Weather Rank</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                #{analysis.weatherRank}
              </span>
              <Progress
                value={(6 - analysis.weatherRank) * 20}
                className="flex-1 h-2"
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Overall Score</p>
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-bold ${getScoreColor(
                  analysis?.combinedScore || 0
                )}`}
              >
                {analysis?.combinedScore?.toFixed(1) || "0"}
              </span>
              <Progress
                value={analysis?.combinedScore || 0}
                className="flex-1 h-2"
              />
            </div>
          </div>
        </div>

        {/* Weather Recommendation */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-sm">
            {weatherData?.recommendation || "No recommendation available"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
