"use client";

import { Moon } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getAllHotels } from "@/domains/hotels/registry";
import { getAllLocations } from "@/domains/locations/registry";

const WEATHER_LOCATIONS = getAllLocations()
  .map((location) => {
    const hotels = getAllHotels().filter(
      (h) => h.locationSlug === location.slug
    );
    return {
      value: location.slug,
      label: `${location.name} (${hotels.map((h) => h.name).join(", ")})`,
      hasHotels: hotels.length > 0,
    };
  })
  .filter((loc) => loc.hasHotels);

const MONTH_OPTIONS = [1, 2, 3, 4, 5, 6, 9, 12];

interface SearchOptionsProps {
  isYearSearch: boolean;
  onYearToggle: (checked: boolean) => void;
  yearSearchDisabled?: boolean;
  yearSearchHint?: string;
  enableMonthsSearch: boolean;
  onMonthsToggle: (checked: boolean) => void;
  months: number;
  onMonthsChange: (months: number) => void;
  includeWeather: boolean;
  onWeatherToggle: (checked: boolean) => void;
  weatherLocation: string;
  onWeatherLocationChange: (location: string) => void;
}

export function SearchOptions({
  isYearSearch,
  onYearToggle,
  yearSearchDisabled,
  yearSearchHint,
  enableMonthsSearch,
  onMonthsToggle,
  months,
  onMonthsChange,
  includeWeather,
  onWeatherToggle,
  weatherLocation,
  onWeatherLocationChange,
}: SearchOptionsProps) {
  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-base">Year-long Search</Label>
          <p className="text-muted-foreground text-sm">
            {yearSearchHint ??
              "Search for the best prices throughout the entire year"}
          </p>
        </div>
        <Switch
          checked={isYearSearch}
          disabled={yearSearchDisabled}
          onCheckedChange={onYearToggle}
        />
      </div>

      {!isYearSearch && (
        <>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">Multi-Month Search</Label>
              <p className="text-muted-foreground text-sm">
                Search across multiple months for the best deals
              </p>
            </div>
            <Switch
              checked={enableMonthsSearch}
              onCheckedChange={onMonthsToggle}
            />
          </div>

          {enableMonthsSearch && (
            <div className="space-y-2">
              <Label htmlFor="months">Months to Check</Label>
              <Select
                onValueChange={(v) => onMonthsChange(Number.parseInt(v, 10))}
                value={months.toString()}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {m} month{m > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="flex items-center gap-2 text-base">
            <Moon className="h-4 w-4" />
            Weather Analysis
          </Label>
          <p className="text-muted-foreground text-sm">
            Include weather forecasts and beach conditions for top deals
          </p>
        </div>
        <Switch checked={includeWeather} onCheckedChange={onWeatherToggle} />
      </div>

      {includeWeather && (
        <div className="space-y-2">
          <Label htmlFor="weatherLocation">Weather Location</Label>
          <Select
            onValueChange={onWeatherLocationChange}
            value={weatherLocation}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEATHER_LOCATIONS.map((loc) => (
                <SelectItem key={loc.value} value={loc.value}>
                  {loc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
