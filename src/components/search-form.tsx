"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Search,
  Hotel,
  Users,
  Moon,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
}

interface SearchParams {
  checkin: string;
  nights: number;
  adults: number;
  children: number;
  room: string;
  months: number;
  hotelIds: string[];
  includeWeather: boolean;
  isYearSearch: boolean;
}

interface Hotel {
  id: string;
  name: string;
  displayName: string;
}

const ROOM_TYPES = [
  { value: "ALL", label: "Any Room Type" },
  { value: "TRIPLE", label: "Triple Suite" },
  { value: "DBLSV", label: "Double Suite | Sea View" },
  { value: "TRIPLP", label: "Triple Suite | Private Pool" },
  { value: "DBLPP", label: "Double Suite Side Sea View | Private Pool" },
  { value: "2LEVEL", label: "2-Level Suite" },
  { value: "SUITPP", label: "Double Suite Sea View | Private Pool" },
  { value: "2LESV", label: "2 Level Suite | Sea View" },
  { value: "BCARP", label: "Blue Carpet Suite Sea View | Private Pool" },
  { value: "2LVLJA", label: "2 Level Suite | Outdoor Jacuzzi" },
  { value: "PART", label: "2 Level Suite Sea View | Outdoor Jacuzzi" },
  { value: "IND", label: "Deluxe Suite Sea View | Indoor Jacuzzi" },
];

export function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [formData, setFormData] = useState<SearchParams>({
    checkin: format(new Date(), "yyyy-MM-dd"),
    nights: 5,
    adults: 2,
    children: 0,
    room: "ALL",
    months: 3,
    hotelIds: ["bluecarpet", "cocooning"],
    includeWeather: false,
    isYearSearch: false,
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    // Fetch available hotels
    fetch("/api/hotels")
      .then((res) => res.json())
      .then((data) => setHotels(data))
      .catch((err) => console.error("Failed to fetch hotels:", err));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Convert "ALL" back to empty string for the API
    const apiFormData = {
      ...formData,
      room: formData.room === "ALL" ? "" : formData.room,
    };
    onSearch(apiFormData);
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
      months: checked ? 12 : 3,
    }));
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hotel className="h-5 w-5" />
          Pefkohori Hotels Price Search
        </CardTitle>
        <CardDescription>
          Find the best prices at Blue Carpet Suites and Cocooning Suites in
          Greece
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date and Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkin">Check-in Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nights">Nights</Label>
              <Input
                id="nights"
                type="number"
                min="1"
                max="30"
                value={formData.nights}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nights: parseInt(e.target.value),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="room">Room Type</Label>
              <Select
                value={formData.room}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, room: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((room) => (
                    <SelectItem key={room.value} value={room.value}>
                      {room.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Guests */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adults" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Adults
              </Label>
              <Input
                id="adults"
                type="number"
                min="1"
                max="8"
                value={formData.adults}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    adults: parseInt(e.target.value),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="children">Children</Label>
              <Input
                id="children"
                type="number"
                min="0"
                max="6"
                value={formData.children}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    children: parseInt(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          {/* Hotels Selection */}
          <div className="space-y-3">
            <Label>Hotels to Search</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {hotels.map((hotel) => (
                <div key={hotel.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={hotel.id}
                    checked={formData.hotelIds.includes(hotel.id)}
                    onCheckedChange={(checked) =>
                      handleHotelChange(hotel.id, checked as boolean)
                    }
                  />
                  <Label htmlFor={hotel.id} className="text-sm font-normal">
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
                <p className="text-sm text-muted-foreground">
                  Search for the best prices throughout the entire year
                </p>
              </div>
              <Switch
                checked={formData.isYearSearch}
                onCheckedChange={handleYearToggle}
              />
            </div>

            {!formData.isYearSearch && (
              <div className="space-y-2">
                <Label htmlFor="months">Months to Check</Label>
                <Select
                  value={formData.months.toString()}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      months: parseInt(value),
                    }))
                  }
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

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Weather Analysis
                </Label>
                <p className="text-sm text-muted-foreground">
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
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || formData.hotelIds.length === 0}
            size="lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
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
            <p className="text-sm text-red-500 text-center">
              Please select at least one hotel to search
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
