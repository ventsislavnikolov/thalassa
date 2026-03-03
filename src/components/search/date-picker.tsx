"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
}

export function DatePicker({ date, onSelect }: DatePickerProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="checkin">Check-in Date</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            className="w-full justify-start text-left font-normal"
            variant="outline"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            disabled={(d) => d < new Date()}
            initialFocus
            mode="single"
            onSelect={onSelect}
            selected={date}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
