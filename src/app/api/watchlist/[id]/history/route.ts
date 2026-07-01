import { NextResponse } from "next/server";
import { computePriceTrend } from "@/domains/tracking/history";
import { getSnapshots } from "@/domains/tracking/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = Number((await params).id);
  if (!(Number.isInteger(id) && id > 0)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const snapshots = await getSnapshots(id);
  const trend = computePriceTrend(snapshots);

  return NextResponse.json({ snapshots, trend });
}
