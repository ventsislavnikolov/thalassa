"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HotelConfig } from "@/domains/hotels/types";
import type { WatchlistEntry } from "@/domains/tracking/types";
import { WatchlistItem } from "./watchlist-item";

interface FormState {
  adults: number;
  alertPctDrop: string;
  checkinDate: string;
  children: number;
  hotelSlug: string;
  nights: number;
  roomType: string;
  targetPrice: string;
}

const INITIAL_FORM: FormState = {
  hotelSlug: "",
  checkinDate: "",
  nights: 5,
  adults: 2,
  children: 0,
  roomType: "",
  targetPrice: "",
  alertPctDrop: "",
};

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function WatchlistManager() {
  const [hotels, setHotels] = useState<HotelConfig[]>([]);
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/hotels").then((r) => r.json()),
      fetch("/api/watchlist").then((r) => r.json()),
    ])
      .then(([hotelData, entryData]) => {
        setHotels(hotelData);
        setEntries(entryData);
      })
      .catch(() => setError("Failed to load watchlist"))
      .finally(() => setLoading(false));
  }, []);

  const hotelName = (slug: string) =>
    hotels.find((h) => h.slug === slug)?.displayName ?? slug;

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!(form.hotelSlug && form.checkinDate)) {
      setError("Pick a hotel and a check-in date");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: form.hotelSlug,
          checkinDate: form.checkinDate,
          nights: form.nights,
          adults: form.adults,
          children: form.children,
          roomType: form.roomType.trim() || null,
          targetPrice: toNumberOrNull(form.targetPrice),
          alertPctDrop: toNumberOrNull(form.alertPctDrop),
        }),
      });
      if (!res.ok) {
        throw new Error("Request failed");
      }
      const created: WatchlistEntry = await res.json();
      setEntries((prev) => [
        created,
        ...prev.filter((e) => e.id !== created.id),
      ]);
      setForm((prev) => ({ ...INITIAL_FORM, hotelSlug: prev.hotelSlug }));
    } catch {
      setError("Could not add entry");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(entry: WatchlistEntry) {
    const active = !entry.active;
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, active } : e))
    );
    await fetch(`/api/watchlist/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    }).catch(() => {
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, active: !active } : e))
      );
    });
  }

  function handleUpdate(updated: WatchlistEntry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  async function handleDelete(id: number) {
    const previous = entries;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const res = await fetch(`/api/watchlist/${id}`, {
      method: "DELETE",
    }).catch(() => null);
    if (!res?.ok) {
      setEntries(previous);
    }
  }

  return (
    <div className="space-y-8">
      <form
        className="grid grid-cols-1 gap-4 rounded-xl border border-[#1e2a36] bg-[#0b1116] p-5 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={handleAdd}
      >
        <div className="space-y-1.5">
          <Label className="text-[#A3B2B5]">Hotel</Label>
          <Select
            onValueChange={(v) => setForm((p) => ({ ...p, hotelSlug: v }))}
            value={form.hotelSlug}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a hotel" />
            </SelectTrigger>
            <SelectContent>
              {hotels.map((hotel) => (
                <SelectItem key={hotel.slug} value={hotel.slug}>
                  {hotel.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[#A3B2B5]" htmlFor="checkinDate">
            Check-in
          </Label>
          <Input
            id="checkinDate"
            onChange={(e) =>
              setForm((p) => ({ ...p, checkinDate: e.target.value }))
            }
            type="date"
            value={form.checkinDate}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[#A3B2B5]" htmlFor="nights">
            Nights
          </Label>
          <Input
            id="nights"
            max={30}
            min={1}
            onChange={(e) =>
              setForm((p) => ({ ...p, nights: Number(e.target.value) }))
            }
            type="number"
            value={form.nights}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[#A3B2B5]" htmlFor="adults">
            Adults
          </Label>
          <Input
            id="adults"
            max={8}
            min={1}
            onChange={(e) =>
              setForm((p) => ({ ...p, adults: Number(e.target.value) }))
            }
            type="number"
            value={form.adults}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[#A3B2B5]" htmlFor="children">
            Children
          </Label>
          <Input
            id="children"
            max={6}
            min={0}
            onChange={(e) =>
              setForm((p) => ({ ...p, children: Number(e.target.value) }))
            }
            type="number"
            value={form.children}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[#A3B2B5]" htmlFor="roomType">
            Room type <span className="text-[#536365]">(optional)</span>
          </Label>
          <Input
            id="roomType"
            onChange={(e) =>
              setForm((p) => ({ ...p, roomType: e.target.value }))
            }
            placeholder="Cheapest available"
            value={form.roomType}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[#A3B2B5]" htmlFor="targetPrice">
            Target price <span className="text-[#536365]">(alert, €)</span>
          </Label>
          <Input
            id="targetPrice"
            min={0}
            onChange={(e) =>
              setForm((p) => ({ ...p, targetPrice: e.target.value }))
            }
            placeholder="e.g. 1800"
            type="number"
            value={form.targetPrice}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[#A3B2B5]" htmlFor="alertPctDrop">
            Alert on % drop <span className="text-[#536365]">(optional)</span>
          </Label>
          <Input
            id="alertPctDrop"
            max={90}
            min={1}
            onChange={(e) =>
              setForm((p) => ({ ...p, alertPctDrop: e.target.value }))
            }
            placeholder="e.g. 10"
            type="number"
            value={form.alertPctDrop}
          />
        </div>

        <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3">
          <Button disabled={submitting} type="submit">
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Add to watchlist"
            )}
          </Button>
          {error ? <span className="text-red-400 text-sm">{error}</span> : null}
        </div>
      </form>

      <div className="rounded-xl border border-[#1e2a36] bg-[#0b1116]">
        {loading ? (
          <p className="p-5 text-[#536365] text-sm">Loading…</p>
        ) : null}
        {!loading && entries.length === 0 ? (
          <p className="p-5 text-[#536365] text-sm">
            No tracked stays yet. Add one above.
          </p>
        ) : null}
        {entries.map((entry) => (
          <WatchlistItem
            entry={entry}
            hotelName={hotelName(entry.hotelSlug)}
            key={entry.id}
            onDelete={handleDelete}
            onToggle={handleToggle}
            onUpdate={handleUpdate}
          />
        ))}
      </div>
    </div>
  );
}
