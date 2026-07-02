import { NextResponse } from "next/server";
import { calculateSegmentedBill } from "@/lib/billing";
import { requireOwner } from "@/lib/owner-scope";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await requireOwner(req);
  if (session.error) return session.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("electricity_bills")
    .select("id, room_id, bill_month, total_amount, total_person_days, per_person_day_cost, created_at, rooms(room_number), bill_splits(id, bill_id, tenant_id, days_stayed, amount, status, created_at, tenants(full_name))")
    .eq("owner_id", session.owner.owner_id)
    .order("bill_month", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
}

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
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  {
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

    const { data: bill, error: billError } = await supabase
      .from("electricity_bills")
      .upsert(
        {
          owner_id: session.owner.owner_id,
          room_id: room.id,
          bill_month: month,
          total_amount: totalBill,
          total_person_days: 0,
          per_person_day_cost: 0
        },
        { onConflict: "room_id,bill_month" }
      )
      .select("id")
      .single();

    if (billError || !bill) return NextResponse.json({ error: billError?.message || "Unable to save bill" }, { status: 400 });

    const { error: delError } = await supabase
      .from("bill_splits")
      .delete()
      .eq("bill_id", bill.id)
      .eq("owner_id", session.owner.owner_id);
    if (delError) return NextResponse.json({ error: delError.message }, { status: 400 });

    const tenantEntries = Object.entries(segmented.tenantTotals);
    if (tenantEntries.length > 0) {
      const payload = tenantEntries.map(([tenantId, amount]) => ({
        owner_id: session.owner.owner_id,
        bill_id: bill.id,
        tenant_id: tenantId,
        days_stayed: 0,
        amount,
        status: "pending"
      }));

      const { error: splitError } = await supabase.from("bill_splits").insert(payload);
      if (splitError) return NextResponse.json({ error: splitError.message }, { status: 400 });
    }

    return NextResponse.json({
      billId: bill.id,
      saved: true,
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
}
