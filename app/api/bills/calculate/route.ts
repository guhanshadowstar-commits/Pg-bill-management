import { NextResponse } from "next/server";
import { calculateBillSplit } from "@/lib/billing";
import { readDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
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
      .single();

    if (roomError || !room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const { data: logs, error: logError } = await supabase
      .from("occupancy_logs")
      .select("tenant_id, check_in, check_out, tenants(full_name)")
      .eq("room_id", room.id);

    if (logError) return NextResponse.json({ error: logError.message }, { status: 400 });

    const parsed = (logs || []).map((l: any) => ({
      tenantId: l.tenant_id,
      tenantName: l.tenants?.full_name || "Unknown",
      checkIn: l.check_in,
      checkOut: l.check_out
    }));

    const result = calculateBillSplit({ totalBill, roomNumber, month, logs: parsed });
    return NextResponse.json(result);
  }

  const db = await readDb();
  const room = db.rooms.find((r) => r.room_number === roomNumber);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const logs = db.occupancy_logs
    .filter((o) => o.room_id === room.id)
    .map((o) => ({
      tenantId: o.tenant_id,
      tenantName: db.tenants.find((t) => t.id === o.tenant_id)?.full_name || "Unknown",
      checkIn: o.check_in,
      checkOut: o.check_out
    }));

  const result = calculateBillSplit({ totalBill, roomNumber, month, logs });
  return NextResponse.json(result);
}
