"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const handleToggle = (hotelId: string) => {
    onChange(
      selected.includes(hotelId)
        ? selected.filter((id) => id !== hotelId)
        : [...selected, hotelId]
    );
  };

  const handleSelectAll = () => {
    onChange(allSelected ? [] : visibleHotels.map((h) => h.id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[#A3B2B5]">Hotels to Search</Label>
        <Button
          className="h-auto border-[#1e2a36] bg-transparent px-2.5 py-1 text-[#738C8A] text-xs hover:bg-[#111820] hover:text-[#A3B2B5]"
          onClick={handleSelectAll}
          type="button"
          variant="outline"
        >
          {allSelected ? "Deselect All" : "Select All"}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {visibleHotels.map((hotel) => {
          const isSelected = selected.includes(hotel.id);
          return (
            <button
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                isSelected
                  ? "border-[#2A4F58]/50 bg-[#2A4F58]/10 text-[#F5F7F8]"
                  : "border-[#1e2a36] bg-[#111820] text-[#536365] hover:border-[#293044] hover:text-[#A3B2B5]"
              }`}
              key={hotel.id}
              onClick={() => handleToggle(hotel.id)}
              type="button"
            >
              <div
                className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors ${
                  isSelected
                    ? "border-[#2E5BB1] bg-[#2E5BB1]"
                    : "border-[#293044] bg-transparent"
                }`}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>
              {hotel.displayName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
