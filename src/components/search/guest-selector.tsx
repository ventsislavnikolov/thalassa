"use client";

import { type ChangeEvent, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GuestSelectorProps {
  adults: number;
  childCount: number;
  onChange: (adults: number, childCount: number) => void;
}

export function GuestSelector({
  adults,
  childCount,
  onChange,
}: GuestSelectorProps) {
  const handleAdultsChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      onChange(Number.parseInt(e.target.value, 10) || 0, childCount),
    [childCount, onChange]
  );

  const handleChildrenChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      onChange(adults, Number.parseInt(e.target.value, 10) || 0),
    [adults, onChange]
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label className="text-[#A3B2B5]" htmlFor="adults">
          Adults
        </Label>
        <Input
          className="border-[#1e2a36] bg-[#111820] text-[#F5F7F8] placeholder:text-[#293044] focus:border-[#2A4F58] focus:ring-[#2A4F58]/30"
          id="adults"
          max="8"
          min="1"
          onChange={handleAdultsChange}
          type="number"
          value={adults || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-[#A3B2B5]" htmlFor="children">
          Children
        </Label>
        <Input
          className="border-[#1e2a36] bg-[#111820] text-[#F5F7F8] placeholder:text-[#293044] focus:border-[#2A4F58] focus:ring-[#2A4F58]/30"
          id="children"
          max="6"
          min="0"
          onChange={handleChildrenChange}
          type="number"
          value={childCount || ""}
        />
      </div>
    </div>
  );
}
