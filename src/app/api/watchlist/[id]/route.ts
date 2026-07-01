import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import {
  deleteWatchlistEntry,
  setWatchlistActive,
  updateWatchlistAlerts,
} from "@/domains/tracking/queries";
import type { WatchlistEntry } from "@/domains/tracking/types";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    active: z.boolean().optional(),
    targetPrice: z.number().positive().max(1_000_000).nullable().optional(),
    alertPctDrop: z.number().int().min(1).max(90).nullable().optional(),
  })
  .refine(
    (data) =>
      data.active !== undefined ||
      data.targetPrice !== undefined ||
      data.alertPctDrop !== undefined,
    { message: "No fields to update" }
  );

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const deleted = await deleteWatchlistEntry(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ id, deleted: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;
  let entry: WatchlistEntry | null = null;

  if (data.active !== undefined) {
    entry = await setWatchlistActive(id, data.active);
  }
  if (data.targetPrice !== undefined || data.alertPctDrop !== undefined) {
    entry = await updateWatchlistAlerts(
      id,
      data.targetPrice ?? null,
      data.alertPctDrop ?? null
    );
  }

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(entry);
}
