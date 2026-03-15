"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PriceResult } from "@/domains/scraping/types";

interface ExportButtonProps {
  prices: PriceResult[];
  filename?: string;
}

export function ExportButton({
  prices,
  filename = "hotel-prices.csv",
}: ExportButtonProps) {
  const handleExport = () => {
    const headers = ["Date", "Day", "Hotel", "Room Type", "Per Night", "Total"];
    const rows = prices.map((p) => [
      p.date,
      p.dayOfWeek,
      p.hotelName,
      p.roomType ?? "Standard Room",
      p.averagePerNight.toFixed(2),
      p.stayTotal.toFixed(2),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={handleExport} size="sm" variant="outline">
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
