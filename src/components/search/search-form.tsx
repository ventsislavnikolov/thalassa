"use client";

import { format } from "date-fns";
import { Calendar, Hotel, Search, Settings2, Users } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HotelConfig } from "@/domains/hotels/types";
import { DatePicker } from "./date-picker";
import { GuestSelector } from "./guest-selector";
import { HotelSelector } from "./hotel-selector";
import { SearchOptions } from "./search-options";

export interface SearchFormParams {
  adults: number;
  checkin: string;
  children: number;
  enableMonthsSearch: boolean;
  hotelIds: string[];
  includeWeather: boolean;
  isYearSearch: boolean;
  months: number;
  nights: number;
  room: string;
  weatherLocation?: string;
}

interface SearchFormProps {
  defaultHotel?: string;
  loading?: boolean;
  onSearch: (params: SearchFormParams) => void;
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
  "stellaisla",
  "mountathos",
  "miraggio",
  "paralos",
  "atriumprestige",
  "nanagolden",
  "makedoniapalace",
  "palmboutique",
  "maritima",
  "fourstones",
  "reinadelmar",
];

export function SearchForm({
  onSearch,
  defaultHotel,
  loading = false,
}: SearchFormProps) {
  const [hotels, setHotels] = useState<HotelConfig[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState<SearchFormParams>({
    adults: 2,
    checkin: format(new Date(), "yyyy-MM-dd"),
    children: 0,
    enableMonthsSearch: false,
    hotelIds: defaultHotel ? [defaultHotel] : DEFAULT_HOTEL_IDS,
    includeWeather: false,
    isYearSearch: false,
    months: 0,
    nights: 5,
    room: "standard",
    weatherLocation: "pefkochori",
  });

  useEffect(() => {
    fetch("/api/hotels")
      .then((res) => res.json())
      .then((data) => setHotels(data))
      .catch(() => {
        // The hotel list only labels the selector; the form works without it
      });
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

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      onSearch(formData);
    },
    [formData, onSearch]
  );

  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setFormData((prev) => ({
        ...prev,
        checkin: format(date, "yyyy-MM-dd"),
      }));
    }
  }, []);

  const handleNightsChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      setFormData((prev) => ({
        ...prev,
        nights: Number.parseInt(e.target.value, 10) || 0,
      })),
    []
  );

  const handleGuestsChange = useCallback(
    (adults: number, childCount: number) =>
      setFormData((prev) => ({ ...prev, adults, children: childCount })),
    []
  );

  const handleHotelsChange = useCallback(
    (ids: string[]) => setFormData((prev) => ({ ...prev, hotelIds: ids })),
    []
  );

  const handleMonthsChange = useCallback(
    (months: number) => setFormData((prev) => ({ ...prev, months })),
    []
  );

  const handleMonthsToggle = useCallback(
    (checked: boolean) =>
      setFormData((prev) => ({
        ...prev,
        enableMonthsSearch: checked,
        months: checked ? 3 : 0,
      })),
    []
  );

  const handleWeatherLocationChange = useCallback(
    (loc: string) => setFormData((prev) => ({ ...prev, weatherLocation: loc })),
    []
  );

  const handleWeatherToggle = useCallback(
    (checked: boolean) =>
      setFormData((prev) => ({ ...prev, includeWeather: checked })),
    []
  );

  const handleYearToggle = useCallback(
    (checked: boolean) =>
      setFormData((prev) => ({
        ...prev,
        enableMonthsSearch: checked,
        isYearSearch: checked,
        months: checked ? 12 : 0,
      })),
    []
  );

  const isOnlyPortoCarras =
    formData.hotelIds.length === 1 && formData.hotelIds[0] === "portocarras";

  return (
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-[#1e2a36] bg-[#0d1117]">
      {/* Form header */}
      <div className="border-b border-[#1e2a36] px-6 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2E5BB1]/15">
            <Search className="h-4 w-4 text-[#2E5BB1]" />
          </div>
          <div>
            <h2 className="font-display text-lg text-[#F5F7F8]">
              Price Search
            </h2>
            <p className="text-xs text-[#536365]">
              Find the best rates across {hotels.length || 15} hotels
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section: When & Duration */}
        <div className="border-b border-[#1e2a36] px-6 py-6 sm:px-8">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-[#738C8A]" />
            <span className="text-xs font-medium tracking-wider text-[#A3B2B5] uppercase">
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
                onChange={handleNightsChange}
                type="number"
                value={formData.nights || ""}
              />
            </div>
          </div>
        </div>

        {/* Section: Guests */}
        <div className="border-b border-[#1e2a36] px-6 py-6 sm:px-8">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-[#738C8A]" />
            <span className="text-xs font-medium tracking-wider text-[#A3B2B5] uppercase">
              Guests
            </span>
          </div>
          <GuestSelector
            adults={formData.adults}
            childCount={formData.children}
            onChange={handleGuestsChange}
          />
        </div>

        {/* Section: Hotels */}
        <div className="border-b border-[#1e2a36] px-6 py-6 sm:px-8">
          <div className="mb-4 flex items-center gap-2">
            <Hotel className="h-3.5 w-3.5 text-[#738C8A]" />
            <span className="text-xs font-medium tracking-wider text-[#A3B2B5] uppercase">
              Hotels
            </span>
            <span className="ml-auto rounded-md bg-[#2A4F58]/15 px-2 py-0.5 text-[10px] text-[#738C8A]">
              {formData.hotelIds.length} selected
            </span>
          </div>
          <HotelSelector
            hotels={hotels}
            onChange={handleHotelsChange}
            selected={formData.hotelIds}
          />
        </div>

        {/* Section: Options */}
        <div className="border-b border-[#1e2a36] px-6 py-6 sm:px-8">
          <div className="mb-4 flex items-center gap-2">
            <Settings2 className="h-3.5 w-3.5 text-[#738C8A]" />
            <span className="text-xs font-medium tracking-wider text-[#A3B2B5] uppercase">
              Options
            </span>
          </div>
          <SearchOptions
            enableMonthsSearch={formData.enableMonthsSearch}
            includeWeather={formData.includeWeather}
            isYearSearch={formData.isYearSearch}
            months={formData.months}
            onMonthsChange={handleMonthsChange}
            onMonthsToggle={handleMonthsToggle}
            onWeatherLocationChange={handleWeatherLocationChange}
            onWeatherToggle={handleWeatherToggle}
            onYearToggle={handleYearToggle}
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
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
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
            <p className="mt-3 text-center text-sm text-red-400">
              Please select at least one hotel to search
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
