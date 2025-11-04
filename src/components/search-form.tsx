"use client";

import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Hotel,
  Moon,
  Search,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type SearchFormProps = {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
};

type SearchParams = {
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
};

type HotelData = {
  id: string;
  name: string;
  displayName: string;
};

export function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [hotels, setHotels] = useState<HotelData[]>([]);
  const [formData, setFormData] = useState<SearchParams>({
    checkin: format(new Date(), "yyyy-MM-dd"),
    nights: 5,
    adults: 2,
    children: 0,
    room: "standard",
    months: 0,
    hotelIds: [
      "bluecarpet",
      "cocooning",
      "myra",
      "portocarras",
      "eaglespalace",
      "eaglesvillas",
      "excelsior",
      "olympionsunset",
      "potideapalace",
    ],
    includeWeather: false,
    isYearSearch: false,
    weatherLocation: "pefkochori",
    enableMonthsSearch: false,
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const WEATHER_LOCATIONS = [
    { value: "pefkochori", label: "Pefkochori (Blue Carpet & Cocooning)" },
    { value: "kavala", label: "Kavala (Myra Hotel)" },
    { value: "neosmarmaras", label: "Neos Marmaras (Porto Carras)" },
  ];

  useEffect(() => {
    // Fetch available hotels
    fetch("/api/hotels")
      .then((res) => res.json())
      .then((data) => setHotels(data))
      .catch((_err) => {});
  }, []);

  // Disable year-long search when only Porto Carras is selected
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

  const handleHotelChange = (hotelId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      hotelIds: checked
        ? [...prev.hotelIds, hotelId]
        : prev.hotelIds.filter((id) => id !== hotelId),
    }));
  };

  const handleYearToggle = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isYearSearch: checked,
      enableMonthsSearch: checked,
      months: checked ? 12 : 0,
    }));
  };

  const handleMonthsToggle = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      enableMonthsSearch: checked,
      months: checked ? 3 : 0,
    }));
  };

  // Check if only Porto Carras is selected
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _isOnlyPortoCarras =
    formData.hotelIds.length === 1 && formData.hotelIds[0] === "portocarras";

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hotel className="h-5 w-5" />
          Greece Hotels Price Search
        </CardTitle>
        <CardDescription>
          Find the best prices at Blue Carpet Suites, Cocooning Suites, and
          Myrto Suites in Greece
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Date and Basic Info */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="checkin">Check-in Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    className="w-full justify-start text-left font-normal"
                    variant="outline"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    disabled={(date) => date < new Date()}
                    initialFocus
                    mode="single"
                    onSelect={handleDateSelect}
                    selected={selectedDate}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nights">Nights</Label>
              <Input
                id="nights"
                max="30"
                min="1"
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nights: Number.parseInt(e.target.value, 10),
                  }))
                }
                type="number"
                value={formData.nights}
              />
            </div>
          </div>

          {/* Guests */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2" htmlFor="adults">
                <Users className="h-4 w-4" />
                Adults
              </Label>
              <Input
                id="adults"
                max="8"
                min="1"
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    adults: Number.parseInt(e.target.value, 10),
                  }))
                }
                type="number"
                value={formData.adults}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="children">Children</Label>
              <Input
                id="children"
                max="6"
                min="0"
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    children: Number.parseInt(e.target.value, 10),
                  }))
                }
                type="number"
                value={formData.children}
              />
            </div>
          </div>

          {/* Hotels Selection */}
          <div className="space-y-3">
            <Label>Hotels to Search</Label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {hotels.map((hotel) => (
                <div className="flex items-center space-x-2" key={hotel.id}>
                  <Checkbox
                    checked={formData.hotelIds.includes(hotel.id)}
                    id={hotel.id}
                    onCheckedChange={(checked) =>
                      handleHotelChange(hotel.id, checked as boolean)
                    }
                  />
                  <Label className="font-normal text-sm" htmlFor={hotel.id}>
                    {hotel.displayName}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Search Options */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Year-long Search</Label>
                <p className="text-muted-foreground text-sm">
                  {formData.hotelIds.length === 1 &&
                  formData.hotelIds[0] === "portocarras"
                    ? "Year-long search not available for Porto Carras"
                    : "Search for the best prices throughout the entire year"}
                </p>
              </div>
              <Switch
                checked={formData.isYearSearch}
                disabled={
                  formData.hotelIds.length === 1 &&
                  formData.hotelIds[0] === "portocarras"
                }
                onCheckedChange={handleYearToggle}
              />
            </div>

            {!formData.isYearSearch && (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base">Multi-Month Search</Label>
                    <p className="text-muted-foreground text-sm">
                      Search across multiple months for the best deals
                    </p>
                  </div>
                  <Switch
                    checked={formData.enableMonthsSearch}
                    onCheckedChange={handleMonthsToggle}
                  />
                </div>

                {formData.enableMonthsSearch && (
                  <div className="space-y-2">
                    <Label htmlFor="months">Months to Check</Label>
                    <Select
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          months: Number.parseInt(value, 10),
                        }))
                      }
                      value={formData.months.toString()}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 9, 12].map((month) => (
                          <SelectItem key={month} value={month.toString()}>
                            {month} month{month > 1 ? "s" : ""}
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
              <Switch
                checked={formData.includeWeather}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, includeWeather: checked }))
                }
              />
            </div>

            {formData.includeWeather && (
              <div className="space-y-2">
                <Label htmlFor="weatherLocation">Weather Location</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, weatherLocation: value }))
                  }
                  value={formData.weatherLocation}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEATHER_LOCATIONS.map((location) => (
                      <SelectItem key={location.value} value={location.value}>
                        {location.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            className="w-full"
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
            <p className="text-center text-red-500 text-sm">
              Please select at least one hotel to search
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
