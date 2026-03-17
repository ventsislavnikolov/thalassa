"use client";

import { format } from "date-fns";
import { Calendar, Hotel, Search, Settings2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-[#1e2a36] bg-[#0d1117]">
      {/* Form header */}
      <div className="border-[#1e2a36] border-b px-6 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2E5BB1]/15">
            <Search className="h-4 w-4 text-[#2E5BB1]" />
          </div>
          <div>
            <h2 className="font-display text-[#F5F7F8] text-lg">
              Price Search
            </h2>
            <p className="text-[#536365] text-xs">
              Find the best rates across {hotels.length || 15} hotels
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section: When & Duration */}
        <div className="border-[#1e2a36] border-b px-6 py-6 sm:px-8">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-[#738C8A]" />
            <span className="font-medium text-[#A3B2B5] text-xs uppercase tracking-wider">
              When
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DatePicker date={selectedDate} onSelect={handleDateSelect} />
            <div className="space-y-2">
              <Label className="text-[#A3B2B5]" htmlFor="nights">
                Nights
              </Label>
              <Input
                className="border-[#1e2a36] bg-[#111820] text-[#F5F7F8] placeholder:text-[#293044] focus:border-[#2A4F58] focus:ring-[#2A4F58]/30"
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
        </div>

        {/* Section: Guests */}
        <div className="border-[#1e2a36] border-b px-6 py-6 sm:px-8">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-[#738C8A]" />
            <span className="font-medium text-[#A3B2B5] text-xs uppercase tracking-wider">
              Guests
            </span>
          </div>
          <GuestSelector
            adults={formData.adults}
            childCount={formData.children}
            onChange={(adults, childCount) =>
              setFormData((prev) => ({ ...prev, adults, children: childCount }))
            }
          />
        </div>

        {/* Section: Hotels */}
        <div className="border-[#1e2a36] border-b px-6 py-6 sm:px-8">
          <div className="mb-4 flex items-center gap-2">
            <Hotel className="h-3.5 w-3.5 text-[#738C8A]" />
            <span className="font-medium text-[#A3B2B5] text-xs uppercase tracking-wider">
              Hotels
            </span>
            <span className="ml-auto rounded-md bg-[#2A4F58]/15 px-2 py-0.5 text-[#738C8A] text-[10px]">
              {formData.hotelIds.length} selected
            </span>
          </div>
          <HotelSelector
            hotels={hotels}
            onChange={(ids) =>
              setFormData((prev) => ({ ...prev, hotelIds: ids }))
            }
            selected={formData.hotelIds}
          />
        </div>

        {/* Section: Options */}
        <div className="border-[#1e2a36] border-b px-6 py-6 sm:px-8">
          <div className="mb-4 flex items-center gap-2">
            <Settings2 className="h-3.5 w-3.5 text-[#738C8A]" />
            <span className="font-medium text-[#A3B2B5] text-xs uppercase tracking-wider">
              Options
            </span>
          </div>
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
        </div>

        {/* Submit */}
        <div className="px-6 py-6 sm:px-8">
          <Button
            className="w-full bg-[#2E5BB1] text-white hover:bg-[#2E5BB1]/90 disabled:bg-[#293044] disabled:text-[#536365]"
            disabled={loading || formData.hotelIds.length === 0}
            size="lg"
            type="submit"
          >
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2" />
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
            <p className="mt-3 text-center text-red-400 text-sm">
              Please select at least one hotel to search
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
