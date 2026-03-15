"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { HotelConfig } from "@/domains/hotels/types";

interface HotelSelectorProps {
  hotels: HotelConfig[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

// Hotels temporarily hidden from search (keep config/registry intact for later)
const HIDDEN_HOTEL_IDS = ["excelsior"];

export function HotelSelector({
  hotels,
  selected,
  onChange,
}: HotelSelectorProps) {
  const visibleHotels = hotels.filter((h) => !HIDDEN_HOTEL_IDS.includes(h.id));
  const allSelected =
    visibleHotels.length > 0 && selected.length === visibleHotels.length;

  const handleToggle = (hotelId: string, checked: boolean) => {
    onChange(
      checked ? [...selected, hotelId] : selected.filter((id) => id !== hotelId)
    );
  };

  const handleSelectAll = () => {
    onChange(allSelected ? [] : visibleHotels.map((h) => h.id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Hotels to Search</Label>
        <Button
          onClick={handleSelectAll}
          size="sm"
          type="button"
          variant="ghost"
        >
          {allSelected ? "Deselect All" : "Select All"}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {visibleHotels.map((hotel) => (
          <div className="flex items-center space-x-2" key={hotel.id}>
            <Checkbox
              checked={selected.includes(hotel.id)}
              id={`hotel-${hotel.id}`}
              onCheckedChange={(checked) =>
                handleToggle(hotel.id, checked as boolean)
              }
            />
            <Label
              className="font-normal text-sm"
              htmlFor={`hotel-${hotel.id}`}
            >
              {hotel.displayName}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
