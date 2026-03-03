"use client";

import { Users } from "lucide-react";
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
  return (
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
            onChange(Number.parseInt(e.target.value, 10), childCount)
          }
          type="number"
          value={adults}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="children">Children</Label>
        <Input
          id="children"
          max="6"
          min="0"
          onChange={(e) =>
            onChange(adults, Number.parseInt(e.target.value, 10))
          }
          type="number"
          value={childCount}
        />
      </div>
    </div>
  );
}
