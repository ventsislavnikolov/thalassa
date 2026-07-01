import { ArrowDownRight, ArrowRight, ArrowUpRight, Trophy } from "lucide-react";
import type { PriceTrend } from "@/domains/tracking/types";

interface PriceTrendStatsProps {
  trend: PriceTrend;
}

function money(value: number | null, currency: string): string {
  if (value === null) {
    return "—";
  }
  return `${currency} ${value.toLocaleString()}`;
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[#536365] text-xs uppercase tracking-wide">{label}</p>
      <p className={`font-medium ${accent ?? "text-[#F5F7F8]"}`}>{value}</p>
    </div>
  );
}

export function PriceTrendStats({ trend }: PriceTrendStatsProps) {
  if (!trend.hasData) {
    return null;
  }

  const { currency } = trend;
  const changeLow = trend.changeFromLowPct;
  const direction = trend.direction;

  const DirectionIcon =
    direction === "down"
      ? ArrowDownRight
      : direction === "up"
        ? ArrowUpRight
        : ArrowRight;
  const directionColor =
    direction === "down"
      ? "text-green-400"
      : direction === "up"
        ? "text-red-400"
        : "text-[#738C8A]";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          accent={trend.currentAvailable ? undefined : "text-amber-400"}
          label="Current"
          value={
            trend.currentAvailable
              ? money(trend.current, currency)
              : "Unavailable"
          }
        />
        <Stat
          accent="text-green-400"
          label="Lowest"
          value={money(trend.low, currency)}
        />
        <Stat label="Highest" value={money(trend.high, currency)} />
        <Stat label="First seen" value={money(trend.first, currency)} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {trend.isAtLow ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-1 font-medium text-green-400 text-xs">
            <Trophy className="size-3.5" /> At historical low
          </span>
        ) : changeLow === null ? null : (
          <span className="text-[#738C8A]">
            <span className="text-[#A3B2B5]">+{changeLow.toFixed(1)}%</span>{" "}
            above the historical low
          </span>
        )}

        {direction === "flat" ? null : (
          <span
            className={`inline-flex items-center gap-1 text-xs ${directionColor}`}
          >
            <DirectionIcon className="size-3.5" />
            {direction === "down" ? "Trending down" : "Trending up"}
          </span>
        )}

        <span className="text-[#536365] text-xs">
          {trend.pointCount} point{trend.pointCount === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
