import { NextResponse } from "next/server";
import { calculateBillSplit, calculateSegmentedBill } from "@/lib/billing";
import { readDb } from "@/lib/db";
import { belongsToOwner, requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const body = await req.json();
  const roomNumber = String(body.roomNumber || "").trim();
  const month = String(body.month || "").trim();
  const totalBill = Number(body.totalBill);

  if (!roomNumber || !month || !Number.isFinite(totalBill) || totalBill < 0) {
    return NextResponse.json({ error: "roomNumber, month and valid totalBill are required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, room_number")
      .eq("room_number", roomNumber)
      .eq("owner_id", session.owner.owner_id)
      .single();

    if (roomError || !room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const [{ data: logs, error: logError }, { data: readings, error: readingsError }] = await Promise.all([
      supabase
        .from("occupancy_logs")
        .select("id, tenant_id, bed_id, check_in, check_out, tenants(full_name)")
        .eq("owner_id", session.owner.owner_id)
        .eq("room_id", room.id),
      supabase
        .from("room_meter_readings")
        .select("reading_value, reading_type, reading_date, occupancy_log_id")
        .eq("owner_id", session.owner.owner_id)
        .eq("room_id", room.id)
        .gte("reading_date", `${month}-01`)
        .lte("reading_date", `${month}-31`)
    ]);

    if (logError) return NextResponse.json({ error: logError.message }, { status: 400 });
    if (readingsError) return NextResponse.json({ error: readingsError.message }, { status: 400 });

    const occupancyLogs = (logs || []).map((l: any) => ({
      id: l.id,
      tenant_id: l.tenant_id,
      bed_id: l.bed_id,
      check_in: l.check_in,
      check_out: l.check_out
    }));

    const tenantNames = new Map((logs || []).map((l: any) => [l.tenant_id, l.tenants?.full_name || "Unknown"]));

    const segmented = calculateSegmentedBill({
      roomId: room.id,
      month,
      totalBill,
      readings: readings || [],
      occupancyLogs
    });

    if (segmented.error) {
      return NextResponse.json({ error: segmented.error }, { status: 400 });
    }

    const tenantEntries = Object.entries(segmented.tenantTotals);

    return NextResponse.json({
      totalBill,
      roomNumber,
      month,
      segments: segmented.segments,
      tenantTotals: segmented.tenantTotals,
      splits: tenantEntries.map(([tenantId, amount]) => ({
        tenantId,
        tenantName: tenantNames.get(tenantId) || "Unknown",
        amount
      }))
    });
  }

  const db = await readDb();
  const room = db.rooms.find((r) => r.room_number === roomNumber && belongsToOwner(r, session.owner.owner_id));
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const logs = db.occupancy_logs
    .filter((o) => o.room_id === room.id && belongsToOwner(o, session.owner.owner_id))
    .map((o) => ({
      tenantId: o.tenant_id,
      tenantName: db.tenants.find((t) => t.id === o.tenant_id && belongsToOwner(t, session.owner.owner_id))?.full_name || "Unknown",
      checkIn: o.check_in,
      checkOut: o.check_out
    }));

  const result = calculateBillSplit({ totalBill, roomNumber, month, logs });
  return NextResponse.json(result);
}
