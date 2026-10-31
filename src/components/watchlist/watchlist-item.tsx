"use client";

import { Bell, ChevronDown, LineChart, Loader2, Trash2 } from "lucide-react";
import { type ChangeEvent, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  onUpdate: (entry: WatchlistEntry) => void;
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

interface HistoryPanelProps {
  history: PriceHistoryResponse | null;
  loading: boolean;
}

function HistoryPanel({ history, loading }: HistoryPanelProps) {
  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-[#536365]">
        <Loader2 className="size-4 animate-spin" /> Loading price history…
      </p>
    );
  }
  if (!history) {
    return null;
  }
  if (history.trend.hasData) {
    return (
      <>
        <PriceTrendStats trend={history.trend} />
        <PriceHistoryChart snapshots={history.snapshots} />
      </>
    );
  }
  return (
    <p className="flex items-center gap-2 py-2 text-sm text-[#536365]">
      <LineChart className="size-4" /> No price data yet — the scraper records a
      point every 2 hours when the price changes.
    </p>
  );
}

interface DealAlertsProps {
  entry: WatchlistEntry;
  error: string | null;
  onPctDropChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onTargetChange: (event: ChangeEvent<HTMLInputElement>) => void;
  pctDrop: string;
  saving: boolean;
  target: string;
}

function DealAlerts({
  entry,
  error,
  onPctDropChange,
  onSave,
  onTargetChange,
  pctDrop,
  saving,
  target,
}: DealAlertsProps) {
  return (
    <div className="space-y-3 border-t border-[#1e2a36] pt-4">
      <div className="flex items-center gap-2">
        <Bell className="size-4 text-amber-400" />
        <p className="text-sm font-medium text-[#A3B2B5]">Deal alerts</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-[#738C8A]" htmlFor={`t-${entry.id}`}>
            Target price (€)
          </Label>
          <Input
            className="w-36"
            id={`t-${entry.id}`}
            min={0}
            onChange={onTargetChange}
            placeholder="none"
            type="number"
            value={target}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-[#738C8A]" htmlFor={`p-${entry.id}`}>
            % drop
          </Label>
          <Input
            className="w-28"
            id={`p-${entry.id}`}
            max={90}
            min={1}
            onChange={onPctDropChange}
            placeholder="none"
            type="number"
            value={pctDrop}
          />
        </div>
        <Button disabled={saving} onClick={onSave} type="button">
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Save alerts"}
        </Button>
        {error ? <span className="text-sm text-red-400">{error}</span> : null}
      </div>
      <p className="text-xs text-[#536365]">
        {entry.alertedAt
          ? `Last alerted ${new Date(entry.alertedAt).toLocaleString()}`
          : "No alerts sent yet. Emailed once when a threshold is crossed."}
      </p>
    </div>
  );
}

function describeStay(entry: WatchlistEntry): string {
  return [
    `${entry.checkinDate} · ${entry.nights} night`,
    entry.nights === 1 ? "" : "s",
    ` · ${entry.adults} adult`,
    entry.adults === 1 ? "" : "s",
    entry.children > 0 ? ` · ${entry.children} children` : "",
    entry.roomType ? ` · ${entry.roomType}` : "",
  ].join("");
}

export function WatchlistItem({
  entry,
  hotelName,
  onDelete,
  onToggle,
  onUpdate,
}: WatchlistItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<PriceHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState(entry.targetPrice?.toString() ?? "");
  const [pctDrop, setPctDrop] = useState(entry.alertPctDrop?.toString() ?? "");
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  const hasAlert = entry.targetPrice !== null || entry.alertPctDrop !== null;

  const toggleExpanded = useCallback(async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !history) {
      setLoading(true);
      try {
        const res = await fetch(`/api/watchlist/${entry.id}/history`);
        if (!res.ok) {
          throw new Error("Request failed");
        }
        setHistory(await res.json());
      } catch {
        setHistory(null);
      } finally {
        setLoading(false);
      }
    }
  }, [entry.id, expanded, history]);

  const saveAlerts = useCallback(async () => {
    setSavingAlerts(true);
    setAlertsError(null);
    try {
      const res = await fetch(`/api/watchlist/${entry.id}`, {
        body: JSON.stringify({
          alertPctDrop: toNumberOrNull(pctDrop),
          targetPrice: toNumberOrNull(target),
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!res.ok) {
        throw new Error("Request failed");
      }
      onUpdate((await res.json()) as WatchlistEntry);
    } catch {
      setAlertsError("Could not save alerts");
    } finally {
      setSavingAlerts(false);
    }
  }, [entry.id, onUpdate, pctDrop, target]);

  const handleToggle = useCallback(() => onToggle(entry), [entry, onToggle]);
  const handleDelete = useCallback(
    () => onDelete(entry.id),
    [entry.id, onDelete]
  );
  const handleTargetChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setTarget(e.target.value),
    []
  );
  const handlePctDropChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setPctDrop(e.target.value),
    []
  );

  return (
    <div className="border-b border-[#1e2a36] last:border-b-0">
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
            <p className="flex items-center gap-2 font-medium text-[#F5F7F8]">
              {hotelName}
              {hasAlert ? <Bell className="size-3.5 text-amber-400" /> : null}
            </p>
            <p className="text-sm text-[#738C8A]">{describeStay(entry)}</p>
          </div>
        </button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={entry.active} onCheckedChange={handleToggle} />
            <span className="text-xs text-[#738C8A]">
              {entry.active ? "Active" : "Paused"}
            </span>
          </div>
          <Button
            aria-label="Remove"
            onClick={handleDelete}
            size="icon"
            variant="ghost"
          >
            <Trash2 className="size-4 text-[#738C8A]" />
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="space-y-5 border-t border-[#1e2a36] bg-[#070c10] px-5 py-5">
          <HistoryPanel history={history} loading={loading} />
          <DealAlerts
            entry={entry}
            error={alertsError}
            onPctDropChange={handlePctDropChange}
            onSave={saveAlerts}
            onTargetChange={handleTargetChange}
            pctDrop={pctDrop}
            saving={savingAlerts}
            target={target}
          />
        </div>
      ) : null}
    </div>
  );
}
