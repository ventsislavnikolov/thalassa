"use client";

import { ChevronDown, LineChart, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type {
  PriceHistoryResponse,
  WatchlistEntry,
} from "@/domains/tracking/types";
import { PriceHistoryChart } from "./price-history-chart";
import { PriceTrendStats } from "./price-trend-stats";

interface WatchlistItemProps {
  entry: WatchlistEntry;
  hotelName: string;
  onDelete: (id: number) => void;
  onToggle: (entry: WatchlistEntry) => void;
}

export function WatchlistItem({
  entry,
  hotelName,
  onDelete,
  onToggle,
}: WatchlistItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<PriceHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    if (next && !history) {
      setLoading(true);
      try {
        const res = await fetch(`/api/watchlist/${entry.id}/history`);
        setHistory(await res.json());
      } catch {
        setHistory(null);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="border-[#1e2a36] border-b last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <button
          className="flex min-w-0 items-center gap-3 text-left"
          onClick={toggleExpanded}
          type="button"
        >
          <ChevronDown
            className={`size-4 shrink-0 text-[#738C8A] transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
          <div className="min-w-0">
            <p className="font-medium text-[#F5F7F8]">{hotelName}</p>
            <p className="text-[#738C8A] text-sm">
              {entry.checkinDate} · {entry.nights} night
              {entry.nights === 1 ? "" : "s"} · {entry.adults} adult
              {entry.adults === 1 ? "" : "s"}
              {entry.children > 0 ? ` · ${entry.children} children` : ""}
              {entry.roomType ? ` · ${entry.roomType}` : ""}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={entry.active}
              onCheckedChange={() => onToggle(entry)}
            />
            <span className="text-[#738C8A] text-xs">
              {entry.active ? "Active" : "Paused"}
            </span>
          </div>
          <Button
            aria-label="Remove"
            onClick={() => onDelete(entry.id)}
            size="icon"
            variant="ghost"
          >
            <Trash2 className="size-4 text-[#738C8A]" />
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="space-y-4 border-[#1e2a36] border-t bg-[#070c10] px-5 py-5">
          {loading ? (
            <p className="flex items-center gap-2 text-[#536365] text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading price history…
            </p>
          ) : null}
          {!loading && history?.trend.hasData ? (
            <>
              <PriceTrendStats trend={history.trend} />
              <PriceHistoryChart snapshots={history.snapshots} />
            </>
          ) : null}
          {!loading && history && !history.trend.hasData ? (
            <p className="flex items-center gap-2 py-2 text-[#536365] text-sm">
              <LineChart className="size-4" /> No price data yet — the scraper
              records a point every 2 hours when the price changes.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
