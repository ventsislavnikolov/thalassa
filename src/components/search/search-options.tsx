"use client";

import { CloudSun } from "lucide-react";
import { useCallback } from "react";
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
      hasHotels: hotels.length > 0,
      label: `${location.name} (${hotels.map((h) => h.name).join(", ")})`,
      value: location.slug,
    };
  })
  .filter((loc) => loc.hasHotels);

const MONTH_OPTIONS = [1, 2, 3, 4, 5, 6, 9, 12];

interface SearchOptionsProps {
  enableMonthsSearch: boolean;
  includeWeather: boolean;
  isYearSearch: boolean;
  months: number;
  onMonthsChange: (months: number) => void;
  onMonthsToggle: (checked: boolean) => void;
  onWeatherLocationChange: (location: string) => void;
  onWeatherToggle: (checked: boolean) => void;
  onYearToggle: (checked: boolean) => void;
  weatherLocation: string;
  yearSearchDisabled?: boolean;
  yearSearchHint?: string;
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
  const handleMonthsSelect = useCallback(
    (value: string) => onMonthsChange(Number.parseInt(value, 10)),
    [onMonthsChange]
  );

  return (
    <div className="space-y-4">
      {/* Year search */}
      <div className="flex items-center justify-between rounded-lg border border-[#1e2a36] bg-[#111820] px-4 py-3">
        <div className="space-y-0.5">
          <Label className="text-sm text-[#F5F7F8]" htmlFor="year-search">
            Year-long Search
          </Label>
          <p className="text-xs text-[#536365]">
            {yearSearchHint ??
              "Search for the best prices throughout the entire year"}
          </p>
        </div>
        <Switch
          checked={isYearSearch}
          disabled={yearSearchDisabled}
          id="year-search"
          onCheckedChange={onYearToggle}
        />
      </div>

      {!isYearSearch && (
        <>
          {/* Multi-month */}
          <div className="flex items-center justify-between rounded-lg border border-[#1e2a36] bg-[#111820] px-4 py-3">
            <div className="space-y-0.5">
              <Label
                className="text-sm text-[#F5F7F8]"
                htmlFor="multi-month-search"
              >
                Multi-Month Search
              </Label>
              <p className="text-xs text-[#536365]">
                Search across multiple months for the best deals
              </p>
            </div>
            <Switch
              checked={enableMonthsSearch}
              id="multi-month-search"
              onCheckedChange={onMonthsToggle}
            />
          </div>

          {enableMonthsSearch ? (
            <div className="space-y-2 pl-4">
              <Label className="text-[#A3B2B5]" htmlFor="months">
                Months to Check
              </Label>
              <Select
                onValueChange={handleMonthsSelect}
                value={months.toString()}
              >
                <SelectTrigger className="w-32 border-[#1e2a36] bg-[#111820] text-[#F5F7F8]">
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
          ) : null}
        </>
      )}

      {/* Weather */}
      <div className="flex items-center justify-between rounded-lg border border-[#1e2a36] bg-[#111820] px-4 py-3">
        <div className="space-y-0.5">
          <Label
            className="flex items-center gap-2 text-sm text-[#F5F7F8]"
            htmlFor="weather-analysis"
          >
            <CloudSun className="h-3.5 w-3.5 text-[#738C8A]" />
            Weather Analysis
          </Label>
          <p className="text-xs text-[#536365]">
            Include weather forecasts and beach conditions for top deals
          </p>
        </div>
        <Switch
          checked={includeWeather}
          id="weather-analysis"
          onCheckedChange={onWeatherToggle}
        />
      </div>

      {includeWeather ? (
        <div className="space-y-2 pl-4">
          <Label className="text-[#A3B2B5]" htmlFor="weatherLocation">
            Weather Location
          </Label>
          <Select
            onValueChange={onWeatherLocationChange}
            value={weatherLocation}
          >
            <SelectTrigger className="border-[#1e2a36] bg-[#111820] text-[#F5F7F8]">
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
      ) : null}
    </div>
  );
}
