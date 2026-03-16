"use client";

import { format } from "date-fns";
import { Hotel, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HotelConfig } from "@/domains/hotels/types";
import { DatePicker } from "./date-picker";
import { GuestSelector } from "./guest-selector";
import { HotelSelector } from "./hotel-selector";
import { SearchOptions } from "./search-options";

export interface SearchFormParams {
  checkin: string;
  nights: number;
  adults: number;
  children: number;
  room: string;
  months: number;
  hotelIds: string[];
  includeWeather: boolean;
  isYearSearch: boolean;
  weatherLocation?: string;
  enableMonthsSearch: boolean;
}

interface SearchFormProps {
  onSearch: (params: SearchFormParams) => void;
  defaultHotel?: string;
  loading?: boolean;
}

const DEFAULT_HOTEL_IDS = [
  "paxos",
  "avatonlr",
  "bluecarpet",
  "cocooning",
  "dnoruzkass",
  "whitecoast",
  "neemamais",
  "myra",
  "portocarras",
  "eaglespalace",
  "eaglesvillas",
  "ekies",
  // "excelsior",
  "olympionsunset",
  "potideapalace",
  "meditekassandra",
];

export function SearchForm({
  onSearch,
  defaultHotel,
  loading = false,
}: SearchFormProps) {
  const [hotels, setHotels] = useState<HotelConfig[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState<SearchFormParams>({
    checkin: format(new Date(), "yyyy-MM-dd"),
    nights: 5,
    adults: 2,
    children: 0,
    room: "standard",
    months: 0,
    hotelIds: defaultHotel ? [defaultHotel] : DEFAULT_HOTEL_IDS,
    includeWeather: false,
    isYearSearch: false,
    weatherLocation: "pefkochori",
    enableMonthsSearch: false,
  });

  useEffect(() => {
    fetch("/api/hotels")
      .then((res) => res.json())
      .then((data) => setHotels(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const isOnlyPortoCarras =
      formData.hotelIds.length === 1 && formData.hotelIds[0] === "portocarras";
    if (isOnlyPortoCarras && formData.isYearSearch) {
      setFormData((prev) => ({
        ...prev,
        isYearSearch: false,
        months: 3,
      }));
    }
  }, [formData.hotelIds, formData.isYearSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(formData);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setFormData((prev) => ({
        ...prev,
        checkin: format(date, "yyyy-MM-dd"),
      }));
    }
  };

  const isOnlyPortoCarras =
    formData.hotelIds.length === 1 && formData.hotelIds[0] === "portocarras";

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Hotel className="h-5 w-5" />
          Thalassa Price Search
        </CardTitle>
        <CardDescription>
          Find the best prices across premium hotels in Halkidiki &amp;
          Thessaloniki
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DatePicker date={selectedDate} onSelect={handleDateSelect} />
            <div className="space-y-2">
              <Label htmlFor="nights">Nights</Label>
              <Input
                id="nights"
                max="30"
                min="1"
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nights: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
                type="number"
                value={formData.nights || ""}
              />
            </div>
          </div>

          <GuestSelector
            adults={formData.adults}
            childCount={formData.children}
            onChange={(adults, childCount) =>
              setFormData((prev) => ({ ...prev, adults, children: childCount }))
            }
          />

          <HotelSelector
            hotels={hotels}
            onChange={(ids) =>
              setFormData((prev) => ({ ...prev, hotelIds: ids }))
            }
            selected={formData.hotelIds}
          />

          <SearchOptions
            enableMonthsSearch={formData.enableMonthsSearch}
            includeWeather={formData.includeWeather}
            isYearSearch={formData.isYearSearch}
            months={formData.months}
            onMonthsChange={(months) =>
              setFormData((prev) => ({ ...prev, months }))
            }
            onMonthsToggle={(checked) =>
              setFormData((prev) => ({
                ...prev,
                enableMonthsSearch: checked,
                months: checked ? 3 : 0,
              }))
            }
            onWeatherLocationChange={(loc) =>
              setFormData((prev) => ({ ...prev, weatherLocation: loc }))
            }
            onWeatherToggle={(checked) =>
              setFormData((prev) => ({ ...prev, includeWeather: checked }))
            }
            onYearToggle={(checked) =>
              setFormData((prev) => ({
                ...prev,
                isYearSearch: checked,
                enableMonthsSearch: checked,
                months: checked ? 12 : 0,
              }))
            }
            weatherLocation={formData.weatherLocation ?? "pefkochori"}
            yearSearchDisabled={isOnlyPortoCarras}
            yearSearchHint={
              isOnlyPortoCarras
                ? "Year-long search not available for Porto Carras"
                : undefined
            }
          />

          <Button
            className="w-full"
            disabled={loading || formData.hotelIds.length === 0}
            size="lg"
            type="submit"
          >
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-primary-foreground border-b-2" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search Prices
              </>
            )}
          </Button>

          {formData.hotelIds.length === 0 && (
            <p className="text-center text-destructive text-sm">
              Please select at least one hotel to search
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
